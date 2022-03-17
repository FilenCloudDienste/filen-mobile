import { Platform, PermissionsAndroid } from "react-native"
import { check, PERMISSIONS, RESULTS, request, requestMultiple } from "react-native-permissions"
import { storage } from "./storage"
import { i18n } from "../i18n/i18n"

export const hasWritePermissions = () => {
    return new Promise((resolve, reject) => {
        if(Platform.OS == "android"){
            check(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE).then((status) => {
                if([RESULTS.GRANTED].includes(status)){
                    return resolve(true)
                }

                request(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE).then((requestStatus) => {
                    if([RESULTS.GRANTED].includes(requestStatus)){
                        return resolve(true)
                    }

                    return reject(i18n(storage.getString("lang"), "pleaseGrantPermission"))
                }).catch(reject)
            }).catch(reject)
        }
        else{
            return resolve()
        }
    })
}

export const hasReadPermissions = () => {
    return new Promise(async (resolve, reject) => {
        if(Platform.OS == "android"){
            check(PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE).then((status) => {
                if([RESULTS.GRANTED].includes(status)){
                    return resolve(true)
                }

                request(PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE).then((requestStatus) => {
                    if([RESULTS.GRANTED].includes(requestStatus)){
                        return resolve(true)
                    }

                    return reject(i18n(storage.getString("lang"), "pleaseGrantPermission"))
                }).catch(reject)
            }).catch(reject)
        }
        else{
            return resolve()
        }
    })
}

export const hasCameraPermissions = () => {
    return new Promise(async (resolve, reject) => {
        if(Platform.OS == "android"){
            check(PERMISSIONS.ANDROID.CAMERA).then((status) => {
                if([RESULTS.GRANTED].includes(status)){
                    return resolve(true)
                }

                request(PERMISSIONS.ANDROID.CAMERA).then((requestStatus) => {
                    if([RESULTS.GRANTED].includes(requestStatus)){
                        return resolve(true)
                    }

                    return reject(i18n(storage.getString("lang"), "pleaseGrantPermission"))
                }).catch(reject)
            }).catch(reject)
        }
        else{
            check(PERMISSIONS.IOS.CAMERA).then((status) => {
                if([RESULTS.GRANTED].includes(status)){
                    return resolve(true)
                }

                request(PERMISSIONS.IOS.CAMERA).then((requestStatus) => {
                    if([RESULTS.GRANTED].includes(requestStatus)){
                        return resolve(true)
                    }

                    return reject(i18n(storage.getString("lang"), "pleaseGrantPermission"))
                }).catch(reject)
            }).catch(reject)
        }
    })
}

export const hasBiometricPermissions = () => {
    return new Promise(async (resolve, reject) => {
        if(Platform.OS == "android"){
            return resolve(true)
        }
        else{
            check(PERMISSIONS.IOS.FACE_ID).then((status) => {
                if([RESULTS.GRANTED].includes(status)){
                    return resolve(true)
                }

                request(PERMISSIONS.IOS.FACE_ID).then((requestStatus) => {
                    if([RESULTS.GRANTED].includes(requestStatus)){
                        return resolve(true)
                    }

                    return reject(i18n(storage.getString("lang"), "pleaseGrantPermission"))
                }).catch(reject)
            }).catch(reject)
        }
    })
}

export const hasPhotoLibraryPermissions = () => {
    return new Promise(async (resolve, reject) => {
        if(Platform.OS == "android"){
            hasStoragePermissions().then(resolve).catch(reject)
        }
        else{
            check([PERMISSIONS.IOS.PHOTO_LIBRARY, PERMISSIONS.IOS.PHOTO_LIBRARY_ADD_ONLY]).then((statuses) => {
                if([RESULTS.GRANTED].includes(statuses[PERMISSIONS.IOS.PHOTO_LIBRARY]) && [RESULTS.GRANTED].includes(statuses[PERMISSIONS.IOS.PHOTO_LIBRARY_ADD_ONLY])){
                    return resolve(true)
                }

                requestMultiple([PERMISSIONS.IOS.PHOTO_LIBRARY, PERMISSIONS.IOS.PHOTO_LIBRARY_ADD_ONLY]).then((requestStatuses) => {
                    if([RESULTS.GRANTED].includes(requestStatuses[PERMISSIONS.IOS.PHOTO_LIBRARY]) && [RESULTS.GRANTED].includes(requestStatuses[PERMISSIONS.IOS.PHOTO_LIBRARY_ADD_ONLY])){
                        return resolve(true)
                    }
    
                    return reject(i18n(storage.getString("lang"), "pleaseGrantPermission"))
                }).catch(reject)
            }).catch(reject)
        }
    })
}

export const hasStoragePermissions = () => {
    return new Promise(async (resolve, reject) => {
        if(Platform.OS == "ios"){
            return resolve(true)
        }

        try{
            var read = await hasReadPermissions()
            var write = await hasWritePermissions()
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