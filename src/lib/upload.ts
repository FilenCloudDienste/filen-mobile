import { getUploadServer, getAPIKey, getMasterKeys, encryptMetadata, Semaphore, getFileParentPath, getFileExt, canCompressThumbnail } from "./helpers"
import RNFS from "react-native-fs"
import { useStore } from "./state"
import { markUploadAsDone, checkIfItemParentIsShared, reportError } from "./api"
import { showToast } from "../components/Toasts"
import storage from "./storage"
import { i18n } from "../i18n/i18n"
import { DeviceEventEmitter } from "react-native"
import { getDownloadPath } from "./download"
import { getThumbnailCacheKey } from "./services/items"
import ImageResizer from "react-native-image-resizer"
import striptags from "striptags"
import memoryCache from "./memoryCache"
import { addItemLoadItemsCache, buildFile } from "./services/items"
import BackgroundTimer from "react-native-background-timer"

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

export const queueFileUpload = async ({ file, parent }: { file: UploadFile, parent: string }): Promise<void> => {
    const netInfo = useStore.getState().netInfo

    if(storage.getBoolean("onlyWifiUploads:" + storage.getNumber("userId")) && netInfo.type !== "wifi"){
        return
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

    if(fileName.indexOf(".") !== -1){
		let fileNameEx = fileName.split(".")
		let lowerCaseFileEnding = fileNameEx[fileNameEx.length - 1].toLowerCase()
		
		fileNameEx.pop()
		
		const fileNameWithLowerCaseEnding = fileNameEx.join(".") + "." + lowerCaseFileEnding

        fileName = striptags(fileNameWithLowerCaseEnding)
	}

    const name = fileName
    const size = file.size
    const mime = file.mime || ""
    const chunkSizeToUse = ((1024 * 1024) * 1)
    let dummyOffset = 0
    let fileChunks = 0
    const expire = "never"
    const lastModified = file.lastModified

    while(dummyOffset < size){
        fileChunks += 1
        dummyOffset += chunkSizeToUse
    }

    item.chunks = fileChunks
    item.name = name

    let didStop = false

    const addToState = () => {
        const currentUploads = useStore.getState().uploads

        if(typeof currentUploads[name] == "undefined"){
            currentUploads[name] = {
                id: Math.random().toString().slice(3),
                file: {
                    name,
                    size,
                    mime,
                    parent,
                    chunks: fileChunks
                },
                chunksDone: 0,
                progress: 0,
                loaded: 0,
                stopped: false,
                paused: false
            }
        
            useStore.setState({
                uploads: currentUploads
            })
        }
    }

    const removeFromState = () => {
        const currentUploads = useStore.getState().uploads
        
        if(typeof currentUploads[name] !== "undefined"){
            delete currentUploads[name]

            useStore.setState({
                uploads: currentUploads
            })
        }

        uploadSemaphore.release()
    }

    const isPaused = () => {
        const currentUploads = useStore.getState().uploads

        if(typeof currentUploads[name] == "undefined"){
            return false
        }

        return currentUploads[name].paused
    }

    const isStopped = () => {
        const currentUploads = useStore.getState().uploads

        if(typeof currentUploads[name] == "undefined"){
            return false
        }

        return currentUploads[name].stopped
    }

    const currentUploads = useStore.getState().uploads

    if(typeof currentUploads[name] !== "undefined"){
        return
    }

    addToState()

    const stopInterval = BackgroundTimer.setInterval(() => {
        if(isStopped() && !didStop){
            didStop = true

            BackgroundTimer.clearInterval(stopInterval)

            removeFromState()

            return true
        }
    }, 10)

    await uploadSemaphore.acquire()

    const masterKeys = getMasterKeys()
    const apiKey = getAPIKey()

    if(masterKeys.length <= 0){
        removeFromState()

        BackgroundTimer.clearInterval(stopInterval)

        return console.log("master keys !== object")
    }

    try{
        var uuid = await global.nodeThread.uuidv4()
        var key = await global.nodeThread.generateRandomString({ charLength: 32 })
        var rm = await global.nodeThread.generateRandomString({ charLength: 32 })
        var uploadKey = await global.nodeThread.generateRandomString({ charLength: 32 })
        var nameEnc = await encryptMetadata(name, key)
        var nameH = await global.nodeThread.hashFn({ string: name.toLowerCase() })
        var mimeEnc = await encryptMetadata(mime, key)
        var sizeEnc = await encryptMetadata(size.toString(), key)
        var metaData = await encryptMetadata(JSON.stringify({
			name,
			size,
			mime,
			key,
			lastModified
		}), masterKeys[masterKeys.length - 1])

        item.key = key
        item.rm = rm
        item.metadata = metaData
    }
    catch(e){
        removeFromState()

        BackgroundTimer.clearInterval(stopInterval)

        return console.log(e)
    }

    item.uuid = uuid

    let err = undefined

    const upload = (index: number): Promise<any> => {
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

            console.log("UPLOADING", index, file.path)

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

    DeviceEventEmitter.emit("download", {
        type: "start",
        data: item
    })

    DeviceEventEmitter.emit("download", {
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
                        upload(i).then((response) => {
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
                return
            }
    
            err = e
        }
    }

    if(typeof err !== "undefined"){
        DeviceEventEmitter.emit("download", {
            type: "err",
            data: {
                err: err.toString()
            }
        })

        BackgroundTimer.clearInterval(stopInterval)

        if(err == "stopped"){
            return
        }
        else if(err.toString().toLowerCase().indexOf("blacklist") !== -1){
            removeFromState()

            showToast({ message: i18n(storage.getString("lang"), "notEnoughRemoteStorage") })

            return
        }
        else{
            removeFromState()

            showToast({ message: err.toString() })

            return
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
        removeFromState()

        DeviceEventEmitter.emit("download", {
            type: "err",
            data: {
                err: e.toString()
            }
        })

        BackgroundTimer.clearInterval(stopInterval)

        showToast({ message: e.toString() })

        return
    }

    const newItem = await buildFile({
        file: {
            uuid,
            name,
            size,
            mime,
            key,
            lastModified,
            bucket: item.bucket,
            region: item.region,
            timestamp: item.timestamp,
            rm,
            chunks_size: size,
            parent,
            chunks: fileChunks,
            receiverId: undefined,
            receiverEmail: undefined,
            sharerId: undefined,
            sharerEmail: undefined,
            version: uploadVersion,
            favorited: 0
        },
        metadata: {
            name,
            size,
            mime,
            key,
            lastModified
        },
        masterKeys
    })

    DeviceEventEmitter.emit("download", {
        type: "done",
        data: item
    })

    removeFromState()

    BackgroundTimer.clearInterval(stopInterval)

    //showToast({ message: i18n(storage.getString("lang"), "fileUploaded", true, ["__NAME__"], [name]) })
}