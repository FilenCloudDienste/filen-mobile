import { updateKeys } from "../user/keys"
import { apiRequest } from "../../api"
import { getAPIKey, promiseAllSettled } from "../../helpers"
import storage from "../../storage"
import { getDownloadPath } from "../download/download"
import { showToast } from "../../../components/Toasts"
import { NavigationContainerRef } from "@react-navigation/native"
import { memoize } from "lodash"
import { getOfflineList, removeItemFromOfflineList } from "../offline"
import { validate } from "uuid"
import { Item } from "../../../types"
import * as fs from "../../fs"

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

export const checkOfflineItems = async () => {
    const deletePromises = []

    let [ list, offlinePath ] = await Promise.all([
        getOfflineList(),
        getDownloadPath({ type: "offline" })
    ])

    offlinePath = offlinePath.slice(0, -1)

    const items: string[] = await fs.readDirectory(offlinePath)
    const inList: string[] = list.map(item => item.uuid)

    const inDir: string[] = items.filter(item => {
        if(item.indexOf("_") == -1){
            return false
        }

        const exUnderscore = item.split("_")
        const uuidEx = exUnderscore[exUnderscore.length - 1].split(".")
        const uuid = uuidEx[0]

        if(!validate(uuid)){
            return false
        }

        return true
    }).map(item => {
        const exUnderscore = item.split("_")
        const uuidEx = exUnderscore[exUnderscore.length - 1].split(".")
        const uuid = uuidEx[0]

        return uuid
    })

    const toDelete: string[] = []
    const toRemove: string[] = []

    for(let i = 0; i < items.length; i++){
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
            deletePromises.push(fs.unlink(offlinePath + "/" + toDelete[i], true))
        }
    }

    for(let i = 0; i < toRemove.length; i++){
        removeItemFromOfflineList({
            item: {
                uuid: toRemove[i]
            } as Item
        }).catch((err) => {
            console.log(6, "Could not remove", toRemove[i], err)
        })
    }

    await promiseAllSettled(deletePromises)
}

export const clearCacheDirectories = async () => {
    const deletePromises = []
    const cachedDownloadsPath = (await getDownloadPath({ type: "cachedDownloads" })).slice(0, -1)
    const cacheDownloadsItems = await fs.readDirectory(cachedDownloadsPath)

    for(let i = 0; i < cacheDownloadsItems.length; i++){
        if(CACHE_CLEARING_ENABLED){
            if(canDelete(cacheDownloadsItems[i])){
                deletePromises.push(fs.unlink(cachedDownloadsPath + "/" + cacheDownloadsItems[i], true))
            }
        }
        else{
            console.log("cacheDownloadsItems", cacheDownloadsItems[i])
        }
    }

    if(fs.cacheDirectory){
        const cachePath = fs.cacheDirectory.indexOf("file://") == -1 ? "file://" + fs.cacheDirectory : fs.cacheDirectory
        const cacheItems = await fs.readDirectory(cachePath)

        for(let i = 0; i < cacheItems.length; i++){
            if(CACHE_CLEARING_ENABLED){
                if(canDelete(cacheItems[i])){
                    deletePromises.push(fs.unlink(cachePath + "/" + cacheItems[i], true))
                }
            }
            else{
                console.log("cacheItems", cacheItems[i])
            }
        }
    }

    const tmpPath = (await getDownloadPath({ type: "cachedDownloads" })).slice(0, -1)
    const tmpItems = await fs.readDirectory(tmpPath)

    for(let i = 0; i < tmpItems.length; i++){
        if(CACHE_CLEARING_ENABLED){
            if(canDelete(tmpItems[i])){
                deletePromises.push(fs.unlink(tmpPath + "/" + tmpItems[i], true))
            }
        }
        else{
            console.log("tmpItems", tmpItems[i])
        }
    }

    const tempPath = (await getDownloadPath({ type: "temp" })).slice(0, -1)
    const tempItems = await fs.readDirectory(tempPath)

    for(let i = 0; i < tempItems.length; i++){
        if(CACHE_CLEARING_ENABLED){
            if(canDelete(tempItems[i])){
                deletePromises.push(fs.unlink(tempPath + "/" + tempItems[i], true))
            }
        }
        else{
            console.log("tmpItems", tempItems[i])
        }
    }

    await promiseAllSettled(deletePromises)
}

export const setup = async ({ navigation }: { navigation: NavigationContainerRef<ReactNavigation.RootParamList> }): Promise<boolean> => {
    let cacheCleared = false

    checkOfflineItems().catch(console.error)

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