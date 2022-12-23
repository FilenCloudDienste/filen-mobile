import { updateKeys } from "../user/keys"
import { apiRequest } from "../../api"
import { getAPIKey } from "../../helpers"
import storage from "../../storage"
import { getDownloadPath } from "../download/download"
import { logger, fileAsyncTransport, mapConsoleTransport } from "react-native-logs"
import * as FileSystem from "expo-file-system"
import { showToast } from "../../../components/Toasts"
import { promiseAllSettled } from "../../helpers"
import path from "path"

const log = logger.createLogger({
    severity: "debug",
    transport: [fileAsyncTransport, mapConsoleTransport],
    transportOptions: {
        FS: FileSystem,
        fileName: "logs/setup.log"
    }
})

const ONLY_DEFAULT_DRIVE_ENABLED: boolean = true

const DONT_DELETE: string[] = [
    "sentry",
    "expo",
    "http-cache",
    "image-cache",
    "webview",
    "shareCache",
    "image_manager",
    "log",
    "logs"
]

export const clearCacheDirectories = async (): Promise<boolean> => {
    const cachedDownloadsPath = await getDownloadPath({ type: "cachedDownloads" })
    const cachedDownloadsPathAbsolute = cachedDownloadsPath.indexOf("file://") == -1 ? "file://" + cachedDownloadsPath : cachedDownloadsPath
    const cacheDownloadsItems = await FileSystem.readDirectoryAsync(cachedDownloadsPathAbsolute)

    const tmpPath = await getDownloadPath({ type: "cachedDownloads" })
    const tmpPathAbsolute = tmpPath.indexOf("file://") == -1 ? "file://" + tmpPath : tmpPath
    const tmpItems = await FileSystem.readDirectoryAsync(tmpPathAbsolute)

    for(let i = 0; i < cacheDownloadsItems.length; i++){
        if(DONT_DELETE.filter(d => cacheDownloadsItems[i].toLowerCase().indexOf(d.toLowerCase()) !== -1).length == 0){
            FileSystem.deleteAsync(path.join(cachedDownloadsPathAbsolute, cacheDownloadsItems[i])).catch(() => {})
        }
    }

    for(let i = 0; i < tmpItems.length; i++){
        if(DONT_DELETE.filter(d => tmpItems[i].toLowerCase().indexOf(d.toLowerCase()) !== -1).length == 0){
            FileSystem.deleteAsync(path.join(tmpPathAbsolute, tmpItems[i])).catch(() => {})
        }
    }

    if(FileSystem.cacheDirectory){
        const cachePath = FileSystem.cacheDirectory.indexOf("file://") == -1 ? "file://" + FileSystem.cacheDirectory : FileSystem.cacheDirectory
        const cacheItems = await FileSystem.readDirectoryAsync(cachePath)

        for(let i = 0; i < cacheItems.length; i++){
            if(DONT_DELETE.filter(d => cacheItems[i].toLowerCase().indexOf(d.toLowerCase()) !== -1).length == 0){
                FileSystem.deleteAsync(path.join(cachePath, cacheItems[i])).catch(() => {})
            }
        }
    }

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
            FileSystem.deleteAsync(items[i]).catch(() => {})
        }
    }

    return true
}

export const setup = async ({ navigation }: { navigation: any }): Promise<boolean> => {
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