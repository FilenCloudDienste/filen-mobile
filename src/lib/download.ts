import ReactNativeBlobUtil from "react-native-blob-util"
import { Semaphore, getFileExt, randomIdUnsafe } from "./helpers"
import RNFS from "react-native-fs"
import { Platform, DeviceEventEmitter } from "react-native"
import { useStore } from "./state"
import { i18n } from "../i18n/i18n"
import storage from "./storage"
import { showToast } from "../components/Toasts"
import BackgroundTimer from "react-native-background-timer"
import { addItemToOfflineList } from "./services/offline"
import { getItemOfflinePath } from "./services/offline"
import DeviceInfo from "react-native-device-info"
import { clearCacheDirectories } from "./setup"
import type { Item } from "./services/items"

const downloadSemaphore = new Semaphore(3)
const maxThreads = 16
const downloadThreadsSemaphore = new Semaphore(maxThreads)

export const getDownloadPath = ({ type = "temp" }: { type: string }): Promise<string> => {
    return new Promise((resolve, reject) => {
        if(Platform.OS == "android"){
            if(type == "temp"){
                return resolve(ReactNativeBlobUtil.fs.dirs.CacheDir + "/")
            }
            else if(type == "thumbnail"){
                const root = ReactNativeBlobUtil.fs.dirs.DocumentDir + "/"
                const path = root + "thumbnailCache"

                ReactNativeBlobUtil.fs.mkdir(path).then(() => {
                    return resolve(path + "/")
                }).catch((err) => {
                    if(err.toString().toLowerCase().indexOf("already exists") !== -1){
                        return resolve(path + "/")
                    }

                    return reject(err)
                })
            }
            else if(type == "offline"){
                const root = ReactNativeBlobUtil.fs.dirs.DocumentDir + "/"
                const path = root + "offlineFiles"

                ReactNativeBlobUtil.fs.mkdir(path).then(() => {
                    return resolve(path + "/")
                }).catch((err) => {
                    if(err.toString().toLowerCase().indexOf("already exists") !== -1){
                        return resolve(path + "/")
                    }

                    return reject(err)
                })
            }
            else if(type == "misc"){
                const root = ReactNativeBlobUtil.fs.dirs.DocumentDir + "/"
                const path = root + "misc"

                ReactNativeBlobUtil.fs.mkdir(path).then(() => {
                    return resolve(path + "/")
                }).catch((err) => {
                    if(err.toString().toLowerCase().indexOf("already exists") !== -1){
                        return resolve(path + "/")
                    }

                    return reject(err)
                })
            }
            else if(type == "cachedDownloads"){
                const root = ReactNativeBlobUtil.fs.dirs.DocumentDir + "/"
                const path = root + "cachedDownloads"

                ReactNativeBlobUtil.fs.mkdir(path).then(() => {
                    return resolve(path + "/")
                }).catch((err) => {
                    if(err.toString().toLowerCase().indexOf("already exists") !== -1){
                        return resolve(path + "/")
                    }

                    return reject(err)
                })
            }
            else if(type == "download"){
                return resolve(ReactNativeBlobUtil.fs.dirs.DownloadDir + "/")
            }
            else if(type == "node"){
                const root = ReactNativeBlobUtil.fs.dirs.DocumentDir + "/"
                const path = root + "node"

                ReactNativeBlobUtil.fs.mkdir(path).then(() => {
                    return resolve(path + "/")
                }).catch((err) => {
                    if(err.toString().toLowerCase().indexOf("already exists") !== -1){
                        return resolve(path + "/")
                    }

                    return reject(err)
                })
            }
        }
        else{
            if(type == "temp"){
                return resolve(ReactNativeBlobUtil.fs.dirs.CacheDir + "/")
            }
            else if(type == "thumbnail"){
                const root = ReactNativeBlobUtil.fs.dirs.DocumentDir + "/"
                const path = root + "thumbnailCache"

                ReactNativeBlobUtil.fs.mkdir(path).then(() => {
                    return resolve(path + "/")
                }).catch((err) => {
                    if(err.toString().toLowerCase().indexOf("already exists") !== -1){
                        return resolve(path + "/")
                    }

                    return reject(err)
                })
            }
            else if(type == "offline"){
                const root = ReactNativeBlobUtil.fs.dirs.DocumentDir + "/"
                const path = root + "offlineFiles"

                ReactNativeBlobUtil.fs.mkdir(path).then(() => {
                    return resolve(path + "/")
                }).catch((err) => {
                    if(err.toString().toLowerCase().indexOf("already exists") !== -1){
                        return resolve(path + "/")
                    }

                    return reject(err)
                })
            }
            else if(type == "misc"){
                const root = ReactNativeBlobUtil.fs.dirs.DocumentDir + "/"
                const path = root + "misc"

                ReactNativeBlobUtil.fs.mkdir(path).then(() => {
                    return resolve(path + "/")
                }).catch((err) => {
                    if(err.toString().toLowerCase().indexOf("already exists") !== -1){
                        return resolve(path + "/")
                    }

                    return reject(err)
                })
            }
            else if(type == "cachedDownloads"){
                const root = ReactNativeBlobUtil.fs.dirs.DocumentDir + "/"
                const path = root + "cachedDownloads"

                ReactNativeBlobUtil.fs.mkdir(path).then(() => {
                    return resolve(path + "/")
                }).catch((err) => {
                    if(err.toString().toLowerCase().indexOf("already exists") !== -1){
                        return resolve(path + "/")
                    }

                    return reject(err)
                })
            }
            else if(type == "download"){
                const root = ReactNativeBlobUtil.fs.dirs.DocumentDir + "/"
                const path = root + "Downloads"

                ReactNativeBlobUtil.fs.mkdir(path).then(() => {
                    return resolve(path + "/")
                }).catch((err) => {
                    if(err.toString().toLowerCase().indexOf("already exists") !== -1){
                        return resolve(path + "/")
                    }

                    return reject(err)
                })
            }
        }
    })
}

export interface QueueFileDownload {
    file: Item,
    storeOffline?: boolean,
    optionalCallback?: Function,
    saveToGalleryCallback?: Function,
    isOfflineUpdate?: boolean,
    isPreview?: boolean,
    showNotification?: boolean
}

export const queueFileDownload = async ({ file, storeOffline = false, optionalCallback = undefined, saveToGalleryCallback = undefined, isOfflineUpdate = false, isPreview = false, showNotification = false }: QueueFileDownload) => {
    let didStop = false

    const callOptionalCallback = (...args: any) => {
        if(typeof optionalCallback == "function"){
            optionalCallback(...args)
        }
    }

    const netInfo = useStore.getState().netInfo

    if(!netInfo.isInternetReachable || !netInfo.isInternetReachable){
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
                id: Math.random().toString().slice(3),
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

        if(!isPreview){
            downloadSemaphore.release()
        }

        return true
    }

    const isStopped = () => {
        const currentDownloads = useStore.getState().downloads

        if(typeof currentDownloads[file.uuid] == "undefined"){
            return false
        }

        return currentDownloads[file.uuid].stopped
    }

    const currentDownloads = useStore.getState().downloads

    if(typeof currentDownloads[file.uuid] !== "undefined"){
        callOptionalCallback(new Error("already downloading this file"))

        return showToast({ message: i18n(storage.getString("lang"), "alreadyDownloadingFile", true, ["__NAME__"], [file.name]) })
    }

    addToState()

    const stopInterval = BackgroundTimer.setInterval(async () => {
        if(isStopped() && !didStop){
            didStop = true

            removeFromState()

            BackgroundTimer.clearInterval(stopInterval)
        }
    }, 100)

    if(!isPreview){
        await downloadSemaphore.acquire()
    }

    if(didStop){
        callOptionalCallback("stopped")

        return false
    }

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
        if(storage.getBoolean("onlyWifiDownloads:" + storage.getNumber("userId")) && netInfo.type !== "wifi"){
            return showToast({ message: i18n(storage.getString("lang"), "onlyWifiDownloads") })
        }
    }
    catch(e){
        console.log(e)
    }

    const filePath = downloadPath + file.name

    downloadFile(file).then(async (path) => {
        BackgroundTimer.clearInterval(stopInterval)

        if(isPreview){
            removeFromState()

            return callOptionalCallback(null, path)
        }

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
                        if(showNotification || useStore.getState().imagePreviewModalVisible){
                            showToast({ message: i18n(storage.getString("lang"), "fileStoredOfflineUpdate", true, ["__NAME__"], [file.name]) })
                        }
                    }
                    else{
                        if(showNotification || useStore.getState().imagePreviewModalVisible){
                            showToast({ message: i18n(storage.getString("lang"), "fileStoredOffline", true, ["__NAME__"], [file.name]) })
                        }
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

                            if(showNotification || useStore.getState().imagePreviewModalVisible){
                                showToast({ message: i18n(storage.getString("lang"), "fileDownloaded", true, ["__NAME__"], [file.name]) })
                            }

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

                        if(showNotification || useStore.getState().imagePreviewModalVisible){
                            showToast({ message: i18n(storage.getString("lang"), "fileDownloaded", true, ["__NAME__"], [file.name]) })
                        }

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

                    if(showNotification || useStore.getState().imagePreviewModalVisible){
                        showToast({ message: i18n(storage.getString("lang"), "fileDownloaded", true, ["__NAME__"], [file.name]) })
                    }

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

        BackgroundTimer.clearInterval(stopInterval)

        if(err !== "stopped"){
            showToast({ message: err.toString() })

            console.log(err)
        }

        return callOptionalCallback(err)
    })
}

export const downloadFile = (file: Item): Promise<string> => {
    return new Promise((resolve, reject) => {
        getDownloadPath({ type: "cachedDownloads" }).then(async (cachedDownloadsPath) => {
            const cachePath = cachedDownloadsPath + file.uuid + "." + getFileExt(file.name)

            try{
                if((await ReactNativeBlobUtil.fs.exists(cachePath))){
                    return resolve(cachePath)
                }
            }
            catch(e){
                //console.log(e)
            }

            try{
                if((await DeviceInfo.getFreeDiskStorage()) < (((1024 * 1024) * 256) + file.size)){ // We keep a 256 MB buffer in case previous downloads are still being written to the FS
                    await clearCacheDirectories()
    
                    await new Promise((resolve) => BackgroundTimer.setTimeout(() => resolve(true), 5000))
    
                    if((await DeviceInfo.getFreeDiskStorage()) < (((1024 * 1024) * 256) + file.size)){ // We keep a 256 MB buffer in case previous downloads are still being written to the FS
                        return reject(i18n(storage.getString("lang"), "deviceOutOfStorage"))
                    }
                }
            }
            catch(e){
                return reject(e)
            }

            DeviceEventEmitter.emit("download", {
                type: "start",
                data: file
            })
    
            const tmpPath = ReactNativeBlobUtil.fs.dirs.CacheDir + "/" + randomIdUnsafe() + file.uuid + "." + getFileExt(file.name)
            let currentWriteIndex = 0
            let didStop = false
    
            const stopInterval = BackgroundTimer.setInterval(async () => {
                if(isStopped() && !didStop){
                    didStop = true
    
                    BackgroundTimer.clearInterval(stopInterval)
                }
            }, 10)

            const cleanup = () => {
                BackgroundTimer.clearInterval(stopInterval)

                RNFS.readDir(ReactNativeBlobUtil.fs.dirs.CacheDir).then((items) => {
                    items.forEach((item) => {
                        if(!item.isDirectory()){
                            if(item.name.indexOf(file.uuid + ".chunk") !== -1){
                                ReactNativeBlobUtil.fs.unlink(item.path).catch(console.log)
                            }
                        }
                    })
                }).catch(console.log)
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
    
            const downloadTask = (index: number): Promise<{ index: number, path: string }> => {
                return new Promise(async (resolve, reject) => {
                    if(isPaused()){
                        await new Promise((resolve) => {
                            const wait = BackgroundTimer.setInterval(() => {
                                if(!isPaused() || isStopped()){
                                    BackgroundTimer.clearInterval(wait)
        
                                    return resolve(true)
                                }
                            }, 10)
                        })
                    }
        
                    if(didStop){
                        return reject("stopped")
                    }
    
                    const destPath = ReactNativeBlobUtil.fs.dirs.CacheDir + "/" + randomIdUnsafe() + "." + file.uuid + ".chunk." + index
    
                    global.nodeThread.downloadDecryptAndWriteFileChunk({
                        destPath,
                        uuid: file.uuid,
                        region: file.region,
                        bucket: file.bucket,
                        index,
                        key: file.key,
                        version: file.version
                    }).then(() => {
                        return resolve({
                            index,
                            path: destPath
                        })
                    }).catch(reject)
                })
            }
    
            const write = (index: number, path: string) => {
                if(index !== currentWriteIndex){
                    return BackgroundTimer.setTimeout(() => {
                        write(index, path)
                    }, 10)
                }
    
                if(index == 0){
                    ReactNativeBlobUtil.fs.mv(path, tmpPath).then(() => {
                        currentWriteIndex += 1
    
                        ReactNativeBlobUtil.fs.unlink(path).catch(console.log)
                    }).catch(reject)
                }
                else{
                    global.nodeThread.appendFileToFile({
                        first: tmpPath,
                        second: path
                    }).then(() => {
                        currentWriteIndex += 1
    
                        ReactNativeBlobUtil.fs.unlink(path).catch(console.log)
                    }).catch(reject)
                }
            }

            DeviceEventEmitter.emit("download", {
                type: "started",
                data: file
            })
    
            try{
                await new Promise((resolve, reject) => {
                    let done = 0
    
                    for(let i = 0; i < file.chunks; i++){
                        downloadThreadsSemaphore.acquire().then(() => {
                            downloadTask(i).then(({ index, path }) => {
                                write(index, path)
    
                                done += 1
    
                                downloadThreadsSemaphore.release()
    
                                if(done >= file.chunks){
                                    return resolve(true)
                                }
                            }).catch((err) => {
                                downloadThreadsSemaphore.release()
    
                                return reject(err)
                            })
                        })
                    }
                })
    
                await new Promise((resolve) => {
                    if(currentWriteIndex >= file.chunks){
                        return resolve(true)
                    }
    
                    const wait = BackgroundTimer.setInterval(() => {
                        if(currentWriteIndex >= file.chunks){
                            clearInterval(wait)
    
                            return resolve(true)
                        }
                    }, 10)
                })
    
                if(file.size < ((1024 * 1024) * 64)){
                    ReactNativeBlobUtil.fs.cp(tmpPath, cachePath).catch(console.log)
                }
            }
            catch(e: any){
                cleanup()

                DeviceEventEmitter.emit("download", {
                    type: "err",
                    err: e.toString(),
                    data: file
                })
    
                return reject(e)
            }

            DeviceEventEmitter.emit("download", {
                type: "done",
                data: file
            })
    
            cleanup()
    
            return resolve(tmpPath)
        }).catch(reject)
    })
}

/*export const downloadWholeFileFSStream = ({ file, path = undefined, progressCallback = undefined, maxChunks = Infinity }) => {
    return new Promise(async (resolve, reject) => {
        try{
            const fileOfflinePath = getItemOfflinePath(await getDownloadPath({ type: "offline" }), file)

            if((await RNFS.exists(fileOfflinePath))){
                return resolve(fileOfflinePath)
            }
        }
        catch(e){
            //console.log(e)
        }

        try{
            if((await DeviceInfo.getFreeDiskStorage()) < (((1024 * 1024) * 256) + file.size)){ // We keep a 256 MB buffer in case previous downloads are still being written to the FS
                await clearCacheDirectories()

                await new Promise((resolve) => BackgroundTimer.setTimeout(resolve, 5000))

                if((await DeviceInfo.getFreeDiskStorage()) < (((1024 * 1024) * 256) + file.size)){ // We keep a 256 MB buffer in case previous downloads are still being written to the FS
                    return reject(i18n(storage.getString("lang"), "deviceOutOfStorage"))
                }
            }

            var tempDownloadPath = await getDownloadPath({ type: "temp" })
        }
        catch(e){
            return reject(e)
        }

        if(typeof path == "undefined"){
            path = tempDownloadPath + file.name + "_" + file.uuid + "." + getFileExt(file.name)
        }

        try{
            if((await RNFS.exists(path))){
                const existsStat = await RNFS.stat(path)

                if(existsStat.size >= (file.size - 131072)){
                    return resolve(path)
                }
                else{
                    await RNFS.unlink(path)
                }
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

        const stopInterval = BackgroundTimer.setInterval(async () => {
            if(isStopped() && !didStop){
                didStop = true

                try{
                    if((await RNFS.exists(path))){
                        await RNFS.unlink(path)
                    }
                }
                catch(e){
                    //console.log(e)
                }

                BackgroundTimer.clearInterval(stopInterval)
            }
        }, 10)

        const download = (index) => {
            return new Promise(async (resolve, reject) => {
                if(isPaused()){
                    await new Promise((resolve) => {
                        const wait = BackgroundTimer.setInterval(() => {
                            if(!isPaused() || isStopped()){
                                BackgroundTimer.clearInterval(wait)
    
                                return resolve()
                            }
                        }, 10)
                    })
                }
    
                if(didStop){
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

                downloadFileChunk({
                    region: file.region,
                    bucket: file.bucket,
                    uuid: file.uuid,
                    index,
                    key: file.key,
                    version: file.version
                }).then((data) => {
                    let writeInterval = BackgroundTimer.setInterval(() => {
                        if(writeIndex == index){
                            BackgroundTimer.clearInterval(writeInterval)

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
  
        while(file.chunks > chunksDone && typeof err == "undefined"){
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

        BackgroundTimer.clearInterval(stopInterval)

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
}*/