import { Storage } from "@capacitor/storage"
import * as workers from "../utils/workers"

let storageVersion = "_v1"
let debounceIds = {}
let lastSavedLength = {}
let debounceTimeout = 1000

export function set(key, value){
    return new Promise((resolve, reject) => {
        window.customVariables.isWritingToStorage = true

        Storage.set({
            key: key + storageVersion,
            value
        }).then(() => {
            key = null
            value = null
            window.customVariables.isWritingToStorage = false

            return resolve(true)
        }).catch((err) => {
            key = null
            value = null
            window.customVariables.isWritingToStorage = false

            return reject(err)
        })
    })
}

export function get(key){
    return new Promise((resolve, reject) => {
        Storage.get({
            key: key + storageVersion
        }).then((res) => {
            key = null

            if(typeof res == "undefined"){
                return resolve(null)
            }

            if(typeof res.value == "undefined"){
                return resolve(null)
            }

            resolve(res.value)

            res = null

            return true
        }).catch((err) => {
            key = null
            
            return reject(err)
        })
    })
}

export function remove(key){
    return new Promise((resolve, reject) => {
        window.customVariables.isWritingToStorage = true

        Storage.remove({
            key: key + storageVersion
        }).then(() => {
            key = null
            window.customVariables.isWritingToStorage = false

            return resolve(true)
        }).catch((err) => {
            key = null
            window.customVariables.isWritingToStorage = false
            
            return reject(err)
        })
    })
}

export function saveSettings(newSettings){
    return new Promise((resolve) => {
        clearTimeout(debounceIds['saveSettings'])

        window.customVariables.isWritingToStorage = true

        debounceIds['saveSettings'] = setTimeout(async () => {
            try{
                let data = await workers.JSONStringifyWorker(newSettings)

                await set("settings@" + window.customVariables.userEmail, data)

                data = null
            }
            catch(e){
                console.log(e)
            }

            return resolve()
        }, 1)
    })
}

export function saveItemsCache(){
    if(typeof lastSavedLength['saveItemsCache'] == "undefined"){
        lastSavedLength['saveItemsCache'] = ""
    }

    workers.md5Hash(window.customVariables.itemsCache, true).then((md5Hash) => {
        if(md5Hash == lastSavedLength['saveItemsCache']){
            return false
        }

        lastSavedLength['saveItemsCache'] = md5Hash

        clearTimeout(debounceIds['saveItemsCache'])

        window.customVariables.isWritingToStorage = true

        return debounceIds['saveItemsCache'] = setTimeout(async () => {
            try{
                let data = await workers.JSONStringifyWorker(window.customVariables.itemsCache)

                await set("itemsCache@" + window.customVariables.userEmail, data)

                data = null
            }
            catch(e){
                console.log(e)
            }

            return true
        }, debounceTimeout)
    }).catch((err) => {
        return console.log(err)
    })
}

export function saveOfflineSavedFiles(){
    if(typeof lastSavedLength['saveOfflineSavedFiles'] == "undefined"){
        lastSavedLength['saveOfflineSavedFiles'] = 0
    }

    workers.md5Hash(window.customVariables.offlineSavedFiles, true).then((md5Hash) => {
        if(md5Hash == lastSavedLength['saveOfflineSavedFiles']){
            return false
        }
    
        lastSavedLength['saveOfflineSavedFiles'] = md5Hash
    
        clearTimeout(debounceIds['saveOfflineSavedFiles'])
    
        window.customVariables.isWritingToStorage = true
    
        return debounceIds['saveOfflineSavedFiles'] = setTimeout(async () => {
            try{
                let data = await workers.JSONStringifyWorker(window.customVariables.offlineSavedFiles)
    
                await set("offlineSavedFiles@" + window.customVariables.userEmail, data)
    
                data = null
            }
            catch(e){
                console.log(e)
            }
            return true
        }, debounceTimeout)
    }).catch((err) => {
        return console.log(err)
    })
}

export function saveGetThumbnailErrors(){
    if(typeof lastSavedLength['saveGetThumbnailErrors'] == "undefined"){
        lastSavedLength['saveGetThumbnailErrors'] = 0
    }

    workers.md5Hash(window.customVariables.getThumbnailErrors, true).then((md5Hash) => {
        if(md5Hash == lastSavedLength['saveGetThumbnailErrors']){
            return false
        }
    
        lastSavedLength['saveGetThumbnailErrors'] = md5Hash
    
        clearTimeout(debounceIds['saveGetThumbnailErrors'])
    
        window.customVariables.isWritingToStorage = true
    
        return debounceIds['saveGetThumbnailErrors'] = setTimeout(async () => {
            try{
                let data = await workers.JSONStringifyWorker(window.customVariables.getThumbnailErrors)
    
                await set("getThumbnailErrors@" + window.customVariables.userEmail, data)
    
                data = null
            }
            catch(e){
                console.log(e)
            }
            return true
        }, debounceTimeout)
    }).catch((err) => {
        return console.log(err)
    })
}

export function saveAPICache(){
    if(typeof lastSavedLength['saveAPICache'] == "undefined"){
        lastSavedLength['saveAPICache'] = 0
    }

    workers.md5Hash(window.customVariables.apiCache, true).then((md5Hash) => {
        if(md5Hash == lastSavedLength['saveAPICache']){
            return false
        }
    
        lastSavedLength['saveAPICache'] = md5Hash
    
        clearTimeout(debounceIds['saveAPICache'])
    
        window.customVariables.isWritingToStorage = true
    
        return debounceIds['saveAPICache'] = setTimeout(async () => {
            try{
                let data = await workers.JSONStringifyWorker(window.customVariables.apiCache)
    
                await set("apiCache@" + window.customVariables.userEmail, data)
    
                data = null
            }
            catch(e){
                console.log(e)
            }
    
            return true
        }, debounceTimeout)
    }).catch((err) => {
        return console.log(err)
    })
}

export function saveThumbnailCache(){
    return new Promise((resolve) => {
        if(typeof lastSavedLength['saveThumbnailCache'] == "undefined"){
            lastSavedLength['saveThumbnailCache'] = 0
        }

        workers.md5Hash(window.customVariables.thumbnailCache, true).then((md5Hash) => {
            if(md5Hash == lastSavedLength['saveThumbnailCache']){
                return resolve(true)
            }
        
            lastSavedLength['saveThumbnailCache'] = md5Hash
    
            clearTimeout(debounceIds['saveThumbnailCache'])
    
            window.customVariables.isWritingToStorage = true
    
            return debounceIds['saveThumbnailCache'] = setTimeout(async () => {
                try{
                    let data = await workers.JSONStringifyWorker(window.customVariables.thumbnailCache)
    
                    await set("thumbnailCache@" + window.customVariables.userEmail, data)
    
                    data = null
                }
                catch(e){
                    console.log(e)
                }
        
                return resolve(true)
            }, debounceTimeout)
        }).catch((err) => {
            console.log(err)

            return resolve(true)
        })
    })
}

export function saveCachedItems(){
    return new Promise((resolve) => {
        if(typeof lastSavedLength['saveCachedItems'] == "undefined"){
            lastSavedLength['saveCachedItems'] = 0
        }

        let files = JSON.stringify(window.customVariables.cachedFiles)
        let folders = JSON.stringify(window.customVariables.cachedFolders)
        let meta = JSON.stringify(window.customVariables.cachedMetadata)

        workers.md5Hash((files + folders + meta), false).then((md5Hash) => {
            if(md5Hash == lastSavedLength['saveCachedItems']){
                files = null
                folders = null
                meta = null

                return resolve(true)
            }
        
            lastSavedLength['saveCachedItems'] = md5Hash
    
            clearTimeout(debounceIds['saveCachedItems'])
    
            window.customVariables.isWritingToStorage = true
    
            return debounceIds['saveCachedItems'] = setTimeout(async () => {
                try{
                    let data1 = files
                    let data2 = folders
                    let data3 = meta

                    files = null
                    folders = null
                    meta = null
    
                    await set("cachedFiles@" + window.customVariables.userEmail, data1)
                    await set("cachedFolders@" + window.customVariables.userEmail, data2)
                    await set("cachedMetadata@" + window.customVariables.userEmail, data3)
    
                    data1 = null
                    data2 = null
                    data3 = null
                }
                catch(e){
                    console.log(e)
                }
        
                return resolve(true)
            }, debounceTimeout)
        }).catch((err) => {
            console.log(err)

            files = null
            folders = null
            meta = null

            return resolve(true)
        })
    })
}

export function saveFolderSizeCache(){
    return new Promise((resolve) => {
        if(typeof lastSavedLength['saveFolderSizeCache'] == "undefined"){
            lastSavedLength['saveFolderSizeCache'] = 0
        }

        workers.md5Hash(window.customVariables.folderSizeCache, true).then((md5Hash) => {
            if(md5Hash == lastSavedLength['saveFolderSizeCache']){
                return resolve(true)
            }
        
            lastSavedLength['saveFolderSizeCache'] = md5Hash
    
            clearTimeout(debounceIds['saveFolderSizeCache'])
    
            window.customVariables.isWritingToStorage = true
    
            return debounceIds['saveFolderSizeCache'] = setTimeout(async () => {
                try{
                    let data = await workers.JSONStringifyWorker(window.customVariables.folderSizeCache)
    
                    await set("folderSizeCache@" + window.customVariables.userEmail, data)
    
                    data = null
                }
                catch(e){
                    console.log(e)
                }
        
                return resolve(true)
            }, debounceTimeout)
        }).catch((err) => {
            console.log(err)

            return resolve(true)
        })
    })
}

export function saveCameraUpload(){
    return new Promise((resolve) => {
        if(typeof lastSavedLength['saveCameraUpload'] == "undefined"){
            lastSavedLength['saveCameraUpload'] = 0
        }

        workers.md5Hash(window.customVariables.cameraUpload, true).then(async (md5Hash) => {
            if(md5Hash == lastSavedLength['saveCameraUpload']){
                return resolve(true)
            }
        
            lastSavedLength['saveCameraUpload'] = md5Hash

            window.customVariables.isWritingToStorage = true

            try{
                let data = await workers.JSONStringifyWorker(window.customVariables.cameraUpload)

                await set("cameraUpload@" + window.customVariables.userEmail, data)

                data = null
            }
            catch(e){
                console.log(e)
            }

            return resolve(true)
        }).catch((err) => {
            console.log(err)

            return resolve(true)
        })
    })
}