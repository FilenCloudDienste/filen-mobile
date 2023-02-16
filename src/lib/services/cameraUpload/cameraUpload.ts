import storage from "../../storage"
import { queueFileUpload, UploadFile } from "../upload/upload"
import { Platform } from "react-native"
import { randomIdUnsafe, promiseAllSettled, convertTimestampToMs, getAPIKey, decryptFileMetadata, getMasterKeys, toExpoFsPath, getAssetId, Semaphore, getFileExt } from "../../helpers"
import { folderPresent, apiRequest } from "../../api"
import * as MediaLibrary from "expo-media-library"
import * as FileSystem from "expo-file-system"
import mimeTypes from "mime-types"
import { logger, fileAsyncTransport, mapConsoleTransport } from "react-native-logs"
// @ts-ignore
import RNHeicConverter from "react-native-heic-converter"
import { hasPhotoLibraryPermissions, hasReadPermissions, hasWritePermissions, hasStoragePermissions } from "../../permissions"
import { isOnline, isWifi } from "../isOnline"
import { MAX_CAMERA_UPLOAD_QUEUE } from "../../constants"
import pathModule from "path"
import { memoize } from "lodash"
import { validate } from "uuid"

const CryptoJS = require("crypto-js")
const log = logger.createLogger({
    severity: "debug",
    transport: [fileAsyncTransport, mapConsoleTransport],
    transportOptions: {
        FS: FileSystem,
        fileName: "logs/cameraUpload.log"
    }
})

const TIMEOUT: number = 5000
const FAILED: { [key: string]: number } = {}
const MAX_FAILED: number = 1
const MAX_FETCH_TIME: number = 15000
let askedForPermissions: boolean = false
const getFileMutex = new Semaphore(1)
const uploadSemaphore = new Semaphore(MAX_CAMERA_UPLOAD_QUEUE)
let runTimeout: number = 0
let fallbackInterval: NodeJS.Timer

export const runMutex = new Semaphore(1)
export const getLocalAssetsMutex = new Semaphore(1)

export const startFallbackInterval = () => {
    clearInterval(fallbackInterval)

    fallbackInterval = setInterval(() => {
        runCameraUpload()
    }, 5500)
}

export const disableCameraUpload = (resetFolder: boolean = false): void => {
    const userId = storage.getNumber("userId")

    if(userId == 0){
        return
    }

    storage.set("cameraUploadEnabled:" + userId, false)

    if(resetFolder){
        storage.delete("cameraUploadFolderUUID:" + userId)
        storage.delete("cameraUploadFolderName:" + userId)
        storage.set("cameraUploadUploaded", 0)
        storage.set("cameraUploadTotal", 0)
        storage.delete("loadItemsCache:photos")
        storage.delete("loadItemsCache:lastResponse:photos")
    }
}

export const photoExts: string[] = [
    "jpg",
    "jpeg",
    "png",
    "gif",
    "heic",
    "heif",
    "apng",
    "avif",
    "jfif",
    "pjpeg",
    "pjp",
    "svg",
    "webp",
    "bmp",
    "ico",
    "cur",
    "tif",
    "tiff"
]

export const videoExts: string[] = [
    "hevc",
    "webm",
    "mkv",
    "flv",
    "vob",
    "ogv",
    "ogg",
    "drc",
    "gifv",
    "mng",
    "avi",
    "mts",
    "m2ts2",
    "ts",
    "mov",
    "wmv",
    "mp4",
    "m4p",
    "m4v",
    "mpg",
    "mp2",
    "mpeg",
    "m2v",
    "m4v",
    "3gp"
]

export const isExtensionAllowed = (ext: string) => {
    if(ext.length == 0){
        return false
    }

    ext = ext.toLowerCase()

    if(ext.indexOf(".") !== -1){
        ext = ext.split(".").join("")
    }

    const userId: number = storage.getNumber("userId")
    const cameraUploadIncludeImages: boolean = storage.getBoolean("cameraUploadIncludeImages:" + userId)
    const cameraUploadIncludeVideos: boolean = storage.getBoolean("cameraUploadIncludeVideos:" + userId)
    const allowed: string[] = []
    
    if(cameraUploadIncludeImages && !cameraUploadIncludeVideos){
        allowed.push(...photoExts)
    }

    if(!cameraUploadIncludeImages && cameraUploadIncludeVideos){
        allowed.push(...videoExts)
    }

    if(cameraUploadIncludeImages && cameraUploadIncludeVideos){
        allowed.push(...photoExts, ...videoExts)
    }

    if(userId == 0){
        allowed.push(...photoExts)
    }

    return allowed.filter(allowedExt => allowedExt == ext).length > 0
}

export const getAssetDeltaName = memoize((name: string) => {
    if(name.indexOf(".") == -1){
        return name
    }

    const parsed = pathModule.parse(name)

    return parsed.name
})

export const getMediaTypes = () => {
    const userId: number = storage.getNumber("userId")
    const cameraUploadIncludeImages: boolean = storage.getBoolean("cameraUploadIncludeImages:" + userId)
    const cameraUploadIncludeVideos: boolean = storage.getBoolean("cameraUploadIncludeVideos:" + userId)
    let assetTypes: MediaLibrary.MediaTypeValue[] = ["photo", "video", "unknown"]

    if(cameraUploadIncludeImages && !cameraUploadIncludeVideos){
        assetTypes = ["photo", "unknown"]
    }

    if(!cameraUploadIncludeImages && cameraUploadIncludeVideos){
        assetTypes = ["video", "unknown"]
    }

    if(cameraUploadIncludeImages && cameraUploadIncludeVideos){
        assetTypes = ["photo", "video", "unknown"]
    }

    if(userId == 0){
        assetTypes = ["photo", "unknown"]
    }

    return assetTypes
}

export const getAssetsFromAlbum = (album: MediaLibrary.AlbumRef): Promise<MediaLibrary.Asset[]> => {
    return new Promise((resolve, reject) => {
        const assets: MediaLibrary.Asset[] = []

        const fetch = (after: MediaLibrary.AssetRef | undefined) => {
            MediaLibrary.getAssetsAsync({
                ...(typeof after !== "undefined" ? { after } : {}),
                first: 256,
                mediaType: ["photo", "video", "unknown"],
                sortBy: [
                    [MediaLibrary.SortBy.creationTime, false]
                ],
                album
            }).then((fetched) => {
                for(let i = 0; i < fetched.assets.length; i++){
                    assets.push(fetched.assets[i])
                }

                if(fetched.hasNextPage){
                    return fetch(fetched.endCursor)
                }

                return resolve(assets)
            }).catch(reject)
        }

        return fetch(undefined)
    })
}

export interface Asset {
    album: MediaLibrary.AlbumRef,
    asset: MediaLibrary.Asset
}

export const getLocalAssets = async (): Promise<MediaLibrary.Asset[]> => {
    const albums = await MediaLibrary.getAlbumsAsync({
        includeSmartAlbums: true
    })

    const userId: number = storage.getNumber("userId")
    let cameraUploadExcludedAlbums: any = storage.getString("cameraUploadExcludedAlbums:" + userId)

    if(typeof cameraUploadExcludedAlbums == "string"){
        try{
            cameraUploadExcludedAlbums = JSON.parse(cameraUploadExcludedAlbums)

            if(typeof cameraUploadExcludedAlbums !== "object"){
                cameraUploadExcludedAlbums = {}
            }
        }
        catch(e){
            log.error(e)

            cameraUploadExcludedAlbums = {}
        }
    }
    else{
        cameraUploadExcludedAlbums = {}
    }

    const promises = []
    const assets: MediaLibrary.Asset[] = []
    const existingIds: { [key: string]: boolean } = {}

    for(let i = 0; i < albums.length; i++){
        if(typeof cameraUploadExcludedAlbums[albums[i].id] !== "undefined"){
            continue
        }
        
        promises.push(new Promise((resolve, reject) => {
            getAssetsFromAlbum(albums[i]).then((fetched) => {
                for(let i = 0; i < fetched.length; i++){
                    if(!existingIds[fetched[i].id]){
                        existingIds[fetched[i].id] = true

                        assets.push(fetched[i])
                    }
                }

                return resolve(true)
            }).catch(reject)
        }))
    }

    await Promise.all(promises)

    return assets
}

export const fetchLocalAssets = async (): Promise<MediaLibrary.Asset[]> => {
    await getLocalAssetsMutex.acquire()

    try{
        const userId: number = storage.getNumber("userId")
        const mediaTypes = getMediaTypes()
        const cameraUploadAfterEnabledTime: number = storage.getNumber("cameraUploadAfterEnabledTime:" + userId)
        const fetched = await getLocalAssets()
        const sorted = fetched.sort((a, b) => a.creationTime - b.creationTime).filter(asset => mediaTypes.includes(asset.mediaType) && convertTimestampToMs(asset.creationTime) >= convertTimestampToMs(cameraUploadAfterEnabledTime) && isExtensionAllowed(getFileExt(asset.filename)))
        const existingNames: { [key: string]: boolean } = {}
        const result: MediaLibrary.Asset[] = []

        for(let i = 0; i < sorted.length; i++){
            const asset = sorted[i]

            if(!existingNames[asset.filename.toLowerCase()]){
                existingNames[asset.filename.toLowerCase()] = true

                result.push(asset)
            }
            else{
                const nameParsed = pathModule.parse(asset.filename)
                const newFileName = nameParsed.name + "_" + convertTimestampToMs(asset.creationTime) + nameParsed.ext

                if(!existingNames[newFileName.toLowerCase()]){
                    existingNames[newFileName.toLowerCase()] = true
                    
                    result.push({
                        ...asset,
                        filename: newFileName
                    })
                }
                else{
                    const assetId = getAssetId(asset)
                    const newFileName = nameParsed.name + "_" + CryptoJS.SHA1(assetId || convertTimestampToMs(asset.creationTime)).toString().slice(0, 10) + nameParsed.ext

                    if(!existingNames[newFileName.toLowerCase()]){
                        existingNames[newFileName.toLowerCase()] = true
    
                        result.push({
                            ...asset,
                            filename: newFileName
                        })
                    }
                }
            }
        }

        getLocalAssetsMutex.release()

        return result
    }
    catch(e){
        console.error(e)

        getLocalAssetsMutex.release()

        throw e
    }
}

export interface CameraUploadItem {
    name: string,
    lastModified: number,
    creation: number,
    id: string,
    type: "local" | "remote",
    asset: MediaLibrary.Asset
}

export interface CameraUploadItems {
    [key: string]: CameraUploadItem
}

export const loadLocal = async (): Promise<CameraUploadItems> => {
    const assets = await fetchLocalAssets()

    if(assets.length == 0){
        return {}
    }

    const items: CameraUploadItems = {}

    for(let i = 0; i < assets.length; i++){
        const asset = assets[i]

        items[getAssetDeltaName(asset.filename.toLowerCase())] = {
            name: asset.filename,
            lastModified: convertTimestampToMs(asset.modificationTime),
            creation: convertTimestampToMs(asset.creationTime),
            id: getAssetId(asset),
            type: "local",
            asset
        }
    }

    return items
}

export const loadRemote = async (): Promise<CameraUploadItems> => {
    const apiKey = getAPIKey()
    const masterKeys = getMasterKeys()
    const userId = storage.getNumber("userId")
    const cameraUploadFolderUUID = storage.getString("cameraUploadFolderUUID:" + userId) || ""

    const response = await apiRequest({
        method: "POST",
        endpoint: "/v1/dir/content",
        data: {
            apiKey,
            uuid: cameraUploadFolderUUID,
            folders: JSON.stringify(["default"]),
            page: 1,
            app: "true"
        }
    })

    if(response.data.uploads.length == 0){
        return {}
    }

    const items: CameraUploadItems = {}
    const sorted = response.data.uploads.sort((a: any, b: any) => a.timestamp - b.timestamp)
    const last = sorted[sorted.length - 1]
    const cameraUploadLastLoadRemote = storage.getString("cameraUploadLastLoadRemoteCache:" + cameraUploadFolderUUID)

    if(typeof cameraUploadLastLoadRemote !== "undefined"){
        const cameraUploadLastLoadRemoteParsed = JSON.parse(cameraUploadLastLoadRemote) as { uuid: string, count: number, items: CameraUploadItems }
        
        if(
            cameraUploadLastLoadRemoteParsed.count == sorted.length
            && cameraUploadLastLoadRemoteParsed.uuid == last.uuid
        ){
            return cameraUploadLastLoadRemoteParsed.items
        }
    }

    for(let i = 0; i < sorted.length; i++){
        const file = sorted[i]
        const decrypted = await decryptFileMetadata(masterKeys, file.metadata, file.uuid)

        if(typeof decrypted.name == "string"){
            if(decrypted.name.length > 0){
                items[getAssetDeltaName(decrypted.name.toLowerCase())] = {
                    name: decrypted.name,
                    lastModified: convertTimestampToMs(decrypted.lastModified),
                    creation: convertTimestampToMs(decrypted.lastModified),
                    id: file.uuid,
                    type: "remote",
                    asset: undefined as any
                }
            }
        }
    }

    storage.set("cameraUploadLastLoadRemoteCache:" + cameraUploadFolderUUID, JSON.stringify({
        uuid: last.uuid,
        count: response.data.uploads.length,
        items
    }))

    return items
}

export type DeltaType = "UPLOAD" | "UPDATE"

export interface Delta {
    type: DeltaType,
    item: CameraUploadItem
}

export const getDeltas = (local: CameraUploadItems, remote: CameraUploadItems) => {
    const cameraUploadLastModified = JSON.parse(storage.getString("cameraUploadLastModified") || "{}")
    const deltas: Delta[] = []

    for(const name in local){
        const assetId = getAssetId(local[name].asset)

        if(!remote[name]){
            if(typeof cameraUploadLastModified[assetId] == "number"){
                if(convertTimestampToMs(cameraUploadLastModified[assetId]) !== convertTimestampToMs(local[name].lastModified)){
                    deltas.push({
                        type: "UPLOAD",
                        item: local[name]
                    })
                }
            }
            else{
                deltas.push({
                    type: "UPLOAD",
                    item: local[name]
                })
            }
        }
        else{
            if(typeof cameraUploadLastModified[assetId] == "number"){
                if(convertTimestampToMs(cameraUploadLastModified[assetId]) !== convertTimestampToMs(local[name].lastModified)){
                    deltas.push({
                        type: "UPDATE",
                        item: local[name]
                    })
                }
            }
        }
    }

    return deltas
}

export const getAssetURI = async (asset: MediaLibrary.Asset) => {
    const info = await MediaLibrary.getAssetInfoAsync(asset, {
        shouldDownloadFromNetwork: true
    })

    let assetURI: string = ""

    if(Platform.OS == "android"){
        if(asset.uri.length > 0){
            assetURI = asset.uri
        }
        else{
            if(typeof info.localUri == "string" && info.localUri.length > 0){
                assetURI = info.localUri
            }
        }
    }
    else{
        if(typeof info.localUri == "string" && info.localUri.length > 0){
            assetURI = info.localUri
        }
        else{
            assetURI = info.uri
        }
    }

    if(typeof assetURI == "string" && assetURI.length > 0){
        return assetURI
    }

    throw new Error("No asset URI found for " + asset.id)
}

export const getFile = (asset: MediaLibrary.Asset, assetURI: string): Promise<UploadFile> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            getFileMutex.acquire().then(() => {
                const userId = storage.getNumber("userId")
                const cameraUploadEnableHeic = storage.getBoolean("cameraUploadEnableHeic:" + userId)
                const mutexTimeout = 100
                const tmp = FileSystem.cacheDirectory + randomIdUnsafe() + "_" + asset.filename

                FileSystem.copyAsync({
                    from: toExpoFsPath(assetURI),
                    to: toExpoFsPath(tmp)
                }).then(() => {
                    if(
                        Platform.OS == "ios"
                        && !cameraUploadEnableHeic
                        && assetURI.toLowerCase().endsWith(".heic")
                        && asset.mediaType == "photo"
                    ){
                        RNHeicConverter.convert({
                            path: tmp,
                            quality: 1,
                            extension: "jpg"
                        }).then(({ success, path, error }: { success: boolean, path: string, error: any }) => {
                            if(!error && success && path){
                                FileSystem.getInfoAsync(toExpoFsPath(path)).then((stat) => {
                                    if(stat.exists && stat.size){
                                        const fileNameEx = asset.filename.split(".")
                                        const nameWithoutEx = fileNameEx.slice(0, (fileNameEx.length - 1)).join(".")
                                        const newName = nameWithoutEx + ".JPG"

                                        setTimeout(() => getFileMutex.release(), mutexTimeout)

                                        return resolve({
                                            path: path.split("file://").join(""),
                                            name: newName,
                                            mime: mimeTypes.lookup(path) || "",
                                            size: stat.size,
                                            lastModified: convertTimestampToMs(asset.creationTime)
                                        })
                                    }
                                    else{
                                        setTimeout(() => getFileMutex.release(), mutexTimeout)

                                        return reject(new Error("No size for asset (after HEIC conversion) " + asset.id))
                                    }
                                }).catch((err) => {
                                    setTimeout(() => getFileMutex.release(), mutexTimeout)

                                    return reject(err)
                                })
                            }
                            else{
                                setTimeout(() => getFileMutex.release(), mutexTimeout)

                                return new Error("HEICConverter error: " + error.toString())
                            }
                        }).catch((err: Error) => {
                            setTimeout(() => getFileMutex.release(), mutexTimeout)

                            return reject(err)
                        })
                    }
                    else{
                        FileSystem.getInfoAsync(toExpoFsPath(tmp)).then((stat) => {
                            if(stat.exists && stat.size){
                                setTimeout(() => getFileMutex.release(), mutexTimeout)

                                return resolve({
                                    path: tmp.split("file://").join(""),
                                    name: asset.filename,
                                    mime: mimeTypes.lookup(tmp) || "",
                                    size: stat.size,
                                    lastModified: convertTimestampToMs(asset.creationTime)
                                })
                            }
                            else{
                                setTimeout(() => getFileMutex.release(), mutexTimeout)
                                
                                return reject(new Error("No size for asset " + asset.id))
                            }
                        }).catch((err) => {
                            setTimeout(() => getFileMutex.release(), mutexTimeout)

                            return reject(err)
                        })
                    }
                }).catch((err) => {
                    setTimeout(() => getFileMutex.release(), mutexTimeout)

                    return reject(err)
                })
            })
        }, 1)
    })
}

export const runCameraUpload = async (maxQueue: number = 16384, runOnce: boolean = false): Promise<boolean> => {
    await runMutex.acquire()

    if(runTimeout > new Date().getTime()){
        runMutex.release()

        return true
    }

    try{
        const isLoggedIn = storage.getBoolean("isLoggedIn")
        const userId = storage.getNumber("userId")

        if(!isLoggedIn || userId == 0){
            runTimeout = new Date().getTime() + (TIMEOUT - 1000)
            runMutex.release()

            if(runOnce){
                return true
            }

            setTimeout(() => {
                runCameraUpload(maxQueue)
            }, TIMEOUT)

            return true
        }

        if(!runOnce && !askedForPermissions){
            if(
                !(await hasStoragePermissions(true))
                || !(await hasPhotoLibraryPermissions(true))
                || !(await hasReadPermissions(true))
                || !(await hasWritePermissions(true))
            ){
                runTimeout = new Date().getTime() + (TIMEOUT - 1000)
                runMutex.release()
    
                setTimeout(() => {
                    runCameraUpload(maxQueue)
                }, TIMEOUT)
    
                return true
            }

            askedForPermissions = true
        }

        const cameraUploadEnabled = storage.getBoolean("cameraUploadEnabled:" + userId)
        const cameraUploadFolderUUID = storage.getString("cameraUploadFolderUUID:" + userId)
        const now = new Date().getTime()

        if(!cameraUploadEnabled){
            runTimeout = new Date().getTime() + (TIMEOUT - 1000)
            runMutex.release()

            if(runOnce){
                return true
            }

            setTimeout(() => {
                runCameraUpload(maxQueue)
            }, TIMEOUT)

            return true
        }

        if(typeof cameraUploadFolderUUID !== "string"){
            runTimeout = new Date().getTime() + (TIMEOUT - 1000)
            runMutex.release()

            if(runOnce){
                return true
            }

            setTimeout(() => {
                runCameraUpload(maxQueue)
            }, TIMEOUT)

            return true
        }

        if(cameraUploadFolderUUID.length < 32 || !validate(cameraUploadFolderUUID)){
            runTimeout = new Date().getTime() + (TIMEOUT - 1000)
            runMutex.release()

            if(runOnce){
                return true
            }

            setTimeout(() => {
                runCameraUpload(maxQueue)
            }, TIMEOUT)

            return true
        }

        if(!isOnline()){
            runTimeout = new Date().getTime() + (TIMEOUT - 1000)
            runMutex.release()

            if(runOnce){
                return true
            }

            setTimeout(() => {
                runCameraUpload(maxQueue)
            }, TIMEOUT)

            return true
        }

        if(storage.getBoolean("onlyWifiUploads:" + userId) && !isWifi()){
            runTimeout = new Date().getTime() + (TIMEOUT - 1000)
            runMutex.release()

            if(runOnce){
                return true
            }

            setTimeout(() => {
                runCameraUpload(maxQueue)
            }, TIMEOUT)

            return true
        }

        let folderExists = false
        const isFolderPresent = await folderPresent({ uuid: cameraUploadFolderUUID })

        if(isFolderPresent.present){
            if(!isFolderPresent.trash){
                folderExists = true
            }
        }

        if(!folderExists){
            runTimeout = new Date().getTime() + (TIMEOUT - 1000)
            runMutex.release()

            disableCameraUpload(true)

            if(runOnce){
                return true
            }

            setTimeout(() => {
                runCameraUpload(maxQueue)
            }, TIMEOUT)

            return true
        }

        const [local, remote] = await Promise.all([
            loadLocal(),
            loadRemote()
        ])
        const deltas = getDeltas(local, remote)
        const currentlyUploadedCount = Object.keys(local).length - deltas.length

        storage.set("cameraUploadTotal", Object.keys(local).length)
        storage.set("cameraUploadUploaded", currentlyUploadedCount)

        if(new Date().getTime() > (now + MAX_FETCH_TIME) && runOnce){
            runTimeout = new Date().getTime() + (TIMEOUT - 1000)
            runMutex.release()

            return true
        }

        let currentQueue = 0
        const uploads: Promise<boolean>[] = []
        let uploadedThisRun = 0

        const upload = async (delta: Delta): Promise<boolean> => {
            await uploadSemaphore.acquire()

            const asset = delta.item.asset
            const assetId = getAssetId(asset)

            try{
                const assetURI = await getAssetURI(asset)
                var stat = await FileSystem.getInfoAsync(toExpoFsPath(assetURI))
                const cameraUploadLastModified = JSON.parse(storage.getString("cameraUploadLastModified") || "{}")
                const cameraUploadLastModifiedStat = JSON.parse(storage.getString("cameraUploadLastModifiedStat") || "{}")
                const cameraUploadLastSize = JSON.parse(storage.getString("cameraUploadLastSize") || "{}")

                if(
                    stat.exists
                    && (
                        convertTimestampToMs(stat.modificationTime) == convertTimestampToMs(cameraUploadLastModifiedStat[assetId])
                        || convertTimestampToMs(cameraUploadLastModified[assetId]) == convertTimestampToMs(delta.item.lastModified)
                        || cameraUploadLastSize[assetId] == stat.size
                    )
                ){
                    uploadedThisRun += 1

                    storage.set("cameraUploadUploaded", currentlyUploadedCount + uploadedThisRun)

                    const cameraUploadLastModified = JSON.parse(storage.getString("cameraUploadLastModified") || "{}")
                    const cameraUploadLastModifiedStat = JSON.parse(storage.getString("cameraUploadLastModifiedStat") || "{}")
                    const cameraUploadLastSize = JSON.parse(storage.getString("cameraUploadLastSize") || "{}")

                    cameraUploadLastModified[assetId] = convertTimestampToMs(delta.item.lastModified)
                    cameraUploadLastModifiedStat[assetId] = convertTimestampToMs(stat.modificationTime)
                    cameraUploadLastSize[assetId] = stat.size

                    storage.set("cameraUploadLastModified", JSON.stringify(cameraUploadLastModified))
                    storage.set("cameraUploadLastModifiedStat", JSON.stringify(cameraUploadLastModifiedStat))
                    storage.set("cameraUploadLastSize", JSON.stringify(cameraUploadLastSize))

                    uploadSemaphore.release()

                    return true
                }

                var file = await getFile(asset, assetURI)
            }
            catch(e){
                log.error(e)
        
                if(typeof FAILED[assetId] !== "number"){
                    FAILED[assetId] = 1
                }
                else{
                    FAILED[assetId] += 1
                }

                uploadSemaphore.release()

                return false
            }

            try{
                await queueFileUpload({
                    file,
                    parent: cameraUploadFolderUUID,
                    isCameraUpload: true
                })

                FileSystem.deleteAsync(toExpoFsPath(file.path)).catch(console.error)
        
                uploadedThisRun += 1

                storage.set("cameraUploadUploaded", currentlyUploadedCount + uploadedThisRun)

                const cameraUploadLastModified = JSON.parse(storage.getString("cameraUploadLastModified") || "{}")
                const cameraUploadLastModifiedStat = JSON.parse(storage.getString("cameraUploadLastModifiedStat") || "{}")
                const cameraUploadLastSize = JSON.parse(storage.getString("cameraUploadLastSize") || "{}")

                cameraUploadLastModified[assetId] = convertTimestampToMs(delta.item.lastModified)
                cameraUploadLastModifiedStat[assetId] = convertTimestampToMs(stat.modificationTime || delta.item.lastModified)
                cameraUploadLastSize[assetId] = stat.size

                storage.set("cameraUploadLastModified", JSON.stringify(cameraUploadLastModified))
                storage.set("cameraUploadLastModifiedStat", JSON.stringify(cameraUploadLastModifiedStat))
                storage.set("cameraUploadLastSize", JSON.stringify(cameraUploadLastSize))

                uploadSemaphore.release()

                return true
            }
            catch(e){
                log.error(e)
        
                FileSystem.deleteAsync(toExpoFsPath(file.path)).catch(console.error)

                uploadSemaphore.release()

                return false
            }
        }

        for(let i = 0; i < deltas.length; i++){
            const delta = deltas[i]

            if(typeof delta.item.asset == "undefined"){
                continue
            }

            const assetId = getAssetId(delta.item.asset)

            if(
                maxQueue > currentQueue
                && (typeof FAILED[assetId] !== "number" ? 0 : FAILED[assetId]) < MAX_FAILED
            ){
                currentQueue += 1

                if(
                    delta.type == "UPLOAD"
                    || delta.type == "UPDATE"
                ){
                    uploads.push(upload(delta))
                }
            }
        }

        if(uploads.length > 0){
            await promiseAllSettled(uploads)

            storage.set("cameraUploadUploaded", currentlyUploadedCount + uploadedThisRun)
        }
        else{
            storage.set("cameraUploadUploaded", Object.keys(local).length)
        }

        runTimeout = new Date().getTime() + (TIMEOUT - 1000)
        runMutex.release()

        if(runOnce){
            return true
        }

        setTimeout(() => {
            runCameraUpload(maxQueue)
        }, TIMEOUT)

        return true
    }
    catch(e){
        log.error(e)

        runTimeout = new Date().getTime() + (TIMEOUT - 1000)
        runMutex.release()

        if(runOnce){
            return true
        }

        setTimeout(() => {
            runCameraUpload(maxQueue)
        }, TIMEOUT)

        return true
    }
}