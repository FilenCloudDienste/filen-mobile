import { getAPIKey, getMasterKeys, encryptMetadata, Semaphore, getFileExt, canCompressThumbnail, getParent } from "./helpers"
import RNFS from "react-native-fs"
import { useStore } from "./state"
import { markUploadAsDone, checkIfItemParentIsShared } from "./api"
import { showToast } from "../components/Toasts"
import storage from "./storage"
import { i18n } from "../i18n"
import { DeviceEventEmitter } from "react-native"
import { getDownloadPath } from "./download"
import { getThumbnailCacheKey } from "./services/items"
import ImageResizer from "react-native-image-resizer"
import striptags from "striptags"
import memoryCache from "./memoryCache"
import BackgroundTimer from "react-native-background-timer"
import { debounce } from "lodash"

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

const debouncedListUpdate = debounce(() => {
    global.fetchItemList({ bypassCache: true, callStack: 0, loadFolderSizes: true }).catch(console.error)
}, 1000, {
    leading: true,
    trailing: false
})

export const queueFileUpload = ({ file, parent, includeFileHash = false }: { file: UploadFile, parent: string, includeFileHash?: boolean }): Promise<any> => {
    return new Promise(async (resolve, reject) => {
        const masterKeys = getMasterKeys()
        const apiKey = getAPIKey()

        if(masterKeys.length <= 0){
            return reject("master keys !== object")
        }

        const netInfo = useStore.getState().netInfo

        if(storage.getBoolean("onlyWifiUploads:" + storage.getNumber("userId")) && netInfo.type !== "wifi"){
            return reject("wifiOnly")
        }

        let fileName = file.name.split("/").join("_").split("\\").join("_")
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

        /*if(fileName.indexOf(".") !== -1){
            let fileNameEx = fileName.split(".")
            let lowerCaseFileEnding = fileNameEx[fileNameEx.length - 1].toLowerCase()
            
            fileNameEx.pop()
            
            const fileNameWithLowerCaseEnding = fileNameEx.join(".") + "." + lowerCaseFileEnding

            fileName = striptags(fileNameWithLowerCaseEnding)
        }*/

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
        }, 10)

        try{
            var key = await global.nodeThread.generateRandomString({ charLength: 32 })

            var [uuid, rm, uploadKey, nameEnc, nameH, mimeEnc, sizeEnc, metaData] = await Promise.all([
                global.nodeThread.uuidv4(),
                global.nodeThread.generateRandomString({ charLength: 32 }),
                global.nodeThread.generateRandomString({ charLength: 32 }),
                encryptMetadata(name, key),
                global.nodeThread.hashFn({ string: name.toLowerCase() }),
                encryptMetadata(mime, key),
                encryptMetadata(size.toString(), key),
                encryptMetadata(JSON.stringify(includeFileHash ? {
                    name,
                    size,
                    mime,
                    key,
                    lastModified,
                    hash: await global.nodeThread.getFileHash({
                        path: file.path,
                        hashName: "sha512"
                    })
                } : {
                    name,
                    size,
                    mime,
                    key,
                    lastModified
                }), masterKeys[masterKeys.length - 1])
            ])

            item.key = key
            item.rm = rm
            item.metadata = metaData
        }
        catch(e){
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

            if(
                file.path.indexOf(RNFS.CachesDirectoryPath)
                || file.path.indexOf(RNFS.TemporaryDirectoryPath)
            ){
                RNFS.unlink(file.path).catch(() => {})
            }
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
                        }, 10)
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
                                    if((await RNFS.exists(dest))){
                                        await RNFS.unlink(dest)
                                    }
                                }
                                catch(e){
                                    //console.log(e)
                                }
            
                                const { width, height, quality, cacheKey } = getThumbnailCacheKey({ uuid })
            
                                ImageResizer.createResizedImage(file.path, width, height, "JPEG", quality).then((compressed) => {
                                    RNFS.moveFile(compressed.uri, dest).then(() => {
                                        storage.set(cacheKey, item.uuid + ".jpg")
                                        memoryCache.set("cachedThumbnailPaths:" + uuid, item.uuid + ".jpg")
            
                                        return resolve(true)
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

                return reject(err)
            }
        }

        try{
            await new Promise((resolve) => BackgroundTimer.setTimeout(() => resolve(true), 250))

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

            if(e.toString().toLowerCase().indexOf("upload chunks") == -1){
                showToast({ message: e.toString() })
            }

            return reject(e)
        }

        DeviceEventEmitter.emit("upload", {
            type: "done",
            data: item
        })

        cleanup()

        if(getParent() == parent){
            debouncedListUpdate()
        }

        return resolve(item)

        //showToast({ message: i18n(storage.getString("lang"), "fileUploaded", true, ["__NAME__"], [name]) })
    })
}