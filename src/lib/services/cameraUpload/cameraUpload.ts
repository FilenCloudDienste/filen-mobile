import storage from "../../storage"
import { queueFileUpload, UploadFile } from "../upload/upload"
import { Platform } from "react-native"
import { randomIdUnsafe, promiseAllSettled, convertTimestampToMs, getAPIKey, decryptFileMetadata, getMasterKeys, toExpoFsPath, getAssetId, Semaphore } from "../../helpers"
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
let isRunning: boolean = false
let fallbackInterval: any = undefined
let askedForPermissions: boolean = false
const getFileMutex = new Semaphore(1)

export const startCameraUploadFallbackInterval = () => {
    clearInterval(fallbackInterval)

    fallbackInterval = setInterval(() => {
        if(!isRunning){
            runCameraUpload(MAX_CAMERA_UPLOAD_QUEUE, true)
        }
    }, TIMEOUT)
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

export const fetchLocalAssets = (): Promise<MediaLibrary.Asset[]> => {
    return new Promise(async (resolve, reject) => {
        const assets: MediaLibrary.Asset[] = []
        const userId: number = storage.getNumber("userId")
        const cameraUploadIncludeImages: boolean = storage.getBoolean("cameraUploadIncludeImages:" + userId)
        const cameraUploadIncludeVideos: boolean = storage.getBoolean("cameraUploadIncludeVideos:" + userId)
        let cameraUploadExcludedAlbums: any = storage.getString("cameraUploadExcludedAlbums:" + userId)
        let assetTypes: MediaLibrary.MediaTypeValue[] = ["photo", "video"]
        const cameraUploadAfterEnabledTime: number = storage.getNumber("cameraUploadAfterEnabledTime:" + userId)

        if(cameraUploadIncludeImages && !cameraUploadIncludeVideos){
            assetTypes = ["photo"]
        }

        if(!cameraUploadIncludeImages && cameraUploadIncludeVideos){
            assetTypes = ["video"]
        }

        if(cameraUploadIncludeImages && cameraUploadIncludeVideos){
            assetTypes = ["photo", "video"]
        }

        if(userId == 0){
            assetTypes = ["photo"]
        }

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

        const fetch = (after: MediaLibrary.AssetRef | undefined) => {
            MediaLibrary.getAssetsAsync({
                ...(typeof after !== "undefined" ? { after } : {}),
                first: 256,
                mediaType: ["photo", "video"],
                sortBy: MediaLibrary.SortBy.creationTime
            }).then((fetched) => {
                for(let i = 0; i < fetched.assets.length; i++){
                    assets.push(fetched.assets[i])
                }

                if(fetched.hasNextPage){
                    return fetch(fetched.endCursor)
                }

                const sorted: MediaLibrary.Asset[] = assets.sort((a, b) => a.creationTime - b.creationTime).filter(asset => assetTypes.includes(asset.mediaType) && typeof cameraUploadExcludedAlbums[(asset.albumId || asset.uri)] == "undefined" && asset.creationTime >= cameraUploadAfterEnabledTime)

                return resolve(sorted)
            }).catch(reject)
        }

        return fetch(undefined)
    })
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

        items[asset.filename.toLowerCase()] = {
            name: asset.filename,
            lastModified: asset.modificationTime,
            creation: asset.creationTime,
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

    let items: CameraUploadItems = {}

    if(response.data.uploads.length == 0){
        return {}
    }

    const sorted = response.data.uploads.sort((a: any, b: any) => a.timestamp - b.timestamp)
    const last = sorted[sorted.length - 1]
    const cameraUploadLastLoadRemote = storage.getString("cameraUploadLastLoadRemote:" + cameraUploadFolderUUID)

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
                items[decrypted.name.toLowerCase()] = {
                    name: decrypted.name,
                    lastModified: decrypted.lastModified,
                    creation: decrypted.lastModified,
                    id: file.uuid,
                    type: "remote",
                    asset: undefined as any
                }
            }
        }
    }

    storage.set("cameraUploadLastLoadRemote:" + cameraUploadFolderUUID, JSON.stringify({
        uuid: last.uuid,
        count: response.data.uploads.length,
        items
    }))

    return items
}

export interface Delta {
    type: "UPLOAD" | "UPDATE",
    item: CameraUploadItem
}

export const getDeltas = (local: CameraUploadItems, remote: CameraUploadItems) => {
    const cameraUploadLastModified = JSON.parse(storage.getString("cameraUploadLastModified") || "{}")
    const deltas: Delta[] = []

    for(const name in local){
        if(!remote[name]){
            deltas.push({
                type: "UPLOAD",
                item: local[name]
            })
        }
        else{
            const assetId = getAssetId(local[name].asset)

            if(typeof cameraUploadLastModified[assetId] !== "undefined"){
                if(cameraUploadLastModified[assetId] !== local[name].lastModified){
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

export const getFile = (asset: MediaLibrary.Asset): Promise<UploadFile> => {
    return new Promise((resolve, reject) => {
        const userId = storage.getNumber("userId")
        const cameraUploadEnableHeic = storage.getBoolean("cameraUploadEnableHeic:" + userId)

        getFileMutex.acquire().then(() => {
            MediaLibrary.getAssetInfoAsync(asset, {
                shouldDownloadFromNetwork: true
            }).then((assetInfo) => {
                const tmp = FileSystem.cacheDirectory + randomIdUnsafe() + "_" + asset.filename
                let assetURI: string = ""

                if(Platform.OS == "android"){
                    if(asset.uri.length > 0){
                        assetURI = asset.uri
                    }
                    else{
                        if(typeof assetInfo.localUri == "string" && assetInfo.localUri.length > 0){
                            assetURI = assetInfo.localUri
                        }
                    }
                }
                else{
                    if(typeof assetInfo.localUri == "string" && assetInfo.localUri.length > 0){
                        assetURI = assetInfo.localUri
                    }
                    else{
                        assetURI = assetInfo.uri
                    }
                }

                if(typeof assetURI == "string" && assetURI.length > 0){
                    FileSystem.copyAsync({
                        from: assetURI,
                        to: tmp
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
                                    FileSystem.getInfoAsync(path).then((stat) => {
                                        if(stat.exists && stat.size){
                                            const fileNameEx = asset.filename.split(".")
                                            const nameWithoutEx = fileNameEx.slice(0, (fileNameEx.length - 1)).join(".")
                                            const newName = nameWithoutEx + ".JPG"

                                            getFileMutex.release()

                                            return resolve({
                                                path: path.split("file://").join(""),
                                                name: newName,
                                                mime: mimeTypes.lookup(path) || "",
                                                size: stat.size,
                                                lastModified: convertTimestampToMs(asset.creationTime)
                                            })
                                        }
                                        else{
                                            getFileMutex.release()

                                            return reject(new Error("No size for asset (after HEIC conversion) " + asset.id))
                                        }
                                    }).catch((err) => {
                                        getFileMutex.release()
        
                                        return reject(err)
                                    })
                                }
                                else{
                                    getFileMutex.release()

                                    return new Error("HEICConverter error: " + error.toString())
                                }
                            }).catch((err: Error) => {
                                getFileMutex.release()

                                return reject(err)
                            })
                        }
                        else{
                            FileSystem.getInfoAsync(tmp).then((stat) => {
                                if(stat.exists && stat.size){
                                    getFileMutex.release()

                                    return resolve({
                                        path: tmp.split("file://").join(""),
                                        name: asset.filename,
                                        mime: mimeTypes.lookup(tmp) || "",
                                        size: stat.size,
                                        lastModified: convertTimestampToMs(asset.creationTime)
                                    })
                                }
                                else{
                                    getFileMutex.release()
                                    
                                    return reject(new Error("No size for asset " + asset.id))
                                }
                            }).catch((err) => {
                                getFileMutex.release()

                                return reject(err)
                            })
                        }
                    }).catch((err) => {
                        getFileMutex.release()

                        return reject(err)
                    })
                }
                else{
                    getFileMutex.release()

                    return reject(new Error("No localURI for asset " + asset.id))
                }
            }).catch((err) => {
                getFileMutex.release()

                return reject(err)
            })
        })
    })
}

export const runCameraUpload = async (maxQueue: number = MAX_CAMERA_UPLOAD_QUEUE, runOnce: boolean = false): Promise<boolean> => {
    if(isRunning){
        if(runOnce){
            return true
        }

        setTimeout(() => {
            runCameraUpload(maxQueue, runOnce)
        }, TIMEOUT)

        return true
    }

    isRunning = true

    try{
        const isLoggedIn = storage.getBoolean("isLoggedIn")
        const userId = storage.getNumber("userId")

        if(!isLoggedIn || userId == 0){
            isRunning = false

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
                isRunning = false
    
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
            isRunning = false

            if(runOnce){
                return true
            }

            setTimeout(() => {
                runCameraUpload(maxQueue)
            }, TIMEOUT)

            return true
        }

        if(typeof cameraUploadFolderUUID !== "string"){
            isRunning = false

            if(runOnce){
                return true
            }

            setTimeout(() => {
                runCameraUpload(maxQueue)
            }, TIMEOUT)

            return true
        }

        if(cameraUploadFolderUUID.length < 32){
            isRunning = false

            if(runOnce){
                return true
            }

            setTimeout(() => {
                runCameraUpload(maxQueue)
            }, TIMEOUT)

            return true
        }

        if(!isOnline()){
            isRunning = false

            if(runOnce){
                return true
            }

            setTimeout(() => {
                runCameraUpload(maxQueue)
            }, TIMEOUT)

            return true
        }

        if(storage.getBoolean("onlyWifiUploads:" + userId) && !isWifi()){
            isRunning = false

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
            isRunning = false

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

        storage.set("cameraUploadTotal", Object.keys(local).length)

        const deltas = getDeltas(local, remote)
        
        const currentlyUploadedCount = Object.keys(local).length - deltas.length

        storage.set("cameraUploadUploaded", currentlyUploadedCount)

        if(new Date().getTime() > (now + MAX_FETCH_TIME) && runOnce){
            isRunning = false

            return true
        }

        const cameraUploadLastModified = JSON.parse(storage.getString("cameraUploadLastModified") || "{}")
        let currentQueue = 0
        const uploads: Promise<boolean>[] = []
        let uploadedThisRun = 0

        const upload = (asset: MediaLibrary.Asset): Promise<boolean> => {
            return new Promise((resolve) => {
                const assetId = getAssetId(asset)

                getFile(asset).then((file) => {
                    queueFileUpload({
                        file,
                        parent: cameraUploadFolderUUID
                    }).then(() => {
                        FileSystem.deleteAsync(toExpoFsPath(file.path)).catch(console.error)

                        uploadedThisRun += 1

                        storage.set("cameraUploadUploaded", currentlyUploadedCount + uploadedThisRun)

                        cameraUploadLastModified[assetId] = asset.modificationTime

                        storage.set("cameraUploadLastModified", JSON.stringify(cameraUploadLastModified))

                        return resolve(true)
                    }).catch((err) => {
                        log.error(err)

                        FileSystem.deleteAsync(toExpoFsPath(file.path)).catch(console.error)

                        return resolve(true)
                    })
                }).catch((err) => {
                    log.error(err)

                    if(typeof FAILED[assetId] !== "number"){
                        FAILED[assetId] = 1
                    }
                    else{
                        FAILED[assetId] += 1
                    }

                    return resolve(true)
                })
            })
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

                uploads.push(upload(delta.item.asset))
            }
        }

        if(uploads.length > 0){
            await promiseAllSettled(uploads)

            storage.set("cameraUploadUploaded", currentlyUploadedCount + uploadedThisRun)
        }
        else{
            storage.set("cameraUploadUploaded", Object.keys(local).length)
        }

        isRunning = false

        if(runOnce){
            return true
        }

        setTimeout(() => {
            runCameraUpload(maxQueue)
        }, uploadedThisRun > 0 ? 10 : TIMEOUT)

        return true
    }
    catch(e){
        log.error(e)

        isRunning = false

        if(runOnce){
            return true
        }

        setTimeout(() => {
            runCameraUpload(maxQueue)
        }, TIMEOUT)

        return true
    }
}