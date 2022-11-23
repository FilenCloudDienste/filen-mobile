import { updateKeys } from "../user/keys"
import RNFS from "react-native-fs"
import { apiRequest } from "../../api"
import { getAPIKey } from "../../helpers"
import storage from "../../storage"
import { getDownloadPath } from "../download/download"
import { logger, fileAsyncTransport, mapConsoleTransport } from "react-native-logs"
import * as FileSystem from "expo-file-system"
import { showToast } from "../../../components/Toasts"
import { promiseAllSettled } from "../../helpers"

const log = logger.createLogger({
    severity: "debug",
    transport: [fileAsyncTransport, mapConsoleTransport],
    transportOptions: {
        FS: FileSystem,
        fileName: "logs/setup.log"
    }
})

const ONLY_DEFAULT_DRIVE_ENABLED: boolean = true

export const clearCacheDirectories = async (): Promise<boolean> => {
    const cachedDownloadsPath = await getDownloadPath({ type: "cachedDownloads" })
    const cacheDownloadsItems = await FileSystem.readDirectoryAsync(cachedDownloadsPath.indexOf("file://") == -1 ? "file://" + cachedDownloadsPath : cachedDownloadsPath)

    for(let i = 0; i < cacheDownloadsItems.length; i++){
        if(cacheDownloadsItems[i].indexOf("SentryCrash") == -1){
            FileSystem.deleteAsync(cacheDownloadsItems[i]).catch(() => {})
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

        if(info.size && info.size > (1024 * 1024 * 3)){
            FileSystem.deleteAsync(items[i]).catch(() => {})
        }
    }

    return true
}

export const setup = async ({ navigation }: { navigation: any }): Promise<boolean> => {
    await promiseAllSettled([
        clearLogs(),
        clearCacheDirectories()
    ])

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