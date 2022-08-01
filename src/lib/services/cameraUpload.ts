import storage from "../storage"
import { queueFileUpload } from "../upload"
import { Platform } from "react-native"
import { randomIdUnsafe, promiseAllSettled } from "../helpers"
import { folderPresent } from "../api"
import BackgroundTimer from "react-native-background-timer"
import * as MediaLibrary from "expo-media-library"
import ReactNativeBlobUtil from "react-native-blob-util"
import * as FileSystem from "expo-file-system"
import { throttle } from "lodash"
import NetInfo from "@react-native-community/netinfo"
import RNFS from "react-native-fs"
import type { UploadFile } from "../upload"

const TIMEOUT = 5000

export const disableCameraUpload = (resetFolder: boolean = false): void => {
    const userId = storage.getNumber("userId")

    if(userId == 0){
        return
    }

    storage.set("cameraUploadEnabled:" + userId, false)

    if(resetFolder){
        storage.delete("cameraUploadFolderUUID:" + userId)
        storage.delete("cameraUploadFolderName:" + userId)
    }
}

export const convertPhAssetToAssetsLibrary = (localId: string, ext: string): string => {
    const hash = localId.split("/")[0]

    return "assets-library://asset/asset." + ext + "?id=" + hash + "&ext=" + ext
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

export const runCameraUpload = throttle(async (maxQueue: number = 32): Promise<any> => {
    try{
        const isLoggedIn = storage.getBoolean("isLoggedIn")
        const userId = storage.getNumber("userId")

        if(!isLoggedIn || userId == 0){
            return BackgroundTimer.setTimeout(() => {
                runCameraUpload(maxQueue)
            }, TIMEOUT)
        }

        const cameraUploadEnabled = storage.getBoolean("cameraUploadEnabled:" + userId)
        const cameraUploadFolderUUID = storage.getString("cameraUploadFolderUUID:" + userId)
        const cameraUploadUploadedIds = JSON.parse(storage.getString("cameraUploadUploadedIds:" + userId) || "{}")
        const cameraUploadEnableHeic = storage.getBoolean("cameraUploadEnableHeic:" + userId)

        storage.set("cameraUploadUploaded", Object.keys(cameraUploadUploadedIds).length)

        if(!cameraUploadEnabled){
            return BackgroundTimer.setTimeout(() => {
                runCameraUpload(maxQueue)
            }, TIMEOUT)
        }

        if(typeof cameraUploadFolderUUID !== "string"){
            return BackgroundTimer.setTimeout(() => {
                runCameraUpload(maxQueue)
            }, TIMEOUT)
        }

        if(cameraUploadFolderUUID.length < 32){
            return BackgroundTimer.setTimeout(() => {
                runCameraUpload(maxQueue)
            }, TIMEOUT)
        }

        const netInfo = await NetInfo.fetch()

        if(!netInfo.isConnected || !netInfo.isInternetReachable){
            return BackgroundTimer.setTimeout(() => {
                runCameraUpload(maxQueue)
            }, TIMEOUT)
        }

        if(storage.getBoolean("onlyWifiUploads:" + userId) && netInfo.type !== "wifi"){
            return BackgroundTimer.setTimeout(() => {
                runCameraUpload(maxQueue)
            }, TIMEOUT)
        }

        let folderExists = false
        const isFolderPresent = await folderPresent({ uuid: cameraUploadFolderUUID })

        if(isFolderPresent.present){
            if(!isFolderPresent.trash){
                folderExists = true
            }
        }

        if(!folderExists){
            disableCameraUpload(true)

            return BackgroundTimer.setTimeout(() => {
                runCameraUpload(maxQueue)
            }, TIMEOUT)
        }

        const assets = await fetchAssets()

        storage.set("cameraUploadTotal", assets.length)

        if(assets.length == 0){
            return BackgroundTimer.setTimeout(() => {
                runCameraUpload(maxQueue)
            }, TIMEOUT)
        }

        let currentQueue = 0
        const uploads = []

        const upload = (asset: MediaLibrary.Asset): Promise<boolean> => {
            return new Promise((resolve) => {
                const getFile = (): Promise<UploadFile> => {
                    return new Promise((resolve, reject) => {
                        const tmp = FileSystem.cacheDirectory + randomIdUnsafe() + "_" + asset.filename
                        const path = tmp.replace("file://", "")

                        if(Platform.OS == "ios"){
                            if(cameraUploadEnableHeic){
                                FileSystem.copyAsync({
                                    from: asset.uri,
                                    to: tmp
                                }).then(() => {
                                    ReactNativeBlobUtil.fs.stat(path).then((stat) => {
                                        return resolve({
                                            path,
                                            name: asset.filename,
                                            mime: stat.type,
                                            size: stat.size,
                                            lastModified: asset.modificationTime
                                        })
                                    }).catch(reject)
                                }).catch(reject)
                            }
                            else{
                                if(asset.mediaType == "photo"){
                                    RNFS.copyAssetsFileIOS(convertPhAssetToAssetsLibrary(asset.uri.replace("ph://", ""), "jpg"), tmp, 0, 0).then(() => {
                                        ReactNativeBlobUtil.fs.stat(path).then((stat) => {
                                            return resolve({
                                                path,
                                                name: asset.filename,
                                                mime: stat.type,
                                                size: stat.size,
                                                lastModified: asset.modificationTime
                                            })
                                        }).catch(reject)
                                    }).catch(reject)
                                }
                                else{
                                    RNFS.copyAssetsVideoIOS(convertPhAssetToAssetsLibrary(asset.uri.replace("ph://", ""), "mov"), tmp).then(() => {
                                        ReactNativeBlobUtil.fs.stat(path).then((stat) => {
                                            return resolve({
                                                path,
                                                name: asset.filename,
                                                mime: stat.type,
                                                size: stat.size,
                                                lastModified: asset.modificationTime
                                            })
                                        }).catch(reject)
                                    }).catch(reject)
                                }
                            }
                        }
                        else{
                            FileSystem.copyAsync({
                                from: asset.uri,
                                to: tmp
                            }).then(() => {
                                ReactNativeBlobUtil.fs.stat(path).then((stat) => {
                                    return resolve({
                                        path,
                                        name: asset.filename,
                                        mime: stat.type,
                                        size: stat.size,
                                        lastModified: asset.modificationTime
                                    })
                                }).catch(reject)
                            }).catch(reject)
                        }
                    })
                }

                getFile().then((file) => {
                    queueFileUpload({
                        file,
                        parent: cameraUploadFolderUUID
                    }).then(() => {
                        const uploadedIds = JSON.parse(storage.getString("cameraUploadUploadedIds:" + userId) || "{}")
    
                        if(typeof uploadedIds[asset.uri] == "undefined"){
                            uploadedIds[asset.uri] = true
    
                            storage.set("cameraUploadUploadedIds:" + userId, JSON.stringify(uploadedIds))
                            storage.set("cameraUploadUploaded", Object.keys(uploadedIds).length)
                        }

                        return resolve(true)
                    }).catch((err) => {
                        console.log(err)

                        return resolve(true)
                    })
                }).catch((err) => {
                    console.log(err)

                    return resolve(true)
                })
            })
        }

        for(let i = 0; i < assets.length; i++){
            if(typeof cameraUploadUploadedIds[assets[i].uri] == "undefined" && maxQueue > currentQueue){
                currentQueue += 1

                uploads.push(upload(assets[i]))
            }
        }

        if(uploads.length > 0){
            await promiseAllSettled(uploads)
        }

        return BackgroundTimer.setTimeout(() => {
            runCameraUpload(maxQueue)
        }, TIMEOUT)
    }
    catch(e){
        console.log(e)

        return BackgroundTimer.setTimeout(() => {
            runCameraUpload(maxQueue)
        }, TIMEOUT)
    }
}, TIMEOUT)