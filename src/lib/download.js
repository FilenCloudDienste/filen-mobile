import ReactNativeBlobUtil from "react-native-blob-util"
import { getDownloadServer, Semaphore, getFileExt } from "./helpers"
import RNFS from "react-native-fs"
import { Platform, DeviceEventEmitter } from "react-native"
import { useStore } from "./state"
import { i18n } from "../i18n/i18n"
import { storage } from "./storage"
import { showToast } from "../components/Toasts"
import BackgroundTimer from "react-native-background-timer"
import { addItemToOfflineList } from "./services/offline"
import { getItemOfflinePath } from "./services/offline"

const cachedGetDownloadPath = {}
const downloadSemaphore = new Semaphore(3)
const maxThreads = 32

export const downloadFileChunk = ({ region, bucket, uuid, index, key, version }) => {
    return new Promise((resolve, reject) => {
        const maxTries = 3
        let tries = 0
        const triesTimeout = 1000
        const requestTimeout = 3600000

        const download = async () => {
            if(tries >= maxTries){
                return reject(new Error("Max tries reached for download of UUID " + uuid))
            }

            tries += 1

            try{
                return resolve(await global.nodeThread.downloadAndDecryptChunk({
                    url: getDownloadServer() + "/" + region + "/" + bucket + "/" + uuid + "/" + index,
                    timeout: requestTimeout,
                    key,
                    version
                }))
            }
            catch(e){
                console.log(e)

                return BackgroundTimer.setTimeout(download, triesTimeout)
            }
        }

        download()
    })
}

export const getDownloadPath = ({ type = "temp" }) => {
    return new Promise((resolve, reject) => {
        const cacheKey = Platform.OS + ":" + type

        if(typeof cachedGetDownloadPath[cacheKey] !== "undefined"){
            return resolve(cachedGetDownloadPath[cacheKey])
        }

        if(Platform.OS == "android"){
            if(type == "temp"){
                return resolve(RNFS.TemporaryDirectoryPath + (RNFS.TemporaryDirectoryPath.slice(-1) == "/" ? "" : "/"))
            }
            else if(type == "thumbnail"){
                const root = RNFS.DocumentDirectoryPath + (RNFS.DocumentDirectoryPath.slice(-1) == "/" ? "" : "/")
                const path = root + "thumbnailCache"

                RNFS.mkdir(path).then(() => {
                    cachedGetDownloadPath[cacheKey] = path + "/"

                    return resolve(path + "/")
                }).catch(reject)
            }
            else if(type == "offline"){
                const root = RNFS.DocumentDirectoryPath + (RNFS.DocumentDirectoryPath.slice(-1) == "/" ? "" : "/")
                const path = root + "offlineFiles"

                RNFS.mkdir(path).then(() => {
                    cachedGetDownloadPath[cacheKey] = path + "/"

                    return resolve(path + "/")
                }).catch(reject)
            }
            else if(type == "download"){
                return resolve(RNFS.DownloadDirectoryPath + (RNFS.DownloadDirectoryPath.slice(-1) == "/" ? "" : "/"))
            }
        }
        else{
            if(type == "temp"){
                return resolve(RNFS.TemporaryDirectoryPath + (RNFS.TemporaryDirectoryPath.slice(-1) == "/" ? "" : "/"))
            }
            else if(type == "thumbnail"){
                const root = RNFS.LibraryDirectoryPath + (RNFS.LibraryDirectoryPath.slice(-1) == "/" ? "" : "/") + "NoCloud/"
                const path = root + "thumbnailCache"

                RNFS.mkdir(path).then(() => {
                    cachedGetDownloadPath[cacheKey] = path + "/"

                    return resolve(path + "/")
                }).catch(reject)
            }
            else if(type == "offline"){
                const root = RNFS.LibraryDirectoryPath + (RNFS.LibraryDirectoryPath.slice(-1) == "/" ? "" : "/") + "NoCloud/"
                const path = root + "offlineFiles"

                RNFS.mkdir(path).then(() => {
                    cachedGetDownloadPath[cacheKey] = path + "/"

                    return resolve(path + "/")
                }).catch(reject)
            }
            else if(type == "download"){
                const root = RNFS.DocumentDirectoryPath + (RNFS.DocumentDirectoryPath.slice(-1) == "/" ? "" : "/")
                const path = root + "Downloads"

                RNFS.mkdir(path).then(() => {
                    cachedGetDownloadPath[cacheKey] = path + "/"

                    return resolve(path + "/")
                }).catch(reject)
            }
        }
    })
}

export const getItemDownloadName = (path, item) => {
    return path + item.name + "_" + item.uuid + "." + getFileExt(item.name)
}

export const queueFileDownload = async ({ file, storeOffline = false, optionalCallback = undefined, saveToGalleryCallback = undefined, isOfflineUpdate = false }) => {
    const callOptionalCallback = (...args) => {
        if(typeof optionalCallback == "function"){
            optionalCallback(...args)
        }
    }

    const appState = useStore.getState()

    if(!appState.netInfo.isInternetReachable || !appState.netInfo.isInternetReachable){
        callOptionalCallback(new Error("device is offline"))

        return showToast({ message: i18n(storage.getString("lang"), "deviceOffline") })
    }

    if(typeof saveToGalleryCallback == "function"){
        try{
            const offlinePath = await getDownloadPath({ type: "offline" })
    
            if((await RNFS.exists(getItemOfflinePath(offlinePath, file)))){
                callOptionalCallback(null, getItemOfflinePath(offlinePath, file))

                return saveToGalleryCallback(getItemOfflinePath(offlinePath, file))
            }
        }
        catch(e){
            console.log(e)
        }
    }

    const addToState = () => {
        const currentDownloads = useStore.getState().downloads

        if(typeof currentDownloads[file.uuid] == "undefined"){
            currentDownloads[file.uuid] = {
                file,
                chunksDone: 0,
                loaded: 0,
                stopped: false,
                paused: false
            }
        
            useStore.setState({
                downloads: currentDownloads
            })
        }

        return true
    }

    const removeFromState = () => {
        const currentDownloads = useStore.getState().downloads
        
        if(typeof currentDownloads[file.uuid] !== "undefined"){
            delete currentDownloads[file.uuid]

            useStore.setState({
                downloads: currentDownloads
            })
        }

        downloadSemaphore.release()

        return true
    }

    const updateProgress = (chunksDone) => {
        const currentDownloads = useStore.getState().downloads

        if(typeof currentDownloads[file.uuid] !== "undefined"){
            currentDownloads[file.uuid].chunksDone = chunksDone

            useStore.setState({
                downloads: currentDownloads
            })
        }

        return true
    }

    const currentDownloads = useStore.getState().downloads

    if(typeof currentDownloads[file.uuid] !== "undefined"){
        callOptionalCallback(new Error("already downloading this file"))

        return showToast({ message: i18n(storage.getString("lang"), "alreadyDownloadingFile", true, ["__NAME__"], [file.name]) })
    }

    await downloadSemaphore.acquire()

    addToState()

    try{
        var downloadPath = await getDownloadPath({ type: (storeOffline ? "offline" : "download") })
    }
    catch(e){
        removeFromState()

        console.log(e)

        callOptionalCallback(new Error("could not get download path"))

        return showToast({ message: i18n(storage.getString("lang"), "couldNotGetDownloadPath") })
    }

    try{
        if(storage.getBoolean("onlyWifiDownloads:" + storage.getString("email")) && appState.netInfo.type !== "wifi"){
            return showToast({ message: i18n(storage.getString("lang"), "onlyWifiDownloads") })
        }
    }
    catch(e){
        console.log(e)
    }

    const filePath = downloadPath + file.name

    downloadWholeFileFSStream({
        file,
        progressCallback: (chunksDone) => {
            updateProgress(chunksDone)
        }
    }).then(async (path) => {
        if(typeof saveToGalleryCallback == "function"){
            removeFromState()

            callOptionalCallback(null, path)
            
            return saveToGalleryCallback(path)
        }

        if(storeOffline){
            const offlinePath = getItemOfflinePath(downloadPath, file)

            try{
                if((await RNFS.exists(offlinePath))){
                    await RNFS.unlink(offlinePath)
                }
            }
            catch(e){
                console.log(e)
            }

            RNFS.moveFile(path, offlinePath).then(() => {
                addItemToOfflineList({
                    item: file
                }).then(() => {
                    removeFromState()

                    DeviceEventEmitter.emit("event", {
                        type: "mark-item-offline",
                        data: {
                            uuid: file.uuid,
                            value: true
                        }
                    })

                    if(isOfflineUpdate){
                        showToast({ message: i18n(storage.getString("lang"), "fileStoredOfflineUpdate", true, ["__NAME__"], [file.name]) })
                    }
                    else{
                        showToast({ message: i18n(storage.getString("lang"), "fileStoredOffline", true, ["__NAME__"], [file.name]) })
                    }

                    callOptionalCallback(null, offlinePath)

                    return console.log(file.name + " download done")
                }).catch((err) => {
                    removeFromState()
    
                    showToast({ message: err.toString() })

                    callOptionalCallback(err)
    
                    return console.log(err)
                })
            }).catch((err) => {
                removeFromState()

                showToast({ message: err.toString() })

                callOptionalCallback(err)

                return console.log(err)
            })
        }
        else{
            if(Platform.OS == "android"){
                if(Platform.constants.Version >= 29){
                    ReactNativeBlobUtil.MediaCollection.copyToMediaStore({
                        name: file.name,
                        parentFolder: "",
                        mimeType: file.mime
                    }, "Download", path).then(() => {
                        RNFS.unlink(path).then(() => {
                            removeFromState()

                            showToast({ message: i18n(storage.getString("lang"), "fileDownloaded", true, ["__NAME__"], [file.name]) })

                            callOptionalCallback(null, "")
    
                            return console.log(file.name + " download done")
                        }).catch((err) => {
                            removeFromState()

                            showToast({ message: err.toString() })

                            callOptionalCallback(err)
    
                            return console.log(err)
                        })
                    }).catch((err) => {
                        removeFromState()

                        showToast({ message: err.toString() })

                        callOptionalCallback(err)
    
                        return console.log(err)
                    })
                }
                else{
                    try{
                        if((await RNFS.exists(filePath))){
                            await RNFS.unlink(filePath)
                        }
                    }
                    catch(e){
                        console.log(e)
                    }

                    RNFS.moveFile(path, filePath).then(() => {
                        removeFromState()

                        showToast({ message: i18n(storage.getString("lang"), "fileDownloaded", true, ["__NAME__"], [file.name]) })

                        callOptionalCallback(null, filePath)
        
                        return console.log(file.name + " download done")
                    }).catch((err) => {
                        removeFromState()

                        showToast({ message: err.toString() })

                        callOptionalCallback(err)
        
                        return console.log(err)
                    })
                }
            }
            else{
                try{
                    if((await RNFS.exists(filePath))){
                        await RNFS.unlink(filePath)
                    }
                }
                catch(e){
                    console.log(e)
                }

                RNFS.moveFile(path, filePath).then(() => {
                    removeFromState()

                    showToast({ message: i18n(storage.getString("lang"), "fileDownloaded", true, ["__NAME__"], [file.name]) })

                    callOptionalCallback(null, filePath)
    
                    return console.log(file.name + " download done")
                }).catch((err) => {
                    removeFromState()

                    showToast({ message: err.toString() })

                    callOptionalCallback(err)
    
                    return console.log(err)
                })
            }
        }
    }).catch((err) => {
        removeFromState()

        if(err !== "stopped"){
            showToast({ message: err.toString() })

            console.log(err)
        }

        return callOptionalCallback(err)
    })
}

export const downloadWholeFileFSStream = ({ file, path = undefined, progressCallback = undefined, maxChunks = Infinity }) => {
    return new Promise(async (resolve, reject) => {
        if(typeof path == "undefined"){
            path = RNFS.TemporaryDirectoryPath + (RNFS.TemporaryDirectoryPath.slice(-1) == "/" ? "" : "/") + file.name + "_" + file.uuid + "." + getFileExt(file.name)
        }

        try{
            if((await RNFS.exists(path))){
                return resolve(path)
            }
        }
        catch(e){
            //console.log(e)
        }

        try{
            var stream = await ReactNativeBlobUtil.fs.writeStream(path, "base64", false)
        }
        catch(e){
            return reject(e)
        }

        const isPaused = () => {
            const currentDownloads = useStore.getState().downloads
    
            if(typeof currentDownloads[file.uuid] == "undefined"){
                return false
            }
    
            return currentDownloads[file.uuid].paused
        }
    
        const isStopped = () => {
            const currentDownloads = useStore.getState().downloads
    
            if(typeof currentDownloads[file.uuid] == "undefined"){
                return false
            }
    
            return currentDownloads[file.uuid].stopped
        }

        let chunksDone = 0
        let currentIndex = -1
        let err = undefined
        let writeIndex = 0
        let didStop = false

        const stopInterval = setInterval(async () => {
            if(isStopped() && !didStop){
                didStop = true

                clearInterval(stopInterval)

                try{
                    if((await RNFS.exists(path))){
                        await RNFS.unlink(path)
                    }
                }
                catch(e){
                    //console.log(e)
                }
    
                return reject("stopped")
            }
        }, 100)

        const download = (index) => {
            return new Promise(async (resolve, reject) => {
                if(isPaused()){
                    await new Promise((resolve) => {
                        const wait = setInterval(() => {
                            if(!isPaused() || isStopped()){
                                clearInterval(wait)
    
                                return resolve()
                            }
                        }, 250)
                    })
                }
    
                if(didStop){
                    return reject("stopped")
                }

                downloadFileChunk({
                    region: file.region,
                    bucket: file.bucket,
                    uuid: file.uuid,
                    index,
                    key: file.key,
                    version: file.version
                }).then((data) => {
                    let writeInterval = setInterval(() => {
                        if(writeIndex == index){
                            clearInterval(writeInterval)

                            stream.write(data).then(() => {
                                writeIndex = index + 1

                                if(typeof progressCallback == "function"){
                                    progressCallback(index + 1)
                                }
        
                                return resolve(index)
                            }).catch(reject)
                        }
                    }, 10)
                }).catch(reject)
            })
        }
  
        while(file.chunks > chunksDone){
            let chunksLeft = (file.chunks - chunksDone)
            let chunksToDownload = maxThreads
            
            if(chunksLeft >= maxThreads){
                chunksToDownload = maxThreads
            }
            else{
                chunksToDownload = chunksLeft
            }
            
            const downloadChunks = []
            
            for(let i = 0; i < chunksToDownload; i++){
                currentIndex += 1

                downloadChunks.push(download(currentIndex))
            }
            
            try{
                await Promise.all(downloadChunks)
            }
            catch(e){
                err = e

                break
            }
            
            chunksDone += downloadChunks.length
        }

        stream.close()

        clearInterval(stopInterval)

        if(typeof err !== "undefined"){
            try{
                if((await RNFS.exists(path))){
                    await RNFS.unlink(path)
                }
            }
            catch(e){
                //console.log(e)
            }

            return reject(err)
        }

        return resolve(path)
    })
}