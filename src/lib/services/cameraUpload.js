import { storage } from "../storage"
import CameraRoll from "@react-native-community/cameraroll"
import { Platform } from "react-native"
import { useStore } from "../state"
import { queueFileUpload } from "../upload"
import { getFilenameFromPath, Semaphore, randomIdUnsafe, getFileExt, promiseAllSettled } from "../helpers"
import ReactNativeBlobUtil from "react-native-blob-util"
import { getDownloadPath } from "../download"
import { folderPresent, reportError } from "../api"
import BackgroundTimer from "react-native-background-timer"
import RNFS from "react-native-fs"
import { hasStoragePermissions, hasPhotoLibraryPermissions } from "../permissions"

const cameraUploadTimeout = 1000
const copySemaphore = new Semaphore(1)
const maxErrorCountIds = 5
const erroredIds = {}

const increaseErrorCountForId = (id) => {
    if(typeof erroredIds[id] == "undefined"){
        erroredIds[id] = 0
    }

    erroredIds[id] = erroredIds[id] + 1

    return true
}

const getErrorCountForId = (id) => {
    return typeof erroredIds[id] == "undefined" ? 0 : erroredIds[id]
}

export const isCameraUploadRunning = () => {
    try{
        return storage.getBoolean("cameraUploadRunning")
    }
    catch(e){
        console.log(e)

        return false
    }
}

export const setCameraUploadRunning = (val = true) => {
    try{
        storage.set("cameraUploadRunning", val)
    }
    catch(e){
        console.log(e)

        return false
    }

    return true
}

export const disableCameraUpload = (resetFolder = false) => {
    try{
        var userId = storage.getString("userId")

        storage.set("cameraUploadEnabled:" + userId, false)

        if(resetFolder){
            storage.delete("cameraUploadFolderUUID:" + userId)
            storage.delete("cameraUploadFolderName:" + userId)
        }
    }
    catch(e){
        console.log(e)

        return false
    }

    return true
}

export const runCameraUpload = async ({ maxQueue = 10, runOnce = false, callback = undefined }) => {
    const callCallback = (...args) => {
        if(typeof callback == "function"){
            return callback(...args)
        }

        return false
    }

    if(isCameraUploadRunning() && !runOnce){
        callCallback(false)

        return false
    }

    setCameraUploadRunning(true)

    const isDeviceReady = useStore.getState().isDeviceReady
    const netInfo = useStore.getState().netInfo

    if(!isDeviceReady){
        setCameraUploadRunning(false)
        callCallback(false)

        if(runOnce){
            return false
        }
        else{
            return BackgroundTimer.setTimeout(() => {
                runCameraUpload({ maxQueue, runOnce, callback })
            }, cameraUploadTimeout)
        }
    }

    try{
        var isLoggedIn = storage.getBoolean("isLoggedIn")
    }
    catch(e){
        console.log(e)

        reportError(e, "cameraUpload:getIsLoggedIn")

        setCameraUploadRunning(false)
        callCallback(false)

        if(runOnce){
            return false
        }
        else{
            return BackgroundTimer.setTimeout(() => {
                runCameraUpload({ maxQueue, runOnce, callback })
            }, cameraUploadTimeout)
        }
    }

    if(!isLoggedIn){
        setCameraUploadRunning(false)
        callCallback(false)

        if(runOnce){
            return false
        }
        else{
            return BackgroundTimer.setTimeout(() => {
                runCameraUpload({ maxQueue, runOnce, callback })
            }, cameraUploadTimeout)
        }
    }

    try{
        var userId = storage.getString("userId")
    }
    catch(e){
        console.log(e)

        reportError(e, "cameraUpload:getUserId")

        setCameraUploadRunning(false)
        callCallback(false)

        if(runOnce){
            return false
        }
        else{
            return BackgroundTimer.setTimeout(() => {
                runCameraUpload({ maxQueue, runOnce, callback })
            }, cameraUploadTimeout)
        }
    }

    if(typeof userId !== "number"){
        setCameraUploadRunning(false)
        callCallback(false)

        reportError("userId !== number", "cameraUpload:userId")

        if(runOnce){
            return false
        }
        else{
            return BackgroundTimer.setTimeout(() => {
                runCameraUpload({ maxQueue, runOnce, callback })
            }, cameraUploadTimeout)
        }
    }

    if(userId == 0){
        setCameraUploadRunning(false)
        callCallback(false)

        reportError("userId == 0", "cameraUpload:userId")

        if(runOnce){
            return false
        }
        else{
            return BackgroundTimer.setTimeout(() => {
                runCameraUpload({ maxQueue, runOnce, callback })
            }, cameraUploadTimeout)
        }
    }

    try{
        if(storage.getBoolean("onlyWifiUploads:" + userId) && netInfo.type !== "wifi"){
            setCameraUploadRunning(false)
            callCallback(false)

            if(runOnce){
                return false
            }
            else{
                return BackgroundTimer.setTimeout(() => {
                    runCameraUpload({ maxQueue, runOnce, callback })
                }, cameraUploadTimeout)
            }
        }
    }
    catch(e){
        console.log(e)

        reportError(e, "cameraUpload:getWifiOnlyUploads")
    }

    try{
        var cameraUploadEnabled = storage.getBoolean("cameraUploadEnabled:" + userId)
        var cameraUploadFolderUUID = storage.getString("cameraUploadFolderUUID:" + userId)
        var cameraUploadFetchNewAssetsTimeout = storage.getNumber("cameraUploadFetchNewAssetsTimeout") || 0
        var cameraUploadUploadedIds = JSON.parse(storage.getString("cameraUploadUploadedIds:" + userId) || "{}")
    }
    catch(e){
        console.log(e)

        reportError(e, "cameraUpload:getState")

        setCameraUploadRunning(false)
        callCallback(false)

        if(runOnce){
            return false
        }
        else{
            return BackgroundTimer.setTimeout(() => {
                runCameraUpload({ maxQueue, runOnce, callback })
            }, cameraUploadTimeout)
        }
    }

    useStore.setState({ cameraUploadUploaded: Object.keys(cameraUploadUploadedIds).length })

    if(!cameraUploadEnabled){
        setCameraUploadRunning(false)
        callCallback(false)

        return false
    }

    if(typeof cameraUploadFolderUUID !== "string"){
        setCameraUploadRunning(false)
        disableCameraUpload(true)
        callCallback(false)

        return false
    }

    if(cameraUploadFolderUUID.length < 32){
        setCameraUploadRunning(false)
        disableCameraUpload(true)
        callCallback(false)

        return false
    }

    if(!netInfo.isConnected || !netInfo.isInternetReachable){
        setCameraUploadRunning(false)
        callCallback(false)

        if(runOnce){
            return false
        }
        else{
            return BackgroundTimer.setTimeout(() => {
                runCameraUpload({ maxQueue, runOnce, callback })
            }, cameraUploadTimeout)
        }
    }

    let folderExists = false

    try{
        const isFolderPresent = await folderPresent({ uuid: cameraUploadFolderUUID })

        if(isFolderPresent.present){
            if(!isFolderPresent.trash){
                folderExists = true
            }
        }
    }
    catch(e){
        console.log(e)

        reportError(e, "cameraUpload:folderPresent")

        setCameraUploadRunning(false)
        callCallback(false)

        if(runOnce){
            return false
        }
        else{
            return BackgroundTimer.setTimeout(() => {
                runCameraUpload({ maxQueue, runOnce, callback })
            }, cameraUploadTimeout)
        }
    }

    if(!folderExists){
        setCameraUploadRunning(false)
        disableCameraUpload(true)

        return false
    }

    if(Math.floor(+new Date()) > cameraUploadFetchNewAssetsTimeout){
        try{
            var assets = await getCameraRollAssets()

            storage.set("cachedCameraUploadAssets:" + userId, JSON.stringify(assets))
            storage.set("cameraUploadFetchNewAssetsTimeout", (Math.floor(+new Date()) + 30000))
        }
        catch(e){
            console.log(e)

            reportError(e, "cameraUpload:getCameraRollAssets")

            setCameraUploadRunning(false)
            callCallback(false)

            if(runOnce){
                return false
            }
            else{
                return BackgroundTimer.setTimeout(() => {
                    runCameraUpload({ maxQueue, runOnce, callback })
                }, cameraUploadTimeout)
            }
        }
    }
    else{
        try{
            var assets = JSON.parse(storage.getString("cachedCameraUploadAssets:" + userId) || "[]")
        }
        catch(e){
            console.log(e)

            reportError(e, "cameraUpload:getCachedCameraRollAssets")

            setCameraUploadRunning(false)
            callCallback(false)

            if(runOnce){
                return false
            }
            else{
                return BackgroundTimer.setTimeout(() => {
                    runCameraUpload({ maxQueue, runOnce, callback })
                }, cameraUploadTimeout)
            }
        }
    }

    useStore.setState({ cameraUploadTotal: assets.length })

    if(assets.length == 0){
        setCameraUploadRunning(false)
        callCallback(false)

        if(runOnce){
            return false
        }
        else{
            return BackgroundTimer.setTimeout(() => {
                runCameraUpload({ maxQueue, runOnce, callback })
            }, cameraUploadTimeout)
        }
    }

    if(Object.keys(cameraUploadUploadedIds).length == assets.length){
        setCameraUploadRunning(false)
        callCallback(false)

        if(runOnce){
            return false
        }
        else{
            return BackgroundTimer.setTimeout(() => {
                runCameraUpload({ maxQueue, runOnce, callback })
            }, cameraUploadTimeout)
        }
    }

    let currentQueue = 0
    const uploads = []

    const upload = (asset) => {
        return new Promise(async (resolve, reject) => {
            const id = getAssetId(asset)

            if(getErrorCountForId(id) >= maxErrorCountIds){
                return resolve()
            }

            await copySemaphore.acquire()

            const uploadName = getUploadName(asset)

            if(Platform.OS == "android"){
                try{
                    var stat = await RNFS.stat(asset.uri)
                    var copyPath = await getDownloadPath({ type: "temp" }) + randomIdUnsafe() + "." + getFileExt(uploadName)

                    if((await RNFS.exists(copyPath))){
                        await RNFS.unlink(copyPath)
                    }

                    await new Promise((resolve) => BackgroundTimer.setTimeout(resolve, 100)) // somehow needs to sleep a bit, otherwise the copy call fails on older/slower devices
                    
                    await RNFS.copyFile(asset.uri, copyPath)
                }
                catch(e){
                    console.log(e)

                    copySemaphore.release()

                    reportError(e, "cameraUpload:copyAndStat")
                    increaseErrorCountForId(id)

                    return reject(e)
                }

                if(typeof stat !== "object"){
                    copySemaphore.release()

                    reportError("camera upload: copy path stat !== object")
                    increaseErrorCountForId(id)

                    return reject("camera upload: copy path stat !== object")
                }

                var file = {
                    uri: copyPath.indexOf("file://") == -1 ? "file://" + copyPath : copyPath,
                    name: uploadName,
                    size: stat.size,
                    type: asset.type,
                    lastModified: asset.timestamp
                }
            }
            else{
                try{
                    var copyPath = await getDownloadPath({ type: "temp" }) + randomIdUnsafe() + "." + getFileExt(uploadName)

                    if((await RNFS.exists(copyPath))){
                        await RNFS.unlink(copyPath)
                    }

                    await new Promise((resolve) => BackgroundTimer.setTimeout(resolve, 100)) // somehow needs to sleep a bit, otherwise the copy call fails on older/slower devices

                    //todo: RN blob util supports copying raw heif/heic, make it an option
                    //await ReactNativeBlobUtil.fs.cp(asset.uri, copyPath)

                    if(asset.type.indexOf("image") !== -1){
                        await RNFS.copyAssetsFileIOS(asset.uri, copyPath, 0, 0)
                    }
                    else{
                        await RNFS.copyAssetsVideoIOS(asset.uri, copyPath)
                    }

                    await new Promise((resolve) => BackgroundTimer.setTimeout(resolve, 1000)) // somehow needs to sleep a bit, otherwise the stat call fails on older/slower devices

                    var stat = await RNFS.stat(copyPath)
                }
                catch(e){
                    console.log(e)

                    copySemaphore.release()

                    reportError(e, "cameraUpload:copyAndStat")
                    increaseErrorCountForId(id)

                    return reject(e)
                }

                if(typeof stat !== "object"){
                    copySemaphore.release()

                    reportError("camera upload: copy path stat !== object")
                    increaseErrorCountForId(id)

                    return reject("camera upload: copy path stat !== object")
                }

                var file = {
                    uri: copyPath.indexOf("file://") == -1 ? "file://" + copyPath : copyPath,
                    name: uploadName,
                    size: stat.size,
                    type: asset.type.indexOf("image") !== -1 ? "image/jpg" : "video/mp4",
                    lastModified: asset.timestamp
                }
            }

            copySemaphore.release()

            queueFileUpload({
                pickedFile: file,
                parent: cameraUploadFolderUUID,
                cameraUploadCallback: async (err) => {
                    if(!err){
                        try{
                            const uploadedIds = JSON.parse(storage.getString("cameraUploadUploadedIds:" + userId) || "{}")

                            if(typeof uploadedIds[id] == "undefined"){
                                uploadedIds[id] = true

                                storage.set("cameraUploadUploadedIds:" + userId, JSON.stringify(uploadedIds))

                                useStore.setState({ cameraUploadUploaded: Object.keys(uploadedIds).length })
                            }
                        }
                        catch(e){
                            console.log(e)
                        }
                    }
                    else{
                        return reject(err)
                    }

                    return resolve()
                }
            })
        })
    }

    for(let i = 0; i < assets.length; i++){
        const id = getAssetId(assets[i])

        if(typeof cameraUploadUploadedIds[id] == "undefined" && maxQueue > currentQueue){
            currentQueue += 1

            uploads.push(upload(assets[i]))
        }
    }

    if(uploads.length > 0){
        try{
            await promiseAllSettled(uploads)
        }
        catch(e){
            console.log(e)
        }
    }

    setCameraUploadRunning(false)
    callCallback(true)

    if(runOnce){
        return true
    }
    else{
        return BackgroundTimer.setTimeout(() => {
            runCameraUpload({ maxQueue, runOnce, callback })
        }, cameraUploadTimeout)
    }
}

export const getUploadName = (asset) => {
    //new Date(asset.timestamp * 1000).toLocaleString().split(" ").join("_").split(",").join("_").split(":").join("_").split(".").join("_") + "_" + 

    if(Platform.OS == "ios"){
        return asset.rawId.split("/").join("_").split("-").join("_") + "." + (asset.type.indexOf("image") !== -1 ? "jpg" : "mp4")
    }
    else{
        return getFilenameFromPath(asset.uri)
    }
}

export const getAssetId = (asset) => {
    return asset.uri
}

export const convertPhAssetToAssetsLibrary = (localId, ext) => {
    const hash = localId.split("/")[0]

    return "assets-library://asset/asset." + ext + "?id=" + hash + "&ext=" + ext
}

export const getCameraRollAssets = () => {
    return new Promise((resolve, reject) => {
        hasStoragePermissions(false).then(() => {
            hasPhotoLibraryPermissions(false).then(() => {
                try{
                    var userId = storage.getString("userId")
                    var cameraUploadIncludeImages = storage.getBoolean("cameraUploadIncludeImages:" + userId)
                    var cameraUploadIncludeVideos = storage.getBoolean("cameraUploadIncludeVideos:" + userId)
                }
                catch(e){
                    return reject(e)
                }
        
                let assetType = "All"
        
                if(cameraUploadIncludeImages && !cameraUploadIncludeVideos){
                    assetType = "Photos"
                }
        
                if(!cameraUploadIncludeImages && cameraUploadIncludeVideos){
                    assetType = "Videos"
                }
        
                if(cameraUploadIncludeImages && cameraUploadIncludeVideos){
                    assetType = "All"
                }
        
                const max = 100
                let after = undefined
                const photos = []
                const existing = {}
        
                const get = (first, cursor) => {
                    CameraRoll.getPhotos({
                        first,
                        assetType,
                        include: [],
                        after: cursor
                    }).then((data) => {
                        try{
                            data.edges.forEach((edge) => {
                                const uri = decodeURIComponent(edge.node.image.uri)
            
                                // Do not upload files that are locally saved (app isolated library), avoiding duplicates
                                if(
                                    uri.indexOf("/io.filen.app/") == -1
                                    && typeof existing[uri] == "undefined"
                                    && getErrorCountForId(uri) < maxErrorCountIds
                                ){
                                    existing[uri] = true
                                    
                                    photos.push({
                                        rawId: uri.replace("ph://", ""),
                                        uri: Platform.OS == "ios" ? convertPhAssetToAssetsLibrary(uri.replace("ph://", ""), edge.node.type === "image" ? "jpg" : "mov") : uri,
                                        rawURI: uri,
                                        type: edge.node.type,
                                        timestamp: Math.floor(edge.node.timestamp)
                                    })
                                }
                            })
            
                            if(data.page_info.has_next_page){
                                after = data.page_info.end_cursor
            
                                return get(first, after)
                            }
            
                            // There is sorting bug in the RN-CameraRoll lib so we have to manually sort the fetched assets by date taken DESC
                            const assets = photos.sort((a, b) => {
                                return b.timestamp > a.timestamp
                            })
            
                            return resolve(assets)
                        }
                        catch(e){
                            return reject(e)
                        }
                    }).catch(reject)
                }
        
                return get(max, after)
            }).catch(reject)
        }).catch(reject)
    })
}