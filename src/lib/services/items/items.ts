import { apiRequest, folderPresent } from "../../api"
import storage from "../../storage"
import { getAPIKey, orderItemsByType, getFilePreviewType, getFileExt, getRouteURL, canCompressThumbnail, simpleDate, convertTimestampToMs, getMasterKeys, getParent } from "../../helpers"
import striptags from "striptags"
import { getDownloadPath, queueFileDownload } from "../download/download"
import * as fs from "../../fs"
import { DeviceEventEmitter } from "react-native"
import { useStore } from "../../state"
import FileViewer from "react-native-file-viewer"
import { getOfflineList, removeFromOfflineStorage, checkOfflineItems, getItemOfflinePath } from "../offline"
import { showToast } from "../../../components/Toasts"
import { i18n } from "../../../i18n/i18n"
import { StackActions } from "@react-navigation/native"
import { navigationAnimation } from "../../state"
import memoryCache from "../../memoryCache"
import { isOnline, isWifi } from "../isOnline"
import { Item, ItemReceiver } from "../../../types"
import { MB } from "../../constants"
import { Asset } from "expo-media-library"
import { getLocalAssetsMutex, getAssetURI } from "../cameraUpload"
import { getThumbnailCacheKey } from "../thumbnails"
import { decryptFolderNamePrivateKey, decryptFileMetadataPrivateKey, decryptFolderName, decryptFileMetadata, FileMetadata } from "../../crypto"
import { PreviewItem } from "../../../screens/ImageViewerScreen"
import * as db from "../../db"

export interface BuildFolder {
    folder: any,
    name?: string,
    masterKeys?: string[],
    sharedIn?: boolean,
    privateKey?: string
}

export const buildFolder = async ({ folder, name = "", masterKeys = [], sharedIn = false, privateKey = "" }: BuildFolder): Promise<Item> => {
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

    const folderLastModified = convertTimestampToMs(folder.timestamp)
    const cachedSize = memoryCache.has("folderSizeCache:" + folder.uuid) ? memoryCache.get("folderSizeCache:" + folder.uuid) : await db.get("folderSizeCache:" + folder.uuid)

    return {
        id: folder.uuid,
        type: "folder",
        uuid: folder.uuid,
        name: striptags(name),
        date: simpleDate(folderLastModified),
        timestamp: folder.timestamp,
        lastModified: folderLastModified,
        lastModifiedSort: parseFloat(folderLastModified + "." + folder.uuid.replace(/\D/g, "")),
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
        size: cachedSize ? cachedSize > 0 ? cachedSize : 0 : 0,
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
}

export interface BuildFile {
    file: any,
    metadata?: FileMetadata,
    masterKeys?: string[],
    sharedIn?: boolean,
    privateKey?: string,
    routeURL?: string,
    userId?: number
}

export const buildFile = async ({ file, metadata = { name: "", mime: "", size: 0, key: "", lastModified: 0, hash: "" }, masterKeys = [], sharedIn = false, privateKey = "", routeURL = "", userId = 0 }: BuildFile): Promise<Item> => {
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

    const fileLastModified = typeof metadata.lastModified == "number" && !isNaN(metadata.lastModified) && metadata.lastModified > 1348846653  ? convertTimestampToMs(metadata.lastModified) : convertTimestampToMs(file.timestamp)
    const isAvailableOffline = await db.has(userId + ":offlineItems:" + file.uuid)

    return {
        id: file.uuid,
        type: "file",
        uuid: file.uuid,
        name: striptags(metadata.name),
        mime: metadata.mime,
        size: typeof file.size == "number" ? file.size : typeof file.chunks_size == "number" ? file.chunks_size : 0,
        key: metadata.key,
        lastModified: fileLastModified,
        lastModifiedSort: parseFloat(fileLastModified + "." + file.uuid.replace(/\D/g, "")),
        bucket: file.bucket,
        region: file.region,
        parent: file.parent || "base",
        rm: file.rm,
        chunks: file.chunks,
        date: simpleDate(fileLastModified),
        timestamp: file.timestamp,
        receiverId: typeof file.receiverId == "number" ? file.receiverId : 0,
        receiverEmail: typeof file.receiverEmail == "string" ? file.receiverEmail : undefined,
        sharerId: typeof file.sharerId == "number" ? file.sharerId : 0,
        sharerEmail: typeof file.sharerEmail == "string" ? file.sharerEmail : undefined,
        offline: isAvailableOffline,
        version: file.version,
        favorited: file.favorited,
        thumbnail: thumbnailCachePath,
        selected: false,
        color: null,
        isBase: false,
        isSync: false,
        isDefault: false,
        hash: typeof metadata.hash == "string" && metadata.hash.length > 0 ? metadata.hash : ""
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

        return [...folders, ...files.sort((a, b) => b.lastModifiedSort - a.lastModifiedSort)]
    }

    const sortBy = JSON.parse(storage.getString("sortBy") || "{}")

    if(routeURL.indexOf("recents") !== -1){
        items = items
    }
    else{
        items = orderItemsByType(items, sortBy[routeURL])
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

export const loadItems = async (route: any, skipCache: boolean = false): Promise<{ cached: boolean, items: Item[] }> => {
    const uuid: string = getParent(route)
    const url: string = getRouteURL(route)
    const userId = storage.getNumber("userId")
    const masterKeys = getMasterKeys()
    const privateKey = storage.getString("privateKey")

    if(userId == 0 || masterKeys.length <= 0){
        throw new Error("Invalid user data")
    }

    const refresh = async (): Promise<{ cached: boolean, items: Item[] }> => {
        if(!isOnline()){
            throw new Error("Device offline")
        }

        let items: Item[] = []

        if(url.indexOf("recents") !== -1){
            const response = await apiRequest({
                method: "POST",
                endpoint: "/v1/user/recent",
                data: {
                    apiKey: getAPIKey()
                }
            })
    
            if(!response.status){
                throw new Error(response.message)
            }
    
            for(const file of response.data){
                items.push(await buildFile({ file, masterKeys, userId }))
            }
        }
        else if(url.indexOf("shared-in") !== -1){
            if(typeof privateKey !== "string"){
                throw new Error("Invalid user data")
            }

            const response = await apiRequest({
                method: "POST",
                endpoint: "/v1/user/shared/in",
                data: {
                    apiKey: getAPIKey(),
                    uuid,
                    folders: JSON.stringify(["shared-in"]),
                    page: 1,
                    app: "true"
                }
            })
    
            if(!response.status){
                throw new Error(response.message)
            }
    
            for(const folder of response.data.folders){
                const item = await buildFolder({ folder, masterKeys, sharedIn: true, privateKey })

                items.push(item)
                
                await db.set("itemCache:folder:" + folder.uuid, item).catch(console.error)

                memoryCache.set("itemCache:folder:" + folder.uuid, item)
            }
    
            for(const file of response.data.uploads){
                items.push(await buildFile({ file, masterKeys, sharedIn: true, privateKey, userId }))
            }
        }
        else if(url.indexOf("shared-out") !== -1){
            const response = await apiRequest({
                method: "POST",
                endpoint: "/v1/user/shared/out",
                data: {
                    apiKey: getAPIKey(),
                    uuid,
                    folders: JSON.stringify(["default"]),
                    page: 1,
                    app: "true",
                    receiverId: global.currentReceiverId
                }
            })
    
            if(!response.status){
                throw new Error(response.message)
            }
    
            for(let folder of response.data.folders){
                folder.name = folder.metadata
                
                const item = await buildFolder({ folder, masterKeys })
    
                items.push(item)
                
                await db.set("itemCache:folder:" + folder.uuid, item).catch(console.error)

                memoryCache.set("itemCache:folder:" + folder.uuid, item)
            }
    
            for(const file of response.data.uploads){
                items.push(await buildFile({ file, masterKeys, userId }))
            }
    
            const groups: Item[] = []
            const sharedTo: { [key: string]: ItemReceiver[] } = {}
            const added: { [key: string]: boolean } = {}
    
            for(let i = 0; i < items.length; i++){
                if(Array.isArray(sharedTo[items[i].uuid])){
                    sharedTo[items[i].uuid].push({
                        id: items[i].receiverId,
                        email: items[i].receiverEmail
                    })
                }
                else{
                    sharedTo[items[i].uuid] = [{
                        id: items[i].receiverId,
                        email: items[i].receiverEmail
                    }]
                }
            }
    
            for(let i = 0; i < items.length; i++){
                if(Array.isArray(sharedTo[items[i].uuid])){
                    items[i].receivers = sharedTo[items[i].uuid]
                }
    
                if(!added[items[i].uuid]){
                    added[items[i].uuid] = true
    
                    groups.push(items[i])
                }
            }
    
            items = groups
        }
        else if(url.indexOf("photos") !== -1){
            const cameraUploadParent = storage.getString("cameraUploadFolderUUID:" + userId)
    
            if(typeof cameraUploadParent !== "string"){
                return {
                    cached: false,
                    items: []
                }
            }

            if(cameraUploadParent.length < 16){
                return {
                    cached: false,
                    items: []
                }
            }

            let folderExists: boolean = false
            const isFolderPresent = await folderPresent({ uuid: cameraUploadParent })

            if(isFolderPresent.present){
                if(!isFolderPresent.trash){
                    folderExists = true
                }
            }

            if(!folderExists){
                return {
                    cached: false,
                    items: []
                }
            }

            const response = await apiRequest({
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

            if(!response.status){
                throw new Error(response.message)
            }
    
            for(const file of response.data.uploads){
                const item = await buildFile({ file, masterKeys, userId })
    
                if(canCompressThumbnail(getFileExt(item.name))){
                    items.push(item)
                }
            }
        }
        else if(url.indexOf("offline") !== -1){
            const [ list, offlinePath ] = await Promise.all([
                getOfflineList(),
                getDownloadPath({ type: "offline" })
            ])
    
            for(let file of list){
                file.offline = true
    
                const itemOfflinePath = getItemOfflinePath(offlinePath, file)
    
                if(!(await fs.stat(itemOfflinePath)).exists){
                    await removeFromOfflineStorage({ item: file })

                    if(isOnline()){
                        queueFileDownload({
                            file,
                            storeOffline: true
                        }).catch(console.error)
                    }
                }
                else{
                    items.push(file)
                }
            }
    
            checkOfflineItems(items).catch(console.error)
        }
        else{
            const response = await apiRequest({
                method: "POST",
                endpoint: "/v1/dir/content",
                data: {
                    apiKey: getAPIKey(),
                    uuid,
                    folders: JSON.stringify(["default"]),
                    page: 1,
                    app: "true"
                }
            })
    
            if(!response.status){
                throw new Error(response.message)
            }
    
            for(const folder of response.data.folders){
                const item = await buildFolder({ folder, masterKeys })
    
                items.push(item)

                await db.set("itemCache:folder:" + folder.uuid, item).catch(console.error)

                memoryCache.set("itemCache:folder:" + folder.uuid, item)
            }
    
            for(const file of response.data.uploads){
                items.push(await buildFile({ file, masterKeys, userId }))
            }
        }

        items = sortItems({ items, passedRoute: route }).filter(item => item !== null && typeof item.uuid == "string" && item.name.length > 0)

        await db.set("loadItems:" + url, items)

        memoryCache.set("loadItems:" + url, items)

        return {
            cached: false,
            items
        }
    }

    const cached = await db.get("loadItems:" + url)

    if(!isOnline()){
        if(cached && Array.isArray(cached)){
            memoryCache.set("loadItems:" + url, sortItems({ items: cached, passedRoute: route }).filter(item => item !== null && typeof item.uuid == "string" && item.name.length > 0))

            return {
                cached: true,
                items: cached as Item[]
            }
        }
        
        return {
            cached: false,
            items: []
        }
    }

    if(cached && !skipCache){
        memoryCache.set("loadItems:" + url, cached)

        return {
            cached: true,
            items: cached as Item[]
        }
    }

    return await refresh()
}

export const previewItem = async ({ item, setCurrentActionSheetItem = true, navigation }: { item: Item, setCurrentActionSheetItem?: boolean, navigation?: any }) => {
    if(item.size >= (MB * 1024)){
        DeviceEventEmitter.emit("event", {
            type: "open-item-actionsheet",
            data: item
        })

        return
    }

    const previewType = getFilePreviewType(getFileExt(item.name))
    const canThumbnail = canCompressThumbnail(getFileExt(item.name))

    if(!["image", "video", "text", "code", "pdf", "doc", "audio"].includes(previewType)){
        DeviceEventEmitter.emit("event", {
            type: "open-item-actionsheet",
            data: item
        })

        return
    }

    let existsOffline = false
    let offlinePath = ""

    try{
        offlinePath = getItemOfflinePath(await getDownloadPath({ type: "offline" }), item)

        if((await fs.stat(offlinePath)).exists){
            existsOffline = true
        }
    }
    catch(e){
        //console.log(e)
    }

    if(previewType == "image"){
        if(!canThumbnail){
            DeviceEventEmitter.emit("event", {
                type: "open-item-actionsheet",
                data: item
            })
    
            return
        }

        if(typeof item.thumbnail !== "string"){
            return
        }

        if(!isOnline() && !existsOffline){
            showToast({ message: i18n(storage.getString("lang"), "deviceOffline") })

            return
        }
        
        return setImmediate(() => {
            const currentItems = useStore.getState().currentItems

            if(!Array.isArray(currentItems)){
                return
            }

            const currentImages: PreviewItem[] = []
            let currentIndex = 0
            const addedImages: Record<string, boolean> = {}
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
                fs.readAsString(path, "utf8").then((content) => {
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
        open(offlinePath, true)

        return
    }

    if(!isOnline() && !existsOffline){
        showToast({ message: i18n(storage.getString("lang"), "deviceOffline") })

        return
    }

    if(storage.getBoolean("onlyWifiDownloads:" + storage.getNumber("userId")) && !isWifi()){
        showToast({ message: i18n(storage.getString("lang"), "onlyWifiDownloads") })

        return
    }

    useStore.setState({ fullscreenLoadingModalVisible: true, fullscreenLoadingModalDismissable: true })

    queueFileDownload({
        file: item,
        optionalCallback: (err: any, path: string) => {
            useStore.setState({ fullscreenLoadingModalVisible: false })

            if(err){
                console.log(err)

                showToast({ message: err.toString() })

                return
            }

            open(path)
        },
        isPreview: true
    }).catch((err) => {
        if(err == "stopped"){
            return
        }

        if(err == "wifiOnly"){
            showToast({ message: i18n(storage.getString("lang"), "onlyWifiDownloads") })

            return
        }

        console.error(err)

        showToast({ message: err.toString() })
    })
}

export const convertHeic = async (item: Item, path: string): Promise<string> => {
    const tmpPath = await getDownloadPath({ type: "temp" })
    const outputPath: string = tmpPath + item.uuid + "_convertHeic.jpg"

    try{
        if((await fs.stat(outputPath)).exists){
            return outputPath
        }
    }
    catch(e){
        //console.log(e)
    }

    return global.nodeThread.convertHeic({
        input: path,
        output: outputPath,
        format: "JPEG"
    })
}

export const addToSavedToGallery = async (asset: Asset) => {
    await getLocalAssetsMutex.acquire()

    try{
        const assetURI = await getAssetURI(asset)
        const stat = await fs.stat(assetURI)

        await Promise.all([
            db.cameraUpload.setLastModified(asset, convertTimestampToMs(asset.modificationTime)),
            db.cameraUpload.setLastModifiedStat(asset, convertTimestampToMs(stat.modificationTime || asset.modificationTime)),
            db.cameraUpload.setLastSize(asset, stat.size || 0)
        ])
    }
    catch(e){
        console.error(e)
    }

    getLocalAssetsMutex.release()
}