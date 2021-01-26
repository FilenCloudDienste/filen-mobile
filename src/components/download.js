import * as language from "../utils/language"
import * as workers from "../utils/workers"
import { Capacitor, FilesystemDirectory, Plugins } from "@capacitor/core"
import imageCompression from 'browser-image-compression';
import { call } from "ionicons/icons";

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

export async function downloadFileChunk(file, index, tries, maxTries, callback){
    if(tries >= maxTries){
		return callback(new Error("Max download retries reached for " + file.uuid + ", returning."))
	}

	if(index >= file.chunks){
		return callback(null, index)
    }

    if(typeof window.customVariables.stoppedDownloads[file.uuid] !== "undefined"){
        return callback("stopped")
    }

    await window.customVariables.downloadChunkSemaphore.acquire()

    utils.fetchWithTimeout(3600000, fetch(utils.getDownloadServer() + "/" + file.region + "/" + file.bucket + "/" + file.uuid + "/" + index, {
        method: "GET"
    })).then((response) => {
        response.arrayBuffer().then((res) => {
            if(typeof window.customVariables.stoppedDownloads[file.uuid] !== "undefined"){
                return callback("stopped")
            }

            try{
                if(res.byteLength){
                    if(res.byteLength > 1){
                        workers.decryptData(file.uuid, index, file.key, res, (decrypted) => {
                            window.customVariables.downloadChunkSemaphore.release()
    
                            return callback(null, index, decrypted)
                        })
                    }
                    else{
                        window.customVariables.downloadChunkSemaphore.release()

                        return setTimeout(() => {
                            this.downloadFileChunk(file, index, (tries + 1), maxTries, callback)
                        }, 1000)
                    }
                }
                else{
                    window.customVariables.downloadChunkSemaphore.release()

                    return setTimeout(() => {
                        this.downloadFileChunk(file, index, (tries + 1), maxTries, callback)
                    }, 1000)
                }
            }
            catch(e){
                console.log(e)

                window.customVariables.downloadChunkSemaphore.release()

                return setTimeout(() => {
                    this.downloadFileChunk(file, index, (tries + 1), maxTries, callback)
                }, 1000)
            }
        }).catch((err) => {
            console.log(err)

            window.customVariables.downloadChunkSemaphore.release()

            return setTimeout(() => {
                this.downloadFileChunk(file, index, (tries + 1), maxTries, callback)
            }, 1000)
        })
    }).catch((err) => {
        console.log(err)

        window.customVariables.downloadChunkSemaphore.release()

        return setTimeout(() => {
            this.downloadFileChunk(file, index, (tries + 1), maxTries, callback)
        }, 1000)
    })
}

export async function writeChunkToFile(file, dirObj, uuid, index, data, callback){
    if(!window.customVariables.downloads[uuid]){
        return callback(new Error("Download does not exist"))
    }

    if(window.customVariables.downloads[uuid].nextWriteChunk !== index){
        return setTimeout(() => {
            this.writeChunkToFile(file, dirObj, uuid, index, data, callback)
        }, 50)
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
    
                return callback(null)
            }
            catch(e){
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
    
                return callback(null)
            }
            catch(e){
                return callback(e)
            }
        }
    })
}

export async function queueFileDownload(file){
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

    window.customVariables.stoppedDownloads[uuid] = undefined
    window.customVariables.stoppedDownloadsDone[uuid] = undefined

	if(typeof file.makeOffline !== "undefined"){
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

        const addToState = () => {
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
                makeOffline: file.makeOffline
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
                makeOffline: file.makeOffline
			}

			return this.setState({
				downloads: currentDownloads,
				downloadsCount: (this.state.downloadsCount + 1)
			})
		}

		const removeFromState = () => {
			let currentDownloads = this.state.downloads

			delete currentDownloads[uuid]
			delete window.customVariables.downloads[uuid]

			return this.setState({
				downloads: currentDownloads,
				downloadsCount: (this.state.downloadsCount - 1)
			})
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
				})
			}
			catch(e){
				return console.log(e)
			}
        }

		addToState()

        this.spawnToast(language.get(this.state.lang, "fileDownloadStarted", true, ["__NAME__"], [file.name]))

        await window.customVariables.downloadSemaphore.acquire()
        
        let downloadInterval = setInterval(() => {
            currentIndex += 1

            let thisIndex = currentIndex

            if(thisIndex < file.chunks && typeof window.customVariables.downloads[uuid] !== "undefined"){
                this.downloadFileChunk(file, thisIndex, 0, 10, async (err, downloadIndex, downloadData) => {
                    if(err){
                        console.log(err)

                        window.customVariables.downloadSemaphore.release()

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

                                window.customVariables.downloadSemaphore.release()

                                removeFromState()

                                return this.spawnToast(language.get(this.state.lang, "fileWriteError", true, ["__NAME__"], [file.name]))
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
                                    if(typeof window.customVariables.downloads[uuid].makeOffline !== "undefined"){
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
    
                                        window.customVariables.downloadSemaphore.release()
                                        
                                        return this.forceUpdate()
                                    }
                                    else{
                                        this.spawnToast(language.get(this.state.lang, "fileDownloadDone", true, ["__NAME__"], [file.name]))
    
                                        window.customVariables.downloadSemaphore.release()
    
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
                clearInterval(downloadInterval)
            }
        }, 100)
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

        if(file.chunks > 16 && !videoExts.includes(ext)){
            window.customVariables.thumbnailSemaphore.release()

            return reject("too big")
        }

        let thumbnailFileName = file.name

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

            if(videoExts.includes(ext)){
                this.downloadPreview(file, undefined, async (err, downloadData) => {
                    if(err){
                        window.customVariables.thumbnailSemaphore.release()
    
                        return reject(err)
                    }

                    downloadData = new File([new Blob([downloadData], {
                        type: file.mime
                    })], file.name, {
                        lastModified: new Date(),
                        type: file.mime
                    })
    
                    try{
                        var thumbnailData = await utils.getVideoCover(downloadData)
                    }
                    catch(e){
                        window.customVariables.thumbnailSemaphore.release()
    
                        return reject(e)
                    }

                    thumbnailData = new File([thumbnailData], thumbnailFileName, {
                        lastModified: new Date(),
                        type: "image/jpeg"
                    })

                    try{
                        var compressedImage = await imageCompression(thumbnailData, {
                            maxWidthOrHeight: 200,
                            useWebWorker: true
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
                }, 5, true)
            }
            else{
                this.downloadPreview(file, undefined, async (err, data) => {
                    if(err){
                        window.customVariables.thumbnailSemaphore.release()
    
                        return reject(err)
                    }
    
                    if(utils.canCompressThumbnail(ext)){
                        data = new File([new Blob([data], {
                            type: file.mime
                        })], thumbnailFileName, {
                            lastModified: new Date(),
                            type: file.mime
                        })
        
                        try{
                            var compressedImage = await imageCompression(data, {
                                maxWidthOrHeight: 200,
                                useWebWorker: true
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

                return reject(e)
            }

            if(typeof stat.size == "undefined"){
                window.customVariables.thumbnailSemaphore.release()

                delete window.customVariables.thumbnailCache[file.uuid]

                return reject("Thumbnail not found on device, it might have been deleted")
            }

            if(stat.size <= 0){
                window.customVariables.thumbnailSemaphore.release()

                delete window.customVariables.thumbnailCache[file.uuid]

                return reject("Thumbnail not found on device, it might have been deleted")
            }

            try{
                var uri = await Plugins.Filesystem.getUri({
                    path: dirObj.path + "/" + thumbnailFileName,
                    directory: dirObj.directory
                })
            }
            catch(e){
                window.customVariables.thumbnailSemaphore.release()

                delete window.customVariables.thumbnailCache[file.uuid]

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
            }, 50)
        }
    }

    let downloadInterval = setInterval(() => {
        currentIndex += 1

        let thisIndex = currentIndex

        if(isThumbnailDownload){
            window.customVariables.stopGettingPreviewData = false
        }

        if(thisIndex < file.chunks && thisIndex < maxChunks && !window.customVariables.stopGettingPreviewData){
            this.downloadFileChunk(file, thisIndex, 0, 32, (err, downloadIndex, downloadData) => {
                if(isThumbnailDownload){
                    window.customVariables.stopGettingPreviewData = false
                }

                if(err){
                    return callback(err)
                }

                write(downloadIndex, downloadData, callback)
            })
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