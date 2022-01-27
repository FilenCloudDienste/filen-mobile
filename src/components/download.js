import * as language from "../utils/language"
import * as workers from "../utils/workers"
import { Capacitor } from "@capacitor/core"
import Compressor from "../utils/compressor"
import writeBlob from "../utils/blobWriter"
import { spawnToast } from "./spawn"

const utils = require("../utils/utils")

let downloads = {}
let currentDownloadThreads = 0
let maxDownloadThreads = 20
let currentWriteThreads = 0
let maxWriteThreads = 128

export async function getDownloadDir(makeOffline, fileName, callback){
    if(Capacitor.platform == "ios"){
        return callback(null, {
            path: window.cordova.file.documentsDirectory + "Downloads",
            directory : window.cordova.file.documentsDirectory,
            uri: window.cordova.file.documentsDirectory + "Downloads"
        })
    }
    else{
        return callback(null, {
            path: window.cordova.file.dataDirectory + "Downloads",
            directory : window.cordova.file.dataDirectory,
            uri: window.cordova.file.dataDirectory + "Downloads"
        })
    }
}

export async function downloadFileChunk(file, index, tries, maxTries, callback, isPreview = false){
    if(tries >= maxTries){
		callback(new Error("Max download retries reached for " + file.uuid + ", returning."))

        file = null

        return false
	}

	if(index >= file.chunks){
		callback(null, index)

        file = null

        return false
    }

    if(typeof window.customVariables.stoppedDownloads[file.uuid] !== "undefined"){
        callback("stopped")

        file = null

        return false
    }

    if(!isPreview){
        await window.customVariables.downloadChunkSemaphore.acquire()
    }

    return utils.fetchWithTimeout(3600000, fetch(utils.getDownloadServer() + "/" + file.region + "/" + file.bucket + "/" + file.uuid + "/" + index, {
        method: "GET"
    })).then((response) => {
        if(response.status !== 200){
            if(!isPreview){
                window.customVariables.downloadChunkSemaphore.release()
            }

            response = null
    
            return setTimeout(() => {
                downloadFileChunk(file, index, (tries + 1), maxTries, callback)
            }, 1000)
        }

        return response.arrayBuffer().then((res) => {
            try{
                if(res.byteLength){
                    if(res.byteLength > 1){
                        return workers.decryptData(file.uuid, index, file.key, res, file.version).then((decrypted) => {
                            if(!isPreview){
                                window.customVariables.downloadChunkSemaphore.release()
                            }
    
                            if(typeof window.customVariables.stoppedDownloads[file.uuid] !== "undefined"){
                                callback("stopped")
    
                                res = null
                                decrypted = null
                                file = null
                                response = null
    
                                return false
                            }
    
                            callback(null, index, decrypted)
    
                            res = null
                            decrypted = null
                            file = null
                            response = null
    
                            return false
                        }).catch((err) => {
                            callback(err)
    
                            res = null
                            err = null
                            file = null
                            response = null
    
                            return false
                        })
                    }
                    else{
                        if(!isPreview){
                            window.customVariables.downloadChunkSemaphore.release()
                        }
    
                        res = null
                        response = null
    
                        return setTimeout(() => {
                            downloadFileChunk(file, index, (tries + 1), maxTries, callback)
                        }, 1000)
                    }
                }
                else{
                    if(!isPreview){
                        window.customVariables.downloadChunkSemaphore.release()
                    }
    
                    res = null
                    response = null
    
                    return setTimeout(() => {
                        downloadFileChunk(file, index, (tries + 1), maxTries, callback)
                    }, 1000)
                }
            }
            catch(e){
                console.log(e)
    
                if(!isPreview){
                    window.customVariables.downloadChunkSemaphore.release()
                }
    
                res = null
                response = null
    
                return setTimeout(() => {
                    downloadFileChunk(file, index, (tries + 1), maxTries, callback)
                }, 1000)
            }
        }).catch((err) => {
            console.log(err)

            response = null

            if(!isPreview){
                window.customVariables.downloadChunkSemaphore.release()
            }

            return setTimeout(() => {
                downloadFileChunk(file, index, (tries + 1), maxTries, callback)
            }, 1000)
        })
    }).catch((err) => {
        console.log(err)

        if(!isPreview){
            window.customVariables.downloadChunkSemaphore.release()
        }

        return setTimeout(() => {
            downloadFileChunk(file, index, (tries + 1), maxTries, callback)
        }, 1000)
    })
}

export async function writeChunkToFile(file, dirObj, uuid, index, data, callback){
    if(!downloads[uuid]){
        currentWriteThreads -= 1

        file = null
        dirObj = null
        uuid = null
        index = null
        data = null

        return false
    }

    if(downloads[uuid].nextWriteChunk !== index){
        return setTimeout(() => {
            writeChunkToFile(file, dirObj, uuid, index, data, callback)
        }, 10)
    }

    if(typeof window.customVariables.stoppedDownloads[uuid] !== "undefined"){
        currentWriteThreads -= 1

        file = null
        dirObj = null
        uuid = null
        index = null
        data = null

        return false
    }

    /*if(index == 0){
        try{
            await new Promise((resolve, reject) => {
                window.resolveLocalFileSystemURL(dirObj.path + "/" + file.name, (resolved) => {
                    resolved.remove(() => {
                        return resolve(true)
                    }, (err) => {
                        return reject(err)
                    })
                }, (err) => {
                    return reject(err)
                })
            })
        }
        catch(e){
            console.log(e)
        }
    }*/

    if(index == 0){
        try{
            let blob = await workers.newBlob(data)

            await writeBlob({
                blob: blob,
                path: dirObj.path + "/" + file.name,
                recursive: true,
                append: false
            })

            currentWriteThreads -= 1

            blob = null
            file = null
            dirObj = null
            uuid = null
            index = null
            data = null

            return callback(null)
        }
        catch(e){
            currentWriteThreads -= 1

            file = null
            dirObj = null
            uuid = null
            index = null
            data = null

            return callback(e)
        }
    }
    else{
        try{
            let blob = await workers.newBlob(data)

            await writeBlob({
                blob: blob,
                path: dirObj.path + "/" + file.name,
                recursive: false,
                append: true
            })

            currentWriteThreads -= 1

            blob = null
            file = null
            dirObj = null
            uuid = null
            index = null
            data = null

            return callback(null)
        }
        catch(e){
            currentWriteThreads -= 1

            file = null
            dirObj = null
            uuid = null
            index = null
            data = null

            return callback(e)
        }
    }
}

export async function queueFileDownload(self, file, isOfflineRequest = false, optionalCallback = undefined, calledByPreview = false, saveToGalleryCallback = undefined){
    const callOptionalCallback = (...args) => {
        if(typeof optionalCallback == "function"){
            optionalCallback(...args)
        }
    }

    const returnOfflineSavedPath = async (doDelete = true) => {
        try{
            let filePath = await new Promise((resolve, reject) => {
                window.resolveLocalFileSystemURL(window.cordova.file.dataDirectory + "/offlineFiles/" + file.uuid, (resolved) => {
                    return resolve(resolved.nativeURL)
                }, (err) => {
                    return reject(err)
                })
            })

            return saveToGalleryCallback(null, filePath, doDelete)
        }
        catch(e){
            console.log(e)

            return saveToGalleryCallback(e)
        }
    }

    if(Capacitor.isNative){
        if(self.state.settings.onlyWifi){
            let networkStatus = self.state.networkStatus

            if(networkStatus.connectionType !== "wifi"){
                callOptionalCallback(null)

                if(typeof saveToGalleryCallback == "function"){
                    saveToGalleryCallback("no wifi")
                }

                return spawnToast(language.get(self.state.lang, "onlyWifiError"))
            }
        }
    }

    for(let prop in downloads){
		if(downloads[prop].name == file.name){
            callOptionalCallback(null)

            if(typeof saveToGalleryCallback == "function"){
                saveToGalleryCallback("already downloading")
            }

			return spawnToast(language.get(self.state.lang, "fileDownloadAlreadyDownloadingFile", true, ["__NAME__"], [file.name]))
		}
    }
    
    let uuid = file.uuid
	let name = file.name
	let size = file.size

	let currentIndex = -1

	let ext = file.name.split(".")
	ext = ext[ext.length - 1].toLowerCase()

    let makeOffline = false
    let fileName = file.name

    delete window.customVariables.stoppedDownloads[uuid]
    delete window.customVariables.stoppedDownloadsDone[uuid]

	if(isOfflineRequest){
        if(typeof window.customVariables.offlineSavedFiles[file.uuid] !== "undefined"){
            callOptionalCallback(null)

            if(typeof saveToGalleryCallback == "function"){
                return returnOfflineSavedPath(false)
            }
            else{
                return spawnToast(language.get(self.state.lang, "fileAlreadyStoredOffline", true, ["__NAME__"], [file.name]))
            }
        }

        makeOffline = true
        fileName = file.uuid
    }

    getDownloadDir(makeOffline, fileName, async (err, dirObj) => {
        if(err){
            console.log(err)

            callOptionalCallback(null)

            if(typeof saveToGalleryCallback == "function"){
                saveToGalleryCallback("could not get download dir")
            }

            return spawnToast(language.get(self.state.lang, "couldNotGetDownloadDir"))
        }

        let isRemovedFromState = false
        let isAddedToState = false

        const addToState = () => {
            if(isAddedToState){
                return false
            }

            isAddedToState = true

			let currentDownloads = self.state.downloads

			currentDownloads[uuid] = {
				uuid,
				size,
                chunks: file.chunks,
                name: file.name,
                mime: file.mime,
                chunksDone: 0,
                nextWriteChunk: 0,
                chunksWritten: 0,
				loaded: 0,
                progress: 0,
                makeOffline: makeOffline
			}

			downloads[uuid] = {
				uuid,
				size,
                chunks: file.chunks,
                name: file.name,
                mime: file.mime,
                chunksDone: 0,
                nextWriteChunk: 0,
                chunksWritten: 0,
				loaded: 0,
                progress: 0,
                makeOffline: makeOffline
			}

			return self.setState({
				downloads: currentDownloads,
				downloadsCount: (self.state.downloadsCount + 1)
			}, () => {
                self.forceUpdate()
            })
		}

		const removeFromState = () => {
            if(isRemovedFromState){
                return false
            }

            isRemovedFromState = true

            window.customVariables.downloadSemaphore.release()

            callOptionalCallback(null)

            try{
                let currentDownloads = self.state.downloads

                delete currentDownloads[uuid]
                delete downloads[uuid]

                return self.setState({
                    downloads: currentDownloads,
                    downloadsCount: (self.state.downloadsCount - 1)
                }, () => {
                    self.forceUpdate()
                })
            }
            catch(e){
                console.log(e)
            }
		}

		const setProgress = (progress) => {
			try{
				downloads[uuid].progress = progress

                window.$("#downloads-progress-" + uuid).html(downloads[uuid].progress >= 100 ? language.get(self.state.lang, "transfersFinishing") + " " + downloads[uuid].chunksWritten + "/" + downloads[uuid].chunks : downloads[uuid].progress == 0 ? language.get(self.state.lang, "transfersQueued") : downloads[uuid].progress + "%")

                return true
			}
			catch(e){
				return console.log(e)
			}
		}

		const setLoaded = (moreLoaded) => {
			try{
				downloads[uuid].loaded += moreLoaded

                return true
			}
			catch(e){
				return console.log(e)
			}
        }
        
        const chunksDonePlus = () => {
            try{
				downloads[uuid].chunksDone += 1

                return true
			}
			catch(e){
				return console.log(e)
			}
        }

        const chunksWrittenPlus = () => {
            try{
                downloads[uuid].nextWriteChunk += 1
				downloads[uuid].chunksWritten += 1

                return true
			}
			catch(e){
				return console.log(e)
			}
        }

		addToState()

        //spawnToast(language.get(self.state.lang, "fileDownloadStarted", true, ["__NAME__"], [file.name]))

        await window.customVariables.downloadSemaphore.acquire()
        
        let downloadInterval = setInterval(() => {
            if(currentDownloadThreads < maxDownloadThreads && currentWriteThreads < maxWriteThreads){
                currentDownloadThreads += 1
                currentWriteThreads += 1
                
                currentIndex += 1

                let thisIndex = currentIndex

                if(thisIndex < file.chunks && typeof downloads[uuid] !== "undefined"){
                    return downloadFileChunk(file, thisIndex, 0, 128, async (err, downloadIndex, downloadData) => {
                        currentDownloadThreads -= 1
                        
                        if(err){
                            console.log(err)

                            currentWriteThreads -= 1

                            removeFromState()

                            downloadData = null

                            if(err == "stopped"){
                                if(typeof saveToGalleryCallback == "function"){
                                    saveToGalleryCallback("stopped")
                                }

                                if(typeof window.customVariables.stoppedDownloadsDone[uuid] == "undefined"){
                                    window.customVariables.stoppedDownloadsDone[uuid] = true

                                    try{
                                        await new Promise((resolve, reject) => {
                                            return window.resolveLocalFileSystemURL(dirObj.path + "/" + file.name, (resolved) => {
                                                return resolved.remove(() => {
                                                    return resolve(true)
                                                }, (err) => {
                                                    return reject(err)
                                                })
                                            }, (err) => {
                                                return reject(err)
                                            })
                                        })
                                    }
                                    catch(e){
                                        console.log(e)
                                    }

                                    return spawnToast(language.get(self.state.lang, "downloadStopped", true, ["__NAME__"], [file.name]))
                                }
                                else{
                                    return false
                                }
                            }
                            else{
                                if(typeof saveToGalleryCallback == "function"){
                                    saveToGalleryCallback("err")
                                }

                                return spawnToast(language.get(self.state.lang, "fileDownloadError", true, ["__NAME__"], [file.name]))
                            }
                        }

                        if(typeof downloads[uuid] !== "undefined"){
                            chunksDonePlus()
                            setLoaded(downloadData.byteLength)
                            
                            return writeChunkToFile(file, dirObj, uuid, downloadIndex, downloadData, async (err) => {
                                downloadData = null

                                if(err){
                                    console.log(err)

                                    removeFromState()

                                    downloadData = null

                                    if(err == "stopped"){
                                        if(typeof saveToGalleryCallback == "function"){
                                            saveToGalleryCallback("stopped")
                                        }

                                        return false
                                    }
                                    else{
                                        if(typeof saveToGalleryCallback == "function"){
                                            saveToGalleryCallback("err")
                                        }

                                        return spawnToast(language.get(self.state.lang, "fileWriteError", true, ["__NAME__"], [file.name]))
                                    }
                                }

                                chunksWrittenPlus()

                                downloadData = null

                                try{
                                    let progress = ((downloads[uuid].loaded / downloads[uuid].size) * 100).toFixed(2)
        
                                    if(progress >= 100){
                                        progress = 100
                                    }
        
                                    setProgress(progress)
                                }
                                catch(e){
                                    console.log(e)
                                }

                                try{
                                    if(downloads[uuid].chunksWritten >= downloads[uuid].chunks){
                                        if(downloads[uuid].makeOffline){
                                            try{
                                                await new Promise((resolve, reject) => {
                                                    return window.resolveLocalFileSystemURL(dirObj.path + "/" + file.name, (resolved) => {
                                                        return window.resolveLocalFileSystemURL(window.cordova.file.dataDirectory, (rootDirEntry) => {
                                                            return rootDirEntry.getDirectory("offlineFiles", {
                                                                create: true
                                                            }, (dirEntry) => {
                                                                return resolved.moveTo(dirEntry, file.uuid, () => {
                                                                    console.log(dirEntry.nativeURL)

                                                                    return resolve(true)
                                                                }, (err) => {
                                                                    return reject(err)
                                                                })
                                                            }, (err) => {
                                                                return reject(err)
                                                            })                    
                                                        }, (err) => {
                                                            return reject(err)
                                                        })
                                                    }, (err) => {
                                                        return reject(err)
                                                    })
                                                })
                                            }
                                            catch(e){
                                                console.log(e)

                                                if(typeof saveToGalleryCallback == "function"){
                                                    saveToGalleryCallback("err")
                                                }
        
                                                return spawnToast(language.get(self.state.lang, "fileWriteError", true, ["__NAME__"], [file.name]))
                                            }

                                            if(typeof saveToGalleryCallback == "function"){
                                                returnOfflineSavedPath()

                                                return removeFromState()
                                            }
                                            else{
                                                window.customVariables.offlineSavedFiles[file.uuid] = true
        
                                                let items = self.state.itemList
                                                let windowItems = window.customVariables.itemList
            
                                                for(let i = 0; i < items.length; i++){
                                                    if(items[i].uuid == file.uuid){
                                                        items[i].offline = true
                                                    }
                                                }
            
                                                for(let i = 0; i < windowItems.length; i++){
                                                    if(windowItems[i].uuid == file.uuid){
                                                        windowItems[i].offline = true
                                                    }
                                                }
            
                                                self.setState({
                                                    itemList: items
                                                })
            
                                                window.customVariables.itemList = windowItems
                                                
                                                if(typeof window.customVariables.cachedFiles[uuid] !== "undefined"){
                                                    window.customVariables.cachedFiles[uuid].offline = true
                                                }

                                                if(!calledByPreview){
                                                    spawnToast(language.get(self.state.lang, "fileIsNowAvailableOffline", true, ["__NAME__"], [file.name]))
                                                }
            
                                                removeFromState()
            
                                                window.customFunctions.saveOfflineSavedFiles()
                                                
                                                return self.forceUpdate()
                                            }
                                        }
                                        else{
                                            if(typeof saveToGalleryCallback == "function"){
                                                returnOfflineSavedPath()
                                            }
                                            else{
                                                spawnToast(language.get(self.state.lang, "fileDownloadDone", true, ["__NAME__"], [file.name]))
                                            }

                                            return removeFromState()
                                        }
                                    }  
                                }
                                catch(e){
                                    console.log(e)
                                }
                            })
                        }
                    })
                }
                else{
                    currentDownloadThreads -= 1
                    currentWriteThreads -= 1
                    
                    clearInterval(downloadInterval)
                }
            }
        }, 10)
    })
}

export function genThumbnail(item, self){
    if(item.type == "file" && self.state.settings.showThumbnails && typeof item.thumbnail !== "string" && typeof window.customVariables.didRequestThumbnail[item.uuid] == "undefined" && item.name.indexOf(".") !== -1){
        window.customVariables.didRequestThumbnail[item.uuid] = undefined
        window.customVariables.currentThumbnailURL = window.location.href

        getFileThumbnail(item, window.location.href, self)

        item = null

        return true
    }
}

export async function getFileThumbnail(file, thumbURL, self, callback = undefined){
	if(typeof window.customVariables.getThumbnailErrors[file.uuid] !== "undefined"){
		if(window.customVariables.getThumbnailErrors[file.uuid] >= 32){
			if(typeof callback == "function"){
				callback(true)
			}

            file = null
            thumbURL = null

			return false
		}
	}

	if(typeof window.customVariables.isGettingThumbnail[file.uuid] !== "undefined"){
		if(typeof callback == "function"){
			callback(true)
		}

        file = null
        thumbURL = null

		return false
	}

	let ext = file.name.toLowerCase().split(".")
	ext = ext[ext.length - 1]

	if(!utils.canShowThumbnail(ext)){
		if(typeof callback == "function"){
			callback(true)
		}

        file = null
        thumbURL = null
        ext = null

		return false
	}

	const gotThumbnail = async (thumbnail) => {
		await window.customVariables.updateItemsSemaphore.acquire()

		if(typeof callback == "function"){
			callback(null, thumbnail)
		}

		let newItems = self.state.itemList
        let didUpdate = false

        for(let i = 0; i < newItems.length; i++){
            if(newItems[i].uuid == file.uuid){
                if(newItems[i].thumbnail !== thumbnail){
                    newItems[i].thumbnail = thumbnail
                    didUpdate = true
                    window.customVariables.thumbnailBlobCache[file.uuid] = thumbnail
                }
            }
        }

		if(thumbURL == window.location.href && didUpdate){
			window.customVariables.itemList = newItems

            let thumbnailDiv = document.getElementById("item-thumbnail-" + file.uuid)

            if(thumbnailDiv !== null){
                thumbnailDiv.style.backgroundImage = "url(" + thumbnail + ")"
            }

            let counter = self.state.itemListChangeCounter
			
			return self.setState({
				itemList: newItems,
                itemListChangeCounter: (counter + 1)
			}, () => {
				self.forceUpdate()

				window.customFunctions.saveThumbnailCache()

				window.customVariables.updateItemsSemaphore.release()

				delete window.customVariables.isGettingThumbnail[file.uuid]
			})
		}
		else{
			window.customVariables.updateItemsSemaphore.release()

			delete window.customVariables.isGettingThumbnail[file.uuid]

			return false
		}
	}

    if(typeof file.thumbnail == "string"){
        return gotThumbnail(file.thumbnail)
    }

	window.customVariables.isGettingThumbnail[file.uuid] = true

	await window.customVariables.getFileThumbnailSemaphore.acquire()

	try{
		let thumbnail = await getThumbnail(file, thumbURL, ext, self)

		window.customVariables.getFileThumbnailSemaphore.release()

		if(typeof thumbnail !== "undefined"){
			return gotThumbnail(thumbnail)
		}
		else{
			delete window.customVariables.isGettingThumbnail[file.uuid]
		}
	}
	catch(e){
		try{
			if(e.toString().indexOf("url changed") !== -1 || e.toString().indexOf("stopped") !== -1){
                //console.log(e)
			}
            else{
                console.log(e)

				if(typeof window.customVariables.getThumbnailErrors[file.uuid] !== "undefined"){
					window.customVariables.getThumbnailErrors[file.uuid] = window.customVariables.getThumbnailErrors[file.uuid] + 1
				}
				else{
					window.customVariables.getThumbnailErrors[file.uuid] = 1
				}

				window.customFunctions.saveGetThumbnailErrors()
            }
		}
		catch(err){
            console.log(err)
        }

		delete window.customVariables.isGettingThumbnail[file.uuid]

        delete window.customVariables.didRequestThumbnail[file.uuid]

		window.customVariables.getFileThumbnailSemaphore.release()
	}

	if(typeof callback == "function"){
		callback(true)
	}

	return true
}

export async function compressThumbnailImg(blob){
    return new Promise((resolve, reject) => {
        let thumbnailMaxWidthOrHeight = 500
        let thumbnailQuality = 0.6

        let compressor = new Compressor(blob, {
            quality: thumbnailQuality,
            maxHeight: thumbnailMaxWidthOrHeight,
            convertSize: 1,
            convertTypes: ["image/png"],
            success(result){
                resolve(result)

                result = null
                blob = null

                return true
            },
            error(err){
                reject(err)

                blob = null
                err = null

                return true
            }
        })

        compressor = null

        return true
    })
}

export function writeThumbnail(file, blob){
    return new Promise((resolve, reject) => {
        if(!Capacitor.isNative){
            blob = null
            file = null

            return reject("stopped")
        }

        let fileName = file.uuid + ".jpg"
        let dir = "cache" + utils.getRandomArbitrary(0, 512)
        let cacheKey = file.uuid

        let nativeFileURL = window.cordova.file.dataDirectory + "thumbnailCache/" + dir + "/" + fileName
        let fileURL = window.Ionic.WebView.convertFileSrc(nativeFileURL)

        return writeBlob({
            path: nativeFileURL,
            blob: blob,
            recursive: true
        }).then(() => {
            window.customVariables.thumbnailCache[cacheKey] = {
                dir,
                fileName
            }

            window.customVariables.thumbnailBlobCache[cacheKey] = fileURL

            resolve(fileURL)

            fileName = null
            dir = null
            blob = null
            nativeFileURL = null
            fileURL = null
            cacheKey = null
            file = null

            return true
        }).catch((err) => {
            reject(err)

            fileName = null
            dir = null
            blob = null
            nativeFileURL = null
            fileURL = null
            cacheKey = null
            file = null

            return false
        })
    })
}

export async function getThumbnail(file, thumbURL, ext, self){
    return new Promise(async (resolve, reject) => {
        if(Capacitor.isNative){
            if(self.state.settings.onlyWifi){
                let networkStatus = self.state.networkStatus
    
                if(networkStatus.connectionType !== "wifi"){
                    reject("stopped")

                    return spawnToast(language.get(self.state.lang, "onlyWifiError"))
                }
            }
        }

        let doContinue = true
        let videoExts = ["mp4", "webm", "mov", "avi", "wmv"]
        let cacheKey = file.uuid

        if(videoExts.includes(ext)){
            return reject("stopped") //fix this

            if(Capacitor.platform == "ios"){
                return reject("ios video thumbs not supported yet") //fix this
            }
        }

        const shouldContinue = (releaseSemaphore = true) => {
            if(thumbURL !== window.location.href || typeof window.customVariables.thumbnailsInView[file.uuid] == "undefined"){
                if(releaseSemaphore){
                    window.customVariables.thumbnailSemaphore.release()
                }

                reject("url changed")

                return false
            }

            return true
        }

        const getCachedThumbnailURL = () => {
            window.customVariables.thumbnailSemaphore.release()

            if(typeof window.customVariables.thumbnailBlobCache[cacheKey] !== "undefined"){
                return resolve(window.customVariables.thumbnailBlobCache[cacheKey])
            }

            let cached = window.customVariables.thumbnailCache[cacheKey]
            let nativeURL = window.cordova.file.dataDirectory + "thumbnailCache/" + cached.dir + "/" + cached.fileName

            let convertedURL = window.Ionic.WebView.convertFileSrc(nativeURL)

            resolve(convertedURL)

            convertedURL = null
            cached = null
            nativeURL = null

            return true
        }
    
        await window.customVariables.thumbnailSemaphore.acquire()

        if(typeof window.customVariables.thumbnailCache[cacheKey] !== "undefined"){
            return getCachedThumbnailURL()
        }

        if(typeof window.customVariables.thumbnailCache[cacheKey] == "undefined"){
            if(videoExts.includes(ext)){ //video thumbnail
                return downloadPreview(file, undefined, async (err, downloadData) => {
                    if(err){
                        window.customVariables.thumbnailSemaphore.release()

                        downloadData = null
    
                        return reject(err)
                    }

                    doContinue = shouldContinue(true)

                    try{
                        var blob = await workers.newBlob(downloadData)

                        downloadData = null
                    }
                    catch(e){
                        window.customVariables.thumbnailSemaphore.release()

                        downloadData = null
    
                        return reject(e)
                    }

                    doContinue = shouldContinue(true)
    
                    try{
                        var thumbnailData = await utils.getVideoCover(blob)

                        blob = null
                    }
                    catch(e){
                        window.customVariables.thumbnailSemaphore.release()

                        blob = null
    
                        return reject(e)
                    }

                    doContinue = shouldContinue(true)

                    try{
                        var compressedImage = await compressThumbnailImg(thumbnailData)

                        thumbnailData = null
                    }
                    catch(e){
                        window.customVariables.thumbnailSemaphore.release()

                        thumbnailData = null
    
                        return reject(e)
                    }

                    doContinue = shouldContinue(true)

                    try{
                        let url = await writeThumbnail(file, compressedImage)

                        compressedImage = null

                        window.customVariables.thumbnailSemaphore.release()
                        
                        resolve(url)

                        url = null
                    }
                    catch(e){
                        window.customVariables.thumbnailSemaphore.release()

                        thumbnailData = null
                        compressedImage = null
    
                        return reject(e)
                    }

                    compressedImage = null

                    return true
                }, 32, true, thumbURL)
            }
            else{
                return downloadPreview(file, undefined, async (err, data) => {
                    if(err){
                        window.customVariables.thumbnailSemaphore.release()

                        data = null
    
                        return reject(err)
                    }

                    doContinue = shouldContinue(true)

                    try{
                        data = await workers.newBlob(data, {
                            type: "image/png"
                        })
                    }
                    catch(e){
                        window.customVariables.thumbnailSemaphore.release()

                        data = null
        
                        return reject(e)
                    }

                    doContinue = shouldContinue(true)
    
                    if(utils.canCompressThumbnail(ext)){
                        try{
                            var compressedImage = await compressThumbnailImg(data)
                        }
                        catch(e){
                            window.customVariables.thumbnailSemaphore.release()

                            data = null
        
                            return reject(e)
                        }

                        try{
                            let url = await writeThumbnail(file, compressedImage)

                            compressedImage = null

                            window.customVariables.thumbnailSemaphore.release()

                            resolve(url)

                            url = null
                        }
                        catch(e){
                            window.customVariables.thumbnailSemaphore.release()

                            data = null
                            compressedImage = null
        
                            return reject(e)
                        }

                        compressedImage = null
                        data = null
                    }
                    else{
                        reject("cannot compress " + file.name)

                        data = null
                    }

                    data = null

                    return true
                }, Infinity, true, thumbURL)
            }
        }
        else{
            return getCachedThumbnailURL()
        }
    })
}

export async function downloadPreview(file, progressCallback, callback, maxChunks = Infinity, isThumbnailDownload = false, thumbURL = undefined){
    let dataArray = []
    let maxChunksToDownload = maxChunks
    let stopped = false

    if(maxChunksToDownload > file.chunks){
        maxChunksToDownload = file.chunks
    }

    for(let i = 0; i < maxChunksToDownload; i++){
        let thisIndex = i

        if(typeof thumbURL !== "undefined"){
            if(thumbURL !== window.location.href){
                callback("stopped")

                stopped = true

                break
            }

            if(typeof window.customVariables.thumbnailsInView[file.uuid] == "undefined"){
                callback("stopped")

                stopped = true

                break
            }
        }

        if(window.customVariables.stopGettingPreviewData && !isThumbnailDownload){
            window.customVariables.isGettingPreviewData = false
            
            callback("stopped")

            stopped = true

            break
        }

        await new Promise((resolve) => {
            downloadFileChunk(file, thisIndex, 0, 64, (err, downloadIndex, downloadData) => {
                if(isThumbnailDownload){
                    window.customVariables.stopGettingPreviewData = false
                }

                if(err){
                    downloadIndex = null
                    downloadData = null

                    return resolve(true)
                }

                dataArray.push(downloadData)

                return resolve(true)
            })
        })
    }

    if(stopped){
        dataArray = null

        return false
    }

    let uint8 = utils.uInt8ArrayConcat(dataArray)

    callback(null, uint8)

    uint8 = null
    dataArray = null

    return true
}