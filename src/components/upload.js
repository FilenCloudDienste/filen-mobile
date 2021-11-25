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

export async function uploadChunk(uuid, file, queryParams, data, tries, maxTries, callback){
	await window.customVariables.uploadChunkSemaphore.acquire()

	if(typeof window.customVariables.stoppedUploads[uuid] !== "undefined"){
        return callback("stopped")
    }

	fetch(utils.getUploadServer() + "/v1/upload?" + queryParams, {
		method: "POST",
		cache: "no-cache",
		body: data
	}).then((response) => {
		response.json().then((obj) => {
			let res = obj

			window.customVariables.uploadChunkSemaphore.release()

			if(typeof window.customVariables.stoppedUploads[uuid] !== "undefined"){
				return callback("stopped")
			}

			if(!res){
				return setTimeout(() => {
					this.uploadChunk(uuid, file, queryParams, data, (tries + 1), maxTries, callback)
				}, 1000)
			}
			else{
				if(typeof res !== "object"){
					return setTimeout(() => {
						this.uploadChunk(uuid, file, queryParams, data, (tries + 1), maxTries, callback)
					}, 1000)
				}
				else{
					if(!res.status){
						if(res.message.toLowerCase().indexOf("blacklisted") !== -1){
							return callback("blacklisted")
						}

						return callback(res.message)
					}
					else{
						return callback(null, res, utils.parseQuery(queryParams))
					}
				}
			}
		}).catch((err) => {
			console.log(err)

			window.customVariables.uploadChunkSemaphore.release()

			return setTimeout(() => {
				this.uploadChunk(uuid, file, queryParams, data, (tries + 1), maxTries, callback)
			}, 1000)
		})
	}).catch((err) => {
		console.log(err)

		window.customVariables.uploadChunkSemaphore.release()

		return setTimeout(() => {
			this.uploadChunk(uuid, file, queryParams, data, (tries + 1), maxTries, callback)
		}, 1000)
	})
}

export async function queueFileUpload(file, passedUpdateUUID = undefined, cameraUploadCallback = undefined){
	//this.spawnToast(language.get(this.state.lang, "fileUploadStarted", true, ["__NAME__"], [file.name]))

	const deleteTempFile = () => {
		if(typeof file.tempFileEntry == "undefined"){
			return false
		}

		if(typeof file.tempFileEntry.remove == "undefined"){
			return false
		}

		file.tempFileEntry.remove(() => {
			console.log(file.name + " temp file removed")
		}, (err) => {
			console.log(err)
		})
	}

	if(typeof this.state.userMasterKeys[this.state.userMasterKeys.length - 1] !== "string"){
		deleteTempFile()

		if(typeof cameraUploadCallback == "function"){
			return cameraUploadCallback("failed")
		}
		else{
			return this.spawnToast(language.get(this.state.lang, "fileUploadFailed", true, ["__NAME__"], [file.name]))
		}
	}

	if(typeof this.state.userMasterKeys[this.state.userMasterKeys.length - 1].length <= 16){
		deleteTempFile()

		if(typeof cameraUploadCallback == "function"){
			return cameraUploadCallback("failed")
		}
		else{
			return this.spawnToast(language.get(this.state.lang, "fileUploadFailed", true, ["__NAME__"], [file.name]))
		}
	}

    if(file.size <= 0){
		deleteTempFile()

        if(typeof cameraUploadCallback == "function"){
			return cameraUploadCallback("invalid size")
		}
		else{
			return this.spawnToast(language.get(this.state.lang, "uploadInvalidFileSize", true, ["__NAME__"], [file.name]))
		}
	}

	let parent = utils.currentParentFolder()

	if(typeof file.editorParent !== "undefined"){
		parent = file.editorParent
	}
	
	if(parent == "base" || parent == "default"){
		deleteTempFile()

		if(typeof cameraUploadCallback == "function"){
			return cameraUploadCallback("invalid parent")
		}
		else{
			return false
		}
	}
	
	if(file.name.indexOf(".") !== -1){
		let fileNameEx = file.name.split(".")
		let lowerCaseFileEnding = fileNameEx[fileNameEx.length - 1].toLowerCase()
		
		fileNameEx.pop()
		
		let fileNameWithLowerCaseEnding = fileNameEx.join(".") + "." + lowerCaseFileEnding

		Object.defineProperty(file, "name", { writable: true, value: utils.escapeHTML(fileNameWithLowerCaseEnding) })
	}

	//if(utils.nameRegex(file.name) || utils.checkIfNameIsBanned(file.name) || utils.fileNameValidationRegex(file.name)){
	//	return this.spawnToast(language.get(this.state.lang, "fileUploadInvalidFileName", true, ["__NAME__"], [file.name]))
	//}

	this.fileExists(file.name, parent, async (err, exists, existsUUID) => {
		if(err){
			deleteTempFile()

			if(typeof cameraUploadCallback == "function"){
				return cameraUploadCallback("api error")
			}
			else{
				return this.spawnToast(language.get(this.state.lang, "apiRequestError"))
			}
		}

		if(exists){
			//return this.spawnToast(language.get(this.state.lang, "fileUploadFileAlreadyExists", true, ["__NAME__"], [file.name]))
		
			if(typeof cameraUploadCallback !== "function"){
				this.spawnToast(language.get(this.state.lang, "updatingFile", true, ["__NAME__"], [file.name]))
			}

			return setTimeout(async () => {
				let updateUUID = utils.uuidv4()

				try{
					var res = await utils.apiRequest("POST", "/v1/file/archive", {
						apiKey: this.state.userAPIKey,
						uuid: existsUUID,
						updateUUID: updateUUID
					})
				}
				catch(e){
					deleteTempFile()

					if(typeof cameraUploadCallback == "function"){
						return cameraUploadCallback("api error")
					}
					else{
						return this.spawnToast(language.get(this.state.lang, "apiRequestError"))
					}
				}
			
				if(!res.status){
					deleteTempFile()

					if(typeof cameraUploadCallback == "function"){
						return cameraUploadCallback(res.message)
					}
					else{
						return this.spawnToast(res.message)
					}
				}

				return this.queueFileUpload(file, updateUUID, cameraUploadCallback)
			})
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

		if(typeof passedUpdateUUID !== "undefined"){
			uuid = passedUpdateUUID
		}

		while(dummyOffset < file.size){
			fileChunks++
			dummyOffset += chunkSizeToUse
		}

		let offset = (0 - chunkSizeToUse)
		let currentIndex = -1

		let nameEnc = await utils.encryptMetadata(name, key)
		let nameH = utils.hashFn(name.toLowerCase())
		let mimeEnc = await utils.encryptMetadata(mime, key)
		let sizeEnc = await utils.encryptMetadata(size.toString(), key)
		
		let metaData = await utils.encryptMetadata(JSON.stringify({
			name,
			size,
			mime,
			key,
			lastModified: Math.floor(file.lastModified / 1000) || Math.floor((+new Date()) / 1000)
		}), this.state.userMasterKeys[this.state.userMasterKeys.length - 1])

		let firstDone = false
		let doFirst = true
		let markedAsDone = false
		let chunksUploaded = 0
		let uploadVersion = this.state.currentFileVersion

		delete window.customVariables.stoppedUploads[uuid]
    	delete window.customVariables.stoppedUploadsDone[uuid]

		let isAddedToState = false
		let isRemovedFromState = false

		const addToState = () => {
			if(isAddedToState){
				return false
			}

			isAddedToState = true

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
			}, () => {
				this.forceUpdate()
			})
		}

		const removeFromState = () => {
			if(isRemovedFromState){
				return false
			}

			isRemovedFromState = true

			try{
				let currentUploads = this.state.uploads

				delete currentUploads[uuid]
				delete window.customVariables.uploads[uuid]

				return this.setState({
					uploads: currentUploads,
					uploadsCount: (this.state.uploadsCount - 1)
				}, () => {
					this.forceUpdate()
				})
			}
			catch(e){
				console.log(e)
			}
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
				}, () => {
					this.forceUpdate()
				})
			}
			catch(e){
				return console.log(e)
			}
		}

		addToState()
		
		await window.customVariables.uploadSemaphore.acquire()

		let uploadInterval = setInterval(async () => {
			if(typeof file == "undefined"){
				clearInterval(uploadInterval)

				window.customVariables.uploadSemaphore.release()
				window.customVariables.currentUploadThreads -= 1
		
				removeFromState()
				deleteTempFile()

				if(typeof window.customVariables.stoppedUploadsDone[uuid] == "undefined"){
					window.customVariables.stoppedUploadsDone[uuid] = true

					if(typeof cameraUploadCallback == "function"){
						return cameraUploadCallback("stopped")
					}
					else{
						return this.spawnToast(language.get(this.state.lang, "uploadStopped", true, ["__NAME__"], [name]))
					}
				}
				else{
					if(typeof cameraUploadCallback == "function"){
						return cameraUploadCallback("stopped")
					}
					else{
						return false
					}
				}
			}
			else{
				if(typeof window.customVariables.stoppedUploads[uuid] !== "undefined"){
					clearInterval(uploadInterval)

					window.customVariables.uploadSemaphore.release()
					window.customVariables.currentUploadThreads -= 1
		
					removeFromState()
					deleteTempFile()
				
					if(typeof window.customVariables.stoppedUploadsDone[uuid] == "undefined"){
						window.customVariables.stoppedUploadsDone[uuid] = true

						if(typeof cameraUploadCallback == "function"){
							return cameraUploadCallback("stopped")
						}
						else{
							return this.spawnToast(language.get(this.state.lang, "uploadStopped", true, ["__NAME__"], [name]))
						}
					}
					else{
						if(typeof cameraUploadCallback == "function"){
							return cameraUploadCallback("stopped")
						}
						else{
							return false
						}
					}
				}
				else{
					if(offset < file.size){
						if(firstDone){
							doFirst = true
						}
		
						if(doFirst){
							if(!firstDone){
								doFirst = false
							}
		
							if(window.customVariables.currentUploadThreads < window.customVariables.maxUploadThreads){
								window.customVariables.currentUploadThreads += 1
		
								offset += chunkSizeToUse
								currentIndex += 1
		
								let thisIndex = currentIndex
		
								let chunk = file.fileEntry.slice(offset, (offset + chunkSizeToUse))
		
								let fileReader = new FileReader()
		
								fileReader.onload = async () => {
									let arrayBuffer = fileReader.result
		
									chunk = undefined
		
									workers.encryptData(uuid, thisIndex, key, arrayBuffer, this.state.currentFileVersion, (encrypted) => {
										let blob = encrypted
		
										arrayBuffer = undefined
		
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
											parent: parent,
											version: uploadVersion
										}).toString()
		
										this.uploadChunk(uuid, file, queryParams, blob, 0, 1000000, (err, res, parsedQueryParams) => {
											if(err){
												console.log(err)
		
												window.customVariables.uploadSemaphore.release()
												window.customVariables.currentUploadThreads -= 1
		
												removeFromState()
												deleteTempFile()
		
												if(err == "stopped"){
													if(typeof window.customVariables.stoppedUploadsDone[uuid] == "undefined"){
														window.customVariables.stoppedUploadsDone[uuid] = true
		
														if(typeof cameraUploadCallback == "function"){
															return cameraUploadCallback("stopped")
														}
														else{
															return this.spawnToast(language.get(this.state.lang, "uploadStopped", true, ["__NAME__"], [name]))
														}
													}
													else{
														if(typeof cameraUploadCallback == "function"){
															return cameraUploadCallback("stopped")
														}
														else{
															return false
														}
													}
												}
												else if(err == "blacklisted"){
													window.customVariables.stoppedUploads[uuid] = true
	
													if(typeof window.customVariables.stoppedUploadsDone[uuid] == "undefined"){
														window.customVariables.stoppedUploadsDone[uuid] = true
													}
													
													if(typeof cameraUploadCallback == "function"){
														return cameraUploadCallback("quota exceeded")
													}
													else{
														return this.spawnToast(language.get(this.state.lang, "uploadStorageExceeded", true, ["__NAME__"], [name]))
													}
												}
												else{
													if(typeof cameraUploadCallback == "function"){
														return cameraUploadCallback("failed")
													}
													else{
														return this.spawnToast(language.get(this.state.lang, "fileUploadFailed", true, ["__NAME__"], [name]))
													}
												}
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
		
											window.customVariables.currentUploadThreads -= 1
											firstDone = true
											blob = undefined
											chunksUploaded += 1
		
											if((chunksUploaded - 1) >= fileChunks){
												clearInterval(uploadInterval)
		
												window.customVariables.uploadSemaphore.release()
		
												if(!markedAsDone){
													markedAsDone = true
		
													this.markUploadAsDone(uuid, uploadKey, 0, 1000000, (err) => {
														if(err){
															console.log(err)
		
															removeFromState()
															deleteTempFile()
		
															if(typeof cameraUploadCallback == "function"){
																return cameraUploadCallback("failed")
															}
															else{
																return this.spawnToast(language.get(this.state.lang, "fileUploadFailed", true, ["__NAME__"], [name]))
															}
														}
		
														utils.checkIfItemParentIsBeingShared(parent, "file", {
															uuid,
															name,
															size: parseInt(size),
															mime,
															key
														}, () => {
															if(utils.currentParentFolder() == parent || utils.currentParentFolder() == "recent"){
																if(this.state.settings.cameraUpload.parent !== utils.currentParentFolder()){
																	clearInterval(window.customVariables.reloadContentAfterUploadTimeout)
				
																	window.customVariables.reloadContentAfterUploadTimeout = setTimeout(() => {
																		if(utils.currentParentFolder() == parent || utils.currentParentFolder() == "recent"){
																			this.updateItemList(false)
																		}
																	}, 500)
																}
															}
				
															if(typeof cameraUploadCallback == "function"){
																cameraUploadCallback(null)
															}
															else{
																this.spawnToast(language.get(this.state.lang, "fileUploadDone", true, ["__NAME__"], [name]))
															}
		
															deleteTempFile()

															return removeFromState()
														})
													})
												}
											}
										})
									})
								}
		
								fileReader.onerror = (err) => {
									window.customVariables.uploadSemaphore.release()
									window.customVariables.currentUploadThreads -= 1
		
									console.log(err)
		
									removeFromState()
									deleteTempFile()
		
									window.customVariables.stoppedUploads[uuid] = true
		
									if(typeof cameraUploadCallback == "function"){
										return cameraUploadCallback("could not read")
									}
									else{
										return this.spawnToast(language.get(this.state.lang, "fileUploadCouldNotReadFile", true, ["__NAME__"], [file.name]))
									}
								}
		
								fileReader.readAsArrayBuffer(chunk)
							}
						}
					}
					else{
						clearInterval(uploadInterval)
					}
				}
			}
		}, 10)
	})
}