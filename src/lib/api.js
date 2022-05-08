import { getAPIServer, getAPIKey, getMasterKeys, decryptFolderLinkKey, encryptMetadata, decryptFileMetadata, decryptFolderName, Semaphore } from "./helpers"
import { storage } from "./storage"
import { i18n } from "../i18n/i18n"
import { DeviceEventEmitter, Platform } from "react-native"
import { updateLoadItemsCache, removeLoadItemsCache, emptyTrashLoadItemsCache, clearLoadItemsCacheLastResponse } from "./services/items"
import { logout } from "./auth/logout"
import { useStore } from "./state"
import BackgroundTimer from "react-native-background-timer"
import DeviceInfo from "react-native-device-info"

const shareSemaphore = new Semaphore(4)
const apiRequestSemaphore = new Semaphore(16)

const endpointsToCache = [
    "/v1/dir/content",
    "/v1/user/baseFolders",
    "/v1/user/shared/in",
    "/v1/user/shared/out",
    "/v1/user/recent",
    "/v1/user/keyPair/info",
    "/v1/user/keyPair/update",
    "/v1/user/keyPair/set",
    "/v1/dir/size",
    "/v1/user/masterKeys"
]

export const apiRequest = ({ method, endpoint, data }) => {
    return new Promise((resolve, reject) => {
        const cacheKey = "apiCache:" + method.toUpperCase() + ":" + endpoint + ":" + JSON.stringify(data)

        let maxTries = 1024
        let tries = 0
        const retryTimeout = 1000

        if(endpointsToCache.includes(endpoint)){
            maxTries = 5
        }

        const netInfo = useStore.getState().netInfo

        if(!netInfo.isConnected || !netInfo.isInternetReachable){
            maxTries = 1
        }

        const request = () => {
            if(tries >= maxTries){
                try{
                    var cache = storage.getString(cacheKey)
    
                    if(typeof cache == "string"){
                        if(cache.length > 0){
                            return resolve(JSON.parse(cache))
                        }
                    }
                }
                catch(e){
                    //console.log(e)
                }

                return reject(err)
            }

            tries += 1

            apiRequestSemaphore.acquire().then(() => {
                global.nodeThread.apiRequest({
                    method: method.toUpperCase(),
                    url: getAPIServer() + endpoint,
                    timeout: 500000,
                    data
                }).then((res) => {
                    apiRequestSemaphore.release()

                    if(endpointsToCache.includes(endpoint)){
                        try{
                            storage.set(cacheKey, JSON.stringify(res))
                        }
                        catch(e){
                            //console.log(e)
                        }
                    }
    
                    if(!res.status){
                        if(typeof res.message == "string"){
                            if(res.message.toLowerCase().indexOf("invalid api key") !== -1){
                                const navigation = useStore.getState().navigation
    
                                if(typeof navigation !== "undefined"){
                                    return logout({ navigation })
                                }
                            }
                        }
                    }
    
                    return resolve(res)
                }).catch((err) => {
                    apiRequestSemaphore.release()
    
                    return BackgroundTimer.setTimeout(request, retryTimeout)
                })
            }).catch((err) => {
                console.log(err)

                return BackgroundTimer.setTimeout(request, retryTimeout)
            })
        }

        return request()
    })
}

export const fileExists = ({ name, parent }) => {
    return new Promise((resolve, reject) => {
        global.nodeThread.hashFn({ string: name.toLowerCase() }).then((nameHashed) => {
            apiRequest({
                method: "POST",
                endpoint: "/v1/file/exists",
                data: {
                    apiKey: getAPIKey(),
                    parent,
                    nameHashed
                }
            }).then((response) => {
                if(!response.status){
                    return reject(response.message)
                }

                return resolve({
                    exists: (response.data.exists ? true : false),
                    existsUUID: response.data.uuid
                })
            }).catch(reject)
        }).catch(reject)
    })
}

export const folderExists = ({ name, parent }) => {
    return new Promise((resolve, reject) => {
        global.nodeThread.hashFn({ string: name.toLowerCase() }).then((nameHashed) => {
            apiRequest({
                method: "POST",
                endpoint: "/v1/dir/exists",
                data: {
                    apiKey: getAPIKey(),
                    parent,
                    nameHashed
                }
            }).then((response) => {
                if(!response.status){
                    return reject(response.message)
                }

                return resolve({
                    exists: (response.data.exists ? true : false),
                    existsUUID: response.data.uuid
                })
            }).catch(reject)
        }).catch(reject)
    })
}

export const markUploadAsDone = ({ uuid, uploadKey }) => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/upload/done",
            data: {
                uuid,
                uploadKey
            }
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve()
        }).catch(reject)
    })
}

export const archiveFile = ({ existsUUID, updateUUID }) => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/file/archive",
            data: {
                apiKey: getAPIKey(),
                uuid: existsUUID,
                updateUUID
            }
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve()
        }).catch(reject)
    })
}

export const getFolderContents = ({ uuid }) => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/download/dir",
            data: {
                apiKey: getAPIKey(),
                uuid
            }
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve(response.data)
        }).catch(reject)
    })
}

export const isSharingFolder = ({ uuid }) => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/share/dir/status",
            data: {
                apiKey: getAPIKey(),
                uuid
            }
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve({
                sharing: (response.data.sharing ? true : false),
                users: response.data.users
            })
        }).catch(reject)
    })
}

export const isPublicLinkingFolder = ({ uuid }) => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/link/dir/status",
            data: {
                apiKey: getAPIKey(),
                uuid
            }
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve({
                linking: (response.data.link ? true : false),
                links: response.data.links
            })
        }).catch(reject)
    })
}

export const addItemToPublicLink = ({ data }) => {
    return new Promise((resolve, reject) => {
        shareSemaphore.acquire().then(() => {
            apiRequest({
                method: "POST",
                endpoint: "/v1/dir/link/add",
                data
            }).then((response) => {
                shareSemaphore.release()

                if(!response.status){
                    return reject(response.message)
                }
    
                return resolve()
            }).catch((err) => {
                shareSemaphore.release()

                return reject(err)
            })
        }).catch(reject)
    })
}

export const shareItem = ({ data }) => {
    return new Promise((resolve, reject) => {
        shareSemaphore.acquire().then(() => {
            apiRequest({
                method: "POST",
                endpoint: "/v1/share",
                data
            }).then((response) => {
                shareSemaphore.release()

                if(!response.status){
                    return reject(response.message)
                }
    
                return resolve()
            }).catch((err) => {
                shareSemaphore.release()

                return reject(err)
            })
        }).catch(reject)
    })
}

export const isSharingItem = ({ uuid }) => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/user/shared/item/status",
            data: {
                apiKey: getAPIKey(),
                uuid
            }
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve({
                sharing: (response.data.sharing ? true : false),
                users: response.data.users
            })
        }).catch(reject)
    })
}

export const isItemInPublicLink = ({ uuid }) => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/link/dir/item/status",
            data: {
                apiKey: getAPIKey(),
                uuid
            }
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve({
                linking: (response.data.link ? true : false),
                links: response.data.links
            })
        }).catch(reject)
    })
}

export const renameItemInPublicLink = ({ data }) => {
    return new Promise((resolve, reject) => {
        shareSemaphore.acquire().then(() => {
            apiRequest({
                method: "POST",
                endpoint: "/v1/link/dir/item/rename",
                data
            }).then((response) => {
                shareSemaphore.release()

                if(!response.status){
                    return reject(response.message)
                }
    
                return resolve()
            }).catch((err) => {
                shareSemaphore.release()

                return reject(err)
            }).catch(reject)
        })
    })
}

export const renameSharedItem = ({ data }) => {
    return new Promise((resolve, reject) => {
        shareSemaphore.acquire().then(() => {
            apiRequest({
                method: "POST",
                endpoint: "/v1/user/shared/item/rename",
                data
            }).then((response) => {
                shareSemaphore.release()

                if(!response.status){
                    return reject(response.message)
                }
    
                return resolve()
            }).catch((err) => {
                shareSemaphore.release()

                return reject(err)
            })
        }).catch(reject)
    })
}

export const checkIfItemParentIsShared = ({ type, parent, metaData }) => {
    return new Promise((resolve, reject) => {
        let shareCheckDone = false
        let linkCheckDone = false
        let resolved = false
        let doneInterval = undefined
        const apiKey = getAPIKey()
        const masterKeys = getMasterKeys()

        const done = () => {
            if(shareCheckDone && linkCheckDone){
                clearInterval(doneInterval)

                if(!resolved){
                    resolved = true

                    resolve()
                }

                return true
            }

            return false
        }

        doneInterval = setInterval(done, 100)

        isSharingFolder({ uuid: parent }).then((data) => {
            if(!data.sharing){
                shareCheckDone = true

                return done()
            }

            const totalUsers = data.users.length

            if(type == "file"){
                let doneUsers = 0

                const doneSharing = () => {
                    doneUsers += 1

                    if(doneUsers >= totalUsers){
                        shareCheckDone = true

                        done()
                    }

                    return true
                }

                for(let i = 0; i < totalUsers; i++){
                    const user = data.users[i]
                    const itemMetadata = JSON.stringify({
                        name: metaData.name,
                        size: metaData.size,
                        mime: metaData.mime,
                        key: metaData.key,
                        lastModified: metaData.lastModified
                    })

                    global.nodeThread.encryptMetadataPublicKey({ data: itemMetadata, publicKey: user.publicKey }).then((encrypted) => {
                        shareItem({
                            data: {
                                apiKey,
                                uuid: metaData.uuid,
                                parent,
                                email: user.email,
                                type,
                                metadata: encrypted
                            }
                        }).then(() => {
                            return doneSharing()
                        }).catch((err) => {
                            console.log(err)
    
                            return doneSharing()
                        })
                    }).catch((err) => {
                        console.log(err)
    
                        return doneSharing()
                    })
                }
            }
            else{
                getFolderContents({ uuid: metaData.uuid }).then(async (contents) => {
                    const itemsToShare = []

                    itemsToShare.push({
                        uuid: metaData.uuid,
                        parent,
                        metadata: metaData.name,
                        type: "folder"
                    })

                    const files = contents.files
                    const folders = contents.folders

                    for(let i = 0; i < files.length; i++){
                        try{
                            var decrypted = await decryptFileMetadata(masterKeys, files[i].metadata, files[i].uuid)
                        }
                        catch(e){
                            //console.log(e)
                        }

                        if(typeof decrypted == "object"){
                            if(typeof decrypted.name == "string"){
                                if(decrypted.name.length > 0){
                                    itemsToShare.push({
                                        uuid: files[i].uuid,
                                        parent: files[i].parent,
                                        metadata: {
                                            name: decrypted.name,
                                            size: decrypted.size,
                                            mime: decrypted.mime,
                                            key: decrypted.key,
                                            lastModified: decrypted.lastModified
                                        },
                                        type: "file"
                                    })
                                }
                            }
                        }
                    }

                    for(let i = 0; i < folders.length; i++){
                        try{
                            var decrypted = await decryptFolderName(masterKeys, folders[i].name, folders[i].uuid)
                        }
                        catch(e){
                            //console.log(e)
                        }

                        if(typeof decrypted == "string"){
                            if(decrypted.length > 0){
                                if(folders[i].uuid !== metaData.uuid && folders[i].parent !== "base"){
                                    itemsToShare.push({
                                        uuid: folders[i].uuid,
                                        parent: (i == 0 ? "none" : folders[i].parent),
                                        metadata: decrypted,
                                        type: "folder"
                                    })
                                }
                            }
                        }
                    }

                    let itemsShared = 0

                    const doneSharingItem = () => {
                        itemsShared += 1

                        if(itemsShared >= (itemsToShare.length * totalUsers)){
                            shareCheckDone = true

                            done()
                        }

                        return true
                    }

                    for(let i = 0; i < itemsToShare.length; i++){
                        const itemToShare = itemsToShare[i]

                        for(let x = 0; x < totalUsers; x++){
                            const user = data.users[x]
                            let itemMetadata = ""

                            if(itemToShare.type == "file"){
                                itemMetadata = JSON.stringify({
				    				name: itemToShare.metadata.name,
				    				size: itemToShare.metadata.size,
				    				mime: itemToShare.metadata.mime,
				    				key: itemToShare.metadata.key,
									lastModified: itemToShare.metadata.lastModified
				    			})
                            }
                            else{
                                itemMetadata = JSON.stringify({
									name: itemToShare.metadata
								})
                            }

                            global.nodeThread.encryptMetadataPublicKey({ data: itemMetadata, publicKey: user.publicKey }).then((encrypted) => {
                                shareItem({
                                    data: {
                                        apiKey,
                                        uuid: itemToShare.uuid,
                                        parent: itemToShare.parent,
                                        email: user.email,
                                        type: itemToShare.type,
                                        metadata: encrypted
                                    }
                                }).then(() => {
                                    return doneSharingItem()
                                }).catch((err) => {
                                    console.log(err)
            
                                    return doneSharingItem()
                                })
                            }).catch((err) => {
                                console.log(err)
            
                                return doneSharingItem()
                            })
                        }
                    }
                }).catch((err) => {
                    console.log(err)

                    shareCheckDone = true

                    return done()
                })
            }
        }).catch((err) => {
            console.log(err)

            shareCheckDone = true

            return done()
        })

        isPublicLinkingFolder({ uuid: parent }).then(async (data) => {
            if(!data.linking){
                linkCheckDone = true

                return done()
            }

            const totalLinks = data.links.length

            if(type == "file"){
                let linksDone = 0

                const doneLinking = () => {
                    linksDone += 1

                    if(linksDone >= totalLinks){
                        linkCheckDone = true

                        done()
                    }

                    return true
                }

                for(let i = 0; i < totalLinks; i++){
                    const link = data.links[i]

                    try{
                        var key = await decryptFolderLinkKey(masterKeys, link.linkKey)
                    }
                    catch(e){
                        //console.log(e)
                    }

                    if(typeof key == "string"){
                        if(key.length > 0){
                            try{
                                var encrypted = await encryptMetadata(JSON.stringify({
                                    name: metaData.name,
                                    size: metaData.size,
                                    mime: metaData.mime,
                                    key: metaData.key,
                                    lastModified: metaData.lastModified
                                }), key)
                            }
                            catch(e){
                                //console.log(e)
                            }

                            if(typeof encrypted == "string"){
                                if(encrypted.length > 0){
                                    addItemToPublicLink({
                                        data: {
                                            apiKey,
                                            uuid: metaData.uuid,
                                            parent,
                                            linkUUID: link.linkUUID,
                                            type,
                                            metadata: encrypted,
                                            key: link.linkKey,
                                            expiration: "never",
                                            password: "empty",
                                            passwordHashed: "8f83dfba6522ce8c34c5afefa64878e3a4ac554d", //hashFn("empty")
                                            downloadBtn: "enable"
                                        }
                                    }).then(() => {
                                        return doneLinking()
                                    }).catch((err) => {
                                        console.log(err)

                                        return doneLinking()
                                    })
                                }
                                else{
                                    doneLinking()
                                }
                            }
                            else{
                                doneLinking()
                            }
                        }
                        else{
                            doneLinking()
                        }
                    }
                    else{
                        doneLinking()
                    }
                }
            }
            else{
                getFolderContents({ uuid: metaData.uuid }).then(async (contents) => {
                    const itemsToLink = []

                    itemsToLink.push({
                        uuid: metaData.uuid,
                        parent,
                        metadata: metaData.name,
                        type: "folder"
                    })

                    const files = contents.files
                    const folders = contents.folders

                    for(let i = 0; i < files.length; i++){
                        try{
                            var decrypted = await decryptFileMetadata(masterKeys, files[i].metadata, files[i].uuid)
                        }
                        catch(e){
                            //console.log(e)
                        }

                        if(typeof decrypted == "object"){
                            if(typeof decrypted.name == "string"){
                                if(decrypted.name.length > 0){
                                    itemsToLink.push({
                                        uuid: files[i].uuid,
                                        parent: files[i].parent,
                                        metadata: {
                                            name: decrypted.name,
                                            size: decrypted.size,
                                            mime: decrypted.mime,
                                            key: decrypted.key,
                                            lastModified: decrypted.lastModified
                                        },
                                        type: "file"
                                    })
                                }
                            }
                        }
                    }

                    for(let i = 0; i < folders.length; i++){
                        try{
                            var decrypted = await decryptFolderName(masterKeys, folders[i].name, folders[i].uuid)
                        }
                        catch(e){
                            //console.log(e)
                        }

                        if(typeof decrypted == "string"){
                            if(decrypted.length > 0){
                                if(folders[i].uuid !== metaData.uuid && folders[i].parent !== "base"){
                                    itemsToLink.push({
                                        uuid: folders[i].uuid,
                                        parent: (i == 0 ? "none" : folders[i].parent),
                                        metadata: decrypted,
                                        type: "folder"
                                    })
                                }
                            }
                        }
                    }

                    let itemsLinked = 0

                    const itemLinked = () => {
                        itemsLinked += 1

                        if(itemsLinked >= (itemsToLink.length * totalLinks)){
                            linkCheckDone = true

                            done()
                        }

                        return true
                    }

                    for(let i = 0; i < itemsToLink.length; i++){
                        const itemToLink = itemsToLink[i]

                        for(let x = 0; x < totalLinks; x++){
                            const link = data.links[x]

                            try{
                                var key = await decryptFolderLinkKey(masterKeys, link.linkKey)
                            }
                            catch(e){
                                //console.log(e)
                            }

                            if(typeof key == "string"){
                                if(key.length > 0){
                                    let itemMetadata = ""

                                    if(itemToLink.type == "file"){
                                        itemMetadata = JSON.stringify({
                                            name: itemToLink.metadata.name,
                                            size: itemToLink.metadata.size,
                                            mime: itemToLink.metadata.mime,
                                            key: itemToLink.metadata.key,
                                            lastModified: itemToLink.metadata.lastModified
                                        })
                                    }
                                    else{
                                        itemMetadata = JSON.stringify({
                                            name: itemToLink.metadata
                                        })
                                    }

                                    try{
                                        var encrypted = await encryptMetadata(itemMetadata, key)
                                    }
                                    catch(e){
                                        //console.log(e)
                                    }

                                    if(typeof encrypted == "string"){
                                        if(encrypted.length > 0){
                                            addItemToPublicLink({
                                                data: {
                                                    apiKey,
                                                    uuid: itemToLink.uuid,
                                                    parent: itemToLink.parent,
                                                    linkUUID: link.linkUUID,
                                                    type: itemToLink.type,
                                                    metadata: encrypted,
                                                    key: link.linkKey,
                                                    expiration: "never",
                                                    password: "empty",
                                                    passwordHashed: "8f83dfba6522ce8c34c5afefa64878e3a4ac554d", //hashFn("empty")
                                                    downloadBtn: "enable"
                                                }
                                            }).then(() => {
                                                return itemLinked()
                                            }).catch((err) => {
                                                console.log(err)

                                                return itemLinked()
                                            })
                                        }
                                        else{
                                            itemLinked()
                                        }
                                    }
                                    else{
                                        itemLinked()
                                    }
                                }
                                else{
                                    itemLinked()
                                }
                            }
                            else{
                                itemLinked()
                            }
                        }
                    }
                }).catch((err) => {
                    console.log(err)

                    linkCheckDone = true

                    return done()
                })
            }
        }).catch((err) => {
            console.log(err)

            linkCheckDone = true

            return done()
        })
    })
}

export const checkIfItemIsSharedForRename = ({ type, uuid, metaData }) => {
    return new Promise((resolve, reject) => {
        let shareCheckDone = false
        let linkCheckDone = false
        let resolved = false
        let doneInterval = undefined
        const apiKey = getAPIKey()
        const masterKeys = getMasterKeys()

        const done = () => {
            if(shareCheckDone && linkCheckDone){
                clearInterval(doneInterval)

                if(!resolved){
                    resolved = true

                    resolve()
                }

                return true
            }

            return false
        }

        doneInterval = setInterval(done, 100)

        isSharingItem({ uuid }).then((data) => {
            if(!data.sharing){
                shareCheckDone = true

                return done()
            }

            const totalUsers = data.users.length
            let doneUsers = 0

            const doneSharing = () => {
                doneUsers += 1

                if(doneUsers >= totalUsers){
                    shareCheckDone = true

                    done()
                }

                return true
            }

            for(let i = 0; i < totalUsers; i++){
                const user = data.users[i]
                let itemMetadata = ""

                if(type == "file"){
                    itemMetadata = JSON.stringify({
                        name: metaData.name,
                        size: metaData.size,
                        mime: metaData.mime,
                        key: metaData.key,
                        lastModified: metaData.lastModified
                    })
                }
                else{
                    itemMetadata = JSON.stringify({
                        name: metaData.name
                    })
                }

                global.nodeThread.encryptMetadataPublicKey({ data: itemMetadata, publicKey: user.publicKey }).then((encrypted) => {
                    renameSharedItem({
                        data: {
                            apiKey,
                            uuid,
                            receiverId: user.id,
                            metadata: encrypted
                        }
                    }).then(() => {
                        return doneSharing()
                    }).catch((err) => {
                        console.log(err)

                        return doneSharing()
                    })
                }).catch((err) => {
                    console.log(err)

                    return doneSharing()
                })
            }
        }).catch((err) => {
            console.log(err)

            shareCheckDone = true

            return done()
        })

        isItemInPublicLink({ uuid }).then((data) => {
            if(!data.linking){
                linkCheckDone = true

                return done()
            }

            const totalLinks = data.links.length
            let linksDone = 0

            const doneLinking = () => {
                linksDone += 1

                if(linksDone >= totalLinks){
                    linkCheckDone = true

                    done()
                }

                return true
            }

            for(let i = 0; i < totalLinks; i++){
                const link = data.links[i]

                decryptFolderLinkKey(masterKeys, link.linkKey).then((key) => {
                    let itemMetadata = ""

                    if(type == "file"){
                        itemMetadata = JSON.stringify({
                            name: metaData.name,
                            size: metaData.size,
                            mime: metaData.mime,
                            key: metaData.key,
                            lastModified: metaData.lastModified
                        })
                    }
                    else{
                        itemMetadata = JSON.stringify({
                            name: metaData.name
                        })
                    }

                    encryptMetadata(itemMetadata, key).then((encrypted) => {
                        renameItemInPublicLink({
                            data: {
                                apiKey,
                                uuid,
                                linkUUID: link.linkUUID,
                                metadata: encrypted
                            }
                        }).then(() => {
                            return doneLinking()
                        }).catch((err) => {
                            console.log(err)

                            return doneLinking()
                        })
                    }).catch((err) => {
                        console.log(err)

                        return doneLinking()
                    })
                }).catch((err) => {
                    console.log(err)

                    return doneLinking()
                })
            }
        }).catch((err) => {
            console.log(err)

            linkCheckDone = true

            return done()
        })
    })
}

export const renameFile = ({ file, name }) => {
    return new Promise((resolve, reject) => {
        global.nodeThread.hashFn({ string: name.toLowerCase() }).then((nameHashed) => {
            const masterKeys = getMasterKeys()

            Promise.all([
                encryptMetadata(JSON.stringify({
                    name,
                    size: file.size,
                    mime: file.mime,
                    key: file.key,
                    lastModified: file.lastModified
                }), masterKeys[masterKeys.length - 1]),
                encryptMetadata(name, masterKeys[masterKeys.length - 1])
            ]).then(([encrypted, encryptedName]) => {
                apiRequest({
                    method: "POST",
                    endpoint: "/v1/file/rename",
                    data: {
                        apiKey: getAPIKey(),
                        uuid: file.uuid,
                        name: encryptedName,
                        nameHashed,
                        metaData: encrypted
                    }
                }).then((response) => {
                    if(!response.status){
                        return reject(response.message)
                    }
        
                    checkIfItemIsSharedForRename({
                        type: "file",
                        uuid: file.uuid,
                        metaData: {
                            name,
                            size: file.size,
                            mime: file.mime,
                            key: file.key,
                            lastModified: file.lastModified
                        }
                    }).then(() => {
                        updateLoadItemsCache({
                            item: file,
                            prop: "name",
                            value: name
                        }).then(() => {
                            return resolve()
                        })
                    }).catch(reject)
                }).catch(reject)
            }).catch(reject)
        }).catch(reject)
    })
}

export const renameFolder = ({ folder, name }) => {
    return new Promise((resolve, reject) => {
        global.nodeThread.hashFn({ string: name.toLowerCase() }).then((nameHashed) => {
            const masterKeys = getMasterKeys()

            encryptMetadata(JSON.stringify({ name }), masterKeys[masterKeys.length - 1]).then((encrypted) => {
                apiRequest({
                    method: "POST",
                    endpoint: "/v1/dir/rename",
                    data: {
                        apiKey: getAPIKey(),
                        uuid: folder.uuid,
                        name: encrypted,
                        nameHashed
                    }
                }).then((response) => {
                    if(!response.status){
                        return reject(response.message)
                    }
        
                    checkIfItemIsSharedForRename({
                        type: "folder",
                        uuid: folder.uuid,
                        metaData: {
                            name
                        }
                    }).then(() => {
                        updateLoadItemsCache({
                            item: folder,
                            prop: "name",
                            value: name
                        }).then(() => {
                            return resolve()
                        })
                    }).catch(reject)
                }).catch(reject)
            }).catch(reject)
        }).catch(reject)
    })
}

export const createFolder = ({ name, parent }) => {
    return new Promise((resolve, reject) => {
        global.nodeThread.hashFn({ string: name.toLowerCase() }).then((nameHashed) => {
            global.nodeThread.uuidv4().then((uuid) => {
                const masterKeys = getMasterKeys()

                encryptMetadata(JSON.stringify({ name }), masterKeys[masterKeys.length - 1]).then((encrypted) => {
                    apiRequest({
                        method: "POST",
                        endpoint: (parent == "base" ? "/v1/dir/create" : "/v1/dir/sub/create"),
                        data: {
                            apiKey: getAPIKey(),
                            uuid,
                            name: encrypted,
                            nameHashed,
                            parent
                        }
                    }).then((response) => {
                        if(!response.status){
                            return reject(response.message)
                        }
        
                        if(parent == "base"){
                            return resolve(uuid)
                        }

                        checkIfItemParentIsShared({
                            type: "folder",
                            parent,
                            metaData: {
                                uuid,
                                name
                            }
                        }).then(() => {
                            return resolve(uuid)
                        }).catch(reject)
                    }).catch(reject)
                }).catch(reject)
            }).catch(reject)
        }).catch(reject)
    })
}

export const moveFile = ({ file, parent }) => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/file/move",
            data: {
                apiKey: getAPIKey(),
                fileUUID: file.uuid,
                folderUUID: parent
            }
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            checkIfItemParentIsShared({
                type: "file",
                parent,
                metaData: {
                    uuid: file.uuid,
                    name: file.name,
                    size: file.size,
                    mime: file.mime,
                    key: file.key,
                    lastModified: file.lastModified
                }
            }).then(() => {
                return resolve()
            }).catch(reject)
        }).catch(reject)
    })
}

export const moveFolder = ({ folder, parent }) => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/dir/move",
            data: {
                apiKey: getAPIKey(),
                uuid: folder.uuid,
                folderUUID: parent
            }
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            checkIfItemParentIsShared({
                type: "folder",
                parent,
                metaData: {
                    name: folder.name,
                    uuid: folder.uuid
                }
            }).then(() => {
                return resolve()
            }).catch(reject)
        }).catch(reject)
    })
}

export const changeFolderColor = ({ folder, color }) => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/dir/color/change",
            data: {
                apiKey: getAPIKey(),
                uuid: folder.uuid,
                color
            }
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            updateLoadItemsCache({
                item: folder,
                prop: "color",
                value: color
            }).then(() => {
                return resolve()
            }).catch(reject)
        }).catch(reject)
    })
}

export const favoriteItem = ({ item, value }) => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/item/favorite",
            data: {
                apiKey: getAPIKey(),
                uuid: item.uuid,
                type: item.type,
                value
            }
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            DeviceEventEmitter.emit("event", {
                type: "mark-item-favorite",
                data: {
                    uuid: item.uuid,
                    value: value == 1 ? true : false
                }
            })

            updateLoadItemsCache({
                item,
                prop: "favorited",
                value
            }).then(() => {
                return resolve()
            })
        }).catch(reject)
    })
}

export const itemPublicLinkInfo = ({ item }) => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: (item.type == "file" ? "/v1/link/status" : "/v1/dir/link/status"),
            data: (item.type == "file" ? {
                apiKey: getAPIKey(),
                fileUUID: item.uuid
            } : {
                apiKey: getAPIKey(),
                uuid: item.uuid
            })
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve(response.data)
        }).catch(reject)
    })
}

export const editItemPublicLink = ({ item, type, linkUUID, expires, password, downloadBtn, progressCallback, isEdit = false }) => {
    return new Promise((resolve, reject) => {
        const pass = (password.length > 0 ? "notempty" : "empty")
        const passH = (password.length > 0 ? password : "empty")
        
        global.nodeThread.uuidv4().then((uuid) => {
            if(typeof linkUUID !== "string"){
                linkUUID = uuid
            }
            else{
                if(linkUUID.length == 0){
                    linkUUID = uuid
                }
            }

            global.nodeThread.generateRandomString({ charLength: 32 }).then((salt) => {
                global.nodeThread.deriveKeyFromPassword({ password: passH, salt, iterations: 200000, hash: "SHA-512", bitLength: 512, returnHex: true }).then((passwordHashed) => {
                    if(item.type == "file"){
                        apiRequest({
                            method: "POST",
                            endpoint: "/v1/link/edit",
                            data: {
                                apiKey: getAPIKey(),
                                uuid: linkUUID,
                                fileUUID: item.uuid,
                                expiration: expires,
                                password: pass,
                                passwordHashed,
                                salt, 
                                downloadBtn,
                                type: (type ? "enable" : "disable")
                            }
                        }).then((response) => {
                            if(!response.status){
                                return reject(response.message)
                            }
                
                            return resolve(linkUUID)
                        }).catch(reject)
                    }
                    else{
                        if(type){
                            if(isEdit){
                                apiRequest({
                                    method: "POST",
                                    endpoint: "/v1/dir/link/edit",
                                    data: {
                                        apiKey: getAPIKey(),
                                        uuid: item.uuid,
                                        expiration: expires,
                                        password: pass,
                                        passwordHashed,
                                        salt, 
                                        downloadBtn
                                    }
                                }).then((response) => {
                                    if(!response.status){
                                        return reject(response.message)
                                    }
                        
                                    return resolve(linkUUID)
                                }).catch(reject)
                            }
                            else{
                                createFolderPublicLink({ item, progressCallback }).then((data) => {
                                    return resolve(data)
                                }).catch(reject)
                            }
                        }
                        else{
                            apiRequest({
                                method: "POST",
                                endpoint: "/v1/dir/link/remove",
                                data: {
                                    apiKey: getAPIKey(),
                                    uuid: item.uuid
                                }
                            }).then((response) => {
                                if(!response.status){
                                    return reject(response.message)
                                }
                    
                                return resolve(linkUUID)
                            }).catch(reject)
                        }
                    }
                }).catch(reject)
            }).catch(reject)
        }).catch(reject)
    })
}

export const addItemToFolderPublicLink = ({ data }) => {
    return new Promise((resolve, reject) => {
        shareSemaphore.acquire().then(() => {
            apiRequest({
                method: "POST",
                endpoint: "/v1/dir/link/add",
                data
            }).then((response) => {
                shareSemaphore.release()

                if(!response.status){
                    return reject(response.message)
                }
    
                return resolve()
            }).catch((err) => {
                shareSemaphore.release()

                return reject(err)
            })
        }).catch(reject)
    })
}

export const createFolderPublicLink = ({ item, progressCallback }) => {
    return new Promise((resolve, reject) => {
        getFolderContents({ uuid: item.uuid }).then((contents) => {
            global.nodeThread.generateRandomString({ charLength: 32 }).then((key) => {
                const masterKeys = getMasterKeys()

                encryptMetadata(key, masterKeys[masterKeys.length - 1]).then((encryptedKey) => {
                    global.nodeThread.uuidv4().then((linkUUID) => {
                        const folders = contents.folders
                        const files = contents.files
                        const totalItems = (folders.length + files.length)
                        let doneItems = 0

                        const itemAdded = () => {
                            doneItems += 1

                            if(typeof progressCallback == "function"){
                                progressCallback(doneItems, totalItems)
                            }

                            if(doneItems >= totalItems){
                                resolve({
                                    linkUUID,
                                    linkKey: key
                                })
                            }

                            return true
                        }

                        const addItem = (itemType, itemToAdd) => {
                            let itemMetadata = ""

                            if(itemType == "file"){
                                itemMetadata = JSON.stringify({
                                    name: itemToAdd.name,
                                    mime: itemToAdd.mime,
                                    key: itemToAdd.key,
                                    size: itemToAdd.size,
                                    lastModified: itemToAdd.lastModified
                                })
                            }
                            else{
                                itemMetadata = JSON.stringify({
                                    name: itemToAdd.name
                                })
                            }

                            encryptMetadata(itemMetadata, key).then((encrypted) => {
                                addItemToFolderPublicLink({
                                    data: {
                                        apiKey: getAPIKey(),
                                        uuid: itemToAdd.uuid,
                                        parent: itemToAdd.parent,
                                        linkUUID,
                                        type: itemType,
                                        metadata: encrypted,
                                        key: encryptedKey,
                                        expiration: "never",
                                        password: "empty",
                                        passwordHashed: "8f83dfba6522ce8c34c5afefa64878e3a4ac554d", //hashFn("empty")
                                        downloadBtn: "enable"
                                    }
                                }).then(() => {
                                    itemAdded()
                                }).catch((err) => {
                                    console.log(err)

                                    itemAdded()
                                })
                            }).catch(() => {
                                console.log(err)

                                itemAdded()
                            })
                        }

                        for(let i = 0; i < folders.length; i++){
                            const folder = folders[i]

                            decryptFolderName(masterKeys, folder.name, folder.uuid).then((decrypted) => {
                                addItem("folder", {
                                    uuid: folder.uuid,
                                    parent: folder.parent,
                                    name: decrypted
                                })
                            }).catch((err) => {
                                console.log(err)

                                itemAdded()
                            })
                        }

                        for(let i = 0; i < files.length; i++){
                            const file = files[i]

                            decryptFileMetadata(masterKeys, file.metadata, file.uuid).then((decrypted) => {
                                addItem("file", {
                                    uuid: file.uuid,
                                    parent: file.parent,
                                    name: decrypted.name,
                                    mime: decrypted.mime,
                                    key: decrypted.key,
                                    size: decrypted.size,
                                    lastModified: decrypted.lastModified
                                })
                            }).catch((err) => {
                                console.log(err)

                                itemAdded()
                            })
                        }
                    }).catch(reject)
                }).catch(reject)
            }).catch(reject)
        }).catch(reject)
    })
}

export const getPublicKeyFromEmail = ({ email }) => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/user/publicKey/get",
            data: {
                email
            }
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve(response.data.publicKey)
        }).catch(reject)
    })
}

export const shareItemToUser = ({ item, email, publicKey, progressCallback }) => {
    return new Promise((resolve, reject) => {
        const apiKey = getAPIKey()

        if(item.type == "file"){
            global.nodeThread.encryptMetadataPublicKey({
                data: JSON.stringify({
                    name: item.name,
                    size: item.size,
                    mime: item.mime,
                    key: item.key,
                    lastModified: item.lastModified
                }),
                publicKey
            }).then((encrypted) => {
                shareItem({
                    data: {
                        apiKey,
                        uuid: item.uuid,
                        parent: "none",
                        email,
                        type: "file",
                        metadata: encrypted
                    }
                }).then(() => {
                    return resolve()
                }).catch(reject)
            }).catch(reject)
        }
        else{
            getFolderContents({ uuid: item.uuid }).then((contents) => {
                const masterKeys = getMasterKeys()
                const folders = contents.folders
                const files = contents.files
                const totalItems = (folders.length + files.length)
                let doneItems = 0

                const itemShared = () => {
                    doneItems += 1

                    if(typeof progressCallback == "function"){
                        progressCallback(doneItems, totalItems)
                    }

                    if(doneItems >= totalItems){
                        resolve()
                    }

                    return true
                }

                const shareItemRequest = (itemType, itemToShare) => {
                    let itemMetadata = ""

                    if(itemType == "file"){
                        itemMetadata = JSON.stringify({
                            name: itemToShare.name,
                            mime: itemToShare.mime,
                            key: itemToShare.key,
                            size: itemToShare.size,
                            lastModified: itemToShare.lastModified
                        })
                    }
                    else{
                        itemMetadata = JSON.stringify({
                            name: itemToShare.name
                        })
                    }

                    global.nodeThread.encryptMetadataPublicKey({
                        data: itemMetadata,
                        publicKey
                    }).then((encrypted) => {
                        shareItem({
                            data: {
                                apiKey,
                                uuid: itemToShare.uuid,
                                parent: itemToShare.parent,
                                email,
                                type: itemType,
                                metadata: encrypted
                            }
                        }).then(() => {
                            itemShared()
                        }).catch((err) => {
                            console.log(err)

                            itemShared()
                        })
                    }).catch(() => {
                        console.log(err)

                        itemShared()
                    })
                }

                for(let i = 0; i < folders.length; i++){
                    const folder = folders[i]
                    const index = i

                    decryptFolderName(masterKeys, folder.name, folder.uuid).then((decrypted) => {
                        shareItemRequest("folder", {
                            uuid: folder.uuid,
                            parent: (index == 0 ? "none" : folder.parent),
                            name: decrypted
                        })
                    }).catch((err) => {
                        console.log(err)

                        itemShared()
                    })
                }

                for(let i = 0; i < files.length; i++){
                    const file = files[i]

                    decryptFileMetadata(masterKeys, file.metadata, file.uuid).then((decrypted) => {
                        shareItemRequest("file", {
                            uuid: file.uuid,
                            parent: file.parent,
                            name: decrypted.name,
                            mime: decrypted.mime,
                            key: decrypted.key,
                            size: decrypted.size,
                            lastModified: decrypted.lastModified
                        })
                    }).catch((err) => {
                        console.log(err)

                        itemShared()
                    })
                }
            }).catch(reject)
        }
    })
}

export const trashItem = ({ item }) => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: item.type == "folder" ? "/v1/dir/trash" : "/v1/file/trash",
            data: {
                apiKey: getAPIKey(),
                uuid: item.uuid
            }
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            removeLoadItemsCache({
                item
            }).then(() => {
                DeviceEventEmitter.emit("event", {
                    type: "remove-item",
                    data: {
                        uuid: item.uuid
                    }
                })

                return resolve()
            })
        }).catch(reject)
    })
}

export const restoreItem = ({ item }) => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: item.type == "folder" ? "/v1/dir/restore" : "/v1/file/restore",
            data: {
                apiKey: getAPIKey(),
                uuid: item.uuid
            }
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            removeLoadItemsCache({
                item,
                routeURL: "trash"
            }).then(() => {
                clearLoadItemsCacheLastResponse().then(() => {
                    return resolve()
                })
            })
        }).catch(reject)
    })
}

export const deleteItemPermanently = ({ item }) => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: item.type == "folder" ? "/v1/dir/delete/permanent" : "/v1/file/delete/permanent",
            data: {
                apiKey: getAPIKey(),
                uuid: item.uuid
            }
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            removeLoadItemsCache({
                item
            }).then(() => {
                DeviceEventEmitter.emit("event", {
                    type: "remove-item",
                    data: {
                        uuid: item.uuid
                    }
                })

                return resolve()
            })
        }).catch(reject)
    })
}

export const stopSharingItem = ({ item }) => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/user/shared/item/out/remove",
            data: {
                apiKey: getAPIKey(),
                uuid: item.uuid,
                receiverId: item.receiverId
            }
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            removeLoadItemsCache({
                item,
                routeURL: "shared-out"
            }).then(() => {
                DeviceEventEmitter.emit("event", {
                    type: "remove-item",
                    data: {
                        uuid: item.uuid
                    }
                })

                return resolve()
            })
        }).catch(reject)
    })
}

export const removeSharedInItem = ({ item }) => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/user/shared/item/in/remove",
            data: {
                apiKey: getAPIKey(),
                uuid: item.uuid,
                receiverId: 0
            }
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            removeLoadItemsCache({
                item,
                routeURL: "shared-in"
            }).then(() => {
                DeviceEventEmitter.emit("event", {
                    type: "remove-item",
                    data: {
                        uuid: item.uuid
                    }
                })

                return resolve()
            })
        }).catch(reject)  
    })
}

export const fetchFileVersionData = ({ file }) => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/file/versions",
            data: {
                apiKey: getAPIKey(),
                uuid: file.uuid
            }
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve(response.data.versions)
        }).catch(reject)  
    })
}

export const restoreArchivedFile = ({ uuid, currentUUID }) => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/file/archive/restore",
            data: {
                apiKey: getAPIKey(),
                uuid,
                currentUUID
            }
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve()
        }).catch(reject)  
    })
}

export const fetchOfflineFilesInfo = ({ files }) => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/mobile/offline/files/fetch",
            data: {
                apiKey: getAPIKey(),
                files: JSON.stringify(files)
            }
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve(response.data.info)
        }).catch(reject)  
    })
}

export const fetchEvents = ({ lastId = 0, filter = "all" }) => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/user/events",
            data: {
                apiKey: getAPIKey(),
                filter,
                id: parseInt(lastId)
            }
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve({
                events: response.data.events,
                limit: response.data.limit
            })
        }).catch(reject)  
    })
}

export const fetchEventInfo = ({ uuid }) => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/user/events/get",
            data: {
                apiKey: getAPIKey(),
                uuid
            }
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve(response.data)
        }).catch(reject)  
    })
}

export const fetchFolderSize = ({ folder, routeURL }) => {
    return new Promise((resolve, reject) => {
        let payload = {}

        if(routeURL.indexOf("shared-out") !== -1){
            payload = {
                apiKey: getAPIKey(),
                uuid: folder.uuid,
                sharerId: folder.sharerId || 0,
                receiverId: folder.receiverId || 0
            }
        }
        else if(routeURL.indexOf("shared-in") !== -1){
            payload = {
                apiKey: getAPIKey(),
                uuid: folder.uuid,
                sharerId: folder.sharerId || 0,
                receiverId: folder.receiverId || 0
            }
        }
        else if(routeURL.indexOf("trash") !== -1){
            payload = {
                apiKey: getAPIKey(),
                uuid: folder.uuid,
                sharerId: 0,
                receiverId: 0,
                trash: 1
            }
        }
        else{
            payload = {
                apiKey: getAPIKey(),
                uuid: folder.uuid,
                sharerId: 0,
                receiverId: 0
            }
        }

        apiRequest({
            method: "POST",
            endpoint: "/v1/dir/size",
            data: payload
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve(response.data.size)
        }).catch(reject)  
    })
}

export const deleteAllFilesAndFolders = () => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/user/delete/all",
            data: {
                apiKey: getAPIKey()
            }
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve()
        }).catch(reject)  
    })
}

export const deleteAllVersionedFiles = () => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/user/versions/delete",
            data: {
                apiKey: getAPIKey()
            }
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve()
        }).catch(reject)  
    })
}

export const deleteAccount = ({ twoFactorKey = "XXXXXX" }) => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/user/account/delete",
            data: {
                apiKey: getAPIKey(),
                twoFactorKey
            }
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve()
        }).catch(reject)  
    })
}

export const redeemCode = ({ code }) => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/user/code/redeem",
            data: {
                apiKey: getAPIKey(),
                code
            }
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve()
        }).catch(reject)  
    })
}

export const fetchGDPRInfo = () => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/user/gdpr/download",
            data: {
                apiKey: getAPIKey()
            }
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve(response.data)
        }).catch(reject)  
    })
}

export const getAccount = () => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/user/get/account",
            data: {
                apiKey: getAPIKey()
            }
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve(response.data)
        }).catch(reject)  
    })
}

export const getSettings = () => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/user/get/settings",
            data: {
                apiKey: getAPIKey()
            }
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve(response.data)
        }).catch(reject)  
    })
}

export const enable2FA = ({ code = "XXXXXX" }) => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/user/settings/2fa/enable",
            data: {
                apiKey: getAPIKey(),
                code
            }
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve()
        }).catch(reject)  
    })
}

export const disable2FA = ({ code = "XXXXXX" }) => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/user/settings/2fa/disable",
            data: {
                apiKey: getAPIKey(),
                code
            }
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve()
        }).catch(reject)  
    })
}

export const getAuthInfo = ({ email }) => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/auth/info",
            data: {
                email
            }
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve({
                authVersion: response.data.authVersion,
                salt: response.data.salt
            })
        }).catch(reject)  
    })
}

export const changeEmail = ({ email, emailRepeat, password, authVersion }) => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/user/settings/email/change",
            data: {
                apiKey: getAPIKey(),
                email,
                emailRepeat,
                password,
                authVersion
            }
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve()
        }).catch(reject)  
    })
}

export const changePassword = ({ password, passwordRepeat, currentPassword, authVersion, salt, masterKeys }) => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/user/settings/password/change",
            data: {
                apiKey: getAPIKey(),
                password,
                passwordRepeat,
                currentPassword,
                authVersion,
                salt,
                masterKeys
            }
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve(response.data)
        }).catch(reject)  
    })
}

export const fetchAllStoredItems = ({ lastLength = 0, filesOnly, maxSize, includeTrash, includeVersioned  }) => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/user/get/all/index",
            data: {
                apiKey: getAPIKey(),
                lastLength,
                filesOnly: filesOnly ? 1 : 0,
                maxSize: typeof maxSize == "number" ? maxSize : 0,
                includeTrash: includeTrash ? 1 : 0,
                includeVersioned: includeVersioned ? 1 : 0
            }
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve({
                files: response.data.uploads,
                folders: response.data.folders
            })
        }).catch(reject)  
    })
}

export const fetchUserInfo = () => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/user/info",
            data: {
                apiKey: getAPIKey()
            }
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve(response.data)
        }).catch((err) => {
            return reject(err)
        })
    })
}

export const fetchUserUsage = () => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/user/usage",
            data: {
                apiKey: getAPIKey()
            }
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve(response.data)
        }).catch((err) => {
            return reject(err)
        })
    })
}

export const bulkMove = ({ items, parent }) => {
    return new Promise(async (resolve, reject) => {
        for(let i = 0; i < items.length; i++){
            const item = items[i]

            if(item.type == "file"){
                try{
                    let res = await fileExists({
                        name: item.name,
                        parent
                    })

                    if(!res.exists){
                        await moveFile({
                            file: item,
                            parent
                        })
                    }
                }
                catch(e){
                    console.log(e)
                }
            }
            else{
                try{
                    let res = await folderExists({
                        name: item.name,
                        parent
                    })

                    if(!res.exists){
                        await moveFolder({
                            folder: item,
                            parent
                        })
                    }
                }
                catch(e){
                    console.log(e)
                }
            }
        }

        return resolve()
    })
}

export const bulkFavorite = ({ value, items }) => {
    return new Promise(async (resolve, reject) => {
        for(let i = 0; i < items.length; i++){
            const item = items[i]

            if(value !== item.favorited){
                try{
                    await favoriteItem({
                        item,
                        value
                    })
                }
                catch(e){
                    console.log(e)
                }
            }
        }

        return resolve()
    })
}

export const bulkTrash = ({ items }) => {
    return new Promise(async (resolve, reject) => {
        for(let i = 0; i < items.length; i++){
            const item = items[i]

            try{
                await trashItem({ item })
            }
            catch(e){
                console.log(e)
            }
        }

        return resolve()
    })
}

export const bulkShare = ({ email, items }) => {
    return new Promise((resolve, reject) => {
        getPublicKeyFromEmail({ email }).then(async (publicKey) => {
            if(typeof publicKey !== "string"){
                return reject(i18n(storage.getString("lang"), "shareUserNotFound"))
            }

            if(publicKey.length < 16){
                return reject(i18n(storage.getString("lang"), "shareUserNotFound"))
            }

            for(let i = 0; i < items.length; i++){
                const item = items[i]

                try{
                    await shareItemToUser({
                        item,
                        publicKey,
                        email
                    })
                }
                catch(e){
                    console.log(e)
                }
            }

            return resolve()
        }).catch((err) => {
            console.log(err)

            return reject(i18n(storage.getString("lang"), "shareUserNotFound"))
        })
    })
}

export const bulkDeletePermanently = ({ items }) => {
    return new Promise(async (resolve, reject) => {
        for(let i = 0; i < items.length; i++){
            const item = items[i]

            try{
                await deleteItemPermanently({ item })

                DeviceEventEmitter.emit("event", {
                    type: "remove-item",
                    data: {
                        uuid: item.uuid
                    }
                })
            }
            catch(e){
                console.log(e)
            }
        }

        return resolve()
    })
}

export const bulkRestore = ({ items }) => {
    return new Promise(async (resolve, reject) => {
        for(let i = 0; i < items.length; i++){
            const item = items[i]

            if(item.type == "file"){
                try{
                    let res = await fileExists({
                        name: item.name,
                        parent: item.parent
                    })

                    if(!res.exists){
                        await restoreItem({ item })

                        DeviceEventEmitter.emit("event", {
                            type: "remove-item",
                            data: {
                                uuid: item.uuid
                            }
                        })
                    }
                }
                catch(e){
                    console.log(e)
                }
            }
            else{
                try{
                    let res = await folderExists({
                        name: item.name,
                        parent: item.parent
                    })

                    if(!res.exists){
                        await restoreItem({ item })

                        DeviceEventEmitter.emit("event", {
                            type: "remove-item",
                            data: {
                                uuid: item.uuid
                            }
                        })
                    }
                }
                catch(e){
                    console.log(e)
                }
            }
        }

        return resolve()
    })
}

export const bulkStopSharing = ({ items }) => {
    return new Promise(async (resolve, reject) => {
        for(let i = 0; i < items.length; i++){
            const item = items[i]

            try{
                await stopSharingItem({ item })

                DeviceEventEmitter.emit("event", {
                    type: "remove-item",
                    data: {
                        uuid: item.uuid
                    }
                })
            }
            catch(e){
                console.log(e)
            }
        }

        return resolve()
    })
}

export const bulkRemoveSharedIn = ({ items }) => {
    return new Promise(async (resolve, reject) => {
        for(let i = 0; i < items.length; i++){
            const item = items[i]

            try{
                await removeSharedInItem({ item })

                DeviceEventEmitter.emit("event", {
                    type: "remove-item",
                    data: {
                        uuid: item.uuid
                    }
                })
            }
            catch(e){
                console.log(e)
            }
        }

        return resolve()
    })
}

export const folderPresent = ({ uuid }) => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/dir/present",
            data: {
                apiKey: getAPIKey(),
                uuid
            }
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve(response.data)
        }).catch((err) => {
            return reject(err)
        })
    })
}

export const filePresent = ({ uuid }) => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/file/present",
            data: {
                apiKey: getAPIKey(),
                uuid
            }
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve(response.data)
        }).catch((err) => {
            return reject(err)
        })
    })
}

export const emptyTrash = () => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/trash/empty",
            data: {
                apiKey: getAPIKey()
            }
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            emptyTrashLoadItemsCache().then(() => {
                return resolve()
            })
        }).catch((err) => {
            return reject(err)
        })
    })
}

export const getLatestVersion = () => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/currentVersions",
            data: {
                platform: "mobile"
            }
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve(response.data.mobile)
        }).catch((err) => {
            return reject(err)
        })
    })
}

export const reportError = (err = "", info = "") => {
    return new Promise((resolve, reject) => {
        try{
            err = err.toString()
        }
        catch(e){
            err = JSON.stringify({
                error: err
            })
        }

        if(__DEV__){
            console.log("Sending error to API:", err, info)
            
            return resolve()
        }

        let errObj = {
            message: err,
            file: Platform.OS,
            line: info,
            column: 0,
            stack: {
                message: err.toString(),
                trace: err.toString()
            },
            cancelable: 0,
            timestamp: 0,
            type: Platform.OS + " " + DeviceInfo.getVersion(),
            isTrusted: 0,
            url: 0
        }

        fetch("https://api.filen.io/v1/error/report", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "filen-mobile"
            },
            body: JSON.stringify({
                apiKey: getAPIKey(),
                platform: "mobile",
                error: JSON.stringify(errObj)
            })
        }).then(() => {
            return resolve()
        }).catch(reject)
    })
}