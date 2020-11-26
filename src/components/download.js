import * as language from "../utils/language"
import * as workers from "../utils/workers"
import { Capacitor, FilesystemDirectory, Plugins } from "@capacitor/core"
import { call } from "ionicons/icons"

const utils = require("../utils/utils")

export async function getDownloadDir(makeOffline, fileName, callback){
    if(Capacitor.platform == "android"){
        let path = "Downloads"
        let directory = FilesystemDirectory.External

        if(makeOffline){
            path = "OfflineFiles/" + fileName
        }

        try{
            await Plugins.Filesystem.mkdir({
                path,
                directory,
                recursive: true 
            })

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
        return callback(new Error("ios not yet implemented"))
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

    await window.customVariables.downloadChunkSemaphore.acquire()
    
    fetch(utils.getDownloadServer() + "/" + file.region + "/" + file.bucket + "/" + file.uuid + "/" + index, {
        method: "GET"
    }).then((response) => {
        response.arrayBuffer().then((res) => {
            try{
                if(res.byteLength){
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

export function queueFileDownload(file){
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

	if(typeof file.makeOffline !== "undefined"){
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
                this.downloadFileChunk(file, thisIndex, 0, 10, (err, downloadIndex, downloadData) => {
                    if(err){
                        console.log(err)

                        window.customVariables.downloadSemaphore.release()

                        removeFromState()

                        return this.spawnToast(language.get(this.state.lang, "fileDownloadError", true, ["__NAME__"], [file.name]))
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

export async function downloadPreview(file, progressCallback, callback){
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

			if(chunksDone == file.chunks){
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

		if(thisIndex < file.chunks){
			this.downloadFileChunk(file, thisIndex, 0, 10, (err, downloadIndex, downloadData) => {
				if(err){
					return callback(err)
				}

				write(downloadIndex, downloadData, callback)
			})
		}
		else{
			clearInterval(downloadInterval)
		}
	}, 100)
}