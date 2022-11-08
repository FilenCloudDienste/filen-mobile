import { updateKeys } from "../user/keys"
import RNFS from "react-native-fs"
import { apiRequest } from "../../api"
import { getAPIKey } from "../../helpers"
import storage from "../../storage"
import { getDownloadPath } from "../download/download"
import { logger, fileAsyncTransport, mapConsoleTransport } from "react-native-logs"
import * as FileSystem from "expo-file-system"

const log = logger.createLogger({
    severity: "debug",
    transport: [fileAsyncTransport, mapConsoleTransport],
    transportOptions: {
        FS: FileSystem,
        fileName: "logs/setup.log"
    }
})

const ONLY_DEFAULT_DRIVE_ENABLED: boolean = true

export const clearCacheDirectories = (): Promise<boolean> => {
    return new Promise((resolve) => {
        getDownloadPath({ type: "cachedDownloads" }).then((cachedDownloadsPath) => {
            RNFS.readDir(RNFS.TemporaryDirectoryPath).then(async (items) => {
                for(let i = 0; i < items.length; i++){
                    if(items[i].path.indexOf("SentryCrash") !== -1){
                        continue
                    }

                    try{
                        await RNFS.unlink(items[i].path)
                    }
                    catch(e){
                        //console.log(e)
                    }
                }
    
                RNFS.readDir(RNFS.CachesDirectoryPath).then(async (items) => {
                    for(let i = 0; i < items.length; i++){
                        if(items[i].path.indexOf("SentryCrash") !== -1){
                            continue
                        }

                        try{
                            await RNFS.unlink(items[i].path)
                        }
                        catch(e){
                            //console.log(e)
                        }
                    }
        
                    RNFS.readDir(cachedDownloadsPath).then(async (items) => {
                        for(let i = 0; i < items.length; i++){
                            if(items[i].path.indexOf("SentryCrash") !== -1){
                                continue
                            }
                            
                            try{
                                await RNFS.unlink(items[i].path)
                            }
                            catch(e){
                                //console.log(e)
                            }
                        }
            
                        return resolve(true)
                    }).catch(resolve)
                }).catch(resolve)
            }).catch(resolve)
        }).catch(resolve)
    })
}

export const clearLogs = async (): Promise<boolean> => {
    let items: RNFS.ReadDirItem[] = []

    try{
        items = await RNFS.readDir(RNFS.DocumentDirectoryPath + "/logs")
    }
    catch(e){
        return true
    }

    for(let i = 0; i < items.length; i++){
        if(items[i].size < (1024 * 1024 * 3)){
            continue
        }
        
        try{
            await RNFS.unlink(items[i].path)
        }
        catch(e){
            continue
        }
    }

    return true
}

export const setup = ({ navigation }: { navigation: any }): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        RNFS.mkdir(RNFS.DocumentDirectoryPath + "/logs").then(() => {
            clearLogs().then(() => {
                clearCacheDirectories().then(() => {
                    updateKeys({ navigation }).then(() => {
                        apiRequest({
                            method: "POST",
                            endpoint: "/v1/user/baseFolders",
                            data: {
                                apiKey: getAPIKey()
                            }
                        }).then((response) => {
                            if(!response.status){
                                return reject(response.message)
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
        
                            return resolve(true)
                        })
                    }).catch((err) => {
                        log.error(err)
    
                        return reject(err)
                    })
                }).catch((err) => {
                    log.error(err)
    
                    return reject(err)
                })
            }).catch((err) => {
                log.error(err)
    
                return reject(err)
            })
        }).catch((err) => {
            log.error(err)

            return reject(err)
        })
    })
}