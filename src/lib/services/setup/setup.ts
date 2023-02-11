import { updateKeys } from "../user/keys"
import { apiRequest } from "../../api"
import { getAPIKey, toExpoFsPath, promiseAllSettled, Semaphore } from "../../helpers"
import storage from "../../storage"
import { getDownloadPath } from "../download/download"
import { logger, fileAsyncTransport, mapConsoleTransport } from "react-native-logs"
import * as FileSystem from "expo-file-system"
import { showToast } from "../../../components/Toasts"
import FastImage from "react-native-fast-image"
import type { NavigationContainerRef } from "@react-navigation/native"
import { memoize } from "lodash"
import { getOfflineList, removeItemFromOfflineList } from "../offline"
import { validate } from "uuid"

const log = logger.createLogger({
    severity: "debug",
    transport: [fileAsyncTransport, mapConsoleTransport],
    transportOptions: {
        FS: FileSystem,
        fileName: "logs/setup.log"
    }
})

const ONLY_DEFAULT_DRIVE_ENABLED: boolean = true
const CACHE_CLEARING_ENABLED: boolean = true

const deleteMutex = new Semaphore(1)
const DONT_DELETE: string[] = [
    "sentry",
    "expo",
    "webview",
    "image_manager",
    "log",
    "logs",
    "com.hackemist",
    "com.apple",
    "nsird",
    "io.filen",
    "image_cache",
    "http-cache",
    "a document being saved by"
]

export const canDelete = memoize((name: string) => {
    return DONT_DELETE.filter(d => name.toLowerCase().indexOf(d.toLowerCase()) !== -1).length == 0
})

export const clearCacheDirectories = async (): Promise<boolean> => {
    await promiseAllSettled([
        FastImage.clearDiskCache(),
        FastImage.clearMemoryCache(),
        new Promise(async (resolve, reject) => {
            try{
                const cachedDownloadsPath = (await getDownloadPath({ type: "cachedDownloads" })).slice(0, -1)
                const cacheDownloadsItems = await FileSystem.readDirectoryAsync(toExpoFsPath(cachedDownloadsPath))

                for(let i = 0; i < cacheDownloadsItems.length; i++){
                    if(CACHE_CLEARING_ENABLED){
                        if(canDelete(cacheDownloadsItems[i])){
                            await deleteMutex.acquire()

                            FileSystem.deleteAsync(toExpoFsPath(cachedDownloadsPath + "/" + cacheDownloadsItems[i])).then(() => {
                                deleteMutex.release()
                            }).catch((err) => {
                                deleteMutex.release()

                                console.log(1, "Could not delete", toExpoFsPath(cachedDownloadsPath + "/" + cacheDownloadsItems[i]), err)
                            })
                        }
                    }
                    else{
                        console.log("cacheDownloadsItems", cacheDownloadsItems[i])
                    }
                }
            }
            catch(e){
                console.log(e)

                return reject(e)
            }

            return resolve(true)
        }),
        new Promise(async (resolve, reject) => {
            try{
                if(FileSystem.cacheDirectory){
                    const cachePath = FileSystem.cacheDirectory.indexOf("file://") == -1 ? "file://" + FileSystem.cacheDirectory : FileSystem.cacheDirectory
                    const cacheItems = await FileSystem.readDirectoryAsync(toExpoFsPath(cachePath))
            
                    for(let i = 0; i < cacheItems.length; i++){
                        if(CACHE_CLEARING_ENABLED){
                            if(canDelete(cacheItems[i])){
                                await deleteMutex.acquire()

                                FileSystem.deleteAsync(toExpoFsPath(cachePath + "/" + cacheItems[i])).then(() => {
                                    deleteMutex.release()
                                }).catch((err) => {
                                    deleteMutex.release()

                                    console.log(2, "Could not delete", toExpoFsPath(cachePath + "/" + cacheItems[i]), err)
                                })
                            }
                        }
                        else{
                            console.log("cacheItems", cacheItems[i])
                        }
                    }
                }
            }
            catch(e){
                console.log(e)

                return reject(e)
            }

            return resolve(true)
        }),
        new Promise(async (resolve, reject) => {
            try{
                const tmpPath = (await getDownloadPath({ type: "cachedDownloads" })).slice(0, -1)
                const tmpItems = await FileSystem.readDirectoryAsync(toExpoFsPath(tmpPath))

                for(let i = 0; i < tmpItems.length; i++){
                    if(CACHE_CLEARING_ENABLED){
                        if(canDelete(tmpItems[i])){
                            await deleteMutex.acquire()

                            FileSystem.deleteAsync(toExpoFsPath(tmpPath + "/" + tmpItems[i])).then(() => {
                                deleteMutex.release()
                            }).catch((err) => {
                                deleteMutex.release()

                                console.error(3, "Could not delete", toExpoFsPath(tmpPath + "/" + tmpItems[i]), err)
                            })
                        }
                    }
                    else{
                        console.log("tmpItems", tmpItems[i])
                    }
                }
            }
            catch(e){
                console.log(e)

                return reject(e)
            }

            return resolve(true)
        }),
        new Promise(async (resolve, reject) => {
            try{
                const tmpPath = (await getDownloadPath({ type: "temp" })).slice(0, -1)
                const tmpItems = await FileSystem.readDirectoryAsync(toExpoFsPath(tmpPath))

                for(let i = 0; i < tmpItems.length; i++){
                    if(CACHE_CLEARING_ENABLED){
                        if(canDelete(tmpItems[i])){
                            await deleteMutex.acquire()

                            FileSystem.deleteAsync(toExpoFsPath(tmpPath + "/" + tmpItems[i])).then(() => {
                                deleteMutex.release()
                            }).catch((err) => {
                                deleteMutex.release()

                                console.log(4, "Could not delete", toExpoFsPath(tmpPath + "/" + tmpItems[i]), err)
                            })
                        }
                    }
                    else{
                        console.log("tmpItems", tmpItems[i])
                    }
                }
            }
            catch(e){
                console.log(e)

                return reject(e)
            }

            return resolve(true)
        }),
        new Promise(async (resolve, reject) => {
            try{
                let [ list, offlinePath ] = await Promise.all([
                    getOfflineList(),
                    getDownloadPath({ type: "offline" })
                ])

                offlinePath = offlinePath.slice(0, -1)

                const items: string[] = await FileSystem.readDirectoryAsync(toExpoFsPath(offlinePath))
                const inList: string[] = list.map(item => item.uuid)
                const inDir: string[] = items.filter(item => item.indexOf("_") !== -1 && item.split("_").length == 2 && validate(item.split("_")[1].split(".")[0])).map(item => item.split("_")[1].split(".")[0])
                const toDelete: string[] = []
                const toRemove: string[] = []

                for(let i = 0; i < items.length; i++){
                    if(items[i].indexOf("_") !== -1 && items[i].split("_").length == 2 && validate(items[i].split("_")[1].split(".")[0])){
                        let found = false

                        for(let x = 0; x < inList.length; x++){
                            if(items[i].indexOf(inList[x]) !== -1){
                                found = true
                            }
                        }

                        if(!found){
                            toDelete.push(items[i])
                        }
                    }
                    else{
                        toDelete.push(items[i])
                    }
                }

                for(let i = 0; i < inList.length; i++){
                    let found = false

                    for(let x = 0; x < inDir.length; x++){
                        if(inList[i] == inDir[x]){
                            found = true
                        }
                    }

                    if(!found){
                        toRemove.push(items[i])
                    }
                }

                for(let i = 0; i < toDelete.length; i++){
                    if(canDelete(toDelete[i])){
                        await deleteMutex.acquire()

                        FileSystem.deleteAsync(toExpoFsPath(offlinePath + "/" + toDelete[i])).then(() => {
                            deleteMutex.release()
                        }).catch((err) => {
                            deleteMutex.release()

                            console.log(5, "Could not delete", toExpoFsPath(offlinePath + "/" + toDelete[i]), err)
                        })
                    }
                }

                for(let i = 0; i < toRemove.length; i++){
                    removeItemFromOfflineList({
                        item: {
                            uuid: toRemove[i]
                        }
                    }).catch((err) => {
                        console.log(6, "Could not remove", toRemove[i], err)
                    })
                }
            }
            catch(e){
                console.log(e)

                return reject(e)
            }

            return resolve(true)
        }), 
    ]).catch(() => {})

    return true
}

export const clearLogs = async (): Promise<boolean> => {
    await FileSystem.makeDirectoryAsync(FileSystem.documentDirectory + "/logs", {
        intermediates: true
    })

    const items = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory + "/logs")

    for(let i = 0; i < items.length; i++){
        const info = await FileSystem.getInfoAsync(items[i])

        if(info.exists && info.size && info.size > (1024 * 1024 * 3)){
            await deleteMutex.acquire()
            
            FileSystem.deleteAsync(items[i]).then(() => {
                deleteMutex.release()
            }).catch((err) => {
                deleteMutex.release()

                console.log(7, "Could not delete", items[i], err)
            })
        }
    }

    return true
}

export const setup = async ({ navigation }: { navigation: NavigationContainerRef<ReactNavigation.RootParamList> }): Promise<boolean> => {
    promiseAllSettled([
        clearLogs(),
        clearCacheDirectories()
    ]).catch(log.error)

    await updateKeys({ navigation })
    
    const response = await apiRequest({
        method: "POST",
        endpoint: "/v1/user/baseFolders",
        data: {
            apiKey: getAPIKey()
        }
    })

    if(!response.status){
        log.error(response.message)

        showToast({ message: response.message })

        throw new Error(response.message)
    }

    for(let i = 0; i < response.data.folders.length; i++){
        if(response.data.folders[i].is_default){
            storage.set("defaultDriveUUID:" + storage.getNumber("userId"), response.data.folders[i].uuid)
        }
    }

    if(response.data.folders.length == 1 && ONLY_DEFAULT_DRIVE_ENABLED){
        storage.set("defaultDriveOnly:" + storage.getNumber("userId"), true)
    }
    else{
        storage.set("defaultDriveOnly:" + storage.getNumber("userId"), false)
    }

    return true
}