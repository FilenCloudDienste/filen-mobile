import { updateKeys } from "../user/keys"
import { apiRequest } from "../../api"
import { getAPIKey, toExpoFsPath, promiseAllSettled, Semaphore } from "../../helpers"
import storage from "../../storage"
import { getDownloadPath } from "../download/download"
import * as FileSystem from "expo-file-system"
import { showToast } from "../../../components/Toasts"
import FastImage from "react-native-fast-image"
import { NavigationContainerRef } from "@react-navigation/native"
import { memoize } from "lodash"
import { getOfflineList, removeItemFromOfflineList } from "../offline"
import { validate } from "uuid"

const ONLY_DEFAULT_DRIVE_ENABLED: boolean = true
const CACHE_CLEARING_ENABLED: boolean = true

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

export const clearCacheDirectories = async () => {
    await promiseAllSettled([
        FastImage.clearDiskCache().catch(console.error),
        FastImage.clearMemoryCache().catch(console.error)
    ])

    const deletePromises = []

    const cachedDownloadsPath = (await getDownloadPath({ type: "cachedDownloads" })).slice(0, -1)
    const cacheDownloadsItems = await FileSystem.readDirectoryAsync(toExpoFsPath(cachedDownloadsPath))

    for(let i = 0; i < cacheDownloadsItems.length; i++){
        if(CACHE_CLEARING_ENABLED){
            if(canDelete(cacheDownloadsItems[i])){
                deletePromises.push(FileSystem.deleteAsync(toExpoFsPath(cachedDownloadsPath + "/" + cacheDownloadsItems[i])))
            }
        }
        else{
            console.log("cacheDownloadsItems", cacheDownloadsItems[i])
        }
    }

    if(FileSystem.cacheDirectory){
        const cachePath = FileSystem.cacheDirectory.indexOf("file://") == -1 ? "file://" + FileSystem.cacheDirectory : FileSystem.cacheDirectory
        const cacheItems = await FileSystem.readDirectoryAsync(toExpoFsPath(cachePath))

        for(let i = 0; i < cacheItems.length; i++){
            if(CACHE_CLEARING_ENABLED){
                if(canDelete(cacheItems[i])){
                    deletePromises.push(FileSystem.deleteAsync(toExpoFsPath(cachePath + "/" + cacheItems[i])))
                }
            }
            else{
                console.log("cacheItems", cacheItems[i])
            }
        }
    }

    const tmpPath = (await getDownloadPath({ type: "cachedDownloads" })).slice(0, -1)
    const tmpItems = await FileSystem.readDirectoryAsync(toExpoFsPath(tmpPath))

    for(let i = 0; i < tmpItems.length; i++){
        if(CACHE_CLEARING_ENABLED){
            if(canDelete(tmpItems[i])){
                deletePromises.push(FileSystem.deleteAsync(toExpoFsPath(tmpPath + "/" + tmpItems[i])))
            }
        }
        else{
            console.log("tmpItems", tmpItems[i])
        }
    }

    const tempPath = (await getDownloadPath({ type: "temp" })).slice(0, -1)
    const tempItems = await FileSystem.readDirectoryAsync(toExpoFsPath(tempPath))

    for(let i = 0; i < tempItems.length; i++){
        if(CACHE_CLEARING_ENABLED){
            if(canDelete(tempItems[i])){
                deletePromises.push(FileSystem.deleteAsync(toExpoFsPath(tempPath + "/" + tempItems[i])))
            }
        }
        else{
            console.log("tmpItems", tempItems[i])
        }
    }

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
            deletePromises.push(FileSystem.deleteAsync(toExpoFsPath(offlinePath + "/" + toDelete[i])))
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

    await promiseAllSettled(deletePromises)
}

export const setup = async ({ navigation }: { navigation: NavigationContainerRef<ReactNavigation.RootParamList> }): Promise<boolean> => {
    let cacheCleared = false

    clearCacheDirectories().then(() => {
        cacheCleared = true
    }).catch((err) => {
        console.error(err)

        cacheCleared = true
    })

    await updateKeys({ navigation })
    
    const response = await apiRequest({
        method: "POST",
        endpoint: "/v1/user/baseFolders",
        data: {
            apiKey: getAPIKey()
        }
    })

    if(!response.status){
        console.error(response.message)

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

    await new Promise<void>((resolve) => {
        const interval = setInterval(() => {
            if(cacheCleared){
                clearInterval(interval)

                return resolve()
            }
        }, 10)
    })

    return true
}