import { getUploadServer, getAPIKey, getMasterKeys, encryptMetadata, Semaphore, getFileParentPath, getFileExt, canCompressThumbnail, randomIdUnsafe } from "./helpers"
import RNFS from "react-native-fs"
import { useStore } from "./state"
import { fileExists, markUploadAsDone, archiveFile, checkIfItemParentIsShared, reportError } from "./api"
import { showToast } from "../components/Toasts"
import { storage } from "./storage"
import { i18n } from "../i18n/i18n"
import { DeviceEventEmitter } from "react-native"
import { getDownloadPath } from "./download"
import { getThumbnailCacheKey } from "./services/items"
import ImageResizer from "react-native-image-resizer"
import striptags from "striptags"
import { memoryCache } from "./memoryCache"
import { updateLoadItemsCache, addItemLoadItemsCache, buildFile } from "./services/items"
import BackgroundTimer from "react-native-background-timer"
import ReactNativeBlobUtil from "react-native-blob-util"

const maxThreads = 10
const uploadSemaphore = new Semaphore(3)

export const encryptAndUploadChunk = ({ base64, key, url, timeout }) => {
    return new Promise((resolve, reject) => {
        const maxTries = 1024
        let currentTries = 0
        const retryTimer = 1000

        const doRequest = () => {
            if(currentTries > maxTries){
                return reject(new Error("Max tries reached"))
            }

            currentTries += 1

            global.nodeThread.encryptAndUploadChunk({
                base64,
                key,
                url,
                timeout,
            }).then((res) => {
                if(!res.status){
                    if(res.message.toLowerCase().indexOf("blacklist") !== -1){
                        return reject(res.message)
                    }

                    return BackgroundTimer.setTimeout(doRequest, retryTimer)
                }

                return resolve(res)
            }).catch((err) => {
                console.log(err)

                showToast({ message: err.toString() })

                return BackgroundTimer.setTimeout(doRequest, retryTimer)
            })
        }

        doRequest()
    })
}

export const queueFileUpload = async ({ pickedFile, parent, progressCallback, cameraUploadCallback, routeURL = undefined, clear = true }) => {
    let filePath = decodeURIComponent(pickedFile.uri)

    const clearCache = async () => {
        if(!clear){
            return false
        }

        if(typeof pickedFile.clearCache !== "undefined"){
            try{
                if((await RNFS.exists(getFileParentPath(filePath)))){
                    await RNFS.unlink(getFileParentPath(filePath))
                }
            }
            catch(e){
                //console.log(e)
            }
        }

        return true
    }

    const netInfo = useStore.getState().netInfo

    if(!netInfo.isInternetReachable || !netInfo.isConnected){
        clearCache()

        if(typeof cameraUploadCallback == "function"){
            return cameraUploadCallback("offline")
        }

        return showToast({ message: i18n(storage.getString("lang"), "deviceOffline") })
    }

    try{
        if(storage.getBoolean("onlyWifiUploads:" + storage.getNumber("userId")) && netInfo.type !== "wifi"){
            return showToast({ message: i18n(storage.getString("lang"), "onlyWifiUploads") })
        }
    }
    catch(e){
        console.log(e)

        showToast({ message: e.toString() })
    }

    let generatedFileName = pickedFile.name.split("/").join("_").split("\\").join("_")

    var item = {
        uuid: "",
        name: generatedFileName,
        size: pickedFile.size,
        mime: pickedFile.type || "",
        key: "",
        rm: "",
        metadata: "",
        chunks: 0,
        parent,
        timestamp: Math.floor(+new Date() / 1000),
        version: 2,
        versionedUUID: undefined
    }

    if(generatedFileName.indexOf(".") !== -1){
		let fileNameEx = generatedFileName.split(".")
		let lowerCaseFileEnding = fileNameEx[fileNameEx.length - 1].toLowerCase()
		
		fileNameEx.pop()
		
		const fileNameWithLowerCaseEnding = fileNameEx.join(".") + "." + lowerCaseFileEnding

        generatedFileName = striptags(fileNameWithLowerCaseEnding)
	}

    const name = generatedFileName
    const size = pickedFile.size
    const mime = pickedFile.type || ""

    const chunkSizeToUse = ((1024 * 1024) * 1)
    let dummyOffset = 0
    let fileChunks = 0

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

        return true
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

        return true
    }

    const updateProgress = (chunksDone) => {
        const currentUploads = useStore.getState().uploads

        if(typeof currentUploads[name] !== "undefined"){
            currentUploads[name].chunksDone = chunksDone

            useStore.setState({
                uploads: currentUploads
            })
        }
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
        clearCache()

        if(typeof cameraUploadCallback == "function"){
            return cameraUploadCallback("already uploading")
        }

        return showToast({ message: i18n(storage.getString("lang"), "alreadyUploadingFile", true, ["__NAME__"], [name]) })
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

    try{
        /*if(filePath.indexOf(RNFS.CachesDirectoryPath) == -1){ //only copy if it's not already inside the cache directory
            //copy file to cache directory to prevent iOS/android from removing it (or access to it [the picked file]) before the upload is finished
            var tempPath = await getDownloadPath({ type: "temp" }) + randomIdUnsafe() + "_" + name

            await RNFS.copyFile(filePath, tempPath)

            var stat = await RNFS.stat(tempPath)
        }
        else{
            var tempPath = filePath
        }*/

        var tempPath = filePath
        var stat = await RNFS.stat(tempPath)
        var lastModified = Math.floor(+new Date(stat.mtime) / 1000)
    }
    catch(e){
        removeFromState()

        BackgroundTimer.clearInterval(stopInterval)

        reportError(e, "upload:copyAndStat")

        if(typeof cameraUploadCallback !== "function"){
            showToast({ message: e.toString() })
        }
        else{
            cameraUploadCallback(e)
        }

        clearCache()

        return console.log(e)
    }

    if(typeof pickedFile.lastModified !== "undefined"){
        lastModified = pickedFile.lastModified
    }

    try{
        var existsResponse = await fileExists({ name, parent })
    }
    catch(e){
        removeFromState()

        BackgroundTimer.clearInterval(stopInterval)

        if(typeof cameraUploadCallback !== "function"){
            showToast({ message: e.toString() })
        }
        else{
            cameraUploadCallback(e)
        }

        clearCache()

        return console.log(e)
    }

    if(existsResponse.exists){
        if(typeof cameraUploadCallback == "function"){
            removeFromState()

            BackgroundTimer.clearInterval(stopInterval)

            return cameraUploadCallback(null, item)
        }

        try{
            var updateUUID = await global.nodeThread.uuidv4()

            await archiveFile({ existsUUID: existsResponse.existsUUID, updateUUID })

            item.versionedUUID = existsResponse.existsUUID
        }
        catch(e){
            removeFromState()

            BackgroundTimer.clearInterval(stopInterval)

            if(typeof cameraUploadCallback !== "function"){
                showToast({ message: e.toString() })
            }
            else{
                cameraUploadCallback(e)
            }

            clearCache()

            return console.log(e)
        }
    }

    const masterKeys = getMasterKeys()
    const apiKey = getAPIKey()

    if(typeof masterKeys !== "object"){
        removeFromState()

        BackgroundTimer.clearInterval(stopInterval)

        if(typeof cameraUploadCallback == "function"){
            cameraUploadCallback("invalid master keys")
        }
        else{
            showToast({ message: "Invalid master keys, relogin" })
        }

        clearCache()

        return console.log("master keys !== object")
    }

    if(masterKeys.length <= 0){
        removeFromState()

        BackgroundTimer.clearInterval(stopInterval)

        if(typeof cameraUploadCallback == "function"){
            cameraUploadCallback("invalid master keys")
        }
        else{
            showToast({ message: "Invalid master keys, relogin" })
        }

        clearCache()

        return console.log("master keys !== object")
    }

    if(typeof masterKeys[masterKeys.length - 1] !== "string"){
        removeFromState()

        BackgroundTimer.clearInterval(stopInterval)

        if(typeof cameraUploadCallback == "function"){
            cameraUploadCallback("invalid master keys")
        }
        else{
            showToast({ message: "Invalid master keys, relogin" })
        }

        clearCache()

        return console.log("master key !== string")
    }

    const expire = "never"

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

        reportError(e, "upload:encryptAndCreateMetadata")

        BackgroundTimer.clearInterval(stopInterval)

        if(typeof cameraUploadCallback == "function"){
            cameraUploadCallback(e)
        }
        else{
            showToast({ message: e.toString() })
        }

        clearCache()

        return console.log(e)
    }

    if(typeof updateUUID !== "undefined"){
        uuid = updateUUID
    }

    item.uuid = uuid

    let chunksDone = 0
    let currentIndex = -1
    let err = undefined

    const clearAfterUpload = () => {
        return new Promise(async (resolve) => {
            if(!clear){
                return resolve()
            }

            try{
                if((await RNFS.exists(tempPath))){
                    await RNFS.unlink(tempPath)
                }
        
                if(filePath.indexOf(RNFS.CachesDirectoryPath) !== -1 || filePath.indexOf(RNFS.TemporaryDirectoryPath) !== -1){
                    if((await RNFS.exists(filePath))){
                        await RNFS.unlink(filePath)
                    }
                }
            }
            catch(e){
                //console.log(e)
            }
        
            clearCache()

            return resolve()
        })
    }

    const upload = (index) => {
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
                return reject("stopped")
            }

            RNFS.read(tempPath, chunkSizeToUse, (index * chunkSizeToUse), "base64").then((base64) => {
                try{
                    var queryParams = new URLSearchParams({
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
                        version: encodeURIComponent(2)
                    }).toString()
                }
                catch(e){
                    return reject(e)
                }

                const maxTries = 1024
                let currentTries = 0
                const triesTimeout = 1000

                const doUpload = () => {
                    if(currentTries >= maxTries){
                        return reject(new Error("max tries reached for upload, returning, uuid: " + uuid + ", name: " + name))
                    }

                    currentTries += 1

                    encryptAndUploadChunk({
                        base64,
                        key,
                        url: getUploadServer() + "/v1/upload?" + queryParams,
                        timeout: 3600000
                    }).then((res) => {
                        if(typeof res !== "object"){
                            console.log("upload res not object, uuid: " + uuid + ", name: " + name)

                            return BackgroundTimer.setTimeout(doUpload, triesTimeout)
                        }
    
                        if(!res.status){
                            console.log(res.message)

                            return BackgroundTimer.setTimeout(doUpload, triesTimeout)
                        }
    
                        updateProgress((chunksDone + 1))
    
                        if(typeof progressCallback == "function"){
                            progressCallback((chunksDone + 1), fileChunks)
                        }
    
                        return resolve(res)
                    }).catch(reject)
                }

                doUpload()
            }).catch(reject)
        })
    }

    try{
        var res = await upload(0)

        item.region = res.data.region
        item.bucket = res.data.bucket
    }
    catch(e){
        err = e
    }

    if(typeof err == "undefined"){
        chunksDone += 1
        currentIndex += 1

        while(fileChunks > chunksDone && typeof err == "undefined"){
            let chunksLeft = (fileChunks - chunksDone)
            let chunksToUpload = maxThreads
            
            if(chunksLeft >= maxThreads){
                chunksToUpload = maxThreads
            }
            else{
                chunksToUpload = chunksLeft
            }
            
            const uploadChunks = []
            
            for(let i = 0; i < chunksToUpload; i++){
                currentIndex += 1

                uploadChunks.push(upload(currentIndex))
            }
            
            try{
                await Promise.all(uploadChunks)
            }
            catch(e){
                err = e

                break
            }
            
            chunksDone += uploadChunks.length
        }
    }

    if(typeof err == "undefined"){
        try{
            await upload((currentIndex + 1))
        }
        catch(e){
            err = e
        }

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
    
                        ImageResizer.createResizedImage(tempPath, width, height, "JPEG", quality).then((compressed) => {
                            RNFS.moveFile(compressed.uri, dest).then(() => {
                                storage.set(cacheKey, item.uuid + ".jpg")
                                memoryCache.set("cachedThumbnailPaths:" + uuid, item.uuid + ".jpg")
    
                                return resolve()
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

    await clearAfterUpload()

    if(typeof err !== "undefined"){
        BackgroundTimer.clearInterval(stopInterval)

        if(err == "stopped"){
            if(typeof cameraUploadCallback == "function"){
                cameraUploadCallback("stopped")
            }

            return true
        }
        else if(err.toString().toLowerCase().indexOf("blacklist") !== -1){
            removeFromState()

            if(typeof cameraUploadCallback == "function"){
                cameraUploadCallback(err)
            }
            else{
                showToast({ message: i18n(storage.getString("lang"), "notEnoughRemoteStorage") })
            }

            return console.log(err)
        }
        else{
            removeFromState()

            if(typeof cameraUploadCallback == "function"){
                cameraUploadCallback(err)
            }
            else{
                showToast({ message: err.toString() })
            }

            return console.log(err)
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
    catch(e){
        removeFromState()

        BackgroundTimer.clearInterval(stopInterval)

        if(typeof cameraUploadCallback == "function"){
            cameraUploadCallback(e)
        }
        else{
            showToast({ message: e.toString() })
        }

        return console.log(e)
    }

    const newItem = await buildFile({
        file: {
            uuid,
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
            size,
            parent,
            chunks: fileChunks,
            receiverId: undefined,
            receiverEmail: undefined,
            sharerId: undefined,
            sharerEmail: undefined,
            version: 2,
            favorited: 0
        },
        metadata: {
            uuid,
            name,
            size,
            mime,
            key,
            lastModified
        },
        masterKeys,
        email: storage.getString("email"),
        userId: storage.getNumber("userId")
    })

    if(typeof cameraUploadCallback == "function" || parent == "photos"){
        await addItemLoadItemsCache({
            item: newItem,
            routeURL: "photos"
        })

        DeviceEventEmitter.emit("event", {
            type: "add-item",
            data: {
                item: newItem,
                parent: "photos"
            }
        })
    }
    else{
        DeviceEventEmitter.emit("event", {
            type: "reload-list",
            data: {
                parent
            }
        })
    }

    removeFromState()

    BackgroundTimer.clearInterval(stopInterval)

    //showToast({ message: i18n(storage.getString("lang"), "fileUploaded", true, ["__NAME__"], [name]) })

    if(typeof cameraUploadCallback == "function"){
        cameraUploadCallback(null, item)
    }

    return true
}