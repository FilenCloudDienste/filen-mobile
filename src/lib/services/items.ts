import { apiRequest, fetchOfflineFilesInfo, fetchFolderSize } from "../api"
import storage from "../storage"
import { decryptFolderName, decryptFileMetadata, getAPIKey, orderItemsByType, getFilePreviewType, getFileExt, getParent, getRouteURL, decryptFolderNamePrivateKey, decryptFileMetadataPrivateKey, canCompressThumbnail, simpleDate } from "../helpers"
import striptags from "striptags"
import { downloadWholeFileFSStream, getDownloadPath, queueFileDownload } from "../download"
import RNFS from "react-native-fs"
import { DeviceEventEmitter } from "react-native"
import { useStore } from "../state"
import FileViewer from "react-native-file-viewer"
import { getOfflineList, removeFromOfflineStorage, changeItemNameInOfflineList, getItemOfflinePath } from "./offline"
import { showToast } from "../../components/Toasts"
import { i18n } from "../../i18n/i18n"
import ImageResizer from "react-native-image-resizer"
import { StackActions } from "@react-navigation/native"
import { navigationAnimation } from "../state"
import memoryCache from "../memoryCache"

const isGeneratingThumbnailForItemUUID: any = {}
const isCheckingThumbnailForItemUUID : any= {}

export interface Item {
    id: string,
    type: string,
    uuid: string,
    name: string,
    date: string,
    timestamp: number,
    lastModified: number,
    lastModifiedSort: number,
    parent: string,
    receiverId: number,
    receiverEmail: string,
    sharerId: number,
    sharerEmail: string,
    color: string | null,
    favorited: boolean,
    isBase: boolean,
    isSync: boolean,
    isDefault: boolean,
    size: number,
    selected: boolean,
    mime: string,
    key: string,
    offline: boolean,
    bucket: string,
    region: string,
    rm: string,
    chunks: number,
    thumbnail: string | undefined,
    version: number
}

export interface BuildFolder {
    folder: any,
    name?: string,
    masterKeys?: string[],
    sharedIn?: boolean,
    privateKey?: string,
    routeURL?: string,
    userId?: number,
    loadFolderSizes?: boolean
}

export const buildFolder = async ({ folder, name = "", masterKeys = [], sharedIn = false, privateKey = "", routeURL, userId = 0, loadFolderSizes = false }: BuildFolder): Promise<Item> => {
    const cacheKey = "itemMetadata:folder:" + folder.uuid + ":" + folder.name + ":" + sharedIn.toString()

    if(memoryCache.has(cacheKey)){
        name = memoryCache.get(cacheKey)
    }
    else{
        if(!sharedIn){
            if(typeof masterKeys !== "undefined" && typeof folder.name !== "undefined"){
                name = await decryptFolderName(masterKeys, folder.name, folder.uuid)
                
                memoryCache.set(cacheKey, name)
            }
        }
        else{
            if(typeof privateKey !== "undefined" && typeof folder.metadata !== "undefined"){
                name = await decryptFolderNamePrivateKey(privateKey, folder.metadata, folder.uuid)
                
                memoryCache.set(cacheKey, name)
            }
        }
    }

    return {
        id: folder.uuid,
        type: "folder",
        uuid: folder.uuid,
        name: striptags(name),
        date: simpleDate(folder.timestamp),
        timestamp: folder.timestamp,
        lastModified: folder.timestamp,
        lastModifiedSort: parseFloat(folder.timestamp + "." + folder.uuid.replace(/\D/g, "")),
        parent: folder.parent || "base",
        receiverId: typeof folder.receiverId == "number" ? folder.receiverId : 0,
        receiverEmail: typeof folder.receiverEmail == "string" ? folder.receiverEmail : "",
        sharerId: typeof folder.sharerId == "number" ? folder.sharerId : 0,
        sharerEmail: typeof folder.sharerEmail == "string" ? folder.sharerEmail : "",
        color: folder.color || null,
        favorited: folder.favorited == 1 ? true : false,
        isBase: typeof folder.parent == "string" ? false : true,
        isSync: folder.is_sync || false,
        isDefault: folder.is_default || false,
        size: typeof routeURL == "string" ? getFolderSizeFromCache({ folder, routeURL, load: loadFolderSizes }) : 0,
        selected: false,
        mime: "",
        key: "",
        offline: false,
        bucket: "",
        region: "",
        rm: "",
        chunks: 0,
        thumbnail: undefined,
        version: 0
    }
}

export interface BuildFile {
    file: any,
    metadata?: {
        name: string,
        mime: string,
        size: number,
        key: string,
        lastModified: number
    },
    masterKeys?: string[],
    sharedIn?: boolean,
    privateKey?: string,
    routeURL?: string,
    userId?: number
}

export const buildFile = async ({ file, metadata = { name: "", mime: "", size: 0, key: "", lastModified: 0 }, masterKeys = [], sharedIn = false, privateKey = "", routeURL = "", userId = 0 }: BuildFile): Promise<Item> => {
    const cacheKey = "itemMetadata:file:" + file.uuid + ":" + file.metadata + ":" + sharedIn.toString()

    if(memoryCache.has(cacheKey)){
        metadata = memoryCache.get(cacheKey)
    }
    else{
        if(!sharedIn){
            if(typeof masterKeys !== "undefined" && typeof file.metadata !== "undefined"){
                metadata = await decryptFileMetadata(masterKeys, file.metadata, file.uuid)

                memoryCache.set(cacheKey, metadata)
            }
        }
        else{
            if(typeof privateKey !== "undefined" && typeof file.metadata !== "undefined"){
                metadata = await decryptFileMetadataPrivateKey(file.metadata, privateKey, file.uuid)
                
                memoryCache.set(cacheKey, metadata)
            }
        }
    }

    let thumbnailCachePath = undefined

    if(canCompressThumbnail(getFileExt(metadata.name))){
        const thumbnailCacheKey = getThumbnailCacheKey({ uuid: file.uuid }).cacheKey

        if(memoryCache.has(thumbnailCacheKey)){
            thumbnailCachePath = memoryCache.get(thumbnailCacheKey)
        }
        else{
            const thumbnailCache = storage.getString(thumbnailCacheKey)
    
            if(typeof thumbnailCache == "string"){
                if(thumbnailCache.length > 0){
                    thumbnailCachePath = thumbnailCache
                    
                    memoryCache.set(thumbnailCacheKey, thumbnailCache)
                }
            }
        }
    }

    return {
        id: file.uuid,
        type: "file",
        uuid: file.uuid,
        name: striptags(metadata.name),
        mime: metadata.mime,
        size: typeof file.size == "number" ? file.size : typeof file.chunks_size == "number" ? file.chunks_size : 0,
        key: metadata.key,
        lastModified: parseInt(typeof metadata.lastModified == "number" ? metadata.lastModified : file.timestamp),
        lastModifiedSort: parseFloat(typeof metadata.lastModified == "number" ? metadata.lastModified + "." + file.uuid.replace(/\D/g, "") : file.timestamp + "." + file.uuid.replace(/\D/g, "")),
        bucket: file.bucket,
        region: file.region,
        parent: file.parent || "base",
        rm: file.rm,
        chunks: file.chunks,
        date: typeof metadata.lastModified == "number" && metadata.lastModified > 0 ? simpleDate(metadata.lastModified) : simpleDate(file.timestamp),
        timestamp: file.timestamp,
        receiverId: typeof file.receiverId == "number" ? file.receiverId : 0,
        receiverEmail: typeof file.receiverEmail == "string" ? file.receiverEmail : undefined,
        sharerId: typeof file.sharerId == "number" ? file.sharerId : 0,
        sharerEmail: typeof file.sharerEmail == "string" ? file.sharerEmail : undefined,
        offline: typeof userId == "number" && userId !== 0 ? (storage.getBoolean(userId + ":offlineItems:" + file.uuid) ? true : false) : false,
        version: file.version,
        favorited: file.favorited,
        thumbnail: thumbnailCachePath,
        selected: false,
        color: null,
        isBase: false,
        isSync: false,
        isDefault: false
    }
}

export const sortItems = ({ items, passedRoute = undefined }: { items: Item[], passedRoute: any }): Item[] => {
    let routeURL = ""

    if(typeof passedRoute !== "undefined"){
        routeURL = getRouteURL(passedRoute)
    }
    else{
        routeURL = getRouteURL()
    }

    if(routeURL.indexOf("photos") !== -1){
        return items.sort((a, b) => b.lastModifiedSort - a.lastModifiedSort)
    }

    const routeEx = routeURL.split("/")

    if(routeEx[routeEx.length - 1] == storage.getString("cameraUploadFolderUUID:" + storage.getNumber("userId"))){
        const folders = items.filter(item => item.type == "folder")
        const files = items.filter(item => item.type == "file")

        return [...folders, ...files.sort((a, b) => {
            return b.lastModifiedSort - a.lastModifiedSort
        })]
    }

    if(routeURL.indexOf("recents") !== -1){
        items = items
    }
    else{
        items = orderItemsByType(items, useStore.getState().itemsSortBy)
    }

    return items
}

export interface LoadItems {
    parent: string,
    prevItems: Item[],
    setItems: React.Dispatch<React.SetStateAction<Item[]>>,
    masterKeys: string[],
    setLoadDone: React.Dispatch<React.SetStateAction<boolean>>,
    bypassCache?: boolean,
    isFollowUpRequest?: boolean,
    callStack?: number,
    navigation?: any,
    isMounted: () => boolean,
    route?: any,
    setProgress?: any,
    loadFolderSizes?: boolean
}

export const loadItems = async ({ parent, prevItems, setItems, masterKeys, setLoadDone, bypassCache = false, isFollowUpRequest = false, callStack = 0, navigation, isMounted, route, setProgress, loadFolderSizes = false }: LoadItems): Promise<boolean> => {
    const userId = storage.getNumber("userId")

    if(typeof userId !== "number"){
        console.log("userId in storage !== number")

        return false
    }

    if(userId == 0){
        console.log("userId in storage invalid (0)")

        return false
    }
    
    let items: Item[] = []
    const netInfo = useStore.getState().netInfo
    let isDeviceOnline = (netInfo.isConnected && netInfo.isInternetReachable)
    const routeURL = typeof route !== "undefined" ? getRouteURL(route) : getRouteURL()
    const cacheKey = "loadItemsCache:" + routeURL
    const cacheKeyLastResponse = "loadItemsCache:lastResponse:" + routeURL

    try{
        var cacheRaw = storage.getString(cacheKey)
        var cache = typeof cacheRaw == "string" ? JSON.parse(cacheRaw) : undefined
    }
    catch(e){
        console.log(e)

        var cache = undefined
        
        bypassCache = true
    }

    if(!isDeviceOnline){
		bypassCache = false
	}

    if(typeof cache == "object" && !bypassCache){
        if(callStack == 0 && isDeviceOnline && !isFollowUpRequest){
            //setLoadDone(true)

			loadItems({
                parent,
                setItems,
                prevItems,
                masterKeys,
                setLoadDone,
                bypassCache: true,
                isFollowUpRequest: true,
                callStack: 1,
                navigation,
                isMounted,
                route,
                setProgress
            })
		}

        items = cache

        if(getParent(route) == parent && isMounted()){
            items = sortItems({ items, passedRoute: route })

            setItems(items.filter(item => item !== null && typeof item.uuid == "string"))
            setLoadDone(true)
        }

        return true
    }

    if(parent == "base"){
        try{
            var response = await apiRequest({
                method: "POST",
                endpoint: "/v1/user/baseFolders",
                data: {
                    apiKey: getAPIKey()
                }
            })
        }
        catch(e){
            console.log(e)

            return false
        }

        if(!response.status){
            console.log(response.message)

            return false
        }

        if(typeof cache !== "undefined"){
            if(cache.length > 0){
                try{
                    const responseString = JSON.stringify(response.data)

                    if(storage.getString(cacheKeyLastResponse) == responseString){
                        return false
                    }

                    storage.set(cacheKeyLastResponse, responseString)
                }
                catch(e){
                    console.log(e)
                }
            }
        }

        for(let i = 0; i < response.data.folders.length; i++){
			let folder = response.data.folders[i]

			let item = await buildFolder({ folder, masterKeys, userId, routeURL, loadFolderSizes })

			items.push(item)

			storage.set("itemCache:folder:" + folder.uuid, JSON.stringify(item))
		}
    }
    else if(parent == "recents"){
        try{
            var response = await apiRequest({
                method: "POST",
                endpoint: "/v1/user/recent",
                data: {
                    apiKey: getAPIKey()
                }
            })
        }
        catch(e){
            console.log(e)

            return false
        }

        if(!response.status){
            console.log(response.message)

            return false
        }

        if(typeof cache !== "undefined"){
            if(cache.length > 0){
                try{
                    const responseString = JSON.stringify(response.data)

                    if(storage.getString(cacheKeyLastResponse) == responseString){
                        return false
                    }

                    storage.set(cacheKeyLastResponse, responseString)
                }
                catch(e){
                    console.log(e)
                }
            }
        }

        for(let i = 0; i < response.data.length; i++){
            let file = response.data[i]
            
            let item = await buildFile({ file, masterKeys, userId })

            items.push(item)

			storage.set("itemCache:file:" + file.uuid, JSON.stringify(item))
        }
    }
    else if(routeURL.indexOf("shared-in") !== -1){
        try{
            var response = await apiRequest({
                method: "POST",
                endpoint: "/v1/user/shared/in",
                data: {
                    apiKey: getAPIKey(),
                    uuid: parent,
                    folders: JSON.stringify(["shared-in"]),
                    page: 1,
                    app: "true"
                }
            })
        }
        catch(e){
            console.log(e)

            return false
        }

        if(!response.status){
            console.log(response.message)

            return false
        }

        if(typeof cache !== "undefined"){
            if(cache.length > 0){
                try{
                    const responseString = JSON.stringify(response.data)

                    if(storage.getString(cacheKeyLastResponse) == responseString){
                        return false
                    }

                    storage.set(cacheKeyLastResponse, responseString)
                }
                catch(e){
                    console.log(e)
                }
            }
        }

        const privateKey = storage.getString("privateKey")

        for(let i = 0; i < response.data.folders.length; i++){
			let folder = response.data.folders[i]
			
            let item = await buildFolder({ folder, masterKeys, sharedIn: true, privateKey, userId, routeURL, loadFolderSizes })

			items.push(item)

			storage.set("itemCache:folder:" + folder.uuid, JSON.stringify(item))
		}

        for(let i = 0; i < response.data.uploads.length; i++){
            let file = response.data.uploads[i]

            let item = await buildFile({ file, masterKeys, sharedIn: true, privateKey, userId })

            items.push(item)

			storage.set("itemCache:file:" + file.uuid, JSON.stringify(item))
        }
    }
    else if(routeURL.indexOf("shared-out") !== -1){
        try{
            var response = await apiRequest({
                method: "POST",
                endpoint: "/v1/user/shared/out",
                data: {
                    apiKey: getAPIKey(),
                    uuid: parent,
                    folders: JSON.stringify(["default"]),
                    page: 1,
                    app: "true",
                    receiverId: global.currentReceiverId
                }
            })
        }
        catch(e){
            console.log(e)

            return false
        }

        if(!response.status){
            console.log(response.message)

            return false
        }

        if(typeof cache !== "undefined"){
            if(cache.length > 0){
                try{
                    const responseString = JSON.stringify(response.data)

                    if(storage.getString(cacheKeyLastResponse) == responseString){
                        return false
                    }

                    storage.set(cacheKeyLastResponse, responseString)
                }
                catch(e){
                    console.log(e)
                }
            }
        }

        var privateKey = storage.getString("privateKey")

        for(let i = 0; i < response.data.folders.length; i++){
			let folder = response.data.folders[i]

            folder.name = folder.metadata
			
            let item = await buildFolder({ folder, masterKeys, userId, routeURL, loadFolderSizes })

			items.push(item)

			storage.set("itemCache:folder:" + folder.uuid, JSON.stringify(item))
		}

        for(let i = 0; i < response.data.uploads.length; i++){
            let file = response.data.uploads[i]

            let item = await buildFile({ file, masterKeys, userId })

            items.push(item)

			storage.set("itemCache:file:" + file.uuid, JSON.stringify(item))
        }
    }
    else if(parent == "photos"){
        try{
            var cameraUploadParent = storage.getString("cameraUploadFolderUUID:" + userId)
        }
        catch(e){
            console.log(e)
        }

        if(typeof cameraUploadParent == "string"){
            if(cameraUploadParent.length > 16){
                try{
                    var response = await apiRequest({
                        method: "POST",
                        endpoint: "/v1/dir/content",
                        data: {
                            apiKey: getAPIKey(),
                            uuid: cameraUploadParent,
                            folders: JSON.stringify(["default"]),
                            page: 1,
                            app: "true"
                        }
                    })
                }
                catch(e){
                    console.log(e)
        
                    return false
                }
        
                if(!response.status){
                    console.log(response.message)
        
                    return false
                }

                if(typeof cache !== "undefined"){
                    if(cache.length > 0){
                        try{
                            const responseString = JSON.stringify(response.data)
        
                            if(storage.getString(cacheKeyLastResponse) == responseString){
                                return false
                            }
            
                            storage.set(cacheKeyLastResponse, responseString)
                        }
                        catch(e){
                            console.log(e)
                        }
                    }
                }
        
                for(let i = 0; i < response.data.uploads.length; i++){
                    let file = response.data.uploads[i]
        
                    let item = await buildFile({ file, masterKeys, userId })
        
                    if(getFilePreviewType(getFileExt(item.name)) == "image"){
                        items.push(item)
                    }
        
                    storage.set("itemCache:file:" + file.uuid, JSON.stringify(item))
                }
            }
        }
    }
    else if(parent == "offline"){
        try{
            var list = await getOfflineList()
            var offlinePath = await getDownloadPath({ type: "offline" })
        }
        catch(e){
            console.log(e)

            return false
        }

        for(let i = 0; i < list.length; i++){
            let file = list[i]

            file.offline = true

            const itemOfflinePath = getItemOfflinePath(offlinePath, file)

            try{
                const exists = await RNFS.exists(itemOfflinePath)

                if(!exists){
                    await removeFromOfflineStorage({ item: file })

                    if(netInfo.isConnected && netInfo.isInternetReachable){
                        queueFileDownload({ file, storeOffline: true })
                    }
                }
                else{
                    items.push(file)
                }
            }
            catch(e){
                console.log(e)

                items.push(file)
            }
        }

        const offlineFilesToFetchInfo = items.map(item => item.uuid)

        if(offlineFilesToFetchInfo.length > 0 && netInfo.isInternetReachable && netInfo.isConnected){
            try{
                var offlineFilesInfo = await fetchOfflineFilesInfo({ files: offlineFilesToFetchInfo })
            }
            catch(e){
                console.log(e)
    
                return false
            }
    
            for(let i = 0; i < items.length; i++){
                const prop = items[i].uuid
                const itemUUID = items[i].uuid
                const itemName = items[i].name

                if(typeof offlineFilesInfo[prop] !== "undefined"){
                    if(offlineFilesInfo[prop].exists){
                        items[i].favorited = offlineFilesInfo[prop].favorited

                        try{
                            if(offlineFilesInfo[prop].isVersioned){
                                var metadata = await decryptFileMetadata(masterKeys, offlineFilesInfo[prop].versionedInfo.metadata, offlineFilesInfo[prop].versionedInfo.uuid)
                            }
                            else{
                                var metadata = await decryptFileMetadata(masterKeys, offlineFilesInfo[prop].metadata, prop)
                            }

                            if(typeof metadata == "object"){
                                if(offlineFilesInfo[prop].isVersioned || items[i].name !== metadata.name){
                                    let newItem = items[i]
            
                                    if(offlineFilesInfo[prop].isVersioned){
                                        newItem.uuid = offlineFilesInfo[prop].versionedUUID
                                        newItem.region = offlineFilesInfo[prop].versionedInfo.region
                                        newItem.bucket = offlineFilesInfo[prop].versionedInfo.bucket
                                        newItem.chunks = offlineFilesInfo[prop].versionedInfo.chunks
                                        newItem.timestamp = offlineFilesInfo[prop].versionedInfo.timestamp
                                        newItem.rm = offlineFilesInfo[prop].versionedInfo.rm
                                        newItem.thumbnail = undefined
                                        newItem.date = simpleDate(offlineFilesInfo[prop].versionedInfo.timestamp)
                                    }

                                    newItem.offline = true
                                    newItem.name = metadata.name
                                    newItem.size = metadata.size
                                    newItem.mime = metadata.mime
                                    newItem.key = metadata.key
                                    newItem.lastModified = metadata.lastModified

                                    if(offlineFilesInfo[prop].isVersioned){
                                        queueFileDownload({
                                            file: newItem,
                                            storeOffline: true,
                                            isOfflineUpdate: true,
                                            // @ts-ignore
                                            optionalCallback: () => {
                                                removeFromOfflineStorage({
                                                    item: {
                                                        uuid: itemUUID,
                                                        name: itemName
                                                    }
                                                })
    
                                                DeviceEventEmitter.emit("event", {
                                                    type: "remove-item",
                                                    data: {
                                                        uuid: itemUUID
                                                    }
                                                })
    
                                                DeviceEventEmitter.emit("event", {
                                                    type: "add-item",
                                                    data: {
                                                        item: newItem,
                                                        parent: newItem.parent
                                                    }
                                                })
                                            }
                                        })
                                    }
                                    else{
                                        await new Promise((resolve, reject) => {
                                            changeItemNameInOfflineList({ item: items[i], name: metadata.name }).then(() => {
                                                DeviceEventEmitter.emit("event", {
                                                    type: "change-item-name",
                                                    data: {
                                                        uuid: items[i].uuid,
                                                        name: metadata.name
                                                    }
                                                })

                                                return resolve(true)
                                            }).catch(reject)
                                        })
                                    }
                                }
                            }
                        }
                        catch(e){
                            console.log(e)
                        }
                    }
                    else{
                        try{
                            await removeFromOfflineStorage({ item: items[i] })
                        }
                        catch(e){
                            console.log(e)
                        }

                        DeviceEventEmitter.emit("event", {
                            type: "remove-item",
                            data: {
                                uuid: prop
                            }
                        })
                    }
                }
            }
        }
    }
    else{
        try{
            var response = await apiRequest({
                method: "POST",
                endpoint: "/v1/dir/content",
                data: {
                    apiKey: getAPIKey(),
                    uuid: parent,
                    folders: JSON.stringify(["default"]),
                    page: 1,
                    app: "true"
                }
            })
        }
        catch(e){
            console.log(e)

            return false
        }

        if(!response.status){
            console.log(response.message)

            return false
        }

        if(typeof cache !== "undefined"){
            if(cache.length > 0){
                try{
                    const responseString = JSON.stringify(response.data)

                    if(storage.getString(cacheKeyLastResponse) == responseString){
                        return false
                    }

                    storage.set(cacheKeyLastResponse, responseString)
                }
                catch(e){
                    console.log(e)
                }
            }
        }

        for(let i = 0; i < response.data.folders.length; i++){
			let folder = response.data.folders[i]
			
            let item = await buildFolder({ folder, masterKeys, userId, routeURL, loadFolderSizes })

			items.push(item)

			storage.set("itemCache:folder:" + folder.uuid, JSON.stringify(item))
		}

        for(let i = 0; i < response.data.uploads.length; i++){
            let file = response.data.uploads[i]

            let item = await buildFile({ file, masterKeys, userId })

            items.push(item)

			storage.set("itemCache:file:" + file.uuid, JSON.stringify(item))
        }
    }

    items = sortItems({ items, passedRoute: route })

    storage.set(cacheKey, JSON.stringify(items))

    if(getParent(route) == parent && isMounted()){
        setItems(items.filter(item => item !== null && typeof item.uuid == "string"))
        setLoadDone(true)
    }

    return true
}

export const getFolderSizeCacheKey = ({ folder, routeURL }: { folder: Item, routeURL: string }): string => {
    let cacheKey = "folderSize:"

    if(routeURL.indexOf("shared-out") !== -1){
        cacheKey += "shared:" + folder.sharerId + ":" + folder.receiverId + ":" + folder.uuid
    }
    else if(routeURL.indexOf("shared-in") !== -1){
        cacheKey += "shared:" + folder.sharerId + ":" + folder.receiverId + ":" + folder.uuid
    }
    else if(routeURL.indexOf("trash") !== -1){
        cacheKey += "trash:" + folder.uuid
    }
    else{
        cacheKey += "normal:" + folder.uuid
    }

    return cacheKey
}

export const getFolderSizeFromCache = ({ folder, routeURL, load = true }: { folder: Item, routeURL: string, load?: boolean }): number => {
    const cacheKey = getFolderSizeCacheKey({ folder, routeURL })
    let timeout = 0
    const cache = storage.getNumber(cacheKey)
        
    if(load){
        timeout = storage.getNumber(cacheKey + ":timeout")
    }

    if(load){
        const netInfo = useStore.getState().netInfo

        if(Math.floor(+new Date()) > timeout && netInfo.isConnected && netInfo.isInternetReachable){
            fetchFolderSize({ folder, routeURL }).then((size) => {
                try{
                    if(cache == size){
                        storage.set(cacheKey + ":timeout", (Math.floor(+new Date()) + 15000))

                        return false
                    }

                    storage.set(cacheKey, size)
                    storage.set(cacheKey + ":timeout", (Math.floor(+new Date()) + 45000))
                }
                catch(e){
                    return console.log(e)
                }

                updateLoadItemsCache({
                    item: folder,
                    prop: "size",
                    value: size
                }).then(() => {
                    DeviceEventEmitter.emit("event", {
                        type: "folder-size",
                        data: {
                            uuid: folder.uuid,
                            size
                        }
                    })
                })
            }).catch((err) => {
                console.log(err)
            })
        }
    }

    return (typeof cache == "number" ? cache : 0)
}

export const getThumbnailCacheKey = ({ uuid }: { uuid: string }): { width: number, height: number, quality: number, thumbnailVersion: string, cacheKey: string } => {
    const width = 512, height = 512, quality = 80, thumbnailVersion = "2.0.7"
    const cacheKey = "thumbnailCache:" + uuid + ":" + width + ":" + height + ":" + quality + ":" + thumbnailVersion

    return {
        width,
        height,
        quality,
        thumbnailVersion,
        cacheKey
    }
}

/*
Clear last response cache
*/
export const clearLoadItemsCacheLastResponse = (): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        try{
            const keys = storage.getAllKeys()

            for(let i = 0; i < keys.length; i++){
                if(keys[i].indexOf("loadItemsCache:lastResponse:") !== -1){
                    storage.delete(keys[i])
                }
            }
        }
        catch(e){
            console.log(e)
        }

        return resolve(true)
    })
}

/*
Update the item cache so we do not need to re-fetch data from the API
*/
export const updateLoadItemsCache = ({ item, routeURL = "", prop, value }: { item: Item, routeURL?: string, prop: any, value: any }): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        try{
            const keys = storage.getAllKeys()

            for(let i = 0; i < keys.length; i++){
                if(keys[i].indexOf(routeURL.length > 0 ? "loadItemsCache:" + routeURL : "loadItemsCache:") !== -1){
                    let cache = []
                    let didChange = false

                    try{
                        cache = JSON.parse(storage.getString(keys[i]) as string)
                    }
                    catch(err){
                        console.log(err)
                    }

                    for(let x = 0; x < cache.length; x++){
                        if(cache[x].uuid == item.uuid){
                            cache[x][prop] = value
                            didChange = true
                        }
                    }

                    if(didChange){
                        storage.set(keys[i], JSON.stringify(cache))
                    }
                }
            }
        }
        catch(e){
            console.log(e)
        }

        return resolve(true)
    })
}

/*
Update the item cache so we do not need to re-fetch data from the API
*/
export const removeLoadItemsCache = ({ item, routeURL = "" }: { item: Item, routeURL?: string }): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        try{
            const keys = storage.getAllKeys()

            for(let i = 0; i < keys.length; i++){
                if(keys[i].indexOf(routeURL.length > 0 ? "loadItemsCache:" + routeURL : "loadItemsCache:") !== -1){
                    let cache = []
                    let didChange = false

                    try{
                        cache = JSON.parse(storage.getString(keys[i]) as string)
                    }
                    catch(err){
                        console.log(err)
                    }

                    for(let x = 0; x < cache.length; x++){
                        if(cache[x].uuid == item.uuid){
                            cache.splice(x, 1)
                            didChange = true
                        }
                    }

                    if(didChange){
                        storage.set(keys[i], JSON.stringify(cache))
                    }
                }
            }
        }
        catch(e){
            console.log(e)
        }

        return resolve(true)
    })
}

/*
Update the item cache so we do not need to re-fetch data from the API
*/
export const emptyTrashLoadItemsCache = (): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        try{
            const keys = storage.getAllKeys()

            for(let i = 0; i < keys.length; i++){
                if(keys[i].indexOf("loadItemsCache:trash") !== -1){
                    storage.delete(keys[i])
                }
            }
        }
        catch(e){
            console.log(e)
        }

        return resolve(true)
    })
}

/*
Update the item cache so we do not need to re-fetch data from the API
*/
export const addItemLoadItemsCache = ({ item, routeURL = "" }: { item: Item, routeURL?: string }): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        try{
            const keys = storage.getAllKeys()

            for(let i = 0; i < keys.length; i++){
                if(keys[i].indexOf(routeURL.length > 0 ? "loadItemsCache:" + routeURL : "loadItemsCache:") !== -1){
                    let cache = []

                    try{
                        cache = JSON.parse(storage.getString(keys[i]) as string)
                    }
                    catch(err){
                        console.log(err)
                    }

                    if(cache.length > 0){
                        cache.push(item)

                        storage.set(keys[i], JSON.stringify(cache))
                    }
                }
            }
        }
        catch(e){
            console.log(e)
        }

        return resolve(true)
    })
}

/*
Check if a thumbnail exists locally after trying to load it threw an error. If it dos not exists, re-cache it
*/
export const checkItemThumbnail = ({ item }: { item: Item }): void => {
    if(typeof item.thumbnail !== "string"){
        return
    }

    //if(typeof global.visibleItems[item.uuid] == "undefined"){
    //    return
    //}

    if(typeof isCheckingThumbnailForItemUUID[item.uuid] !== "undefined"){
        return
    }

    isCheckingThumbnailForItemUUID[item.uuid] = true

    const { cacheKey } = getThumbnailCacheKey({ uuid: item.uuid })

    try{
        var cache = storage.getString(cacheKey)
    }
    catch(e){
        //console.log(e)
    }

    if(typeof cache !== "string"){
        return
    }

    getDownloadPath({ type: "thumbnail" }).then((path) => {
        RNFS.exists(path + cache).then((exists) => {
            if(!exists){
                delete isCheckingThumbnailForItemUUID[item.uuid]

                const netInfo = useStore.getState().netInfo 
    
                if(!netInfo.isConnected || !netInfo.isInternetReachable){
                    return
                }
    
                storage.delete(cacheKey)
                memoryCache.delete("cachedThumbnailPaths:" + item.uuid)
    
                let thumbItem = item
    
                thumbItem.thumbnail = undefined
    
                global.visibleItems[thumbItem.uuid] = true
                delete isGeneratingThumbnailForItemUUID[thumbItem.uuid]
    
                void generateItemThumbnail({ item: thumbItem, skipInViewCheck: true })
            }
        }).catch((err) => {
            console.log(err)

            delete isCheckingThumbnailForItemUUID[item.uuid]
        })
    }).catch((err) => {
        console.log(err)

        delete isCheckingThumbnailForItemUUID[item.uuid]
    })
}

export const generateItemThumbnail = ({ item, skipInViewCheck = false, callback = undefined }: { item: Item, skipInViewCheck?: boolean, callback?: Function }): any => {
    if(typeof item.thumbnail == "string"){
        if(typeof callback == "function"){
            callback(true)
        }

        return false
    }

    if(typeof global.visibleItems[item.uuid] == "undefined" && !skipInViewCheck){
        if(typeof callback == "function"){
            callback(true)
        }

        return false
    }

    if(memoryCache.has("cachedThumbnailPaths:" + item.uuid)){
        return updateLoadItemsCache({
            item,
            prop: "thumbnail",
            value: item.uuid + ".jpg"
        }).then(() => {
            DeviceEventEmitter.emit("event", {
                type: "thumbnail-generated",
                data: {
                    uuid: item.uuid,
                    path: memoryCache.get("cachedThumbnailPaths:" + item.uuid)
                }
            })

            if(typeof callback == "function"){
                callback(null, memoryCache.get("cachedThumbnailPaths:" + item.uuid))
            }
        })
    }

    const { width, height, quality, cacheKey } = getThumbnailCacheKey({ uuid: item.uuid })
    const cache = storage.getString(cacheKey)

    if(typeof cache == "string"){
        if(cache.length > 0){
            memoryCache.set("cachedThumbnailPaths:" + item.uuid, cache)

            return updateLoadItemsCache({
                item,
                prop: "thumbnail",
                value: item.uuid + ".jpg"
            }).then(() => {
                DeviceEventEmitter.emit("event", {
                    type: "thumbnail-generated",
                    data: {
                        uuid: item.uuid,
                        path: cache
                    }
                })

                if(typeof callback == "function"){
                    callback(null, cache)
                }
            })
        }
    }

    const netInfo = useStore.getState().netInfo 

    if(!netInfo.isConnected || !netInfo.isInternetReachable){
        if(typeof callback == "function"){
            callback(true)
        }

        return false
    }

    if(storage.getBoolean("onlyWifiDownloads:" + storage.getNumber("userId")) && netInfo.type !== "wifi"){
        if(typeof callback == "function"){
            callback(true)
        }

        return false
    }

    if(typeof isGeneratingThumbnailForItemUUID[item.uuid] !== "undefined"){
        if(typeof callback == "function"){
            callback(true)
        }

        return false
    }

    isGeneratingThumbnailForItemUUID[item.uuid] = true

    global.generateThumbnailSemaphore.acquire().then(() => {
        if(typeof global.visibleItems[item.uuid] == "undefined" && !skipInViewCheck){
            delete isGeneratingThumbnailForItemUUID[item.uuid]
        
            global.generateThumbnailSemaphore.release()

            if(typeof callback == "function"){
                callback(true)
            }

            return false
        }
        else{
            getDownloadPath({ type: "thumbnail" }).then(async (dest) => {
                dest = dest + item.uuid + ".jpg"
    
                try{
                    if((await RNFS.exists(dest))){
                        await RNFS.unlink(dest)
                    }
                }
                catch(e){
                    //console.log(e)
                }
    
                downloadWholeFileFSStream({
                    file: item
                }).then((path) => {
                    ImageResizer.createResizedImage(path, width, height, "JPEG", quality).then((compressed) => {
                        RNFS.moveFile(compressed.uri, dest).then(() => {
                            storage.set(cacheKey, item.uuid + ".jpg")
                            memoryCache.set("cachedThumbnailPaths:" + item.uuid, item.uuid + ".jpg")

                            updateLoadItemsCache({
                                item,
                                prop: "thumbnail",
                                value: item.uuid + ".jpg"
                            }).then(() => {
                                DeviceEventEmitter.emit("event", {
                                    type: "thumbnail-generated",
                                    data: {
                                        uuid: item.uuid,
                                        path: item.uuid + ".jpg"
                                    }
                                })
        
                                delete isGeneratingThumbnailForItemUUID[item.uuid]

                                if(typeof callback == "function"){
                                    callback(null, item.uuid + ".jpg")
                                }
                
                                global.generateThumbnailSemaphore.release()
                            }).catch((err) => {
                                console.log(err)
        
                                delete isGeneratingThumbnailForItemUUID[item.uuid]

                                if(typeof callback == "function"){
                                    callback(err)
                                }
                                
                                global.generateThumbnailSemaphore.release()
                            })
                        }).catch((err) => {
                            console.log(err)
    
                            delete isGeneratingThumbnailForItemUUID[item.uuid]

                            if(typeof callback == "function"){
                                callback(err)
                            }
            
                            global.generateThumbnailSemaphore.release()
                        })
                    }).catch((err) => {
                        console.log(err)
    
                        delete isGeneratingThumbnailForItemUUID[item.uuid]

                        if(typeof callback == "function"){
                            callback(err)
                        }
            
                        global.generateThumbnailSemaphore.release()
                    })
                }).catch((err) => {
                    console.log(err)

                    if(typeof callback == "function"){
                        callback(err)
                    }
    
                    delete isGeneratingThumbnailForItemUUID[item.uuid]
                })
            }).catch((err) => {
                console.log(err)

                if(typeof callback == "function"){
                    callback(err)
                }
    
                delete isGeneratingThumbnailForItemUUID[item.uuid]
            })
        }
    })
}

export const previewItem = async ({ item, setCurrentActionSheetItem = true, navigation }: { item: Item, setCurrentActionSheetItem?: boolean, navigation?: any }) => {
    if(item.size >= 134217728){
        return DeviceEventEmitter.emit("event", {
            type: "open-item-actionsheet",
            data: item
        })
    }

    const previewType = getFilePreviewType(getFileExt(item.name))
    const canThumbnail = canCompressThumbnail(getFileExt(item.name))

    if(!["image", "video", "text", "code", "pdf", "doc", "audio"].includes(previewType)){
        DeviceEventEmitter.emit("event", {
            type: "open-item-actionsheet",
            data: item
        })

        return false
    }

    if(previewType == "image"){
        if(!canThumbnail){
            DeviceEventEmitter.emit("event", {
                type: "open-item-actionsheet",
                data: item
            })
    
            return false
        }

        if(typeof item.thumbnail !== "string"){
            return false
        }
        
        return setImmediate(() => {
            const currentItems = useStore.getState().currentItems

            if(!Array.isArray(currentItems)){
                return false
            }

            const currentImages: any = []
            let currentIndex = 0
            const addedImages: any = {}
            let index = 0
            let imgFound = false

            for(let i = 0; i < currentItems.length; i++){
                const ext = getFileExt(currentItems[i].name)

                if(getFilePreviewType(ext) == "image" && canCompressThumbnail(ext) && !addedImages[currentItems[i].uuid]){
                    addedImages[currentItems[i].uuid] = true

                    if(currentItems[i].uuid == item.uuid){
                        currentIndex = index
                        imgFound = true
                    }
                    
                    currentImages.push({
                        uri: undefined,
                        name: currentItems[i].name,
                        index,
                        uuid: currentItems[i].uuid,
                        thumbnail: currentItems[i].thumbnail,
                        file: currentItems[i]
                    })

                    index += 1
                }
            }

            if(imgFound){
                navigationAnimation({ enable: true }).then(() => {
                    navigation.dispatch(StackActions.push("ImageViewerScreen", {
                        items: currentImages,
                        index: currentIndex
                    }))
                })
            }
        })
    }

    let existsOffline = false
    let offlinePath = ""

    try{
        offlinePath = getItemOfflinePath(await getDownloadPath({ type: "offline" }), item)

        if((await RNFS.exists(offlinePath))){
            existsOffline = true
        }
    }
    catch(e){
        //console.log(e)
    }

    const open = (path: string, offlineMode: boolean = false) => {
        setTimeout(() => {
            useStore.setState({ fullscreenLoadingModalVisible: false })

            if(offlineMode){
                return FileViewer.open(path, {
                    displayName: item.name,
                    showOpenWithDialog: false
                }).then(() => {
                    //console.log(path)
                }).catch((err) => {
                    console.log(err)

                    showToast({ message: i18n(storage.getString("lang"), "couldNotOpenFileLocally", true, ["__NAME__"], [item.name]) })
                })
            }

            if(previewType == "video"){
                FileViewer.open(path, {
                    displayName: item.name,
                    showOpenWithDialog: false
                }).then(() => {
                    //console.log(path)
                }).catch((err) => {
                    console.log(err)

                    showToast({ message: i18n(storage.getString("lang"), "couldNotOpenFileLocally", true, ["__NAME__"], [item.name]) })
                })
            }
            else if(previewType == "pdf" || previewType == "doc"){
                FileViewer.open(path, {
                    displayName: item.name,
                    showOpenWithDialog: false
                }).then(() => {
                    //console.log(path)
                }).catch((err) => {
                    console.log(err)

                    showToast({ message: i18n(storage.getString("lang"), "couldNotOpenFileLocally", true, ["__NAME__"], [item.name]) })
                })
            }
            else if(previewType == "text" || previewType == "code"){
                RNFS.readFile(path, "utf8").then((content) => {
                    if(setCurrentActionSheetItem){
                        useStore.setState({ currentActionSheetItem: item })
                    }

                    useStore.setState({
                        textEditorState: "view",
                        textEditorParent: item.parent,
                        createTextFileDialogName: item.name,
                        textEditorText: content
                    })
														
					navigationAnimation({ enable: true }).then(() => {
                        navigation.dispatch(StackActions.push("TextEditorScreen"))
                    })
                }).catch((err) => {
                    console.log(err)
                })
            }
        }, existsOffline ? 1 : 100)
    }

    if(existsOffline){
        return open(offlinePath, true)
    }

    const netInfo = useStore.getState().netInfo

    if(!netInfo.isConnected || !netInfo.isInternetReachable){
        return showToast({ message: i18n(storage.getString("lang"), "deviceOffline") })
    }

    if(storage.getBoolean("onlyWifiDownloads:" + storage.getNumber("userId")) && netInfo.type !== "wifi"){
        return showToast({ message: i18n(storage.getString("lang"), "onlyWifiDownloads") })
    }

    useStore.setState({ fullscreenLoadingModalVisible: true, fullscreenLoadingModalDismissable: true })

    queueFileDownload({
        file: item,
        // @ts-ignore
        optionalCallback: (err, path) => {
            useStore.setState({ fullscreenLoadingModalVisible: false })

            if(err){
                console.log(err)

                return showToast({ message: err.toString() })
            }

            return open(path)
        },
        isPreview: true
    })
}