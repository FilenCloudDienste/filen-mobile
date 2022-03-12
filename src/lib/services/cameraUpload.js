import { storage } from "../storage"
import CameraRoll from "@react-native-community/cameraroll"
import { Platform } from "react-native"
import { useStore } from "../state"
import { queueFileUpload } from "../upload"
import { getFilenameFromPath, getFileExt } from "../helpers"
import RNFS from "react-native-fs"
import { getDownloadPath } from "../download"

const cameraUploadTimeout = 1000

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
        var email = storage.getString("email")

        storage.set("cameraUploadEnabled:" + email, false)

        if(resetFolder){
            storage.delete("cameraUploadFolderUUID:" + email)
            storage.delete("cameraUploadFolderName:" + email)
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
            return setTimeout(() => {
                runCameraUpload({ maxQueue, runOnce, callback })
            }, cameraUploadTimeout)
        }
    }

    try{
        var isLoggedIn = storage.getBoolean("isLoggedIn")
    }
    catch(e){
        console.log(e)

        setCameraUploadRunning(false)
        callCallback(false)

        if(runOnce){
            return false
        }
        else{
            return setTimeout(() => {
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
            return setTimeout(() => {
                runCameraUpload({ maxQueue, runOnce, callback })
            }, cameraUploadTimeout)
        }
    }

    try{
        var email = storage.getString("email")
    }
    catch(e){
        console.log(e)

        setCameraUploadRunning(false)
        callCallback(false)

        if(runOnce){
            return false
        }
        else{
            return setTimeout(() => {
                runCameraUpload({ maxQueue, runOnce, callback })
            }, cameraUploadTimeout)
        }
    }

    if(typeof email !== "string"){
        setCameraUploadRunning(false)
        callCallback(false)

        if(runOnce){
            return false
        }
        else{
            return setTimeout(() => {
                runCameraUpload({ maxQueue, runOnce, callback })
            }, cameraUploadTimeout)
        }
    }

    try{
        if(storage.getBoolean("onlyWifiUploads:" + email) && netInfo.type !== "wifi"){
            setCameraUploadRunning(false)
            callCallback(false)

            if(runOnce){
                return false
            }
            else{
                return setTimeout(() => {
                    runCameraUpload({ maxQueue, runOnce, callback })
                }, cameraUploadTimeout)
            }
        }
    }
    catch(e){
        console.log(e)
    }

    try{
        var cameraUploadEnabled = storage.getBoolean("cameraUploadEnabled:" + email)
        var cameraUploadFolderUUID = storage.getString("cameraUploadFolderUUID:" + email)
        var cameraUploadFetchNewAssetsTimeout = storage.getNumber("cameraUploadFetchNewAssetsTimeout") || 0
        var cameraUploadUploadedIds = JSON.parse(storage.getString("cameraUploadUploadedIds:" + email) || "{}")
    }
    catch(e){
        console.log(e)

        setCameraUploadRunning(false)
        callCallback(false)

        if(runOnce){
            return false
        }
        else{
            return setTimeout(() => {
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
            return setTimeout(() => {
                runCameraUpload({ maxQueue, runOnce, callback })
            }, cameraUploadTimeout)
        }
    }

    /*try{
        //folderExists
    }

    if(!folderExists){
        setCameraUploadRunning(false)
        disableCameraUpload(true)

        return false
    }*/

    if(Math.floor(+new Date()) > cameraUploadFetchNewAssetsTimeout){
        try{
            var assets = await getCameraRollAssets()

            storage.set("cachedCameraUploadAssets:" + email, JSON.stringify(assets))
            storage.set("cameraUploadFetchNewAssetsTimeout", (Math.floor(+new Date()) + 30000))
        }
        catch(e){
            console.log(e)

            setCameraUploadRunning(false)
            callCallback(false)

            if(runOnce){
                return false
            }
            else{
                return setTimeout(() => {
                    runCameraUpload({ maxQueue, runOnce, callback })
                }, cameraUploadTimeout)
            }
        }
    }
    else{
        try{
            var assets = JSON.parse(storage.getString("cachedCameraUploadAssets:" + email) || "[]")
        }
        catch(e){
            console.log(e)

            setCameraUploadRunning(false)
            callCallback(false)

            if(runOnce){
                return false
            }
            else{
                return setTimeout(() => {
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
            return setTimeout(() => {
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
            return setTimeout(() => {
                runCameraUpload({ maxQueue, runOnce, callback })
            }, cameraUploadTimeout)
        }
    }

    let currentQueue = 0
    const uploads = []

    const upload = (asset) => {
        return new Promise(async (resolve, reject) => {
            const id = getAssetId(asset)

            if(Platform.OS == "android"){
                try{
                    var stat = await RNFS.stat(asset.uri)
                    var copyPath = await getDownloadPath({ type: "temp" }) + await global.nodeThread.uuidv4()
                    
                    await RNFS.copyFile(asset.uri, copyPath)
                }
                catch(e){
                    console.log(e)

                    return resolve()
                }

                if(typeof stat !== "object"){
                    return resolve()
                }

                var file = {
                    uri: copyPath.indexOf("file://") == -1 ? "file://" + copyPath : copyPath,
                    name: getUploadName(asset),
                    size: stat.size,
                    type: asset.type,
                    lastModified: asset.timestamp
                }
            }
            else{
                try{
                    var copyPath = await getDownloadPath({ type: "temp" }) + await global.nodeThread.uuidv4()

                    if(asset.type.indexOf("image") !== -1){
                        await RNFS.copyAssetsFileIOS(asset.uri, copyPath, 0, 0)
                    }
                    else{
                        await RNFS.copyAssetsVideoIOS(asset.uri, copyPath)
                    }

                    var stat = await RNFS.stat(copyPath)
                }
                catch(e){
                    console.log(e)

                    return resolve()
                }

                if(typeof stat !== "object"){
                    return resolve()
                }

                var file = {
                    uri: copyPath.indexOf("file://") == -1 ? "file://" + copyPath : copyPath,
                    name: getUploadName(asset),
                    size: stat.size,
                    type: asset.type.indexOf("image") !== -1 ? "image/jpg" : "video/mp4",
                    lastModified: asset.timestamp
                }
            }

            queueFileUpload({
                pickedFile: file,
                parent: cameraUploadFolderUUID,
                cameraUploadCallback: async (err, item) => {
                    if(!err){
                        try{
                            const uploadedIds = JSON.parse(storage.getString("cameraUploadUploadedIds:" + email) || "{}")

                            if(typeof uploadedIds[id] == "undefined"){
                                uploadedIds[id] = true

                                storage.set("cameraUploadUploadedIds:" + email, JSON.stringify(uploadedIds))

                                useStore.setState({ cameraUploadUploaded: Object.keys(uploadedIds).length })
                            }
                        }
                        catch(e){
                            console.log(e)
                        }
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
            await Promise.all(uploads)
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
        //return setTimeout(() => {
        //    runCameraUpload({ maxQueue, runOnce, callback })
        //}, cameraUploadTimeout)
    }
}

export const getUploadName = (asset) => {
    if(Platform.OS == "ios"){
        return new Date(asset.timestamp * 1000).toLocaleString().split(" ").join("_").split(",").join("_").split(":").join("_").split(".").join("_") + "." + (asset.type.indexOf("image") !== -1 ? "jpg" : "mp4")
    }
    else{
        return new Date(asset.timestamp * 1000).toLocaleString().split(" ").join("_").split(",").join("_").split(":").join("_").split(".").join("_") + "." + getFileExt(getFilenameFromPath(asset.uri))
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
        try{
            var email = storage.getString("email")
            var cameraUploadIncludeImages = storage.getBoolean("cameraUploadIncludeImages:" + email)
            var cameraUploadIncludeVideos = storage.getBoolean("cameraUploadIncludeVideos:" + email)
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

        const max = 1000
        let after = undefined
        const photos = []

        const get = (first, cursor) => {
            CameraRoll.getPhotos({
                first,
                assetType,
                include: [],
                after: cursor
            }).then((data) => {
                data.edges.forEach((edge) => {
                    photos.push({
                        uri: Platform.OS == "ios" ? convertPhAssetToAssetsLibrary(edge.node.image.uri.replace("ph://", ""), edge.node.type === "image" ? "jpg" : "mov") : edge.node.image.uri,
                        type: edge.node.type,
                        timestamp: Math.floor(edge.node.timestamp)
                    })
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
            }).catch(reject)
        }

        return get(max, after)
    })
}