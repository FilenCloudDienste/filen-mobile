import storage from "../../storage"
import { queueFileUpload, UploadFile } from "../upload/upload"
import { Platform } from "react-native"
import { randomIdUnsafe, promiseAllSettled, convertTimestampToMs, getAPIKey, decryptFileMetadata, getMasterKeys } from "../../helpers"
import { folderPresent, fileExists, apiRequest } from "../../api"
import BackgroundTimer from "react-native-background-timer"
import * as MediaLibrary from "expo-media-library"
import ReactNativeBlobUtil from "react-native-blob-util"
import * as FileSystem from "expo-file-system"
import NetInfo from "@react-native-community/netinfo"
import RNFS from "react-native-fs"
import mimeTypes from "mime-types"

const TIMEOUT: number = 5000
const FAILED: { [key: string]: number } = {}
const MAX_FAILED: number = 3
const MAX_FETCH_TIME: number = 15000
let isRunning: boolean = false
let fallbackInterval: NodeJS.Timer | undefined = undefined

export const startCameraUploadFallbackInterval = () => {
    fallbackInterval = setInterval(() => {
        if(!isRunning){
            runCameraUpload(32, true)
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
        let cameraUploadExcludedAlbums: any = storage.getString("cameraUploadExcludedAlbums:" + userId)
        let assetTypes: string[] = ["photo", "video"]

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
                console.log(e)

                cameraUploadExcludedAlbums = {}
            }
        }
        else{
            cameraUploadExcludedAlbums = {}
        }

        if(typeof cameraUploadLastAssetsCached == "string"){
            try{
                const cached = JSON.parse(cameraUploadLastAssetsCached)
                const cachedTotal = cached.length
                const currentTotal = await new Promise((resolve) => {
                    MediaLibrary.getAssetsAsync({
                        first: 1
                    }).then((fetched) => {
                        return resolve(fetched.totalCount)
                    }).catch(reject)
                })

                if(cachedTotal == currentTotal){
                    return resolve((cached as MediaLibrary.Asset[]).sort((a, b) => a.modificationTime - b.modificationTime).filter(asset => assetTypes.includes(asset.mediaType) && typeof cameraUploadExcludedAlbums[(asset.albumId || asset.uri)] == "undefined"))
                }
            }
            catch(e){
                return reject(e)
            }
        }

        const fetch = (after: MediaLibrary.AssetRef | undefined) => {
            MediaLibrary.getAssetsAsync({
                ...(typeof after !== "undefined" ? { after } : {}),
                first: 256
            }).then((fetched) => {
                for(let i = 0; i < fetched.assets.length; i++){
                    assets.push(fetched.assets[i])
                }

                if(fetched.hasNextPage){
                    return fetch(fetched.endCursor)
                }

                const sorted: MediaLibrary.Asset[] = assets.sort((a, b) => a.modificationTime - b.modificationTime).filter(asset => assetTypes.includes(asset.mediaType) && typeof cameraUploadExcludedAlbums[(asset.albumId || asset.uri)] == "undefined")

                storage.set("cameraUploadLastAssets:" + userId, JSON.stringify(sorted))

                return resolve(sorted)
            }).catch(reject)
        }

        return fetch(undefined)
    })
}

export const runCameraUpload = async (maxQueue: number = 32, runOnce: boolean = false): Promise<boolean> => {
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

        const cameraUploadEnabled = storage.getBoolean("cameraUploadEnabled:" + userId)
        const cameraUploadFolderUUID = storage.getString("cameraUploadFolderUUID:" + userId)
        const cameraUploadUploadedIds = JSON.parse(storage.getString("cameraUploadUploadedIds:" + userId) || "{}")
        const cameraUploadLastRemoteAssets = JSON.parse(storage.getString("cameraUploadLastRemoteAssets:" + userId) || "[]")
        const cameraUploadEnableHeic = storage.getBoolean("cameraUploadEnableHeic:" + userId)
        const cameraUploadFetchRemoteAssetsTimeout = storage.getNumber("cameraUploadFetchRemoteAssetsTimeout:" + userId)
        const apiKey = getAPIKey()
        const masterKeys = getMasterKeys()
        const now = new Date().getTime()
        const remoteExtraChecks: any = {}

        storage.set("cameraUploadUploaded", Object.keys(cameraUploadUploadedIds).length)

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

        const netInfo = await NetInfo.fetch()

        if(!netInfo.isConnected || !netInfo.isInternetReachable){
            isRunning = false

            if(runOnce){
                return true
            }

            BackgroundTimer.setTimeout(() => {
                runCameraUpload(maxQueue)
            }, TIMEOUT)

            return true
        }

        if(storage.getBoolean("onlyWifiUploads:" + userId) && netInfo.type !== "wifi"){
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

        const assets = await fetchAssets()

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

        if(new Date().getTime() > (now + MAX_FETCH_TIME) && runOnce){
            isRunning = false

            return true
        }

        let currentQueue = 0
        const uploads = []

        const upload = (asset: MediaLibrary.Asset): Promise<boolean> => {
            return new Promise((resolve) => {
                const assetId = getAssetId(asset)

                const add = (fileHash: string = ""): void => {
                    const uploadedIds = JSON.parse(storage.getString("cameraUploadUploadedIds:" + userId) || "{}")
    
                    if(typeof uploadedIds[assetId] == "undefined"){
                        uploadedIds[assetId] = true

                        storage.set("cameraUploadUploadedIds:" + userId, JSON.stringify(uploadedIds))
                        storage.set("cameraUploadUploaded", Object.keys(uploadedIds).length)
                    }

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

                    return resolve(true)
                }

                fileExists({
                    name: asset.filename,
                    parent: cameraUploadFolderUUID
                }).then((exists) => {
                    if(exists.exists){
                        return add()
                    }

                    const getFile = (): Promise<UploadFile> => {
                        return new Promise((resolve, reject) => {
                            if(Platform.OS == "ios" && asset.uri.indexOf("ph://") !== -1){
                                if(cameraUploadEnableHeic){
                                    const tmp = FileSystem.cacheDirectory + randomIdUnsafe() + "_" + asset.filename
                                    const path = tmp.replace("file://", "")

                                    FileSystem.copyAsync({
                                        from: asset.uri,
                                        to: tmp
                                    }).then(() => {
                                        ReactNativeBlobUtil.fs.stat(path).then((stat) => {
                                            return resolve({
                                                path,
                                                name: asset.filename,
                                                mime: stat.type || mimeTypes.lookup(tmp),
                                                size: stat.size,
                                                lastModified: convertTimestampToMs(asset.modificationTime)
                                            })
                                        }).catch(reject)
                                    }).catch(reject)
                                }
                                else{
                                    if(asset.mediaType == "photo"){
                                        const tmp = RNFS.CachesDirectoryPath + randomIdUnsafe() + ".jpg"
                                        const path = tmp.replace("file://", "")

                                        RNFS.copyAssetsFileIOS(convertPhAssetToAssetsLibrary(asset.uri.replace("ph://", ""), "jpg"), tmp, 0, 0).then(() => {
                                            ReactNativeBlobUtil.fs.stat(path).then((stat) => {
                                                return resolve({
                                                    path,
                                                    name: asset.filename.indexOf(".") !== -1 ? (asset.filename.split(".").slice(0, -1).join(".") + ".jpg") : asset.filename + ".jpg",
                                                    mime: stat.type || mimeTypes.lookup(tmp),
                                                    size: stat.size,
                                                    lastModified: convertTimestampToMs(asset.modificationTime)
                                                })
                                            }).catch(reject)
                                        }).catch(reject)
                                    }
                                    else{
                                        const tmp = RNFS.CachesDirectoryPath + randomIdUnsafe() + ".mov"
                                        const path = tmp.replace("file://", "")

                                        RNFS.copyAssetsVideoIOS(convertPhAssetToAssetsLibrary(asset.uri.replace("ph://", ""), "mov"), tmp).then(() => {
                                            ReactNativeBlobUtil.fs.stat(path).then((stat) => {
                                                return resolve({
                                                    path,
                                                    name: asset.filename.indexOf(".") !== -1 ? (asset.filename.split(".").slice(0, -1).join(".") + ".mov") : asset.filename + ".mov",
                                                    mime: stat.type || mimeTypes.lookup(tmp),
                                                    size: stat.size,
                                                    lastModified: convertTimestampToMs(asset.modificationTime)
                                                })
                                            }).catch(reject)
                                        }).catch(reject)
                                    }
                                }
                            }
                            else{
                                const tmp = FileSystem.cacheDirectory + randomIdUnsafe() + "_" + asset.filename
                                const path = tmp.replace("file://", "")

                                FileSystem.copyAsync({
                                    from: asset.uri,
                                    to: tmp
                                }).then(() => {
                                    ReactNativeBlobUtil.fs.stat(path).then((stat) => {
                                        return resolve({
                                            path,
                                            name: asset.filename,
                                            mime: stat.type || mimeTypes.lookup(tmp),
                                            size: stat.size,
                                            lastModified: convertTimestampToMs(asset.modificationTime)
                                        })
                                    }).catch(reject)
                                }).catch(reject)
                            }
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
                                return add(hash)
                            }

                            queueFileUpload({
                                file,
                                parent: cameraUploadFolderUUID,
                                includeFileHash: true
                            }).then(() => {
                                return add(hash)
                            }).catch((err) => {
                                console.log(err)
    
                                return resolve(true)
                            })
                        }).catch((err) => {
                            console.log(err)

                            if(typeof FAILED[assetId] !== "number"){
                                FAILED[assetId] = 1
                            }
                            else{
                                FAILED[assetId] += 1
                            }

                            return resolve(true)
                        })
                    }).catch((err) => {
                        console.log(err)

                        if(typeof FAILED[assetId] !== "number"){
                            FAILED[assetId] = 1
                        }
                        else{
                            FAILED[assetId] += 1
                        }

                        return resolve(true)
                    })
                }).catch((err) => {
                    console.log(err)

                    return resolve(true)
                })
            })
        }

        for(let i = 0; i < assets.length; i++){
            const assetId = getAssetId(assets[i])

            if(
                typeof cameraUploadUploadedIds[assetId] == "undefined"
                && maxQueue > currentQueue
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
        console.log(e)

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