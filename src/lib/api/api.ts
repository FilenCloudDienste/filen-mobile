import {
    getAPIServer,
    getAPIKey,
    getMasterKeys,
    decryptFolderLinkKey,
    encryptMetadata,
    decryptFileMetadata,
    decryptFolderName,
    Semaphore,
    decryptFolderNamePrivateKey,
    decryptFolderNameLink,
    decryptFileMetadataPrivateKey,
    decryptFileMetadataLink,
    convertTimestampToMs
} from "../helpers"
import storage from "../storage"
import { i18n } from "../../i18n"
import { DeviceEventEmitter, Platform } from "react-native"
import { updateLoadItemsCache, removeLoadItemsCache, emptyTrashLoadItemsCache, clearLoadItemsCacheLastResponse } from "../services/items"
import { logout } from "../services/auth/logout"
import { useStore } from "../state"
import DeviceInfo from "react-native-device-info"
import { isOnline } from "../services/isOnline"
import type { Item } from "../../types"

const striptags = require("striptags")

const shareSemaphore = new Semaphore(4)
const apiRequestSemaphore = new Semaphore(8192 * 8192)
const fetchFolderSizeSemaphore = new Semaphore(8192)
const linkItemsSemaphore = new Semaphore(8)

const endpointsToCache: string[] = [
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

export const apiRequest = ({ method, endpoint, data }: { method: string, endpoint: string, data: any }): Promise<any> => {
    return new Promise((resolve, reject) => {
        const cacheKey = "apiCache:" + method.toUpperCase() + ":" + endpoint + ":" + JSON.stringify(data)

        let maxTries = 1024
        let tries = 0
        const retryTimeout = 1000

        if(endpointsToCache.includes(endpoint)){
            maxTries = 3
        }

        if(!isOnline()){
            try{
                const cache = storage.getString(cacheKey)

                if(typeof cache == "string"){
                    if(cache.length > 0){
                        return resolve(JSON.parse(cache))
                    }
                }
            }
            catch(e){
                console.error(e)
            }

            //return reject(i18n(storage.getString("lang"), "deviceOffline"))
        }

        const request = async () => {
            if(tries >= maxTries){
                try{
                    const cache = storage.getString(cacheKey)
    
                    if(typeof cache == "string"){
                        if(cache.length > 0){
                            return resolve(JSON.parse(cache))
                        }
                    }
                }
                catch(e){
                    return reject(e)
                }

                return reject(i18n(storage.getString("lang"), "deviceOffline"))
            }

            tries += 1

            apiRequestSemaphore.acquire().then(() => {
                global.nodeThread.apiRequest({
                    method: method.toUpperCase(),
                    url: getAPIServer() + endpoint,
                    timeout: 60000,
                    data
                }).then(async (res) => {
                    apiRequestSemaphore.release()

                    if(endpointsToCache.includes(endpoint)){
                        storage.set(cacheKey, JSON.stringify(res))
                    }
    
                    if(!res.status){
                        if(typeof res.message == "string"){
                            if(
                                res.message.toLowerCase().indexOf("invalid api key") !== -1
                                || res.message.toLowerCase().indexOf("api key not found") !== -1
                            ){
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

                    console.log(err)
    
                    return setTimeout(request, retryTimeout)
                })
            })
        }

        return request()
    })
}

export const fileExists = ({ name, parent }: { name: string, parent: string }): Promise<{ exists: boolean, existsUUID: string }> => {
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

export const folderExists = ({ name, parent }: { name: string, parent: string }): Promise<{ exists: boolean, existsUUID: string }> => {
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

export const markUploadAsDone = ({ uuid, uploadKey }: { uuid: string, uploadKey: string }): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        const max = 32
        let current = 0
        const timeout = 1000

        const req = () => {
            if(current > max){
                return reject(new Error("Could not mark upload " + uuid + " as done, max tries reached"))
            }

            current += 1

            apiRequest({
                method: "POST",
                endpoint: "/v1/upload/done",
                data: {
                    uuid,
                    uploadKey
                }
            }).then((response) => {
                if(!response.status){
                    if(
                        response.message.toString().toLowerCase().indexOf("chunks are not matching") !== -1
                        || response.message.toString().toLowerCase().indexOf("not matching") !== -1
                        || response.message.toString().toLowerCase().indexOf("done yet") !== -1
                        || response.message.toString().toLowerCase().indexOf("finished yet") !== -1
                        || response.message.toString().toLowerCase().indexOf("chunks not found") !== -1
                    ){
                        return setTimeout(req, timeout)
                    }

                    return reject(response.message)
                }
    
                return resolve(true)
            }).catch(reject)
        }

        req()
    })
}

export const getFolderContents = ({ uuid, type = "normal", linkUUID = undefined, linkHasPassword = undefined, linkPassword = undefined, linkSalt = undefined }: { uuid: string, type?: "normal" | "shared" | "linked", linkUUID?: string | undefined, linkHasPassword?: boolean | undefined, linkPassword?: string | undefined, linkSalt?: string | undefined }): Promise<any> => {
    return new Promise(async (resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: type == "shared" ? "/v1/download/dir/shared" : type == "linked" ? "/v1/download/dir/link" : "/v1/download/dir",
            data: type == "shared" ? {
                apiKey: getAPIKey(),
                uuid
            } : type == "linked" ? {
                uuid: linkUUID,
                parent: uuid,
                password: linkHasPassword && linkSalt && linkPassword ? (linkSalt.length == 32 ? (await global.nodeThread.deriveKeyFromPassword({ password: linkPassword, salt: linkSalt, iterations: 200000, hash: "SHA-512", bitLength: 512, returnHex: true }) as string) : (await global.nodeThread.hashFn({ string: linkPassword.length == 0 ? "empty" : linkPassword }))) : (await global.nodeThread.hashFn({ string: "empty" }))
            } : {
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

export const isSharingFolder = ({ uuid }: { uuid: string }): Promise<{ sharing: boolean, users: any }> => {
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

export const isPublicLinkingFolder = ({ uuid }: { uuid: string }): Promise<{ linking: boolean, links: any }> => {
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

export const addItemToPublicLink = ({ data }: { data: any }): Promise<boolean> => {
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
    
                return resolve(true)
            }).catch((err) => {
                shareSemaphore.release()

                return reject(err)
            })
        }).catch(reject)
    })
}

export const shareItem = ({ data }: { data: any }): Promise<boolean> => {
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
    
                return resolve(true)
            }).catch((err) => {
                shareSemaphore.release()

                return reject(err)
            })
        }).catch(reject)
    })
}

export const isSharingItem = ({ uuid }: { uuid: string }): Promise<{ sharing: boolean, users: any }> => {
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

export const isItemInPublicLink = ({ uuid }: { uuid: string }): Promise<{ linking: boolean, links: any }> => {
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

export const renameItemInPublicLink = ({ data }: { data: any }): Promise<boolean> => {
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
    
                return resolve(true)
            }).catch((err) => {
                shareSemaphore.release()

                return reject(err)
            }).catch(reject)
        })
    })
}

export const renameSharedItem = ({ data }: { data: any }): Promise<boolean> => {
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
    
                return resolve(true)
            }).catch((err) => {
                shareSemaphore.release()

                return reject(err)
            })
        }).catch(reject)
    })
}

export const checkIfItemParentIsShared = ({ type, parent, metaData }: { type: string, parent: string, metaData: any }): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        let shareCheckDone: boolean = false
        let linkCheckDone: boolean = false
        let resolved: boolean = false
        let doneInterval: any = undefined
        const apiKey: string = getAPIKey()
        const masterKeys: string[] = getMasterKeys()

        const done = () => {
            if(shareCheckDone && linkCheckDone){
                clearInterval(doneInterval)

                if(!resolved){
                    resolved = true

                    resolve(true)
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
                        const decrypted = await decryptFileMetadata(masterKeys, files[i].metadata, files[i].uuid)

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
                        const decrypted = await decryptFolderName(masterKeys, folders[i].name, folders[i].uuid)

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
                    const key = await decryptFolderLinkKey(masterKeys, link.linkKey)

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
                        const decrypted = await decryptFileMetadata(masterKeys, files[i].metadata, files[i].uuid)

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
                        const decrypted = await decryptFolderName(masterKeys, folders[i].name, folders[i].uuid)

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
                            const key = await decryptFolderLinkKey(masterKeys, link.linkKey)

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

export const checkIfItemIsSharedForRename = ({ type, uuid, metaData }: { type: string, uuid: string, metaData: any }): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        let shareCheckDone: boolean = false
        let linkCheckDone: boolean = false
        let resolved: boolean = false
        let doneInterval: any = undefined
        const apiKey: string = getAPIKey()
        const masterKeys: string[] = getMasterKeys()

        const done = () => {
            if(shareCheckDone && linkCheckDone){
                clearInterval(doneInterval)

                if(!resolved){
                    resolved = true

                    resolve(true)
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

export const renameFile = ({ file, name }: { file: any, name: string }): Promise<boolean> => {
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
                encryptMetadata(name, file.key)
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
                            return resolve(true)
                        })
                    }).catch(reject)
                }).catch(reject)
            }).catch(reject)
        }).catch(reject)
    })
}

export const renameFolder = ({ folder, name }: { folder: any, name: string }): Promise<boolean> => {
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
                            try{
                                const folderItemCache = JSON.parse(storage.getString("itemCache:folder:" + folder.uuid) || "{}")

                                if(typeof folderItemCache == "object"){
                                    if(typeof folderItemCache.name == "string"){
                                        storage.set("itemCache:folder:" + folder.uuid, JSON.stringify({
                                            ...folderItemCache,
                                            name
                                        }))
                                    }
                                }
                            }
                            catch(e){
                                console.log(e)
                            }

                            return resolve(true)
                        })
                    }).catch(reject)
                }).catch(reject)
            }).catch(reject)
        }).catch(reject)
    })
}

export const createFolder = ({ name, parent }: { name: string, parent: string }): Promise<string> => {
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

export const moveFile = ({ file, parent }: { file: any, parent: string }): Promise<boolean> => {
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
                return resolve(true)
            }).catch(reject)
        }).catch(reject)
    })
}

export const moveFolder = ({ folder, parent }: { folder: any, parent: string }): Promise<boolean> => {
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
                return resolve(true)
            }).catch(reject)
        }).catch(reject)
    })
}

export const changeFolderColor = ({ folder, color }: { folder: any, color: string }): Promise<boolean> => {
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
                return resolve(true)
            }).catch(reject)
        }).catch(reject)
    })
}

export const favoriteItem = ({ item, value }: { item: any, value: number | boolean }): Promise<boolean> => {
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
                value: value == 1 ? true : false
            }).then(() => {
                return resolve(true)
            })
        }).catch(reject)
    })
}

export const itemPublicLinkInfo = ({ item }: { item: any }): Promise<any> => {
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

export const enableItemPublicLink = (item: Item, progressCallback?: (current: number, total: number) => any): Promise<boolean> => {
    return new Promise(async (resolve, reject) => {
        if(item.type == "file"){
            const linkUUID: string = await global.nodeThread.uuidv4()

            apiRequest({
                method: "POST",
                endpoint: "/v1/link/edit",
                data: {
                    apiKey: getAPIKey(),
                    uuid: linkUUID,
                    fileUUID: item.uuid,
                    expiration: "never",
                    password: "empty",
                    passwordHashed: await global.nodeThread.hashFn({ string: "empty" }),
                    salt: await global.nodeThread.generateRandomString({ charLength: 32 }),
                    downloadBtn: "enable",
                    type: "enable"
                }
            }).then((response) => {
                if(typeof progressCallback == "function"){
                    progressCallback(1, 1)
                }

                if(!response.status){
                    return reject(response.message)
                }
    
                return resolve(true)
            }).catch(reject) 
        }
        else{
            createFolderPublicLink(item, progressCallback).then(() => {
                return resolve(true)
            }).catch(reject)
        }
    })
}

export const disableItemPublicLink = (item: Item, linkUUID: string): Promise<boolean> => {
    return new Promise(async (resolve, reject) => {
        if(item.type == "file"){
            if(typeof linkUUID !== "string"){
                return reject(new Error("Invalid linkUUID"))
            }

            if(linkUUID.length < 32){
                return reject(new Error("Invalid linkUUID"))
            }

            apiRequest({
                method: "POST",
                endpoint: "/v1/link/edit",
                data: {
                    apiKey: getAPIKey(),
                    uuid: linkUUID,
                    fileUUID: item.uuid,
                    expiration: "never",
                    password: "empty",
                    passwordHashed: await global.nodeThread.hashFn({ string: "empty" }),
                    salt: await global.nodeThread.generateRandomString({ charLength: 32 }),
                    downloadBtn: "enable",
                    type: "disable"
                }
            }).then((response) => {
                if(!response.status){
                    return reject(response.message)
                }
    
                return resolve(true)
            }).catch(reject) 
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
    
                return resolve(true)
            }).catch(reject)
        }
    })
}

export const addItemToFolderPublicLink = (data: {
    apiKey: string,
    uuid: string,
    parent: string,
    linkUUID: string,
    type: string,
    metadata: string,
    key: string,
    expiration: string,
    password: string,
    passwordHashed: string,
    downloadBtn: string
}): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/dir/link/add",
            data
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            return resolve(true)
        }).catch(reject)
    })
}

export interface GetDirectoryTreeResult {
    path: string,
    item: Item
}

export const getDirectoryTree = (uuid: string, type: "normal" | "shared" | "linked" = "normal", linkUUID: string | undefined = undefined, linkHasPassword: boolean | undefined = undefined, linkPassword: string | undefined = undefined, linkSalt: string | undefined = undefined, linkKey: string | undefined = undefined): Promise<GetDirectoryTreeResult[]> => {
    return new Promise((resolve, reject) => {
        getFolderContents({ uuid, type, linkUUID, linkHasPassword, linkPassword, linkSalt }).then(async (content) => {
            const treeItems = []
            const baseFolderUUID = content.folders[0].uuid
            const baseFolderMetadata = content.folders[0].name
            const baseFolderParent = content.folders[0].parent
            const masterKeys = getMasterKeys()
            const privateKey = storage.getString("privateKey") || ""
            const baseFolderName = type == "normal" ? await decryptFolderName(masterKeys, baseFolderMetadata, baseFolderUUID) : (type == "shared" ? await decryptFolderNamePrivateKey(privateKey, baseFolderMetadata, baseFolderUUID) : await decryptFolderNameLink(baseFolderMetadata, linkKey as string))

            if(baseFolderParent !== "base"){
                return reject(new Error("Invalid base folder parent"))
            }

            if(baseFolderName.length <= 0){
                return reject(new Error("Could not decrypt base folder name"))
            }

            treeItems.push({
                uuid: baseFolderUUID,
                name: baseFolderName,
                parent: "base",
                type: "folder"
            })

            const addedFolders: any = {}
            const addedFiles: any = {}

            for(let i = 0; i < content.folders.length; i++){
                const { uuid, name: metadata, parent } = content.folders[i]

                if(uuid == baseFolderUUID){
                    continue
                }

                const name = type == "normal" ? await decryptFolderName(masterKeys, metadata, uuid) : (type == "shared" ? await decryptFolderNamePrivateKey(privateKey, metadata, uuid) : await decryptFolderNameLink(metadata, linkKey as string))

                if(name.length > 0 && !addedFolders[parent + ":" + name]){
                    addedFolders[parent + ":" + name] = true

                    treeItems.push({
                        uuid,
                        name,
                        parent,
                        type: "folder"
                    })
                }
            }

            for(let i = 0; i < content.files.length; i++){
                const { uuid, bucket, region, chunks, parent, metadata, version } = content.files[i]
                const decrypted = type == "normal" ? await decryptFileMetadata(masterKeys, metadata, uuid) : (type == "shared" ? await decryptFileMetadataPrivateKey(privateKey, metadata, uuid) : await decryptFileMetadataLink(metadata, linkKey as string))

                if(typeof decrypted.lastModified == "number"){
                    if(decrypted.lastModified <= 0){
                        decrypted.lastModified = new Date().getTime()
                    }
                }
                else{
                    decrypted.lastModified = new Date().getTime()
                }

                decrypted.lastModified = convertTimestampToMs(decrypted.lastModified)

                if(decrypted.name.length > 0 && !addedFiles[parent + ":" + decrypted.name]){
                    addedFiles[parent + ":" + decrypted.name] = true

                    treeItems.push({
                        uuid,
                        region,
                        bucket,
                        chunks,
                        parent,
                        metadata: decrypted,
                        version,
                        type: "file"
                    })
                }
            }

            const nest = (items: any, uuid: string = "base", currentPath: string = "", link: string = "parent"): any => {
                return items.filter((item: any) => item[link] == uuid).map((item: any) => ({ 
                    ...item,
                    path: item.type == "folder" ? (currentPath + "/" + item.name) : (currentPath + "/" + item.metadata.name),
                    children: nest(items, item.uuid, item.type == "folder" ? (currentPath + "/" + item.name) : (currentPath + "/" + item.metadata.name), link)
                }))
            }

            const tree = nest(treeItems)
            let reading: number = 0
            const folders: any = {}
            const files: any = {}

            const iterateTree = (parent: any, callback: Function) => {
                if(parent.type == "folder"){
                    folders[parent.path] = parent
                }
                else{
                    files[parent.path] = parent
                }

                if(parent.children.length > 0){
                    for(let i = 0; i < parent.children.length; i++){
                        reading += 1
        
                        iterateTree(parent.children[i], callback)
                    }
                }
        
                reading -= 1
        
                if(reading == 0){
                    return callback()
                }
            }
        
            reading += 1

            iterateTree(tree[0], async () => {
                const result: GetDirectoryTreeResult[] = []

                for(const prop in folders){
                    result.push({
                        path: prop.slice(1),
                        item: {
                            id: folders[prop].uuid,
                            type: "folder",
                            uuid: folders[prop].uuid,
                            name: striptags(folders[prop].name),
                            date: "",
                            timestamp: 0,
                            lastModified: 0,
                            lastModifiedSort: 0,
                            parent: folders[prop].parent,
                            receiverId: 0,
                            receiverEmail: "",
                            sharerId: 0,
                            sharerEmail: "",
                            color: "default",
                            favorited: false,
                            isBase: false,
                            isSync: false,
                            isDefault: false,
                            size: 0,
                            selected: false,
                            mime: "",
                            key: "",
                            offline: false,
                            bucket: "",
                            region: "",
                            rm: "",
                            chunks: 0,
                            thumbnail: undefined,
                            version: 0,
                            hash: ""
                        }
                    })
                }

                for(const prop in files){
                    result.push({
                        path: prop.slice(1),
                        item: {
                            id: files[prop].uuid,
                            type: "file",
                            uuid: files[prop].uuid,
                            name: striptags(files[prop].metadata.name),
                            date: "",
                            timestamp: parseInt(striptags(files[prop].metadata.lastModified.toString())),
                            lastModified: parseInt(striptags(files[prop].metadata.lastModified.toString())),
                            lastModifiedSort: parseInt(striptags(files[prop].metadata.lastModified.toString())),
                            parent: files[prop].parent,
                            receiverId: 0,
                            receiverEmail: "",
                            sharerId: 0,
                            sharerEmail: "",
                            color: "default",
                            favorited: false,
                            isBase: false,
                            isSync: false,
                            isDefault: false,
                            size: parseInt(striptags(files[prop].metadata.size.toString())),
                            selected: false,
                            mime: striptags(files[prop].metadata.mime),
                            key: striptags(files[prop].metadata.key),
                            offline: false,
                            bucket: files[prop].bucket,
                            region: files[prop].region,
                            rm: "",
                            chunks: files[prop].chunks,
                            thumbnail: undefined,
                            version: files[prop].version,
                            hash: ""
                        }
                    })
                }

                return resolve(result)
            })
        }).catch(reject)
    })
}

export const editItemPublicLink = (item: Item, linkUUID: string, expiration: string = "30d", password: string = "", downloadBtn: "enable" | "disable" = "enable"): Promise<boolean> => {
    return new Promise(async (resolve, reject) => {
        if(password == null){
            password = ""
        }

        if(typeof downloadBtn !== "string"){
            downloadBtn = "enable"
        }

        const pass: string = (password.length > 0 ? "notempty" : "empty")
        const passH: string = (password.length > 0 ? password : "empty")
        const salt: string = await global.nodeThread.generateRandomString({ charLength: 32 })

        if(item.type == "file"){
            if(typeof linkUUID !== "string"){
                return reject(new Error("Invalid linkUUID"))
            }

            if(linkUUID.length < 32){
                return reject(new Error("Invalid linkUUID"))
            }

            apiRequest({
                method: "POST",
                endpoint: "/v1/link/edit",
                data: {
                    apiKey: getAPIKey(),
                    uuid: linkUUID,
                    fileUUID: item.uuid,
                    expiration,
                    password: pass,
                    passwordHashed: await global.nodeThread.deriveKeyFromPassword({ password: passH, salt, iterations: 200000, hash: "SHA-512", bitLength: 512, returnHex: true }),
                    salt,
                    downloadBtn,
                    type: "enable"
                }
            }).then((response) => {
                if(!response.status){
                    return reject(response.message)
                }
    
                return resolve(true)
            }).catch(reject) 
        }
        else{
            apiRequest({
                method: "POST",
                endpoint: "/v1/dir/link/edit",
                data: {
                    apiKey: getAPIKey(),
                    uuid: item.uuid,
                    expiration,
                    password: pass,
                    passwordHashed: await global.nodeThread.deriveKeyFromPassword({ password: passH, salt, iterations: 200000, hash: "SHA-512", bitLength: 512, returnHex: true }),
                    salt, 
                    downloadBtn
                }
            }).then((response) => {
                if(!response.status){
                    return reject(response.message)
                }
    
                return resolve(true)
            }).catch(reject)
        }
    })
}

export const createFolderPublicLink = (item: Item, progressCallback?: (current: number, total: number) => any): Promise<any> => {
    return new Promise((resolve, reject) => {
        if(item.type !== "folder"){
            return reject(new Error("Invalid item type"))
        }

        getDirectoryTree(item.uuid).then(async (content) => {
            if(content.length == 0){
                return resolve(true)
            }

            try{
                var masterKeys = getMasterKeys()
                var key = await global.nodeThread.generateRandomString({ charLength: 32 })
                var [encryptedKey, linkUUID, emptyHashed] = await Promise.all([
                    encryptMetadata(key, masterKeys[masterKeys.length - 1]),
                    global.nodeThread.uuidv4(),
                    global.nodeThread.hashFn({ string: "empty" })
                ])
            }
            catch(e){
                return reject(e)
            }

            const sorted = content.sort((a, b) => b.item.parent.length - a.item.parent.length)
            let done: number = 0
            const promises = []

            for(let i = 0; i < sorted.length; i++){
                promises.push(new Promise(async (resolve, reject) => {
                    await linkItemsSemaphore.acquire()

                    const metadata = JSON.stringify(sorted[i].item.type == "file" ? {
                        name: sorted[i].item.name,
                        mime: sorted[i].item.mime,
                        key: sorted[i].item.key,
                        size: sorted[i].item.size,
                        lastModified: sorted[i].item.lastModified
                    } : {
                        name: sorted[i].item.name
                    })

                    encryptMetadata(metadata, key).then((encrypted) => {
                        addItemToFolderPublicLink({
                            apiKey: getAPIKey(),
                            uuid: sorted[i].item.uuid,
                            parent: sorted[i].item.parent,
                            linkUUID,
                            type: sorted[i].item.type,
                            metadata: encrypted,
                            key: encryptedKey,
                            expiration: "never",
                            password: "empty",
                            passwordHashed: emptyHashed,
                            downloadBtn: "enable"
                        }).then(() => {
                            done += 1

                            if(typeof progressCallback == "function"){
                                progressCallback(done, sorted.length)
                            }

                            linkItemsSemaphore.release()

                            return resolve(true)
                        }).catch((err) => {
                            linkItemsSemaphore.release()

                            return reject(err)
                        })
                    }).catch((err) => {
                        linkItemsSemaphore.release()

                        return reject(err)
                    })
                }))
            }

            Promise.all(promises).then(() => {
                return resolve(true)
            }).catch(reject)
        }).catch(reject)
    })
}

export const getPublicKeyFromEmail = ({ email }: { email: string }): Promise<string> => {
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

export const shareItemToUser = ({ item, email, publicKey, progressCallback }: { item: any, email: string, publicKey: string, progressCallback?: (doneItems: number, totalItems: number) => void }): Promise<boolean> => {
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
                    return resolve(true)
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
                        resolve(true)
                    }

                    return true
                }

                const shareItemRequest = (itemType: string, itemToShare: { name?: string, mime?: string, key?: string, size?: number, lastModified?: number, uuid?: string, parent?: string }) => {
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
                    }).catch((err) => {
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

export const trashItem = ({ item }: { item: any }): Promise<boolean> => {
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

                return resolve(true)
            })
        }).catch(reject)
    })
}

export const restoreItem = ({ item }: { item: any }): Promise<boolean> => {
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
                    return resolve(true)
                })
            })
        }).catch(reject)
    })
}

export const deleteItemPermanently = ({ item }: { item: any }): Promise<boolean> => {
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

                return resolve(true)
            })
        }).catch(reject)
    })
}

export const stopSharingItem = ({ item }: { item: any }): Promise<boolean> => {
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

                return resolve(true)
            })
        }).catch(reject)
    })
}

export const removeSharedInItem = ({ item }: { item: any }): Promise<boolean> => {
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

                return resolve(true)
            })
        }).catch(reject)  
    })
}

export const fetchFileVersionData = ({ file }: { file: any }): Promise<any> => {
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

export const restoreArchivedFile = ({ uuid, currentUUID }: { uuid: string, currentUUID: string }): Promise<boolean> => {
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

            return resolve(true)
        }).catch(reject)  
    })
}

export const fetchOfflineFilesInfo = ({ files }: { files: any }): Promise<any> => {
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

export const fetchEvents = ({ lastId = 0, filter = "all" }: { lastId?: number, filter?: string }): Promise<{ events: any, limit: number }> => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/user/events",
            data: {
                apiKey: getAPIKey(),
                filter,
                id: lastId
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

export const fetchEventInfo = ({ uuid }: { uuid: string }): Promise<any> => {
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

export const fetchFolderSize = ({ folder, routeURL }: { folder: any, routeURL: string }): Promise<number> => {
    return new Promise((resolve, reject) => {
        fetchFolderSizeSemaphore.acquire().then(() => {
            let payload = {}

            try{
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
            }
            catch(e){
                fetchFolderSizeSemaphore.release()

                return reject(e)
            }

            apiRequest({
                method: "POST",
                endpoint: "/v1/dir/size",
                data: payload
            }).then((response) => {
                fetchFolderSizeSemaphore.release()

                if(!response.status){
                    return reject(response.message)
                }

                return resolve(response.data.size)
            }).catch((err) => {
                fetchFolderSizeSemaphore.release()

                return reject(err)
            })
        }).catch(reject)
    })
}

export const deleteAllFilesAndFolders = (): Promise<boolean> => {
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

            return resolve(true)
        }).catch(reject)  
    })
}

export const deleteAllVersionedFiles = (): Promise<boolean> => {
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

            return resolve(true)
        }).catch(reject)  
    })
}

export const deleteAccount = ({ twoFactorKey = "XXXXXX" }: { twoFactorKey: string }): Promise<boolean> => {
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

            return resolve(true)
        }).catch(reject)  
    })
}

export const redeemCode = ({ code }: { code: string }): Promise<boolean> => {
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

            return resolve(true)
        }).catch(reject)  
    })
}

export const fetchGDPRInfo = (): Promise<any> => {
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

export const getAccount = (): Promise<any> => {
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

export const getSettings = (): Promise<any> => {
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

export const enable2FA = ({ code = "XXXXXX" }: { code: string }): Promise<boolean> => {
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

            return resolve(true)
        }).catch(reject)  
    })
}

export const disable2FA = ({ code = "XXXXXX" }: { code: string }): Promise<boolean> => {
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

            return resolve(true)
        }).catch(reject)  
    })
}

export const getAuthInfo = ({ email }: { email: string }): Promise<{ authVersion: number, salt: string }> => {
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

export const changeEmail = ({ email, emailRepeat, password, authVersion }: { email: string, emailRepeat: string, password: string, authVersion: number }): Promise<boolean> => {
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

            return resolve(true)
        }).catch(reject)  
    })
}

export const changePassword = ({ password, passwordRepeat, currentPassword, authVersion, salt, masterKeys }: { password: string, passwordRepeat: string, currentPassword: string, authVersion: number, salt: string, masterKeys: string }): Promise<any> => {
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

export const fetchAllStoredItems = ({ lastLength = 0, filesOnly, maxSize, includeTrash, includeVersioned  }: { lastLength?: number, filesOnly: boolean | number, maxSize: number, includeTrash: boolean | number, includeVersioned: boolean | number  }): Promise<{ files: any, folders: any }> => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/user/get/all/index",
            data: {
                apiKey: getAPIKey(),
                lastLength,
                filesOnly: filesOnly ? 1 : 0,
                maxSize: maxSize,
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

export const fetchUserInfo = (): Promise<any> => {
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

export const fetchUserUsage = (): Promise<any> => {
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

export const bulkMove = ({ items, parent }: { items: any, parent: string }): Promise<boolean> => {
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

        return resolve(true)
    })
}

export const bulkFavorite = ({ value, items }: { value: boolean | number, items: any }): Promise<boolean> => {
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

        return resolve(true)
    })
}

export const bulkTrash = ({ items }: { items: any }): Promise<boolean> => {
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

        return resolve(true)
    })
}

export const bulkShare = ({ email, items }: { email: string, items: any }): Promise<boolean> => {
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

            return resolve(true)
        }).catch((err) => {
            console.log(err)

            return reject(i18n(storage.getString("lang"), "shareUserNotFound"))
        })
    })
}

export const bulkDeletePermanently = ({ items }: { items: any }): Promise<boolean> => {
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

        return resolve(true)
    })
}

export const bulkRestore = ({ items }: { items: any }): Promise<boolean> => {
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

        return resolve(true)
    })
}

export const bulkStopSharing = ({ items }: { items: any }): Promise<boolean> => {
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

        return resolve(true)
    })
}

export const bulkRemoveSharedIn = ({ items }: { items: any }): Promise<boolean> => {
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

        return resolve(true)
    })
}

export const folderPresent = ({ uuid }: { uuid: string }): Promise<any> => {
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

export const filePresent = ({ uuid }: { uuid: string }): Promise<any> => {
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

export const emptyTrash = (): Promise<boolean> => {
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

            emptyTrashLoadItemsCache().catch(console.log)

            return resolve(true)
        }).catch((err) => {
            return reject(err)
        })
    })
}

export const getLatestVersion = (): Promise<string> => {
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

export const reportError = (err: string = "", info: string = ""): Promise<boolean> => {
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
            
            return resolve(true)
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
            return resolve(true)
        }).catch(reject)
    })
}