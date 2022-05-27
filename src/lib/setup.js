import { updateKeys } from "./user/keys"
import RNFS from "react-native-fs"
import { apiRequest } from "./api"
import { getAPIKey } from "./helpers"
import { storage } from "./storage"

const ONLY_DEFAULT_DRIVE_ENABLED = true

export const clearCacheDirectories = () => {
    return new Promise((resolve, reject) => {
        RNFS.readDir(RNFS.TemporaryDirectoryPath).then(async (items) => {
            for(let i = 0; i < items.length; i++){
                try{
                    await RNFS.unlink(items[i].path)
                }
                catch(e){
                    //console.log(e)
                }
            }

            RNFS.readDir(RNFS.CachesDirectoryPath).then(async (items) => {
                for(let i = 0; i < items.length; i++){
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
    })
}

export const clearDeprecatedDocumentDirs = () => {
    return new Promise((resolve, reject) => {
        if(Platform.OS == "android"){
            return resolve(true)
        }

        const allowed = ["thumbnailCache", "offlineFiles", "Downloads", "storage", "mmkv", "nodejs-assets", "nodejs-project"]

        RNFS.readDir(RNFS.DocumentDirectoryPath).then(async (items) => {
            for(let i = 0; i < items.length; i++){
                if(!allowed.includes(items[i].name)){
                    try{
                        //await RNFS.unlink(items[i].path)
                    }
                    catch(e){
                        //console.log(e)
                    }

                    console.log("deleting ", items[i].name)
                }
            }

            return resolve(true)
        }).catch(resolve)
    })
}

export const setup = ({ navigation }) => {
    return new Promise((resolve, reject) => {
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
                return reject(err)
            })
        })
    })
}