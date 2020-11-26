import { call } from "ionicons/icons"
import * as language from "../utils/language"
import * as workers from "../utils/workers"

const utils = require("../utils/utils")

export async function fileExists(name, parent, callback){
	if(parent == null){
		parent = "default"
	}

	try{
		var res = await utils.apiRequest("POST", "/v1/file/exists", {
			apiKey: this.state.userAPIKey,
			parent,
			nameHashed: utils.hashFn(name.toLowerCase())
		})
	}
	catch(e){
		return callback(e)
	}

	if(!res.status){
		return callback(res.message)
	}

	return callback(null, res.data.exists, res.data.uuid)
}

export async function markUploadAsDone(uuid, uploadKey, tries, maxTries, callback){
	if(tries >= maxTries){
		return callback(new Error("mark upload as done max tries reached, returning."))
	}

	try{
        var res = await utils.apiRequest("POST", "/v1/upload/done", {
			uuid,
			uploadKey
        })
    }
    catch(e){
		console.log(e)
		
		return setTimeout(() => {
			this.markUploadAsDone(uuid, uploadKey, (tries + 1), maxTries, callback)
		}, 1000)
    }

    if(!res.status){
        console.log(res.message)

        return callback(res.message)
    }

	return callback(null)
}

export async function uploadChunk(uuid, queryParams, data, tries, maxTries, callback){
	await window.customVariables.uploadChunkSemaphore.acquire()

	fetch(utils.getUploadServer() + "/v1/upload?" + queryParams, {
		method: "POST",
		cache: "no-cache",
		body: data
	}).then((response) => {
		response.json().then((obj) => {
			let res = obj

			window.customVariables.uploadChunkSemaphore.release()

			if(!res){
				return setTimeout(() => {
					this.uploadChunk(uuid, queryParams, data, (tries + 1), maxTries, callback)
				}, 1000)
			}
			else{
				if(typeof res !== "object"){
					return setTimeout(() => {
						this.uploadChunk(uuid, queryParams, data, (tries + 1), maxTries, callback)
					}, 1000)
				}
				else{
					if(!res.status){
						return callback(res.message)
					}
					else{
						return callback(null, res)
					}
				}
			}
		}).catch((err) => {
			console.log(err)

			window.customVariables.uploadChunkSemaphore.release()

			return setTimeout(() => {
				this.uploadChunk(uuid, queryParams, data, (tries + 1), maxTries, callback)
			}, 1000)
		})
	}).catch((err) => {
		console.log(err)

		window.customVariables.uploadChunkSemaphore.release()

		return setTimeout(() => {
			this.uploadChunk(uuid, queryParams, data, (tries + 1), maxTries, callback)
		}, 1000)
	})
}

export async function queueFileUpload(file){
    if(file.size <= 0){
        return this.spawnToast(language.get(this.state.lang, "uploadInvalidFileSize", true, ["__NAME__"], [file.name]))
	}

	let parent = utils.currentParentFolder()
	
	if(file.name.indexOf(".") !== -1){
		let fileNameEx = file.name.split(".")
		let lowerCaseFileEnding = fileNameEx[fileNameEx.length - 1].toLowerCase()
		
		fileNameEx.pop()
		
		let fileNameWithLowerCaseEnding = fileNameEx.join(".") + "." + lowerCaseFileEnding

		Object.defineProperty(file, "name", { writable: true, value: utils.removeIllegalCharsFromString(fileNameWithLowerCaseEnding) })
	}

	if(utils.nameRegex(file.name)){
		return this.spawnToast(language.get(this.state.lang, "fileUploadInvalidFileName", true, ["__NAME__"], [file.name]))
	}

	this.fileExists(file.name, parent, async (err, exists, existsUUID) => {
		if(err){
			return this.spawnToast(language.get(this.state.lang, "apiRequestError"))
		}

		if(exists){
			return this.spawnToast(language.get(this.state.lang, "fileUploadFileAlreadyExists", true, ["__NAME__"], [file.name]))
		}

		let name = file.name
		let mime = file.type
		let size = file.size
		let uuid = utils.uuidv4()
		let key = utils.generateRandomString(32)
		let rm = utils.generateRandomString(32)
		let uploadKey = utils.generateRandomString(32)
		let expire = "never"
		let chunkSizeToUse = ((1024 * 1024) * 1)
		let dummyOffset = 0
		let fileChunks = 0

		while(dummyOffset < file.size){
			fileChunks++
			dummyOffset += chunkSizeToUse
		}

		let offset = (0 - chunkSizeToUse)
		let currentIndex = -1

		let nameEnc = utils.cryptoJSEncrypt(name, key)
		let nameH = utils.hashFn(name.toLowerCase())
		let mimeEnc = utils.cryptoJSEncrypt(mime, key)
		let sizeEnc = utils.cryptoJSEncrypt(size.toString(), key)
		
		let metaData = utils.cryptoJSEncrypt(JSON.stringify({
			name,
			size,
			mime,
			key
		}), this.state.userMasterKeys[this.state.userMasterKeys.length - 1])

		let firstDone = false
		let doFirst = true
		let markedAsDone = false

		const addToState = () => {
			let currentUploads = this.state.uploads

			currentUploads[uuid] = {
				uuid,
				size,
				chunks: fileChunks,
				loaded: 0,
				progress: 0,
				name: name 
			}

			window.customVariables.uploads[uuid] = {
				uuid,
				size,
				chunks: fileChunks,
				loaded: 0,
				progress: 0,
				name: name 
			}

			return this.setState({
				uploads: currentUploads,
				uploadsCount: (this.state.uploadsCount + 1)
			})
		}

		const removeFromState = () => {
			let currentUploads = this.state.uploads

			delete currentUploads[uuid]
			delete window.customVariables.uploads[uuid]

			return this.setState({
				uploads: currentUploads,
				uploadsCount: (this.state.uploadsCount - 1)
			})
		}

		const setProgress = (progress) => {
			try{
				let currentUploads = this.state.uploads

				currentUploads[uuid].progress = progress
				window.customVariables.uploads[uuid].progress = progress

				return this.setState({
					uploads: currentUploads
				}, () => {
					this.forceUpdate()
				})
			}
			catch(e){
				return console.log(e)
			}
		}

		const setLoaded = (moreLoaded) => {
			try{
				let currentUploads = this.state.uploads

				currentUploads[uuid].loaded += moreLoaded
				window.customVariables.uploads[uuid].loaded += moreLoaded

				return this.setState({
					uploads: currentUploads
				})
			}
			catch(e){
				return console.log(e)
			}
		}

		addToState()

		this.spawnToast(language.get(this.state.lang, "fileUploadStarted", true, ["__NAME__"], [file.name]))

		await window.customVariables.uploadSemaphore.acquire()

		let uploadInterval = setInterval(() => {
			if(offset < file.size){
				if(firstDone){
					doFirst = true
				}

				if(doFirst){
					if(!firstDone){
						doFirst = false
					}

					offset += chunkSizeToUse
					currentIndex += 1

					let thisIndex = currentIndex
					let chunk = file.slice(offset, (offset + chunkSizeToUse))

					let fileReader = new FileReader()

					fileReader.onload = async () => {
						let arrayBuffer = fileReader.result

						workers.encryptData(uuid, thisIndex, key, arrayBuffer, (encrypted) => {
							let blob = encrypted

							arrayBuffer = null

							let queryParams = new URLSearchParams({
								apiKey: this.state.userAPIKey,
								uuid: uuid,
								name: nameEnc,
								nameHashed: nameH,
								size: sizeEnc,
								chunks: fileChunks,
								mime: mimeEnc,
								index: thisIndex,
								rm: rm,
								expire: expire,
								uploadKey: uploadKey,
								metaData: metaData,
								parent: parent
							}).toString()

							this.uploadChunk(uuid, queryParams, blob, 0, 10, (err, res) => {
								if(err){
									console.log(err)

									window.customVariables.uploadSemaphore.release()

									removeFromState()

									return this.spawnToast(language.get(this.state.lang, "fileUploadFailed", true, ["__NAME__"], [file.name]))
								}

								if(typeof window.customVariables.uploads[uuid] !== "undefined"){
									setLoaded(blob.length)

									try{
										let progress = ((window.customVariables.uploads[uuid].loaded / window.customVariables.uploads[uuid].size) * 100).toFixed(2)

										if(progress >= 100){
											progress = 100
										}

										setProgress(progress)
									}
									catch(e){
										console.log(e)
									}
								}

								blob = null
								firstDone = true

								if(thisIndex >= fileChunks){
									clearInterval(uploadInterval)

									if(!markedAsDone){
										markedAsDone = true

										this.markUploadAsDone(uuid, uploadKey, 0, 10, (err) => {
											if(err){
												console.log(err)

												window.customVariables.uploadSemaphore.release()

												removeFromState()

												return this.spawnToast(language.get(this.state.lang, "fileUploadFailed", true, ["__NAME__"], [file.name]))
											}

											if(utils.currentParentFolder() == parent){
												clearInterval(window.customVariables.reloadContentAfterUploadTimeout)

												window.customVariables.reloadContentAfterUploadTimeout = setTimeout(() => {
													if(utils.currentParentFolder() == parent){
														this.updateItemList()
													}
												}, 500)
											}

											this.spawnToast(language.get(this.state.lang, "fileUploadDone", true, ["__NAME__"], [file.name]))

											utils.checkIfItemParentIsBeingShared(parent, "file", {
												uuid,
												name,
												size: parseInt(size),
												mime,
												key
											})

											window.customVariables.uploadSemaphore.release()

											return removeFromState()
										})
									}
								}
							})
						})
					}

					fileReader.onerror = (err) => {
						window.customVariables.uploadSemaphore.release()

						console.log(err)

						removeFromState()

						return this.spawnToast(language.get(this.state.lang, "fileUploadCouldNotReadFile", true, ["__NAME__"], [file.name]))
					}

					fileReader.readAsArrayBuffer(chunk)
				}
			}
		}, 100)
	})
}