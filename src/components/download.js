import * as language from "../utils/language"
import * as workers from "../utils/workers"
import { Capacitor } from "@capacitor/core"
import { Filesystem, FilesystemDirectory } from "@capacitor/filesystem"
import Compressor from '../utils/compressor'; 

const utils = require("../utils/utils")

export async function getTempDir(callback){
    if(Capacitor.platform == "android"){
        let path = "Temp"
        let directory = FilesystemDirectory.External

        try{
            await Filesystem.mkdir({
                path,
                directory,
                recursive: true 
            })

            var uri = await Filesystem.getUri({
                path,
                directory
            })

            return callback(null, {
                path,
                directory,
                uri
            })
        }
        catch(e){
            if(e.message == "Directory exists"){
                try{
                    var uri = await Filesystem.getUri({
                        path,
                        directory
                    })

                    return callback(null, {
                        path,
                        directory,
                        uri
                    })
                }
                catch(e){
                    return callback(e)
                }
            }
            else{
                return callback(e)
            }
        }
    }
    else if(Capacitor.platform == "ios"){
        let path = "Temp"
        let directory = FilesystemDirectory.Documents

        try{
            await Filesystem.mkdir({
                path,
                directory,
                recursive: true 
            })

            var uri = await Filesystem.getUri({
                path,
                directory
            })

            return callback(null, {
                path,
                directory,
                uri
            })
        }
        catch(e){
            if(e.message == "Directory exists"){
                try{
                    var uri = await Filesystem.getUri({
                        path,
                        directory
                    })

                    return callback(null, {
                        path,
                        directory,
                        uri
                    })
                }
                catch(e){
                    return callback(e)
                }
            }
            else{
                return callback(e)
            }
        }
    }
    else{
        return callback(new Error("Can only run getdir function on native ios or android device"))
    }
}

export async function getThumbnailDir(uuid, callback){
    if(Capacitor.platform == "android"){
        let path = "ThumbnailCache/" + uuid
        let directory = FilesystemDirectory.External

        try{
            await Filesystem.mkdir({
                path,
                directory,
                recursive: true 
            })

            var uri = await Filesystem.getUri({
                path,
                directory
            })

            return callback(null, {
                path,
                directory,
                uri
            })
        }
        catch(e){
            if(e.message == "Directory exists"){
                try{
                    var uri = await Filesystem.getUri({
                        path,
                        directory
                    })

                    return callback(null, {
                        path,
                        directory,
                        uri
                    })
                }
                catch(e){
                    return callback(e)
                }
            }
            else{
                return callback(e)
            }
        }
    }
    else if(Capacitor.platform == "ios"){
        let path = "FilenThumbnailCache/" + uuid
        let directory = FilesystemDirectory.Documents

        try{
            await Filesystem.mkdir({
                path,
                directory,
                recursive: true 
            })

            var uri = await Filesystem.getUri({
                path,
                directory
            })

            return callback(null, {
                path,
                directory,
                uri
            })
        }
        catch(e){
            if(e.message == "Directory exists"){
                try{
                    var uri = await Filesystem.getUri({
                        path,
                        directory
                    })

                    return callback(null, {
                        path,
                        directory,
                        uri
                    })
                }
                catch(e){
                    return callback(e)
                }
            }
            else{
                return callback(e)
            }
        }
    }
    else{
        return callback(new Error("Can only run getdir function on native ios or android device"))
    }
}

export async function getDownloadDir(makeOffline, fileName, callback){
    if(Capacitor.platform == "android"){
        if(makeOffline){
            let path = "Downloads"
            let directory = FilesystemDirectory.External

            try{
                await Filesystem.mkdir({
                    path,
                    directory,
                    recursive: true 
                })

                var uri = await Filesystem.getUri({
                    path,
                    directory
                })

                return callback(null, {
                    path,
                    directory,
                    uri
                })
            }
            catch(e){
                if(e.message == "Directory exists"){
                    try{
                        var uri = await Filesystem.getUri({
                            path,
                            directory
                        })

                        return callback(null, {
                            path,
                            directory,
                            uri
                        })
                    }
                    catch(e){
                        return callback(e)
                    }
                }
                else{
                    return callback(e)
                }
            }
        }
        else{
            let path = "Downloads"
            let directory = FilesystemDirectory.External
            
            try{
                await Filesystem.mkdir({
                    path,
                    directory,
                    recursive: true 
                })

                var uri = await Filesystem.getUri({
                    path,
                    directory
                })

                return callback(null, {
                    path,
                    directory,
                    uri
                })
            }
            catch(e){
                if(e.message == "Directory exists"){
                    try{
                        var uri = await Filesystem.getUri({
                            path,
                            directory
                        })

                        return callback(null, {
                            path,
                            directory,
                            uri
                        })
                    }
                    catch(e){
                        return callback(e)
                    }
                }
                else{
                    return callback(e)
                }
            }
        }
    }
    else if(Capacitor.platform == "ios"){
        if(makeOffline){
            let path = "Downloads"
            let directory = FilesystemDirectory.Documents

            try{
                await Filesystem.mkdir({
                    path,
                    directory,
                    recursive: true 
                })

                var uri = await Filesystem.getUri({
                    path,
                    directory
                })

                return callback(null, {
                    path,
                    directory,
                    uri
                })
            }
            catch(e){
                if(e.message == "Directory exists"){
                    try{
                        var uri = await Filesystem.getUri({
                            path,
                            directory
                        })

                        return callback(null, {
                            path,
                            directory,
                            uri
                        })
                    }
                    catch(e){
                        return callback(e)
                    }
                }
                else{
                    return callback(e)
                }
            }
        }
        else{
            let path = "Downloads"
            let directory = FilesystemDirectory.Documents

            try{
                await Filesystem.mkdir({
                    path,
                    directory,
                    recursive: true 
                })

                var uri = await Filesystem.getUri({
                    path,
                    directory
                })

                return callback(null, {
                    path,
                    directory,
                    uri
                })
            }
            catch(e){
                if(e.message == "Directory exists"){
                    try{
                        var uri = await Filesystem.getUri({
                            path,
                            directory
                        })

                        return callback(null, {
                            path,
                            directory,
                            uri
                        })
                    }
                    catch(e){
                        return callback(e)
                    }
                }
                else{
                    return callback(e)
                }
            }
        }
    }
    else{
        return callback(new Error("Can only run getdir function on native ios or android device"))
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

    workers.fetchWithTimeoutDownloadWorker(utils.getDownloadServer() + "/" + file.region + "/" + file.bucket + "/" + file.uuid + "/" + index, {
        method: "GET"
    }, (3600000 * 3)).then((res) => {
        if(typeof window.customVariables.stoppedDownloads[file.uuid] !== "undefined"){
            callback("stopped")

            res = null
            file = null

            return false
        }

        try{
            if(res.byteLength){
                if(res.byteLength > 1){
                    workers.decryptData(file.uuid, index, file.key, res, file.version, (err, decrypted) => {
                        if(err){
                            callback(err)

                            res = null
                            err = null
                            file = null

                            return false
                        }

                        if(!isPreview){
                            window.customVariables.downloadChunkSemaphore.release()
                        }

                        if(typeof window.customVariables.stoppedDownloads[file.uuid] !== "undefined"){
                            callback("stopped")

                            res = null
                            decrypted = null
                            file = null

                            return false
                        }

                        callback(null, index, decrypted)

                        res = null
                        decrypted = null
                        file = null

                        return false
                    })
                }
                else{
                    if(!isPreview){
                        window.customVariables.downloadChunkSemaphore.release()
                    }

                    res = null

                    return setTimeout(() => {
                        this.downloadFileChunk(file, index, (tries + 1), maxTries, callback)
                    }, 1000)
                }
            }
            else{
                if(!isPreview){
                    window.customVariables.downloadChunkSemaphore.release()
                }

                res = null

                return setTimeout(() => {
                    this.downloadFileChunk(file, index, (tries + 1), maxTries, callback)
                }, 1000)
            }
        }
        catch(e){
            console.log(e)

            if(!isPreview){
                window.customVariables.downloadChunkSemaphore.release()
            }

            res = null

            return setTimeout(() => {
                this.downloadFileChunk(file, index, (tries + 1), maxTries, callback)
            }, 1000)
        }
    }).catch((err) => {
        console.log(err)

        if(!isPreview){
            window.customVariables.downloadChunkSemaphore.release()
        }

        return setTimeout(() => {
            this.downloadFileChunk(file, index, (tries + 1), maxTries, callback)
        }, 1000)
    })
}

export async function writeChunkToFile(file, dirObj, uuid, index, data, callback){
    if(!window.customVariables.downloads[uuid]){
        window.customVariables.currentWriteThreads -= 1

        file = null
        dirObj = null
        uuid = null
        index = null
        data = null

        return false
    }

    if(window.customVariables.downloads[uuid].nextWriteChunk !== index){
        return setTimeout(() => {
            this.writeChunkToFile(file, dirObj, uuid, index, data, callback)
        }, 10)
    }

    if(typeof window.customVariables.stoppedDownloads[uuid] !== "undefined"){
        window.customVariables.currentWriteThreads -= 1

        file = null
        dirObj = null
        uuid = null
        index = null
        data = null

        return false
    }

    if(index == 0){
        try{
            await Filesystem.deleteFile({
                path: dirObj.path + "/" + file.name,
                directory: dirObj.directory
            })
        }
        catch(e){
            console.log(e)
        }
    }

    workers.convertArrayBufferToBase64(data, async (err, b64Data) => {
        if(err){
            callback(err)

            file = null
            dirObj = null
            uuid = null
            index = null
            data = null
            err = null

            return false
        }

        if(index == 0){
            try{
                await Filesystem.writeFile({
                    path: dirObj.path + "/" + file.name,
                    directory: dirObj.directory,
                    data: b64Data,
                    recursive: true
                })

                window.customVariables.currentWriteThreads -= 1

                file = null
                dirObj = null
                uuid = null
                index = null
                data = null
                b64Data = null
    
                return callback(null)
            }
            catch(e){
                window.customVariables.currentWriteThreads -= 1

                file = null
                dirObj = null
                uuid = null
                index = null
                data = null
                b64Data = null

                return callback(e)
            }
        }
        else{
            try{
                await Filesystem.appendFile({
                    path: dirObj.path + "/" + file.name,
                    directory: dirObj.directory,
                    data: b64Data
                })

                window.customVariables.currentWriteThreads -= 1

                file = null
                dirObj = null
                uuid = null
                index = null
                data = null
                b64Data = null
    
                return callback(null)
            }
            catch(e){
                window.customVariables.currentWriteThreads -= 1

                file = null
                dirObj = null
                uuid = null
                index = null
                data = null
                b64Data = null

                return callback(e)
            }
        }
    })
}

export async function queueFileDownload(file, isOfflineRequest = false, optionalCallback = undefined, calledByPreview = false, saveToGalleryCallback = undefined){
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
        if(this.state.settings.onlyWifi){
            let networkStatus = this.state.networkStatus

            if(networkStatus.connectionType !== "wifi"){
                callOptionalCallback(null)

                if(typeof saveToGalleryCallback == "function"){
                    saveToGalleryCallback("no wifi")
                }

                return this.spawnToast(language.get(this.state.lang, "onlyWifiError"))
            }
        }
    }

    for(let prop in window.customVariables.downloads){
		if(window.customVariables.downloads[prop].name == file.name){
            callOptionalCallback(null)

            if(typeof saveToGalleryCallback == "function"){
                saveToGalleryCallback("already downloading")
            }

			return this.spawnToast(language.get(this.state.lang, "fileDownloadAlreadyDownloadingFile", true, ["__NAME__"], [file.name]))
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
                return this.spawnToast(language.get(this.state.lang, "fileAlreadyStoredOffline", true, ["__NAME__"], [file.name]))
            }
        }

        makeOffline = true
        fileName = file.uuid
    }

    this.getDownloadDir(makeOffline, fileName, async (err, dirObj) => {
        if(err){
            console.log(err)

            callOptionalCallback(null)

            if(typeof saveToGalleryCallback == "function"){
                saveToGalleryCallback("could not get download dir")
            }

            return this.spawnToast(language.get(this.state.lang, "couldNotGetDownloadDir"))
        }

        let isRemovedFromState = false
        let isAddedToState = false

        const addToState = () => {
            if(isAddedToState){
                return false
            }

            isAddedToState = true

			let currentDownloads = this.state.downloads

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

			window.customVariables.downloads[uuid] = {
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

			return this.setState({
				downloads: currentDownloads,
				downloadsCount: (this.state.downloadsCount + 1)
			}, () => {
                this.forceUpdate()
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
                let currentDownloads = this.state.downloads

                delete currentDownloads[uuid]
                delete window.customVariables.downloads[uuid]

                return this.setState({
                    downloads: currentDownloads,
                    downloadsCount: (this.state.downloadsCount - 1)
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
				let currentDownloads = this.state.downloads

				currentDownloads[uuid].progress = progress
				window.customVariables.downloads[uuid].progress = progress

				return this.setState({
					downloads: currentDownloads
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
				let currentDownloads = this.state.downloads

				currentDownloads[uuid].loaded += moreLoaded
				window.customVariables.downloads[uuid].loaded += moreLoaded

				return this.setState({
					downloads: currentDownloads
				}, () => {
                    this.forceUpdate()
                })
			}
			catch(e){
				return console.log(e)
			}
        }
        
        const chunksDonePlus = () => {
            try{
				let currentDownloads = this.state.downloads

				currentDownloads[uuid].chunksDone += 1
				window.customVariables.downloads[uuid].chunksDone += 1

				return this.setState({
					downloads: currentDownloads
				})
			}
			catch(e){
				return console.log(e)
			}
        }

        const chunksWrittenPlus = () => {
            try{
				let currentDownloads = this.state.downloads

				currentDownloads[uuid].nextWriteChunk += 1
                window.customVariables.downloads[uuid].nextWriteChunk += 1
                currentDownloads[uuid].chunksWritten += 1
				window.customVariables.downloads[uuid].chunksWritten += 1

				return this.setState({
					downloads: currentDownloads
				}, () => {
                    this.forceUpdate()
                })
			}
			catch(e){
				return console.log(e)
			}
        }

		addToState()

        //this.spawnToast(language.get(this.state.lang, "fileDownloadStarted", true, ["__NAME__"], [file.name]))

        await window.customVariables.downloadSemaphore.acquire()
        
        let downloadInterval = setInterval(() => {
            if(window.customVariables.currentDownloadThreads < window.customVariables.maxDownloadThreads && window.customVariables.currentWriteThreads < window.customVariables.maxWriteThreads){
                window.customVariables.currentDownloadThreads += 1
                window.customVariables.currentWriteThreads += 1
                
                currentIndex += 1

                let thisIndex = currentIndex

                if(thisIndex < file.chunks && typeof window.customVariables.downloads[uuid] !== "undefined"){
                    this.downloadFileChunk(file, thisIndex, 0, 128, async (err, downloadIndex, downloadData) => {
                        window.customVariables.currentDownloadThreads -= 1
                        
                        if(err){
                            console.log(err)

                            window.customVariables.currentWriteThreads -= 1

                            removeFromState()

                            downloadData = null

                            if(err == "stopped"){
                                if(typeof saveToGalleryCallback == "function"){
                                    saveToGalleryCallback("stopped")
                                }

                                if(typeof window.customVariables.stoppedDownloadsDone[uuid] == "undefined"){
                                    window.customVariables.stoppedDownloadsDone[uuid] = true

                                    try{
                                        await Filesystem.deleteFile({
                                            path: dirObj.path + "/" + file.name,
                                            directory: dirObj.directory
                                        })
                                    }
                                    catch(e){
                                        console.log(e)
                                    }

                                    return this.spawnToast(language.get(this.state.lang, "downloadStopped", true, ["__NAME__"], [file.name]))
                                }
                                else{
                                    return false
                                }
                            }
                            else{
                                if(typeof saveToGalleryCallback == "function"){
                                    saveToGalleryCallback("err")
                                }

                                return this.spawnToast(language.get(this.state.lang, "fileDownloadError", true, ["__NAME__"], [file.name]))
                            }
                        }

                        if(typeof window.customVariables.downloads[uuid] !== "undefined"){
                            chunksDonePlus()
                            setLoaded(downloadData.length)
                            
                            this.writeChunkToFile(file, dirObj, uuid, downloadIndex, downloadData, async (err) => {
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

                                        return this.spawnToast(language.get(this.state.lang, "fileWriteError", true, ["__NAME__"], [file.name]))
                                    }
                                }

                                chunksWrittenPlus()

                                downloadData = null

                                try{
                                    let progress = ((window.customVariables.downloads[uuid].loaded / window.customVariables.downloads[uuid].size) * 100).toFixed(2)
        
                                    if(progress >= 100){
                                        progress = 100
                                    }
        
                                    setProgress(progress)
                                }
                                catch(e){
                                    console.log(e)
                                }

                                try{
                                    if(window.customVariables.downloads[uuid].chunksWritten >= window.customVariables.downloads[uuid].chunks){
                                        if(window.customVariables.downloads[uuid].makeOffline){
                                            try{
                                                await new Promise((resolve, reject) => {
                                                    this.getDownloadDir(true, fileName, (err, dirObj) => {
                                                        if(err){
                                                            return reject(err)
                                                        }
                                    
                                                        Filesystem.getUri({
                                                            path: dirObj.path + "/" + file.name,
                                                            directory: dirObj.directory
                                                        }).then((path) => {
                                                            window.resolveLocalFileSystemURL(path.uri, (resolved) => {
                                                                window.resolveLocalFileSystemURL(window.cordova.file.dataDirectory, (rootDirEntry) => {
                                                                    rootDirEntry.getDirectory("offlineFiles", {
                                                                        create: true
                                                                    }, (dirEntry) => {
                                                                        resolved.moveTo(dirEntry, file.uuid, () => {
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
                                                        }).catch((err) => {
                                                            return reject(err)
                                                        })
                                                    })
                                                })
                                            }
                                            catch(e){
                                                console.log(e)

                                                if(typeof saveToGalleryCallback == "function"){
                                                    saveToGalleryCallback("err")
                                                }
        
                                                return this.spawnToast(language.get(this.state.lang, "fileWriteError", true, ["__NAME__"], [file.name]))
                                            }

                                            if(typeof saveToGalleryCallback == "function"){
                                                returnOfflineSavedPath()

                                                return removeFromState()
                                            }
                                            else{
                                                window.customVariables.offlineSavedFiles[file.uuid] = true
        
                                                let items = this.state.itemList
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
            
                                                this.setState({
                                                    itemList: items
                                                })
            
                                                window.customVariables.itemList = windowItems
                                                
                                                if(typeof window.customVariables.cachedFiles[uuid] !== "undefined"){
                                                    window.customVariables.cachedFiles[uuid].offline = true
                                                }

                                                if(!calledByPreview){
                                                    this.spawnToast(language.get(this.state.lang, "fileIsNowAvailableOffline", true, ["__NAME__"], [file.name]))
                                                }
            
                                                removeFromState()
            
                                                window.customFunctions.saveOfflineSavedFiles()
                                                
                                                return this.forceUpdate()
                                            }
                                        }
                                        else{
                                            if(typeof saveToGalleryCallback == "function"){
                                                returnOfflineSavedPath()
                                            }
                                            else{
                                                this.spawnToast(language.get(this.state.lang, "fileDownloadDone", true, ["__NAME__"], [file.name]))
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
                    window.customVariables.currentDownloadThreads -= 1
                    window.customVariables.currentWriteThreads -= 1
                    
                    clearInterval(downloadInterval)
                }
            }
        }, 10)
    })
}

export function genThumbnail(item, index){
    if(item.type == "file" && this.state.settings.showThumbnails && typeof item.thumbnail !== "string" && typeof window.customVariables.didRequestThumbnail[item.uuid] == "undefined" && item.name.indexOf(".") !== -1){
        window.customVariables.didRequestThumbnail[item.uuid] = true
        window.customVariables.currentThumbnailURL = window.location.href

        this.getFileThumbnail(item, window.location.href, index)

        item = null
        index = null

        return true
    }
}

export async function getFileThumbnail(file, thumbURL, index, callback = undefined){
	if(typeof window.customVariables.getThumbnailErrors[file.uuid] !== "undefined"){
		if(window.customVariables.getThumbnailErrors[file.uuid] >= 32){
			if(typeof callback == "function"){
				callback(true)
			}

            file = null
            thumbURL = null
            index = null

			return false
		}
	}

	if(typeof window.customVariables.isGettingThumbnail[file.uuid] !== "undefined"){
		if(typeof callback == "function"){
			callback(true)
		}

        file = null
        thumbURL = null
        index = null

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
        index = null
        ext = null

		return false
	}

	const gotThumbnail = async (thumbnail) => {
		//await window.customVariables.updateItemsSemaphore.acquire()

		if(typeof callback == "function"){
			callback(null, thumbnail)
		}

        let thumbnailDiv = document.getElementById("item-thumbnail-" + file.uuid)

        if(thumbnailDiv !== null){
            thumbnailDiv.style.backgroundImage = "url(" + thumbnail + ")"
        }

		let newItems = this.state.itemList
        let didUpdate = false
        
        if(typeof newItems[index] !== "undefined"){
            if(newItems[index].thumbnail !== thumbnail){
                newItems[index].thumbnail = thumbnail
                didUpdate = true
            }
        }

		if(thumbURL == window.location.href && didUpdate){
			window.customVariables.itemList = newItems

            let counter = this.state.itemListChangeCounter
			
			return this.setState({
				itemList: newItems,
                itemListChangeCounter: (counter + 1)
			}, () => {
				this.forceUpdate()

				window.customFunctions.saveThumbnailCache()

				//window.customVariables.updateItemsSemaphore.release()

				delete window.customVariables.isGettingThumbnail[file.uuid]
			})
		}
		else{
			//window.customVariables.updateItemsSemaphore.release()

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
		let thumbnail = await this.getThumbnail(file, thumbURL, ext)

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
                console.log(e)
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

        window.resolveLocalFileSystemURL(window.cordova.file.dataDirectory, (rootDirEntry) => {
            rootDirEntry.getDirectory("thumbnailCache", {
                create: true
            }, (subDirEntry) => {
                subDirEntry.getDirectory(dir, {
                    create: true
                }, (dirEntry) => {
                    let fileURL = window.Ionic.WebView.convertFileSrc(dirEntry.nativeURL + fileName)

                    dirEntry.getFile(fileName, {
                        create: true,
                        exclusive: false
                    }, (fileEntry) => {
                        fileEntry.createWriter((fileWriter) => {
                            fileWriter.onwriteend = () => {
                                if(typeof fileURL == "string"){
                                    window.customVariables.thumbnailCache[cacheKey] = {
                                        dir,
                                        fileName
                                    }
    
                                    window.customVariables.thumbnailBlobCache[cacheKey] = fileURL
                                }

                                fileEntry = null
                                dirEntry = null
                                subDirEntry = null
                                rootDirEntry = null
                                fileName = null
                                dir = null
                                blob = null
                                file = null

                                return resolve(fileURL)
                            }
                    
                            fileWriter.onerror = (e) => {
                                fileEntry = null
                                dirEntry = null
                                subDirEntry = null
                                rootDirEntry = null
                                fileName = null
                                dir = null
                                blob = null
                                file = null

                                return reject(e)
                            }
                    
                            return fileWriter.write(blob)
                        })
                    }, (err) => {
                        blob = null
                        dirEntry = null
                        subDirEntry = null
                        rootDirEntry = null
                        fileName = null
                        dir = null
                        file = null

                        return reject(err)
                    })
                }, (err) => {
                    blob = null
                    subDirEntry = null
                    rootDirEntry = null
                    fileName = null
                    dir = null
                    file = null

                    return reject(err)
                })
            }, (err) => {
                blob = null
                rootDirEntry = null
                fileName = null
                dir = null
                file = null

                return reject(err)
            })                    
        }, (err) => {
            blob = null
            fileName = null
            dir = null
            file = null

            return reject(err)
        })
    })
}

export async function getThumbnail(file, thumbURL, ext){
    return new Promise(async (resolve, reject) => {
        if(Capacitor.isNative){
            if(this.state.settings.onlyWifi){
                let networkStatus = this.state.networkStatus
    
                if(networkStatus.connectionType !== "wifi"){
                    reject("stopped")

                    return this.spawnToast(language.get(this.state.lang, "onlyWifiError"))
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

            window.resolveLocalFileSystemURL(nativeURL, () => {
                window.customVariables.thumbnailSemaphore.release()

                let convertedURL = window.Ionic.WebView.convertFileSrc(nativeURL)

                resolve(convertedURL)

                convertedURL = null
                cached = null
                nativeURL = null

                return true
            }, (err) => {
                delete window.customVariables.thumbnailCache[cacheKey]
                delete window.customVariables.thumbnailBlobCache[cacheKey]

                window.customVariables.thumbnailSemaphore.release()

                reject(err)

                cached = null
                nativeURL = null
                err = null

                return true
            })
        }
    
        await window.customVariables.thumbnailSemaphore.acquire()

        if(typeof window.customVariables.thumbnailCache[cacheKey] !== "undefined"){
            return getCachedThumbnailURL()
        }

        if(typeof window.customVariables.thumbnailCache[cacheKey] == "undefined"){
            if(videoExts.includes(ext)){ //video thumbnail
                this.downloadPreview(file, undefined, async (err, downloadData) => {
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
                this.downloadPreview(file, undefined, async (err, data) => {
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
    let currentIndex = -1
    let currentWriteIndex = 0
    let chunksDone = 0
    
    const write = (index, data, callback) => {
        if(currentWriteIndex == index){
            dataArray.push(data)

            currentWriteIndex += 1
            chunksDone += 1

            if(typeof progressCallback == "function"){
                progressCallback(chunksDone)
            }

            if(chunksDone == file.chunks || chunksDone == maxChunks){
                let uint8 = utils.uInt8ArrayConcat(dataArray)

                callback(null, uint8)

                index = null
                data = null
                dataArray = null
                uint8 = null

                return true
            }

            index = null
            data = null

            return true
        }
        else{
            return setTimeout(() => {
                write(index, data, callback)
            }, 10)
        }
    }

    let downloadInterval = setInterval(() => {
        currentIndex += 1

        let thisIndex = currentIndex

        if(isThumbnailDownload){
            window.customVariables.stopGettingPreviewData = false
        }

        if(thisIndex < file.chunks && thisIndex < maxChunks && !window.customVariables.stopGettingPreviewData){
            let doGet = true
            
            if(typeof thumbURL !== "undefined"){
                if(thumbURL !== window.location.href){
                    doGet = false
                }

                if(typeof window.customVariables.thumbnailsInView[file.uuid] == "undefined"){
                    doGet = false
                }
            }
            
            if(doGet){
                this.downloadFileChunk(file, thisIndex, 0, 64, (err, downloadIndex, downloadData) => {
                    if(isThumbnailDownload){
                        window.customVariables.stopGettingPreviewData = false
                    }
    
                    if(err){
                        downloadIndex = null
                        downloadData = null

                        return callback(err)
                    }
    
                    write(downloadIndex, downloadData, callback)

                    downloadIndex = null
                    downloadData = null

                    return true
                }, true)
            }
            else{
                callback("stopped")

                return clearInterval(downloadInterval)
            }
        }
        else{
            if(window.customVariables.stopGettingPreviewData && !isThumbnailDownload){
                window.customVariables.isGettingPreviewData = false
                
                callback("stopped")
            }

            return clearInterval(downloadInterval)
        }
    }, 10)
}