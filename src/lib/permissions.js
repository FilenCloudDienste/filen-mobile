import { Platform, PermissionsAndroid } from "react-native"
import { check, PERMISSIONS, RESULTS, request, requestMultiple, checkMultiple } from "react-native-permissions"
import { storage } from "./storage"
import { i18n } from "../i18n/i18n"

export const hasWritePermissions = (requestPermissions) => {
    return new Promise((resolve, reject) => {
        if(Platform.OS == "android"){
            check(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE).then((status) => {
                if([RESULTS.GRANTED].includes(status)){
                    return resolve(true)
                }

                if(!requestPermissions){
                    return reject(i18n(storage.getString("lang"), "pleaseGrantPermission"))
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

export const hasReadPermissions = (requestPermissions) => {
    return new Promise(async (resolve, reject) => {
        if(Platform.OS == "android"){
            check(PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE).then((status) => {
                if([RESULTS.GRANTED].includes(status)){
                    return resolve(true)
                }

                if(!requestPermissions){
                    return reject(i18n(storage.getString("lang"), "pleaseGrantPermission"))
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

export const hasCameraPermissions = (requestPermissions) => {
    return new Promise(async (resolve, reject) => {
        if(Platform.OS == "android"){
            check(PERMISSIONS.ANDROID.CAMERA).then((status) => {
                if([RESULTS.GRANTED].includes(status)){
                    return resolve(true)
                }

                if(!requestPermissions){
                    return reject(i18n(storage.getString("lang"), "pleaseGrantPermission"))
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

                if(!requestPermissions){
                    return reject(i18n(storage.getString("lang"), "pleaseGrantPermission"))
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

export const hasBiometricPermissions = (requestPermissions) => {
    return new Promise(async (resolve, reject) => {
        if(Platform.OS == "android"){
            return resolve(true)
        }
        else{
            check(PERMISSIONS.IOS.FACE_ID).then((status) => {
                if([RESULTS.GRANTED].includes(status)){
                    return resolve(true)
                }

                if(!requestPermissions){
                    return reject(i18n(storage.getString("lang"), "pleaseGrantPermission"))
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

export const hasPhotoLibraryPermissions = (requestPermissions) => {
    return new Promise(async (resolve, reject) => {
        if(Platform.OS == "android"){
            hasStoragePermissions().then(resolve).catch(reject)
        }
        else{
            checkMultiple([PERMISSIONS.IOS.PHOTO_LIBRARY, PERMISSIONS.IOS.PHOTO_LIBRARY_ADD_ONLY]).then((statuses) => {
                if([RESULTS.GRANTED].includes(statuses[PERMISSIONS.IOS.PHOTO_LIBRARY]) && [RESULTS.GRANTED].includes(statuses[PERMISSIONS.IOS.PHOTO_LIBRARY_ADD_ONLY])){
                    return resolve(true)
                }

                if(!requestPermissions){
                    return reject(i18n(storage.getString("lang"), "pleaseGrantPermission"))
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

export const hasStoragePermissions = (requestPermissions) => {
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

export const hasLocationPermissions = (requestPermissions) => {
    return new Promise(async (resolve, reject) => {
        if(Platform.OS == "android"){
            check(PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION).then((status) => {
                if([RESULTS.GRANTED].includes(status)){
                    return resolve(true)
                }

                request(PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION).then((requestStatus) => {
                    if([RESULTS.GRANTED].includes(requestStatus)){
                        return resolve(true)
                    }

                    check(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION).then((status) => {
                        if([RESULTS.GRANTED].includes(status)){
                            return resolve(true)
                        }
        
                        request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION).then((requestStatus) => {
                            if([RESULTS.GRANTED].includes(requestStatus)){
                                return resolve(true)
                            }
        
                            check(PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION).then((status) => {
                                if([RESULTS.GRANTED].includes(status)){
                                    return resolve(true)
                                }
                
                                request(PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION).then((requestStatus) => {
                                    if([RESULTS.GRANTED].includes(requestStatus)){
                                        return resolve(true)
                                    }
                
                                    return reject(i18n(storage.getString("lang"), "pleaseGrantPermission"))
                                }).catch(reject)
                            }).catch(reject)
                        }).catch(reject)
                    }).catch(reject)
                }).catch(reject)
            }).catch(reject)
        }
        else{
            check(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE).then((status) => {
                if([RESULTS.GRANTED].includes(status)){
                    return resolve(true)
                }

                if(!requestPermissions){
                    return reject(i18n(storage.getString("lang"), "pleaseGrantPermission"))
                }

                request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE).then((requestStatus) => {
                    if([RESULTS.GRANTED].includes(requestStatus)){
                        return resolve(true)
                    }

                    return reject(i18n(storage.getString("lang"), "pleaseGrantPermission"))
                }).catch(reject)
            }).catch(reject)
        }
    })
}