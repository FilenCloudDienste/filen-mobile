import ReactNativeBlobUtil from "react-native-blob-util"
import { Semaphore, getFileExt, randomIdUnsafe } from "../../helpers"
import RNFS from "react-native-fs"
import { Platform, DeviceEventEmitter } from "react-native"
import { useStore } from "../../state"
import { i18n } from "../../../i18n"
import storage from "../../storage"
import { showToast } from "../../../components/Toasts"
import BackgroundTimer from "react-native-background-timer"
import { addItemToOfflineList } from "../offline"
import { getItemOfflinePath } from "../offline"
import DeviceInfo from "react-native-device-info"
import { clearCacheDirectories } from "../setup/setup"
import type { Item } from "../items"
import memoryCache from "../../memoryCache"

const downloadSemaphore = new Semaphore(3)
const maxThreads = 16
const downloadThreadsSemaphore = new Semaphore(maxThreads)
const downloadWriteThreadsSemaphore = new Semaphore(256)

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

    const currentDownloads = useStore.getState().downloads

    if(typeof currentDownloads[file.uuid] !== "undefined"){
        callOptionalCallback(new Error("already downloading this file"))

        return showToast({ message: i18n(storage.getString("lang"), "alreadyDownloadingFile", true, ["__NAME__"], [file.name]) })
    }

    DeviceEventEmitter.emit("download", {
        type: "start",
        data: file
    })

    if(!isPreview){
        await downloadSemaphore.acquire()
    }

    try{
        var downloadPath = await getDownloadPath({ type: (storeOffline ? "offline" : "download") })
    }
    catch(e){
        console.log(e)

        callOptionalCallback(new Error("could not get download path"))

        downloadSemaphore.release()

        return showToast({ message: i18n(storage.getString("lang"), "couldNotGetDownloadPath") })
    }

    try{
        if(storage.getBoolean("onlyWifiDownloads:" + storage.getNumber("userId")) && netInfo.type !== "wifi"){
            downloadSemaphore.release()

            return showToast({ message: i18n(storage.getString("lang"), "onlyWifiDownloads") })
        }
    }
    catch(e){
        console.log(e)
    }

    const filePath = downloadPath + file.name

    downloadFile(file, true, false).then(async (path) => {
        DeviceEventEmitter.emit("download", {
            type: "done",
            data: file
        })

        downloadSemaphore.release()

        if(isPreview){
            return callOptionalCallback(null, path)
        }

        if(typeof saveToGalleryCallback == "function"){
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
                    showToast({ message: err.toString() })

                    callOptionalCallback(err)
    
                    return console.log(err)
                })
            }).catch((err) => {
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
                            if(showNotification || useStore.getState().imagePreviewModalVisible){
                                showToast({ message: i18n(storage.getString("lang"), "fileDownloaded", true, ["__NAME__"], [file.name]) })
                            }

                            callOptionalCallback(null, "")
    
                            return console.log(file.name + " download done")
                        }).catch((err) => {
                            showToast({ message: err.toString() })

                            callOptionalCallback(err)
    
                            return console.log(err)
                        })
                    }).catch((err) => {
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
                        if(showNotification || useStore.getState().imagePreviewModalVisible){
                            showToast({ message: i18n(storage.getString("lang"), "fileDownloaded", true, ["__NAME__"], [file.name]) })
                        }

                        callOptionalCallback(null, filePath)
        
                        return console.log(file.name + " download done")
                    }).catch((err) => {
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
                    if(showNotification || useStore.getState().imagePreviewModalVisible){
                        showToast({ message: i18n(storage.getString("lang"), "fileDownloaded", true, ["__NAME__"], [file.name]) })
                    }

                    callOptionalCallback(null, filePath)
    
                    return console.log(file.name + " download done")
                }).catch((err) => {
                    showToast({ message: err.toString() })

                    callOptionalCallback(err)
    
                    return console.log(err)
                })
            }
        }
    }).catch((err) => {
        downloadSemaphore.release()
        
        if(err !== "stopped"){
            showToast({ message: err.toString() })

            DeviceEventEmitter.emit("download", {
                type: "err",
                data: file,
                err: err.toString()
            })

            console.log(err)
        }

        return callOptionalCallback(err)
    })
}

export const downloadFile = (file: Item, showProgress: boolean = true, standalone: boolean = false): Promise<string> => {
    memoryCache.set("showDownloadProgress:" + file.uuid, showProgress)

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

            if(standalone){
                DeviceEventEmitter.emit("download", {
                    type: "start",
                    data: file
                })
            }
    
            const tmpPath = ReactNativeBlobUtil.fs.dirs.CacheDir + "/" + randomIdUnsafe() + file.uuid + "." + getFileExt(file.name)
            let currentWriteIndex = 0
            let didStop = false
            let paused = false
            let stopped = false
    
            const stopInterval = BackgroundTimer.setInterval(() => {
                if(stopped && !didStop){
                    didStop = true
    
                    BackgroundTimer.clearInterval(stopInterval)
                }
            }, 250)

            const pauseListener = DeviceEventEmitter.addListener("pauseTransfer", (uuid) => {
                if(uuid == file.uuid){
                    paused = true
                }
            })

            const resumeListener = DeviceEventEmitter.addListener("resumeTransfer", (uuid) => {
                if(uuid == file.uuid){
                    paused = false
                }
            })

            const stopListener = DeviceEventEmitter.addListener("stopTransfer", (uuid) => {
                if(uuid == file.uuid){
                    stopped = true
                }
            })

            const cleanup = () => {
                BackgroundTimer.clearInterval(stopInterval)
                stopListener.remove()
                pauseListener.remove()
                resumeListener.remove()

                RNFS.readDir(ReactNativeBlobUtil.fs.dirs.CacheDir).then((items) => {
                    items.forEach((item) => {
                        if(!item.isDirectory()){
                            if(item.name.indexOf(file.uuid + ".chunk") !== -1){
                                ReactNativeBlobUtil.fs.unlink(item.path).catch(() => {})
                            }
                        }
                    })
                }).catch(console.log)
            }
    
            const downloadTask = (index: number): Promise<{ index: number, path: string }> => {
                return new Promise(async (resolve, reject) => {
                    if(paused){
                        await new Promise((resolve) => {
                            const wait = BackgroundTimer.setInterval(() => {
                                if(!paused || stopped){
                                    BackgroundTimer.clearInterval(wait)
        
                                    return resolve(true)
                                }
                            }, 250)
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
                    }, 25)
                }
    
                if(index == 0){
                    ReactNativeBlobUtil.fs.mv(path, tmpPath).then(() => {
                        currentWriteIndex += 1

                        downloadWriteThreadsSemaphore.release()
    
                        ReactNativeBlobUtil.fs.unlink(path).catch(console.log)
                    }).catch(reject)
                }
                else{
                    global.nodeThread.appendFileToFile({
                        first: tmpPath,
                        second: path
                    }).then(() => {
                        currentWriteIndex += 1

                        downloadWriteThreadsSemaphore.release()
    
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
                        Promise.all([
                            downloadThreadsSemaphore.acquire(),
                            downloadWriteThreadsSemaphore.acquire()
                        ]).then(() => {
                            downloadTask(i).then(({ index, path }) => {
                                write(index, path)
    
                                done += 1
    
                                downloadThreadsSemaphore.release()
    
                                if(done >= file.chunks){
                                    return resolve(true)
                                }
                            }).catch((err) => {
                                downloadThreadsSemaphore.release()
                                downloadWriteThreadsSemaphore.release()
    
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
                    }, 100)
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

            if(standalone){
                DeviceEventEmitter.emit("download", {
                    type: "done",
                    data: file
                })
            }
    
            cleanup()
    
            return resolve(tmpPath)
        }).catch(reject)
    })
}