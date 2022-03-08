import { Platform } from "react-native"
import { check, PERMISSIONS, RESULTS } from "react-native-permissions"
import { storage } from "./storage"
import { i18n } from "../i18n/i18n"

export const hasWritePermissions = () => {
    return new Promise((resolve, reject) => {
        if(Platform.OS == "android"){
            check(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE).then((status) => {
                if(![RESULTS.GRANTED, RESULTS.LIMITED].includes(status)){
                    return reject(i18n(storage.getString("lang"), "pleaseGrantPermission"))
                }

                return resolve(true)
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
                if(![RESULTS.GRANTED, RESULTS.LIMITED].includes(status)){
                    return reject(i18n(storage.getString("lang"), "pleaseGrantPermission"))
                }

                return resolve(true)
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
            check([PERMISSIONS.ANDROID.CAMERA, PERMISSIONS.ANDROID.RECORD_AUDIO]).then((statuses) => {
                if(![RESULTS.GRANTED, RESULTS.LIMITED].includes(statuses[PERMISSIONS.ANDROID.CAMERA]) || ![RESULTS.GRANTED, RESULTS.LIMITED].includes(statuses[PERMISSIONS.ANDROID.RECORD_AUDIO])){
                    return reject(i18n(storage.getString("lang"), "pleaseGrantPermission"))
                }

                return resolve(true)
            }).catch(reject)
        }
        else{
            check([PERMISSIONS.IOS.CAMERA, PERMISSIONS.IOS.MICROPHONE]).then((statuses) => {
                if(![RESULTS.GRANTED, RESULTS.LIMITED].includes(statuses[PERMISSIONS.IOS.CAMERA]) || ![RESULTS.GRANTED, RESULTS.LIMITED].includes(statuses[PERMISSIONS.IOS.MICROPHONE])){
                    return reject(i18n(storage.getString("lang"), "pleaseGrantPermission"))
                }

                return resolve(true)
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
                if(![RESULTS.GRANTED, RESULTS.LIMITED].includes(status)){
                    return reject(i18n(storage.getString("lang"), "pleaseGrantPermission"))
                }

                return resolve(true)
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
                if(![RESULTS.GRANTED, RESULTS.LIMITED].includes(statuses[PERMISSIONS.IOS.PHOTO_LIBRARY]) || ![RESULTS.GRANTED, RESULTS.LIMITED].includes(statuses[PERMISSIONS.IOS.PHOTO_LIBRARY_ADD_ONLY])){
                    return reject(i18n(storage.getString("lang"), "pleaseGrantPermission"))
                }

                return resolve(true)
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