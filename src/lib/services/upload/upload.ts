import { getAPIKey, getMasterKeys, encryptMetadata, Semaphore, getFileExt, canCompressThumbnail, toExpoFsPath } from "../../helpers"
import { markUploadAsDone, checkIfItemParentIsShared } from "../../api"
import { showToast } from "../../../components/Toasts"
import storage from "../../storage"
import { i18n } from "../../../i18n"
import { DeviceEventEmitter } from "react-native"
import { getDownloadPath } from "../download/download"
import { getThumbnailCacheKey, buildFile } from "../items"
import ImageResizer from "react-native-image-resizer"
import striptags from "striptags"
import memoryCache from "../../memoryCache"
import BackgroundTimer from "react-native-background-timer"
import * as FileSystem from "expo-file-system"
import { logger, fileAsyncTransport, mapConsoleTransport } from "react-native-logs"
import { isOnline, isWifi } from "../isOnline"

const log = logger.createLogger({
    severity: "debug",
    transport: [fileAsyncTransport, mapConsoleTransport],
    transportOptions: {
        FS: FileSystem,
        fileName: "logs/upload.log"
    }
})

const maxThreads = 10
const uploadSemaphore = new Semaphore(3)
const uploadThreadsSemaphore = new Semaphore(maxThreads)
const uploadVersion = 2

export interface UploadFile {
    path: string,
    name: string,
    size: number,
    mime: string,
    lastModified: number
}

export const queueFileUpload = ({ file, parent, includeFileHash = false }: { file: UploadFile, parent: string, includeFileHash?: boolean | string }): Promise<any> => {
    return new Promise(async (resolve, reject) => {
        const masterKeys = getMasterKeys()
        const apiKey = getAPIKey()

        if(masterKeys.length <= 0){
            log.error("master keys !== object")

            return reject("master keys !== object")
        }

        if(!isOnline()){
            return reject(i18n(storage.getString("lang"), "deviceOffline"))
        }

        if(storage.getBoolean("onlyWifiUploads:" + storage.getNumber("userId")) && !isWifi()){
            return reject("wifiOnly")
        }

        file.path = decodeURIComponent(file.path)
        file.name = decodeURIComponent(file.name)

        const fileName = file.name.split("/").join("_").split("\\").join("_")
        const item = {
            uuid: "",
            name: fileName,
            size: file.size,
            mime: file.mime || "",
            key: "",
            rm: "",
            metadata: "",
            chunks: 0,
            parent,
            timestamp: Math.floor(+new Date() / 1000),
            version: uploadVersion,
            versionedUUID: undefined,
            region: "",
            bucket: ""
        }
        const name = striptags(fileName)
        const size = file.size
        const mime = file.mime || ""
        const chunkSizeToUse = ((1024 * 1024) * 1)
        let dummyOffset = 0
        let fileChunks = 0
        const expire = "never"
        const lastModified = file.lastModified
        let paused = false
        let stopped = false
        let didStop = false

        while(dummyOffset < size){
            fileChunks += 1
            dummyOffset += chunkSizeToUse
        }

        item.chunks = fileChunks
        item.name = name

        const stopInterval = BackgroundTimer.setInterval(() => {
            if(stopped && !didStop){
                didStop = true

                BackgroundTimer.clearInterval(stopInterval)

                return true
            }
        }, 250)

        try{
            var key = await global.nodeThread.generateRandomString({ charLength: 32 })
            var metadata = (typeof includeFileHash == "boolean" || typeof includeFileHash == "string") ? {
                name,
                size,
                mime,
                key,
                lastModified,
                hash: typeof includeFileHash == "boolean" ? await global.nodeThread.getFileHash({
                    path: file.path,
                    hashName: "sha512"
                }) : includeFileHash
            } : {
                name,
                size,
                mime,
                key,
                lastModified
            }

            var [uuid, rm, uploadKey, nameEnc, nameH, mimeEnc, sizeEnc, metaData] = await Promise.all([
                global.nodeThread.uuidv4(),
                global.nodeThread.generateRandomString({ charLength: 32 }),
                global.nodeThread.generateRandomString({ charLength: 32 }),
                encryptMetadata(name, key),
                global.nodeThread.hashFn({ string: name.toLowerCase() }),
                encryptMetadata(mime, key),
                encryptMetadata(size.toString(), key),
                encryptMetadata(JSON.stringify(metadata), masterKeys[masterKeys.length - 1])
            ])

            item.key = key
            item.rm = rm
            item.metadata = metaData
        }
        catch(e){
            log.error(e)

            BackgroundTimer.clearInterval(stopInterval)

            return reject(e)
        }

        item.uuid = uuid

        DeviceEventEmitter.emit("upload", {
            type: "start",
            data: item
        })

        await uploadSemaphore.acquire()

        const pauseListener = DeviceEventEmitter.addListener("pauseTransfer", (uuid) => {
            if(uuid == uuid){
                paused = true
            }
        })

        const resumeListener = DeviceEventEmitter.addListener("resumeTransfer", (uuid) => {
            if(uuid == uuid){
                paused = false
            }
        })

        const stopListener = DeviceEventEmitter.addListener("stopTransfer", (uuid) => {
            if(uuid == uuid){
                stopped = true
            }
        })

        const cleanup = () => {
            uploadSemaphore.release()
            pauseListener.remove()
            resumeListener.remove()
            stopListener.remove()
            BackgroundTimer.clearInterval(stopInterval)
        }

        let err = undefined

        const upload = (index: number): Promise<any> => {
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

                global.nodeThread.encryptAndUploadFileChunk({
                    path: file.path,
                    key,
                    queryParams: new URLSearchParams({
                        apiKey: encodeURIComponent(apiKey),
                        uuid: encodeURIComponent(uuid),
                        name: encodeURIComponent(nameEnc),
                        nameHashed: encodeURIComponent(nameH),
                        size: encodeURIComponent(sizeEnc),
                        chunks: encodeURIComponent(fileChunks),
                        mime: encodeURIComponent(mimeEnc),
                        index: encodeURIComponent(index),
                        rm: encodeURIComponent(rm),
                        expire: encodeURIComponent(expire),
                        uploadKey: encodeURIComponent(uploadKey),
                        metaData: encodeURIComponent(metaData),
                        parent: encodeURIComponent(parent),
                        version: encodeURIComponent(uploadVersion)
                    }).toString(),
                    chunkIndex: index,
                    chunkSize: chunkSizeToUse
                }).then(resolve).catch(reject)
            })
        }

        DeviceEventEmitter.emit("upload", {
            type: "started",
            data: item
        })

        try{
            const res = await upload(0)

            item.region = res.data.region
            item.bucket = res.data.bucket
        }
        catch(e){
            err = e
        }

        if(typeof err == "undefined"){
            try{
                await new Promise((resolve, reject) => {
                    let done = 1
        
                    for(let i = 1; i < (fileChunks + 1); i++){
                        uploadThreadsSemaphore.acquire().then(() => {
                            upload(i).then(() => {
                                done += 1
        
                                uploadThreadsSemaphore.release()
        
                                if(done >= (fileChunks + 1)){
                                    return resolve(true)
                                }
                            }).catch((err) => {
                                uploadThreadsSemaphore.release()
        
                                return reject(err)
                            })
                        })
                    }
                })
        
                if(canCompressThumbnail(getFileExt(name))){
                    try{
                        await new Promise((resolve, reject) => {
                            getDownloadPath({ type: "thumbnail" }).then(async (dest) => {
                                dest = dest + uuid + ".jpg"
                
                                try{
                                    if((await FileSystem.getInfoAsync(toExpoFsPath(dest))).exists){
                                        await FileSystem.deleteAsync(toExpoFsPath(dest))
                                    }
                                }
                                catch(e){
                                    //console.log(e)
                                }
            
                                const { width, height, quality, cacheKey } = getThumbnailCacheKey({ uuid })

                                if(width <= 1 || height <= 1){
                                    return resolve(true)
                                }
                        
                                FileSystem.getInfoAsync(file.path).then((stat) => {
                                    if(!stat.exists){
                                        return resolve(true)
                                    }
                                    
                                    if(!stat.size){
                                        return resolve(true)
                                    }

                                    if(stat.size <= 1){
                                        return resolve(true)
                                    }

                                    ImageResizer.createResizedImage(file.path, width, height, "JPEG", quality).then((compressed) => {
                                        FileSystem.moveAsync({
                                            from: toExpoFsPath(compressed.uri),
                                            to: toExpoFsPath(dest)
                                        }).then(() => {
                                            storage.set(cacheKey, item.uuid + ".jpg")
                                            memoryCache.set("cachedThumbnailPaths:" + uuid, item.uuid + ".jpg")
                
                                            return resolve(true)
                                        }).catch(resolve)
                                    }).catch(resolve)
                                }).catch(resolve)
                            }).catch(resolve)
                        })
                    }
                    catch(e){
                        console.log(e)
                    }
                }
            }
            catch(e: any){
                if(e.toString().toLowerCase().indexOf("already exists") !== -1){
                    cleanup()

                    DeviceEventEmitter.emit("upload", {
                        type: "err",
                        err: e.toString(),
                        data: item
                    })

                    return
                }
        
                err = e
            }
        }

        if(typeof err !== "undefined"){
            DeviceEventEmitter.emit("upload", {
                type: "err",
                err: err.toString(),
                data: item
            })

            cleanup()

            if(err == "stopped"){
                return reject("stopped")
            }
            else if(err.toString().toLowerCase().indexOf("blacklist") !== -1){
                showToast({ message: i18n(storage.getString("lang"), "notEnoughRemoteStorage") })

                return reject("notEnoughRemoteStorage")
            }
            else{
                showToast({ message: err.toString() })

                log.error(err)

                return reject(err)
            }
        }

        try{
            await markUploadAsDone({ uuid, uploadKey })

            item.timestamp = Math.floor(+new Date() / 1000)

            await checkIfItemParentIsShared({
                type: "file",
                parent,
                metaData: {
                    uuid,
                    name,
                    size,
                    mime,
                    key,
                    lastModified
                }
            })
        }
        catch(e: any){
            DeviceEventEmitter.emit("upload", {
                type: "err",
                err: e.toString(),
                data: item
            })

            cleanup()

            log.error(e)

            return reject(e)
        }

        DeviceEventEmitter.emit("upload", {
            type: "done",
            data: item
        })

        cleanup()

        const builtFile = await buildFile({
            file: {
                bucket: item.bucket,
                chunks: item.chunks,
                favorited: 0,
                metadata: item.metadata,
                parent,
                region: item.region,
                rm: item.rm,
                size: item.size,
                timestamp: item.timestamp,
                uuid: item.uuid,
                version: item.version
            },
            masterKeys,
            userId: storage.getNumber("userId")
        })

        DeviceEventEmitter.emit("event", {
            type: "add-item",
            data: {
                item: builtFile,
                parent: includeFileHash ? "photos" : parent
            }
        })

        return resolve(item)

        //showToast({ message: i18n(storage.getString("lang"), "fileUploaded", true, ["__NAME__"], [name]) })
    })
}