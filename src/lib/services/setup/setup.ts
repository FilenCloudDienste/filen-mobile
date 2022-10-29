import { updateKeys } from "../user/keys"
import RNFS from "react-native-fs"
import { apiRequest } from "../../api"
import { getAPIKey } from "../../helpers"
import storage from "../../storage"
import { getDownloadPath } from "../download/download"

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

export const setup = ({ navigation }: { navigation: any }): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        clearCacheDirectories().then(() => {
            console.log("setup: cleared cache")

            updateKeys({ navigation }).then(() => {
                console.log("setup: updated keys")

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

                    console.log("setup: fetched default drive uuid")

                    return resolve(true)
                })
            }).catch((err) => {
                return reject(err)
            })
        })
    })
}