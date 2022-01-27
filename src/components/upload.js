import * as language from "../utils/language"
import * as workers from "../utils/workers"
import { Capacitor } from "@capacitor/core"
import { compressThumbnailImg, writeThumbnail } from "./download"
import { spawnToast } from "./spawn"
import { updateItemList } from "./items"

const utils = require("../utils/utils")

let uploads = {}
let currentUploadThreads = 0
let maxUploadThreads = 10

export async function fileExists(self, name, parent, callback){
	if(parent == null){
		parent = "default"
	}

	try{
		var res = await utils.apiRequest("POST", "/v1/file/exists", {
			apiKey: self.state.userAPIKey,
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
			markUploadAsDone(uuid, uploadKey, (tries + 1), maxTries, callback)
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
		uuid = null
		file = null
		queryParams = null
		data = null
		tries = null
		maxTries = null

        return callback("stopped")
    }

	return utils.fetchWithTimeout(7200000, fetch(utils.getUploadServer() + "/v1/upload?" + queryParams, {
		method: "POST",
		body: data
	})).then((response) => {
		if(response.status !== 200){
			window.customVariables.uploadChunkSemaphore.release()

			return setTimeout(() => {
				uploadChunk(uuid, file, queryParams, data, (tries + 1), maxTries, callback)
			}, 1000)
		}

		return response.json().then((obj) => {
			let res = obj

			window.customVariables.uploadChunkSemaphore.release()

			if(typeof window.customVariables.stoppedUploads[uuid] !== "undefined"){
				uuid = null
				file = null
				queryParams = null
				data = null
				tries = null
				maxTries = null

				return callback("stopped")
			}

			if(!res){
				return setTimeout(() => {
					uploadChunk(uuid, file, queryParams, data, (tries + 1), maxTries, callback)
				}, 1000)
			}
			else{
				if(typeof res !== "object"){
					return setTimeout(() => {
						uploadChunk(uuid, file, queryParams, data, (tries + 1), maxTries, callback)
					}, 1000)
				}
				else{
					if(!res.status){
						if(res.message.toLowerCase().indexOf("blacklisted") !== -1){
							uuid = null
							file = null
							queryParams = null
							data = null
							tries = null
							maxTries = null
							res = null

							return callback("blacklisted")
						}

						callback(res.message)

						uuid = null
						file = null
						queryParams = null
						data = null
						tries = null
						maxTries = null
						res = null
						callback = null

						return true
					}
					else{
						callback(null, res, utils.parseQuery(queryParams))

						uuid = null
						file = null
						queryParams = null
						data = null
						tries = null
						maxTries = null
						res = null
						callback = null

						return true
					}
				}
			}
		}).catch((err) => {
			console.log(err)

			window.customVariables.uploadChunkSemaphore.release()

			return setTimeout(() => {
				uploadChunk(uuid, file, queryParams, data, (tries + 1), maxTries, callback)
			}, 1000)
		})
	}).catch((err) => {
		console.log(err)

		window.customVariables.uploadChunkSemaphore.release()

		return setTimeout(() => {
			uploadChunk(uuid, file, queryParams, data, (tries + 1), maxTries, callback)
		}, 1000)
	})
}

export async function queueFileUpload(self, file, passedUpdateUUID = undefined, cameraUploadCallback = undefined){
	//spawnToast(language.get(self.state.lang, "fileUploadStarted", true, ["__NAME__"], [file.name]))

	if(Capacitor.isNative){
		if(self.state.settings.onlyWifiUploads){
			let networkStatus = self.state.networkStatus

			if(networkStatus.connectionType !== "wifi"){
				return spawnToast(language.get(self.state.lang, "onlyWifiError"))
			}
		}
	}

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

	if(typeof self.state.userMasterKeys[self.state.userMasterKeys.length - 1] !== "string"){
		deleteTempFile()

		if(typeof cameraUploadCallback == "function"){
			return cameraUploadCallback("failed")
		}
		else{
			return spawnToast(language.get(self.state.lang, "fileUploadFailed", true, ["__NAME__"], [file.name]))
		}
	}

	if(typeof self.state.userMasterKeys[self.state.userMasterKeys.length - 1].length <= 16){
		deleteTempFile()

		if(typeof cameraUploadCallback == "function"){
			return cameraUploadCallback("failed")
		}
		else{
			return spawnToast(language.get(self.state.lang, "fileUploadFailed", true, ["__NAME__"], [file.name]))
		}
	}

    if(file.size <= 0){
		deleteTempFile()

        if(typeof cameraUploadCallback == "function"){
			return cameraUploadCallback("invalid size")
		}
		else{
			return spawnToast(language.get(self.state.lang, "uploadInvalidFileSize", true, ["__NAME__"], [file.name]))
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
	//	return spawnToast(language.get(self.state.lang, "fileUploadInvalidFileName", true, ["__NAME__"], [file.name]))
	//}

	fileExists(self, file.name, parent, async (err, exists, existsUUID) => {
		if(err){
			deleteTempFile()

			if(typeof cameraUploadCallback == "function"){
				return cameraUploadCallback("api error")
			}
			else{
				return self.spawnToast(language.get(self.state.lang, "apiRequestError"))
			}
		}

		if(exists){
			//return spawnToast(language.get(self.state.lang, "fileUploadFileAlreadyExists", true, ["__NAME__"], [file.name]))
		
			if(typeof cameraUploadCallback !== "function"){
				spawnToast(language.get(self.state.lang, "updatingFile", true, ["__NAME__"], [file.name]))
			}

			return setTimeout(async () => {
				let updateUUID = utils.uuidv4()

				try{
					var res = await utils.apiRequest("POST", "/v1/file/archive", {
						apiKey: self.state.userAPIKey,
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
						return spawnToast(language.get(self.state.lang, "apiRequestError"))
					}
				}
			
				if(!res.status){
					deleteTempFile()

					if(typeof cameraUploadCallback == "function"){
						return cameraUploadCallback(res.message)
					}
					else{
						return spawnToast(res.message)
					}
				}

				return queueFileUpload(self, file, updateUUID, cameraUploadCallback)
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
		let fileLastModified = Math.floor(file.lastModified / 1000) || Math.floor((+new Date()) / 1000)
		
		let metaData = await utils.encryptMetadata(JSON.stringify({
			name,
			size,
			mime,
			key,
			lastModified: fileLastModified
		}), self.state.userMasterKeys[self.state.userMasterKeys.length - 1])

		let firstDone = false
		let doFirst = true
		let markedAsDone = false
		let chunksUploaded = 0
		let uploadVersion = self.state.currentFileVersion

		delete window.customVariables.stoppedUploads[uuid]
    	delete window.customVariables.stoppedUploadsDone[uuid]

		let isAddedToState = false
		let isRemovedFromState = false

		const addToState = () => {
			if(isAddedToState){
				return false
			}

			isAddedToState = true

			let currentUploads = self.state.uploads

			currentUploads[uuid] = {
				uuid,
				size,
				chunks: fileChunks,
				loaded: 0,
				progress: 0,
				name: name 
			}

			uploads[uuid] = {
				uuid,
				size,
				chunks: fileChunks,
				loaded: 0,
				progress: 0,
				name: name 
			}

			return self.setState({
				uploads: currentUploads,
				uploadsCount: (self.state.uploadsCount + 1)
			}, () => {
				self.forceUpdate()
			})
		}

		const removeFromState = () => {
			if(isRemovedFromState){
				return false
			}

			isRemovedFromState = true

			try{
				let currentUploads = self.state.uploads

				delete currentUploads[uuid]
				delete uploads[uuid]

				self.setState({
					uploads: currentUploads,
					uploadsCount: (self.state.uploadsCount - 1)
				}, () => {
					self.forceUpdate()
				})
			}
			catch(e){
				console.log(e)
			}

			nameEnc = null
			nameH = null
			mimeEnc = null
			sizeEnc = null
			metaData = null

			return true
		}

		const setProgress = (progress) => {
			try{
				uploads[uuid].progress = progress

				window.$("#uploads-progress-" + uuid).html(uploads[uuid].progress >= 100 ? language.get(self.state.lang, "transfersFinishing") : uploads[uuid].progress == 0 ? language.get(self.state.lang, "transfersQueued") : uploads[uuid].progress + "%")

				return true
			}
			catch(e){
				return console.log(e)
			}
		}

		const setLoaded = (moreLoaded) => {
			try{
				uploads[uuid].loaded += moreLoaded

				return true
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
				currentUploadThreads -= 1
		
				removeFromState()
				deleteTempFile()

				if(typeof window.customVariables.stoppedUploadsDone[uuid] == "undefined"){
					window.customVariables.stoppedUploadsDone[uuid] = true

					if(typeof cameraUploadCallback == "function"){
						return cameraUploadCallback("stopped")
					}
					else{
						return spawnToast(language.get(self.state.lang, "uploadStopped", true, ["__NAME__"], [name]))
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
					currentUploadThreads -= 1
		
					removeFromState()
					deleteTempFile()
				
					if(typeof window.customVariables.stoppedUploadsDone[uuid] == "undefined"){
						window.customVariables.stoppedUploadsDone[uuid] = true

						if(typeof cameraUploadCallback == "function"){
							return cameraUploadCallback("stopped")
						}
						else{
							return spawnToast(language.get(self.state.lang, "uploadStopped", true, ["__NAME__"], [name]))
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
		
							if(currentUploadThreads < maxUploadThreads){
								currentUploadThreads += 1
		
								offset += chunkSizeToUse
								currentIndex += 1
		
								let thisIndex = currentIndex
		
								let chunk = file.fileEntry.slice(offset, (offset + chunkSizeToUse))

								let fileReader = new FileReader()

								fileReader.onload = () => {
									let arrayBuffer = fileReader.result

									fileReader = null
		
									chunk = null
		
									return workers.encryptData(uuid, thisIndex, key, arrayBuffer, self.state.currentFileVersion, (err, encrypted) => {
										if(err){
											console.log(err)
		
											window.customVariables.uploadSemaphore.release()
											currentUploadThreads -= 1
	
											removeFromState()
											deleteTempFile()

											encrypted = null
											arrayBuffer = null

											if(typeof cameraUploadCallback == "function"){
												return cameraUploadCallback("failed")
											}
											else{
												return spawnToast(language.get(self.state.lang, "fileUploadFailed", true, ["__NAME__"], [name]))
											}
										}

										let blob = encrypted
		
										arrayBuffer = null
		
										let queryParams = new URLSearchParams({
											apiKey: self.state.userAPIKey,
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
		
										return uploadChunk(uuid, file, queryParams, blob, 0, 1000000, async (err, res, parsedQueryParams) => {
											res = null
											parsedQueryParams = null

											if(err){
												console.log(err)
		
												window.customVariables.uploadSemaphore.release()
												currentUploadThreads -= 1
		
												removeFromState()
												deleteTempFile()
		
												if(err == "stopped"){
													if(typeof window.customVariables.stoppedUploadsDone[uuid] == "undefined"){
														window.customVariables.stoppedUploadsDone[uuid] = true
		
														if(typeof cameraUploadCallback == "function"){
															return cameraUploadCallback("stopped")
														}
														else{
															return spawnToast(language.get(self.state.lang, "uploadStopped", true, ["__NAME__"], [name]))
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
														return spawnToast(language.get(self.state.lang, "uploadStorageExceeded", true, ["__NAME__"], [name]))
													}
												}
												else{
													if(typeof cameraUploadCallback == "function"){
														try{
															return cameraUploadCallback("failed - " + err.toString())
														}
														catch(e){
															return cameraUploadCallback(err)
														}
													}
													else{
														return spawnToast(language.get(self.state.lang, "fileUploadFailed", true, ["__NAME__"], [name]))
													}
												}
											}
		
											if(typeof uploads[uuid] !== "undefined"){
												setLoaded(blob.length)
		
												try{
													let progress = ((uploads[uuid].loaded / uploads[uuid].size) * 100).toFixed(2)
		
													if(progress >= 100){
														progress = 100
													}
		
													setProgress(progress)
												}
												catch(e){
													console.log(e)
												}
											}
		
											currentUploadThreads -= 1
											firstDone = true
											blob = null
											chunksUploaded += 1
		
											if((chunksUploaded - 1) >= fileChunks){
												clearInterval(uploadInterval)
		
												if(!markedAsDone){
													markedAsDone = true

													window.customVariables.uploadSemaphore.release()

													let ext = name.toLowerCase().split(".")
													ext = ext[ext.length - 1]

													if(utils.canShowThumbnail(ext) && !["mp4", "webm", "mov", "avi", "wmv"].includes(ext)){
														try{
															await new Promise((resolve, reject) => {
																let fr = new FileReader()

																fr.onload = () => {
																	workers.newBlob(fr.result, {
																		type: "image/png"
																	}).then((blob) => {
																		fr = null

																		return compressThumbnailImg(blob).then((compressed) => {
																			blob = null

																			return writeThumbnail({
																				uuid
																			}, compressed).then((thumbURL) => {
																				thumbURL = null
																				compressed = null
		
																				window.customFunctions.saveThumbnailCache()
		
																				return resolve(true)
																			})
																		}).catch((err) => {
																			blob = null

																			return reject(err)
																		})
																	}).catch((err) => {
																		fr = null

																		return reject(err)
																	})

																	fr = null

																	return true
																}

																fr.onerror = (err) => {
																	fr = null

																	return reject(err)
																}

																return fr.readAsArrayBuffer(file.fileEntry)
															})
														}
														catch(e){
															console.log("ya", e)
														}
													}
		
													return markUploadAsDone(uuid, uploadKey, 0, 1000000, (err) => {
														if(err){
															console.log(err)
		
															removeFromState()
															deleteTempFile()
		
															if(typeof cameraUploadCallback == "function"){
																return cameraUploadCallback("failed")
															}
															else{
																return spawnToast(language.get(self.state.lang, "fileUploadFailed", true, ["__NAME__"], [name]))
															}
														}
		
														return utils.checkIfItemParentIsBeingShared(parent, "file", {
															uuid,
															name,
															size: parseInt(size),
															mime,
															key,
															lastModified: fileLastModified
														}, () => {
															if(utils.currentParentFolder() == parent || utils.currentParentFolder() == "recent"){
																clearInterval(window.customVariables.reloadContentAfterUploadTimeout)
				
																window.customVariables.reloadContentAfterUploadTimeout = setTimeout(() => {
																	if(utils.currentParentFolder() == parent || utils.currentParentFolder() == "recent"){
																		updateItemList(self, false)
																	}
																}, 1000)
															}
				
															if(typeof cameraUploadCallback == "function"){
																cameraUploadCallback(null)
															}
															else{
																spawnToast(language.get(self.state.lang, "fileUploadDone", true, ["__NAME__"], [name]))
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
									fileReader = null

									window.customVariables.uploadSemaphore.release()
									window.customVariables.currentUploadThreads -= 1
		
									console.log(err)
		
									removeFromState()
									deleteTempFile()
		
									window.customVariables.stoppedUploads[uuid] = true

									err = null
									chunk = null
		
									if(typeof cameraUploadCallback == "function"){
										return cameraUploadCallback("could not read")
									}
									else{
										return spawnToast(language.get(self.state.lang, "fileUploadCouldNotReadFile", true, ["__NAME__"], [file.name]))
									}
								}

								return fileReader.readAsArrayBuffer(chunk)
							}
						}
					}
					else{
						return clearInterval(uploadInterval)
					}
				}
			}
		}, 10)
	})
}