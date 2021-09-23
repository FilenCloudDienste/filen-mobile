import * as language from "../utils/language"
import * as workers from "../utils/workers"
import { Capacitor, FilesystemDirectory, Plugins } from "@capacitor/core"
import imageCompression from "browser-image-compression"
import Compressor from 'compressorjs';

const utils = require("../utils/utils")

export async function getThumbnailDir(uuid, callback){
    if(Capacitor.platform == "android"){
        let path = "ThumbnailCache/" + uuid
        let directory = FilesystemDirectory.External

        try{
            await Plugins.Filesystem.mkdir({
                path,
                directory,
                recursive: true 
            })

            var uri = await Plugins.Filesystem.getUri({
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
                    var uri = await Plugins.Filesystem.getUri({
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
            await Plugins.Filesystem.mkdir({
                path,
                directory,
                recursive: true 
            })

            var uri = await Plugins.Filesystem.getUri({
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
                    var uri = await Plugins.Filesystem.getUri({
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
            let path = "OfflineFiles/" + fileName
            let directory = FilesystemDirectory.External

            try{
                await Plugins.Filesystem.mkdir({
                    path,
                    directory,
                    recursive: true 
                })

                var uri = await Plugins.Filesystem.getUri({
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
                        var uri = await Plugins.Filesystem.getUri({
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
            let path = "Download"
            let directory = FilesystemDirectory.ExternalStorage

            try{
                await Plugins.Filesystem.mkdir({
                    path,
                    directory,
                    recursive: true 
                })

                var uri = await Plugins.Filesystem.getUri({
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
                        var uri = await Plugins.Filesystem.getUri({
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
                    path = "Downloads"
                    directory = FilesystemDirectory.External
                    
                    try{
                        await Plugins.Filesystem.mkdir({
                            path,
                            directory,
                            recursive: true 
                        })

                        var uri = await Plugins.Filesystem.getUri({
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
                                var uri = await Plugins.Filesystem.getUri({
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
        }
    }
    else if(Capacitor.platform == "ios"){
        if(makeOffline){
            let path = "FilenOfflineFiles/" + fileName
            let directory = FilesystemDirectory.Documents

            try{
                await Plugins.Filesystem.mkdir({
                    path,
                    directory,
                    recursive: true 
                })

                var uri = await Plugins.Filesystem.getUri({
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
                        var uri = await Plugins.Filesystem.getUri({
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
            let path = "Filen Downloads"
            let directory = FilesystemDirectory.ExternalStorage

            try{
                await Plugins.Filesystem.mkdir({
                    path,
                    directory,
                    recursive: true 
                })

                var uri = await Plugins.Filesystem.getUri({
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
                        var uri = await Plugins.Filesystem.getUri({
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
		return callback(new Error("Max download retries reached for " + file.uuid + ", returning."))
	}

	if(index >= file.chunks){
		return callback(null, index)
    }

    if(typeof window.customVariables.stoppedDownloads[file.uuid] !== "undefined"){
        return callback("stopped")
    }

    if(!isPreview){
        await window.customVariables.downloadChunkSemaphore.acquire()
    }

    utils.fetchWithTimeout(3600000, fetch(utils.getDownloadServer() + "/" + file.region + "/" + file.bucket + "/" + file.uuid + "/" + index, {
        method: "GET"
    })).then((response) => {
        if(response.status !== 200){
            if(!isPreview){
                window.customVariables.downloadChunkSemaphore.release()
            }

            return setTimeout(() => {
                this.downloadFileChunk(file, index, (tries + 1), maxTries, callback)
            }, 1000)
        }

        response.arrayBuffer().then((res) => {
            if(typeof window.customVariables.stoppedDownloads[file.uuid] !== "undefined"){
                return callback("stopped")
            }

            try{
                if(res.byteLength){
                    if(res.byteLength > 1){
                        workers.decryptData(file.uuid, index, file.key, res, file.version, (decrypted) => {
                            if(!isPreview){
                                window.customVariables.downloadChunkSemaphore.release()
                            }

                            if(typeof window.customVariables.stoppedDownloads[file.uuid] !== "undefined"){
                                return callback("stopped")
                            }
    
                            return callback(null, index, decrypted)
                        })
                    }
                    else{
                        if(!isPreview){
                            window.customVariables.downloadChunkSemaphore.release()
                        }

                        return setTimeout(() => {
                            this.downloadFileChunk(file, index, (tries + 1), maxTries, callback)
                        }, 1000)
                    }
                }
                else{
                    if(!isPreview){
                        window.customVariables.downloadChunkSemaphore.release()
                    }

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

        return false
    }

    if(window.customVariables.downloads[uuid].nextWriteChunk !== index){
        return setTimeout(() => {
            this.writeChunkToFile(file, dirObj, uuid, index, data, callback)
        }, 5)
    }

    if(typeof window.customVariables.stoppedDownloads[uuid] !== "undefined"){
        window.customVariables.currentWriteThreads -= 1

        return false
    }

    if(index == 0){
        try{
            await Plugins.Filesystem.deleteFile({
                path: dirObj.path + "/" + file.name,
                directory: dirObj.directory
            })
        }
        catch(e){
            console.log(e)
        }
    }

    workers.convertArrayBufferToBase64(data, async (b64Data) => {
        if(index == 0){
            try{
                await Plugins.Filesystem.writeFile({
                    path: dirObj.path + "/" + file.name,
                    directory: dirObj.directory,
                    data: b64Data,
                    recursive: true
                })

                window.customVariables.currentWriteThreads -= 1
    
                return callback(null)
            }
            catch(e){
                window.customVariables.currentWriteThreads -= 1

                return callback(e)
            }
        }
        else{
            try{
                await Plugins.Filesystem.appendFile({
                    path: dirObj.path + "/" + file.name,
                    directory: dirObj.directory,
                    data: b64Data
                })

                window.customVariables.currentWriteThreads -= 1
    
                return callback(null)
            }
            catch(e){
                window.customVariables.currentWriteThreads -= 1

                return callback(e)
            }
        }
    })
}

export async function queueFileDownload(file, isOfflineRequest = false){
    if(Capacitor.isNative){
        if(this.state.settings.onlyWifi){
            let networkStatus = await Plugins.Network.getStatus()

            if(networkStatus.connectionType !== "wifi"){
                return this.spawnToast(language.get(this.state.lang, "onlyWifiError"))
            }
        }
    }

    for(let prop in window.customVariables.downloads){
		if(window.customVariables.downloads[prop].name == file.name){
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
            return this.spawnToast(language.get(this.state.lang, "fileAlreadyStoredOffline", true, ["__NAME__"], [file.name]))
        }

        makeOffline = true
        fileName = file.uuid
    }

    this.getDownloadDir(makeOffline, fileName, async (err, dirObj) => {
        if(err){
            console.log(err)

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

                            if(err == "stopped"){
                                if(typeof window.customVariables.stoppedDownloadsDone[uuid] == "undefined"){
                                    window.customVariables.stoppedDownloadsDone[uuid] = true

                                    try{
                                        await Plugins.Filesystem.deleteFile({
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

                                    if(err == "stopped"){
                                        return false
                                    }
                                    else{
                                        return this.spawnToast(language.get(this.state.lang, "fileWriteError", true, ["__NAME__"], [file.name]))
                                    }
                                }

                                chunksWrittenPlus()

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
                                
                                            this.spawnToast(language.get(this.state.lang, "fileIsNowAvailableOffline", true, ["__NAME__"], [file.name]))
        
                                            removeFromState()
        
                                            window.customFunctions.saveOfflineSavedFiles()
                                            
                                            return this.forceUpdate()
                                        }
                                        else{
                                            this.spawnToast(language.get(this.state.lang, "fileDownloadDone", true, ["__NAME__"], [file.name]))
        
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

export async function getThumbnail(file, thumbURL, ext){
    return new Promise(async (resolve, reject) => {
        if(Capacitor.isNative){
            if(this.state.settings.onlyWifi){
                let networkStatus = await Plugins.Network.getStatus()
    
                if(networkStatus.connectionType !== "wifi"){
                    reject("only wifi")

                    return this.spawnToast(language.get(this.state.lang, "onlyWifiError"))
                }
            }
        }
        else{
            return reject("not native")
        }

        let dirObj = {
            path: "ThumbnailCache/" + file.uuid,
            directory: FilesystemDirectory.External
        }

        let videoExts = ["mp4", "webm", "mov", "avi", "wmv"]
    
        await window.customVariables.thumbnailSemaphore.acquire()

        if(file.chunks > 32 && !videoExts.includes(ext)){
            window.customVariables.thumbnailSemaphore.release()

            return reject("too big")
        }

        let thumbnailFileName = file.name.toLowerCase()

        if(videoExts.includes(ext)){
            let nameEx = file.name.split(".")

            nameEx[nameEx.length - 1] = "jpg"

            thumbnailFileName = nameEx.join(".")
        }

        if(typeof window.customVariables.thumbnailCache[file.uuid] == "undefined"){
            if(thumbURL !== window.location.href){
                window.customVariables.thumbnailSemaphore.release()

                return reject("url changed")
            }

            const writeThumbnail = async (arrayBuffer) => {
                if(typeof arrayBuffer !== "object"){
                    window.customVariables.thumbnailSemaphore.release()

                    return reject("not arraybuffer")
                }

                try{
                    if(arrayBuffer.byteLength <= 0){
                        window.customVariables.thumbnailSemaphore.release()
    
                        return reject("invalid arraybuffer length")
                    }
                }
                catch(e){
                    window.customVariables.thumbnailSemaphore.release()
    
                    return reject(e)
                }

                workers.convertArrayBufferToBase64(arrayBuffer, async (b64Data) => {
                    try{
                        await Plugins.Filesystem.writeFile({
                            path: dirObj.path + "/" + thumbnailFileName,
                            directory: dirObj.directory,
                            data: b64Data,
                            recursive: true
                        })

                        var uri = await Plugins.Filesystem.getUri({
                            path: dirObj.path + "/" + thumbnailFileName,
                            directory: dirObj.directory
                        })
                    }
                    catch(e){
                        window.customVariables.thumbnailSemaphore.release()

                        return reject(e)
                    }

                    if(thumbURL !== window.location.href){
                        window.customVariables.thumbnailSemaphore.release()
        
                        return reject("url changed")
                    }

                    let imageURL = window.Ionic.WebView.convertFileSrc(uri.uri)

                    window.customVariables.thumbnailBlobCache[file.uuid] = imageURL
                    window.customVariables.thumbnailCache[file.uuid] = true

                    window.customVariables.thumbnailSemaphore.release()

                    return resolve(imageURL)
                })
            }

            if(videoExts.includes(ext)){ //video thumbnail
                this.downloadPreview(file, undefined, async (err, downloadData) => {
                    if(err){
                        window.customVariables.thumbnailSemaphore.release()
    
                        return reject(err)
                    }

                    downloadData = new Blob([downloadData], {
                        type: "image/png"
                    })
    
                    try{
                        var thumbnailData = await utils.getVideoCover(downloadData)
                    }
                    catch(e){
                        window.customVariables.thumbnailSemaphore.release()
    
                        return reject(e)
                    }

                    try{
                        var compressedImage = await new Promise((resolve, reject) => {
                            new Compressor(thumbnailData, {
                                quality: 0.6,
                                maxWidth: 256,
                                maxHeight: 256,
                                mimeType: "image/png",
                                success(result){
                                    return resolve(result)
                                },
                                error(err){
                                    return reject(err)
                                }
                            })
                        })
                    }
                    catch(e){
                        window.customVariables.thumbnailSemaphore.release()
    
                        return reject(e)
                    }
    
                    let fileReader = new FileReader()
    
                    fileReader.onload = (e) => {
                        let arrayBuffer = e.target.result
    
                        return writeThumbnail(arrayBuffer)
                    }
    
                    fileReader.onerror = (err) => {
                        window.customVariables.thumbnailSemaphore.release()
    
                        return reject(err)
                    }
    
                    fileReader.readAsArrayBuffer(compressedImage)
                }, 32, true)
            }
            else{
                this.downloadPreview(file, undefined, async (err, data) => {
                    if(err){
                        window.customVariables.thumbnailSemaphore.release()
    
                        return reject(err)
                    }
    
                    if(utils.canCompressThumbnail(ext)){
                        data = new Blob([data], {
                            type: "image/png"
                        })
        
                        try{
                            var compressedImage = await new Promise((resolve, reject) => {
                                new Compressor(data, {
                                    quality: 0.5,
                                    maxWidth: 256,
                                    maxHeight: 256,
                                    mimeType: "image/png",
                                    success(result){
                                        return resolve(result)
                                    },
                                    error(err){
                                        return reject(err)
                                    }
                                })
                            })
                        }
                        catch(e){
                            window.customVariables.thumbnailSemaphore.release()
        
                            return reject(e)
                        }
        
                        let fileReader = new FileReader()
        
                        fileReader.onload = (e) => {
                            let arrayBuffer = e.target.result
        
                            return writeThumbnail(arrayBuffer)
                        }
        
                        fileReader.onerror = (err) => {
                            window.customVariables.thumbnailSemaphore.release()
        
                            return reject(err)
                        }
        
                        fileReader.readAsArrayBuffer(compressedImage)
                    }
                    else{
                        return writeThumbnail(data)
                    }
                }, Infinity, true)
            }
        }
        else{
            try{
                var stat = await Plugins.Filesystem.stat({
                    path: dirObj.path + "/" + thumbnailFileName,
                    directory: dirObj.directory
                })
            }
            catch(e){
                window.customVariables.thumbnailSemaphore.release()

                delete window.customVariables.thumbnailCache[file.uuid]
                delete window.customVariables.thumbnailBlobCache[file.uuid]

                return reject(e)
            }

            if(typeof stat.uri !== "string" || typeof stat.mtime == "undefined" || typeof stat.size == "undefined"){
                window.customVariables.thumbnailSemaphore.release()

                delete window.customVariables.thumbnailCache[file.uuid]
                delete window.customVariables.thumbnailBlobCache[file.uuid]

                return reject("Thumbnail not found on device, it might have been deleted")
            }

            if(stat.uri.length <= 1 || stat.size <= 8){
                window.customVariables.thumbnailSemaphore.release()

                delete window.customVariables.thumbnailCache[file.uuid]
                delete window.customVariables.thumbnailBlobCache[file.uuid]

                return reject("Thumbnail not found on device, it might have been deleted")
            }

            if(thumbURL !== window.location.href){
                window.customVariables.thumbnailSemaphore.release()

                return reject("url changed")
            }

            let imageURL = window.Ionic.WebView.convertFileSrc(stat.uri)

            window.customVariables.thumbnailBlobCache[file.uuid] = imageURL
            window.customVariables.thumbnailCache[file.uuid] = true

            window.customVariables.thumbnailSemaphore.release()

            return resolve(imageURL)
        }
    })
}

export async function downloadPreview(file, progressCallback, callback, maxChunks = Infinity, isThumbnailDownload = false){
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
                return callback(null, utils.uInt8ArrayConcat(dataArray))
            }
        }
        else{
            return setTimeout(() => {
                write(index, data, callback)
            }, 5)
        }
    }

    let downloadInterval = setInterval(() => {
        currentIndex += 1

        let thisIndex = currentIndex

        if(isThumbnailDownload){
            window.customVariables.stopGettingPreviewData = false
        }

        if(thisIndex < file.chunks && thisIndex < maxChunks && !window.customVariables.stopGettingPreviewData){
            this.downloadFileChunk(file, thisIndex, 0, 64, (err, downloadIndex, downloadData) => {
                if(isThumbnailDownload){
                    window.customVariables.stopGettingPreviewData = false
                }

                if(err){
                    return callback(err)
                }

                write(downloadIndex, downloadData, callback)
            }, true)
        }
        else{
            if(window.customVariables.stopGettingPreviewData && !isThumbnailDownload){
                window.customVariables.isGettingPreviewData = false
                
                callback("stopped")
            }

            clearInterval(downloadInterval)
        }
    }, 100)
}