import { Platform } from "react-native"
import { check, PERMISSIONS, RESULTS, request, requestMultiple, checkMultiple } from "react-native-permissions"
import storage from "../storage"
import { i18n } from "../../i18n"
import * as MediaLibrary from "expo-media-library"

export const hasWritePermissions = (requestPermissions: boolean = true): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        if(Platform.OS == "android"){
            check(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE).then((status) => {
                if(status == RESULTS.GRANTED){
                    return resolve(true)
                }

                request(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE).then((requestStatus) => {
                    if(requestStatus == RESULTS.GRANTED){
                        return resolve(true)
                    }

                    return reject(i18n(storage.getString("lang"), "pleaseGrantPermission"))
                }).catch(reject)
            }).catch(reject)
        }
        else{
            return resolve(true)
        }
    })
}

export const hasReadPermissions = (requestPermissions: boolean = true): Promise<boolean> => {
    return new Promise(async (resolve, reject) => {
        if(Platform.OS == "android"){
            check(PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE).then((status) => {
                if(status == RESULTS.GRANTED){
                    return resolve(true)
                }

                request(PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE).then((requestStatus) => {
                    if(requestStatus == RESULTS.GRANTED){
                        return resolve(true)
                    }

                    return reject(i18n(storage.getString("lang"), "pleaseGrantPermission"))
                }).catch(reject)
            }).catch(reject)
        }
        else{
            return resolve(true)
        }
    })
}

export const hasCameraPermissions = (requestPermissions: boolean = true): Promise<boolean> => {
    return new Promise(async (resolve, reject) => {
        if(Platform.OS == "android"){
            check(PERMISSIONS.ANDROID.CAMERA).then((status) => {
                if(status == RESULTS.GRANTED){
                    return resolve(true)
                }

                if(!requestPermissions){
                    return reject(i18n(storage.getString("lang"), "pleaseGrantPermission"))
                }

                request(PERMISSIONS.ANDROID.CAMERA).then((requestStatus) => {
                    if(requestStatus == RESULTS.GRANTED){
                        return resolve(true)
                    }

                    return reject(i18n(storage.getString("lang"), "pleaseGrantPermission"))
                }).catch(reject)
            }).catch(reject)
        }
        else{
            check(PERMISSIONS.IOS.CAMERA).then((status) => {
                if(status == RESULTS.GRANTED){
                    return resolve(true)
                }

                request(PERMISSIONS.IOS.CAMERA).then((requestStatus) => {
                    if(requestStatus == RESULTS.GRANTED){
                        return resolve(true)
                    }

                    return reject(i18n(storage.getString("lang"), "pleaseGrantPermission"))
                }).catch(reject)
            }).catch(reject)
        }
    })
}

export const hasBiometricPermissions = (requestPermissions: boolean = true): Promise<boolean> => {
    return new Promise(async (resolve, reject) => {
        if(Platform.OS == "android"){
            return resolve(true)
        }
        else{
            check(PERMISSIONS.IOS.FACE_ID).then((status) => {
                if(status == RESULTS.GRANTED){
                    return resolve(true)
                }

                request(PERMISSIONS.IOS.FACE_ID).then((requestStatus) => {
                    if(requestStatus == RESULTS.GRANTED){
                        return resolve(true)
                    }

                    return reject(i18n(storage.getString("lang"), "pleaseGrantPermission"))
                }).catch(reject)
            }).catch(reject)
        }
    })
}

export const hasPhotoLibraryPermissions = (requestPermissions: boolean = true): Promise<boolean> => {
    return new Promise(async (resolve, reject) => {
        const rest = () => {
            if(Platform.OS == "android"){
                check(PERMISSIONS.ANDROID.ACCESS_MEDIA_LOCATION).then((status) => {
                    if(status == RESULTS.GRANTED){
                        return resolve(true)
                    }
    
                    request(PERMISSIONS.ANDROID.ACCESS_MEDIA_LOCATION).then((requestStatus) => {
                        if(requestStatus == RESULTS.GRANTED){
                            return resolve(true)
                        }
    
                        hasStoragePermissions(requestPermissions).then(resolve).catch(reject)
                    }).catch(reject)
                }).catch(reject)
            }
            else{
                checkMultiple([PERMISSIONS.IOS.PHOTO_LIBRARY, PERMISSIONS.IOS.PHOTO_LIBRARY_ADD_ONLY]).then((statuses) => {
                    if(
                        RESULTS.GRANTED == statuses[PERMISSIONS.IOS.PHOTO_LIBRARY]
                        && RESULTS.GRANTED == statuses[PERMISSIONS.IOS.PHOTO_LIBRARY_ADD_ONLY]
                    ){
                        return resolve(true)
                    }
    
                    requestMultiple([PERMISSIONS.IOS.PHOTO_LIBRARY, PERMISSIONS.IOS.PHOTO_LIBRARY_ADD_ONLY]).then((requestStatuses) => {
                        if(
                            RESULTS.GRANTED == requestStatuses[PERMISSIONS.IOS.PHOTO_LIBRARY]
                            && RESULTS.GRANTED == requestStatuses[PERMISSIONS.IOS.PHOTO_LIBRARY_ADD_ONLY]
                        ){
                            return resolve(true)
                        }
        
                        return reject(i18n(storage.getString("lang"), "pleaseGrantPermission"))
                    }).catch(reject)
                }).catch(reject)
            }
        }

        MediaLibrary.getPermissionsAsync(false).then((status) => {
            if(!status.granted){
                MediaLibrary.requestPermissionsAsync(false).then((status) => {
                    if(!status.granted){
                        return reject(i18n(storage.getString("lang"), "pleaseGrantPermission"))
                    }

                    rest()
                }).catch(reject)
            }
            else{
                rest()
            }
        }).catch(reject)
    })
}

export const hasStoragePermissions = (requestPermissions: boolean = true): Promise<boolean> => {
    return new Promise(async (resolve, reject) => {
        if(Platform.OS == "ios"){
            return resolve(true)
        }

        try{
            var read = await hasReadPermissions(requestPermissions)
            var write = await hasWritePermissions(requestPermissions)
        }
        catch(e){
            console.log(e)

            return reject(e)
        }

        if(read && write){
            return resolve(true)
        }

        return reject(i18n(storage.getString("lang"), "pleaseGrantPermission"))
    })
}