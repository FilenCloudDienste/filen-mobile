import ReactNativeBlobUtil from "react-native-blob-util"
import { Semaphore, getFileExt, randomIdUnsafe, toExpoFsPath } from "../../helpers"
import { Platform, DeviceEventEmitter } from "react-native"
import { useStore } from "../../state"
import { i18n } from "../../../i18n"
import storage from "../../storage"
import { showToast } from "../../../components/Toasts"
import { addItemToOfflineList, getItemOfflinePath } from "../offline"
import DeviceInfo from "react-native-device-info"
import { clearCacheDirectories } from "../setup/setup"
import type { Item } from "../../../types"
import memoryCache from "../../memoryCache"
import { logger, fileAsyncTransport, mapConsoleTransport } from "react-native-logs"
import * as FileSystem from "expo-file-system"
import { isOnline, isWifi } from "../isOnline"
import { MB } from "../../constants"
import { memoize } from "lodash"

const log = logger.createLogger({
    severity: "debug",
    transport: [fileAsyncTransport, mapConsoleTransport],
    transportOptions: {
        FS: FileSystem,
        fileName: "logs/download.log"
    }
})

const downloadSemaphore = new Semaphore(3)
const maxThreads = 32
const downloadThreadsSemaphore = new Semaphore(maxThreads)
const downloadWriteThreadsSemaphore = new Semaphore(256)

export const getDownloadPath = memoize(({ type = "temp" }: { type: string }): Promise<string> => {
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
                    
                    log.error(err)

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
                    
                    log.error(err)

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

                    log.error(err)

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

                    log.error(err)

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

                    log.error(err)

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

                    log.error(err)

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

                    log.error(err)

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

                    log.error(err)

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

                    log.error(err)

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

                    log.error(err)

                    return reject(err)
                })
            }
        }
    })
}, ({ type = "temp" }: { type: string }) => type)

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

    if(!isOnline()){
        callOptionalCallback(new Error("device is offline"))

        return showToast({ message: i18n(storage.getString("lang"), "deviceOffline") })
    }

    if(typeof saveToGalleryCallback == "function"){
        try{
            const offlinePath = await getDownloadPath({ type: "offline" })
    
            if((await FileSystem.getInfoAsync(toExpoFsPath(getItemOfflinePath(offlinePath, file)))).exists){
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

        log.error(e)

        callOptionalCallback(new Error("could not get download path"))

        downloadSemaphore.release()

        return showToast({ message: i18n(storage.getString("lang"), "couldNotGetDownloadPath") })
    }

    try{
        if(storage.getBoolean("onlyWifiDownloads:" + storage.getNumber("userId")) && !isWifi()){
            downloadSemaphore.release()

            return showToast({ message: i18n(storage.getString("lang"), "onlyWifiDownloads") })
        }
    }
    catch(e){
        console.log(e)
    }

    const filePath = downloadPath + file.name

    downloadFile(file, true, false, file.chunks).then(async (path) => {
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
                if((await FileSystem.getInfoAsync(toExpoFsPath(offlinePath))).exists){
                    await FileSystem.deleteAsync(toExpoFsPath(offlinePath))
                }
            }
            catch(e){
                //console.log(e)
            }

            FileSystem.moveAsync({
                from: toExpoFsPath(path),
                to: toExpoFsPath(offlinePath)
            }).then(() => {
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

                    callOptionalCallback(null, offlinePath)

                    return console.log(file.name + " download done")
                }).catch((err) => {
                    showToast({ message: err.toString() })

                    callOptionalCallback(err)

                    log.error(err)
    
                    return console.log(err)
                })
            }).catch((err) => {
                showToast({ message: err.toString() })

                callOptionalCallback(err)

                log.error(err)

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
                        FileSystem.deleteAsync(toExpoFsPath(path)).then(() => {
                            if(showNotification || useStore.getState().imagePreviewModalVisible){
                                showToast({ message: i18n(storage.getString("lang"), "fileDownloaded", true, ["__NAME__"], [file.name]) })
                            }

                            callOptionalCallback(null, "")
    
                            return console.log(file.name + " download done")
                        }).catch((err) => {
                            showToast({ message: err.toString() })

                            callOptionalCallback(err)

                            log.error(err)
    
                            return console.log(err)
                        })
                    }).catch((err) => {
                        showToast({ message: err.toString() })

                        callOptionalCallback(err)

                        log.error(err)
    
                        return console.log(err)
                    })
                }
                else{
                    try{
                        if((await FileSystem.getInfoAsync(toExpoFsPath(filePath))).exists){
                            await FileSystem.deleteAsync(toExpoFsPath(filePath))
                        }
                    }
                    catch(e){
                        //console.log(e)
                    }
    
                    FileSystem.moveAsync({
                        from: toExpoFsPath(path),
                        to: toExpoFsPath(filePath)
                    }).then(() => {
                        if(showNotification || useStore.getState().imagePreviewModalVisible){
                            showToast({ message: i18n(storage.getString("lang"), "fileDownloaded", true, ["__NAME__"], [file.name]) })
                        }

                        callOptionalCallback(null, filePath)
        
                        return console.log(file.name + " download done")
                    }).catch((err) => {
                        showToast({ message: err.toString() })

                        callOptionalCallback(err)

                        log.error(err)
        
                        return console.log(err)
                    })
                }
            }
            else{
                try{
                    if((await FileSystem.getInfoAsync(toExpoFsPath(filePath))).exists){
                        await FileSystem.deleteAsync(toExpoFsPath(filePath))
                    }
                }
                catch(e){
                    //console.log(e)
                }

                FileSystem.moveAsync({
                    from: toExpoFsPath(path),
                    to: toExpoFsPath(filePath)
                }).then(() => {
                    if(showNotification || useStore.getState().imagePreviewModalVisible){
                        showToast({ message: i18n(storage.getString("lang"), "fileDownloaded", true, ["__NAME__"], [file.name]) })
                    }

                    callOptionalCallback(null, filePath)
    
                    return console.log(file.name + " download done")
                }).catch((err) => {
                    showToast({ message: err.toString() })

                    callOptionalCallback(err)

                    log.error(err)
    
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

            log.error(err)
        }

        return callOptionalCallback(err)
    })
}

export const downloadFile = (file: Item, showProgress: boolean = true, standalone: boolean = false, maxChunks: number): Promise<string> => {
    memoryCache.set("showDownloadProgress:" + file.uuid, showProgress)

    return new Promise((resolve, reject) => {
        getDownloadPath({ type: "cachedDownloads" }).then(async (cachedDownloadsPath) => {
            const cachePath = cachedDownloadsPath + file.uuid + "." + getFileExt(file.name)

            try{
                if((await FileSystem.getInfoAsync(toExpoFsPath(cachePath))).exists){
                    return resolve(cachePath)
                }
            }
            catch(e){
                //console.log(e)
            }

            try{
                if((await DeviceInfo.getFreeDiskStorage()) < ((MB * 256) + file.size)){ // We keep a 256 MB buffer in case previous downloads are still being written to the FS
                    await clearCacheDirectories()
    
                    await new Promise((resolve) => setTimeout(() => resolve(true), 5000))
    
                    if((await DeviceInfo.getFreeDiskStorage()) < ((MB * 256) + file.size)){ // We keep a 256 MB buffer in case previous downloads are still being written to the FS
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
    
            const stopInterval = setInterval(() => {
                if(stopped && !didStop){
                    didStop = true
    
                    clearInterval(stopInterval)
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
                clearInterval(stopInterval)

                stopListener.remove()
                pauseListener.remove()
                resumeListener.remove()
            }
    
            const downloadTask = (index: number): Promise<{ index: number, path: string }> => {
                return new Promise(async (resolve, reject) => {
                    if(paused){
                        await new Promise((resolve) => {
                            const wait = setInterval(() => {
                                if(!paused || stopped){
                                    clearInterval(wait)
        
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
                    return setTimeout(() => {
                        write(index, path)
                    }, 10)
                }
    
                if(index == 0){
                    FileSystem.moveAsync({
                        from: toExpoFsPath(path),
                        to: toExpoFsPath(tmpPath)
                    }).then(() => {
                        currentWriteIndex += 1

                        downloadWriteThreadsSemaphore.release()
                    }).catch(reject)
                }
                else{
                    global.nodeThread.appendFileToFile({
                        first: tmpPath,
                        second: path
                    }).then(() => {
                        currentWriteIndex += 1

                        downloadWriteThreadsSemaphore.release()
                    }).catch(reject)
                }
            }

            DeviceEventEmitter.emit("download", {
                type: "started",
                data: file
            })

            const chunksToDownload: number = maxChunks

            try{
                await new Promise((resolve, reject) => {
                    let done = 0
    
                    for(let i = 0; i < chunksToDownload; i++){
                        Promise.all([
                            downloadThreadsSemaphore.acquire(),
                            downloadWriteThreadsSemaphore.acquire()
                        ]).then(() => {
                            downloadTask(i).then(({ index, path }) => {
                                write(index, path)
    
                                done += 1
    
                                downloadThreadsSemaphore.release()
    
                                if(done >= chunksToDownload){
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
                    if(currentWriteIndex >= chunksToDownload){
                        return resolve(true)
                    }
    
                    const wait = setInterval(() => {
                        if(currentWriteIndex >= chunksToDownload){
                            clearInterval(wait)
    
                            return resolve(true)
                        }
                    }, 100)
                })
    
                if(file.size < (MB * 128) && maxChunks == Number.MAX_SAFE_INTEGER){
                    FileSystem.copyAsync({
                        from: toExpoFsPath(tmpPath),
                        to: toExpoFsPath(cachePath)
                    }).catch(console.error)
                }
            }
            catch(e: any){
                cleanup()

                if(standalone){
                    DeviceEventEmitter.emit("download", {
                        type: "err",
                        err: e.toString(),
                        data: file
                    })
                }
    
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