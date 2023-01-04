import storage from "../../storage"
import { queueFileUpload, UploadFile } from "../upload/upload"
import { Platform } from "react-native"
import { randomIdUnsafe, promiseAllSettled, convertTimestampToMs, getAPIKey, decryptFileMetadata, getMasterKeys, Semaphore, toExpoFsPath } from "../../helpers"
import { folderPresent, fileExists, apiRequest } from "../../api"
import BackgroundTimer from "react-native-background-timer"
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
let fallbackInterval: NodeJS.Timer | undefined = undefined
let askedForPermissions: boolean = false
const addMutex = new Semaphore(1)

export const startCameraUploadFallbackInterval = () => {
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
        storage.delete("cameraUploadLastAssets:" + userId)
        storage.set("cameraUploadUploaded", 0)
        storage.set("cameraUploadTotal", 0)
        storage.delete("cameraUploadFetchRemoteAssetsTimeout:" + userId)
        storage.delete("cameraUploadRemoteHashes:" + userId)
        storage.delete("cameraUploadLastRemoteAssets:" + userId)
        storage.delete("loadItemsCache:photos")
        storage.delete("loadItemsCache:lastResponse:photos")
    }
}

export const convertPhAssetToAssetsLibrary = (localId: string, ext: string): string => {
    const hash = localId.split("/")[0]

    return "assets-library://asset/asset." + ext + "?id=" + hash + "&ext=" + ext
}

export const getAssetId = (asset: MediaLibrary.Asset): string => {
    return asset.uri.indexOf("ph://") !== -1 && ["photo", "video"].includes(asset.mediaType) ? convertPhAssetToAssetsLibrary(asset.uri.replace("ph://", ""), asset.mediaType == "photo" ? "jpg" : "mov") : asset.uri
}

export const fetchAssets = (): Promise<MediaLibrary.Asset[]> => {
    return new Promise(async (resolve, reject) => {
        const assets: MediaLibrary.Asset[] = []
        const userId: number = storage.getNumber("userId")
        const cameraUploadIncludeImages: boolean = storage.getBoolean("cameraUploadIncludeImages:" + userId)
        const cameraUploadIncludeVideos: boolean = storage.getBoolean("cameraUploadIncludeVideos:" + userId)
        const cameraUploadLastAssetsCached = storage.getString("cameraUploadLastAssets:" + userId)
        const cameraUploadLastAssetCached = storage.getString("cameraUploadLastAsset:" + userId)
        const cameraUploadAssetFetchTimeout: number = storage.getNumber("cameraUploadAssetFetchTimeout:" + userId)
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

        if(typeof cameraUploadLastAssetsCached == "string" && typeof cameraUploadLastAssetCached == "string" && (new Date().getTime() < cameraUploadAssetFetchTimeout)){
            try{
                const cached: MediaLibrary.Asset[] = JSON.parse(cameraUploadLastAssetsCached)
                const lastCached: MediaLibrary.Asset = JSON.parse(cameraUploadLastAssetCached)
                const cachedTotal = cached.length
                const current = await new Promise<{ total: number, last: MediaLibrary.Asset }>((resolve, reject) => {
                    MediaLibrary.getAssetsAsync({
                        first: 1,
                        mediaType: ["photo", "video"],
                        sortBy: MediaLibrary.SortBy.modificationTime
                    }).then((fetched) => {
                        return resolve({
                            total: fetched.totalCount,
                            last: fetched.assets[0]
                        })
                    }).catch(reject)
                })

                if(cachedTotal == current.total && current.last.id == lastCached.id){
                    return resolve(cached.sort((a, b) => a.modificationTime - b.modificationTime).filter(asset => assetTypes.includes(asset.mediaType) && typeof cameraUploadExcludedAlbums[(asset.albumId || asset.uri)] == "undefined" && asset.modificationTime >= cameraUploadAfterEnabledTime))
                }
            }
            catch(e){
                return reject(e)
            }
        }

        const fetch = (after: MediaLibrary.AssetRef | undefined) => {
            MediaLibrary.getAssetsAsync({
                ...(typeof after !== "undefined" ? { after } : {}),
                first: 256,
                mediaType: ["photo", "video"],
                sortBy: MediaLibrary.SortBy.modificationTime
            }).then((fetched) => {
                for(let i = 0; i < fetched.assets.length; i++){
                    assets.push(fetched.assets[i])
                }

                if(fetched.hasNextPage){
                    return fetch(fetched.endCursor)
                }

                const sorted: MediaLibrary.Asset[] = assets.sort((a, b) => a.modificationTime - b.modificationTime).filter(asset => assetTypes.includes(asset.mediaType) && typeof cameraUploadExcludedAlbums[(asset.albumId || asset.uri)] == "undefined" && asset.modificationTime >= cameraUploadAfterEnabledTime)

                storage.set("cameraUploadLastAssets:" + userId, JSON.stringify(sorted))
                storage.set("cameraUploadLastAsset:" + userId, JSON.stringify(sorted[sorted.length - 1]))
                storage.set("cameraUploadAssetFetchTimeout:" + userId, (new Date().getTime() + 300000))

                return resolve(sorted)
            }).catch(reject)
        }

        return fetch(undefined)
    })
}

export const runCameraUpload = async (maxQueue: number = MAX_CAMERA_UPLOAD_QUEUE, runOnce: boolean = false): Promise<boolean> => {
    if(isRunning){
        if(runOnce){
            return true
        }

        BackgroundTimer.setTimeout(() => {
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

            BackgroundTimer.setTimeout(() => {
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
    
                BackgroundTimer.setTimeout(() => {
                    runCameraUpload(maxQueue)
                }, TIMEOUT)
    
                return true
            }

            askedForPermissions = true
        }

        const cameraUploadEnabled = storage.getBoolean("cameraUploadEnabled:" + userId)
        const cameraUploadFolderUUID = storage.getString("cameraUploadFolderUUID:" + userId)
        const cameraUploadLastRemoteAssets = JSON.parse(storage.getString("cameraUploadLastRemoteAssets:" + userId) || "[]")
        const cameraUploadEnableHeic = storage.getBoolean("cameraUploadEnableHeic:" + userId)
        const cameraUploadFetchRemoteAssetsTimeout = storage.getNumber("cameraUploadFetchRemoteAssetsTimeout:" + userId)
        const assetsLastModified = JSON.parse(storage.getString("cameraUploadLastModified") || "{}")
        const apiKey = getAPIKey()
        const masterKeys = getMasterKeys()
        const now = new Date().getTime()
        const remoteExtraChecks: any = {}

        if(!cameraUploadEnabled){
            isRunning = false

            if(runOnce){
                return true
            }

            BackgroundTimer.setTimeout(() => {
                runCameraUpload(maxQueue)
            }, TIMEOUT)

            return true
        }

        if(typeof cameraUploadFolderUUID !== "string"){
            isRunning = false

            if(runOnce){
                return true
            }

            BackgroundTimer.setTimeout(() => {
                runCameraUpload(maxQueue)
            }, TIMEOUT)

            return true
        }

        if(cameraUploadFolderUUID.length < 32){
            isRunning = false

            if(runOnce){
                return true
            }

            BackgroundTimer.setTimeout(() => {
                runCameraUpload(maxQueue)
            }, TIMEOUT)

            return true
        }

        if(!isOnline()){
            isRunning = false

            if(runOnce){
                return true
            }

            BackgroundTimer.setTimeout(() => {
                runCameraUpload(maxQueue)
            }, TIMEOUT)

            return true
        }

        if(storage.getBoolean("onlyWifiUploads:" + userId) && !isWifi()){
            isRunning = false

            if(runOnce){
                return true
            }

            BackgroundTimer.setTimeout(() => {
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

            BackgroundTimer.setTimeout(() => {
                runCameraUpload(maxQueue)
            }, TIMEOUT)

            return true
        }

        if(new Date().getTime() > (now + MAX_FETCH_TIME) && runOnce){
            isRunning = false

            return true
        }

        let remoteHashes: { [key: string]: boolean } = {}

        if(now > cameraUploadFetchRemoteAssetsTimeout){
            const remoteAssetsResponse = await apiRequest({
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

            const remoteAssets = []
    
            for(let i = 0; i < remoteAssetsResponse.data.uploads.length; i++){
                const file = remoteAssetsResponse.data.uploads[i]
                const decrypted = await decryptFileMetadata(masterKeys, file.metadata, file.uuid)

                if(typeof decrypted.name == "string"){
                    if(decrypted.name.length > 0){
                        remoteAssets.push({
                            ...file,
                            metadata: decrypted
                        })
            
                        if(typeof decrypted.hash == "string"){
                            if(decrypted.hash.length > 0){
                                remoteHashes[decrypted.hash] = true
                            }
                        }
        
                        remoteExtraChecks[decrypted.lastModified + ":" + decrypted.size] = true
                    }
                }
            }

            storage.set("cameraUploadLastRemoteAssets:" + userId, JSON.stringify(remoteAssets))
            storage.set("cameraUploadFetchRemoteAssetsTimeout:" + userId, now + 3600000)
            storage.set("cameraUploadRemoteHashes:" + userId, JSON.stringify(remoteHashes))
        }
        else{
            remoteHashes = JSON.parse(storage.getString("cameraUploadRemoteHashes:" + userId) || "{}")

            for(let i = 0; i < cameraUploadLastRemoteAssets.length; i++){
                remoteExtraChecks[cameraUploadLastRemoteAssets[i].metadata.lastModified + ":" + cameraUploadLastRemoteAssets[i].metadata.size] = true
            }
        }

        if(new Date().getTime() > (now + MAX_FETCH_TIME) && runOnce){
            isRunning = false

            return true
        }

        let assets = await fetchAssets()

        storage.set("cameraUploadTotal", assets.length)

        if(assets.length == 0){
            isRunning = false

            if(runOnce){
                return true
            }

            BackgroundTimer.setTimeout(() => {
                runCameraUpload(maxQueue)
            }, TIMEOUT)

            return true
        }

        if(runOnce){ // Limit BG uploads to photos since videos can take longer to upload (terminating the BG fetch process)
            assets = assets.filter(asset => asset.mediaType == "photo")
        }

        if(new Date().getTime() > (now + MAX_FETCH_TIME) && runOnce){
            isRunning = false

            return true
        }

        let currentQueue = 0
        const uploads = []

        const upload = (asset: MediaLibrary.Asset): Promise<boolean> => {
            return new Promise((resolve) => {
                const assetId = getAssetId(asset)

                const add = async (fileHash: string = "") => {
                    await addMutex.acquire()

                    try{
                        storage.set("cameraUploadUploaded", storage.getNumber("cameraUploadUploaded") + 1)

                        if(fileHash.length > 0){
                            const uploadedHashes = JSON.parse(storage.getString("cameraUploadUploadedHashes:" + userId) || "{}")
        
                            if(typeof uploadedHashes[fileHash] == "undefined"){
                                uploadedHashes[fileHash] = true

                                storage.set("cameraUploadUploadedHashes:" + userId, JSON.stringify(uploadedHashes))
                            }

                            const remote = JSON.parse(storage.getString("cameraUploadRemoteHashes:" + userId) || "{}")

                            if(typeof remote[fileHash] == "undefined"){
                                remote[fileHash] = true

                                storage.set("cameraUploadRemoteHashes:" + userId, JSON.stringify(remote))
                            }
                        }

                        const cameraUploadLastModified = JSON.parse(storage.getString("cameraUploadLastModified") || "{}")

                        cameraUploadLastModified[assetId] = asset.modificationTime

                        storage.set("cameraUploadLastModified", JSON.stringify(cameraUploadLastModified))
                    }
                    catch(e){
                        console.error(e)
                        log.error(e)
                    }

                    addMutex.release()

                    return resolve(true)
                }

                fileExists({
                    name: asset.filename,
                    parent: cameraUploadFolderUUID
                }).then((exists) => {
                    if(exists.exists){
                        if(typeof assetsLastModified[assetId] !== "undefined"){
                            if(asset.modificationTime == assetsLastModified[assetId]){
                                add().catch(console.error)
        
                                return
                            }
                        }
                        else{
                            add().catch(console.error)
        
                            return
                        }
                    }

                    const getFile = (): Promise<UploadFile> => {
                        return new Promise((resolve, reject) => {
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

                                                            return resolve({
                                                                path: path.split("file://").join(""),
                                                                name: newName,
                                                                mime: mimeTypes.lookup(path) || "",
                                                                size: stat.size,
                                                                lastModified: convertTimestampToMs(asset.modificationTime)
                                                            })
                                                        }
                                                        else{
                                                            return reject(new Error("No size for asset (after HEIC conversion) " + asset.id))
                                                        }
                                                    }).catch(reject)
                                                }
                                                else{
                                                    return new Error("HEICConverter error: " + error.toString())
                                                }
                                            }).catch(reject)
                                        }
                                        else{
                                            FileSystem.getInfoAsync(tmp).then((stat) => {
                                                if(stat.exists && stat.size){
                                                    return resolve({
                                                        path: tmp.split("file://").join(""),
                                                        name: asset.filename,
                                                        mime: mimeTypes.lookup(tmp) || "",
                                                        size: stat.size,
                                                        lastModified: convertTimestampToMs(asset.modificationTime)
                                                    })
                                                }
                                                else{
                                                    return reject(new Error("No size for asset " + asset.id))
                                                }
                                            }).catch(reject)
                                        }
                                    }).catch(reject)
                                }
                                else{
                                    return reject(new Error("No localURI for asset " + asset.id))
                                }
                            }).catch(reject)
                        })
                    }

                    getFile().then((file) => {
                        global.nodeThread.getFileHash({
                            path: file.path,
                            hashName: "sha512"
                        }).then((hash) => {
                            const uploadedHashes = JSON.parse(storage.getString("cameraUploadUploadedHashes:" + userId) || "{}")

                            if(
                                typeof uploadedHashes[hash] !== "undefined"
                                || typeof remoteHashes[hash] !== "undefined"
                                || typeof remoteExtraChecks[file.lastModified + ":" + file.size] !== "undefined"
                            ){
                                add(hash).catch(console.error)

                                FileSystem.deleteAsync(toExpoFsPath(file.path)).catch(console.error)

                                return
                            }

                            queueFileUpload({
                                file,
                                parent: cameraUploadFolderUUID,
                                includeFileHash: hash
                            }).then(() => {
                                add(hash).catch(console.error)

                                FileSystem.deleteAsync(toExpoFsPath(file.path)).catch(console.error)
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
                }).catch((err) => {
                    log.error(err)

                    return resolve(true)
                })
            })
        }

        for(let i = 0; i < assets.length; i++){
            const assetId = getAssetId(assets[i])

            if(
                maxQueue > currentQueue
                && (typeof FAILED[assetId] !== "number" ? 0 : FAILED[assetId]) < MAX_FAILED
            ){
                currentQueue += 1

                uploads.push(upload(assets[i]))
            }
        }

        if(uploads.length > 0){
            await promiseAllSettled(uploads)
        }

        isRunning = false

        if(runOnce){
            return true
        }

        BackgroundTimer.setTimeout(() => {
            runCameraUpload(maxQueue)
        }, TIMEOUT)

        return true
    }
    catch(e){
        log.error(e)

        isRunning = false

        if(runOnce){
            return true
        }

        BackgroundTimer.setTimeout(() => {
            runCameraUpload(maxQueue)
        }, TIMEOUT)

        return true
    }
}