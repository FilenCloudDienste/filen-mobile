import { apiRequest, fetchOfflineFilesInfo, fetchFolderSize } from "../api"
import { storage } from "../storage"
import { decryptFolderName, decryptFileMetadata, getAPIKey, orderItemsByType, getFilePreviewType, getFileExt, getParent, getRouteURL, decryptFolderNamePrivateKey, decryptFileMetadataPrivateKey, canCompressThumbnail } from "../helpers"
import striptags from "striptags"
import { downloadWholeFileFSStream, getDownloadPath, queueFileDownload } from "../download"
import RNFS from "react-native-fs"
import { DeviceEventEmitter, Platform } from "react-native"
import { useStore } from "../state"
import FileViewer from "react-native-file-viewer"
import { Image } from "react-native-compressor"
import { getOfflineList, removeFromOfflineStorage, changeItemNameInOfflineList, getItemOfflinePath } from "./offline"
import { showToast } from "../../components/Toasts"
import { i18n } from "../../i18n/i18n"

let isGeneratingThumbnailForItemUUID = {}

export const buildFolder = async ({ folder, name = "", masterKeys = undefined, sharedIn = false, privateKey = undefined, email = undefined, routeURL }) => {
    const uploadDate = (new Date(folder.timestamp * 1000)).toString().split(" ")
    
    if(!sharedIn){
        if(typeof masterKeys !== "undefined" && typeof folder.name !== "undefined"){
            name = await decryptFolderName(masterKeys, folder.name, folder.uuid)
        }
    }
    else{
        if(typeof privateKey !== "undefined" && typeof folder.metadata !== "undefined"){
            name = await decryptFolderNamePrivateKey(privateKey, folder.metadata, folder.uuid)
        }
    }

    return {
        id: folder.uuid,
        type: "folder",
        uuid: folder.uuid,
        name: striptags(name),
        date: uploadDate[1] + " " + uploadDate[2] + " " + uploadDate[3] + " " + uploadDate[4],
        timestamp: folder.timestamp,
        parent: folder.parent || "base",
        receiverId: typeof folder.receiverId == "number" ? folder.receiverId : 0,
        receiverEmail: typeof folder.receiverEmail == "string" ? folder.receiverEmail : undefined,
        sharerId: typeof folder.sharerId == "number" ? folder.sharerId : 0,
        sharerEmail: typeof folder.sharerEmail == "string" ? folder.sharerEmail : undefined,
        color: folder.color || null,
        favorited: folder.favorited || 0,
        isBase: typeof folder.parent == "string" ? false : true,
        isSync: folder.is_sync || false,
        isDefault: folder.is_default || false,
        size: typeof routeURL == "string" ? getFolderSizeFromCache({ folder, routeURL }) : 0,
        selected: false
    }
}

export const buildFile = async ({ file, metadata = undefined, masterKeys = undefined, sharedIn = false, privateKey = undefined, email = undefined, routeURL }) => {
    const uploadDate = (new Date(file.timestamp * 1000)).toString().split(" ")

    if(!sharedIn){
        if(typeof masterKeys !== "undefined" && typeof file.metadata !== "undefined"){
            metadata = await decryptFileMetadata(masterKeys, file.metadata, file.uuid)
        }
    }
    else{
        if(typeof privateKey !== "undefined" && typeof file.metadata !== "undefined"){
            metadata = await decryptFileMetadataPrivateKey(file.metadata, privateKey, file.uuid)
        }
    }

    let thumbnailCachePath = undefined
    const thumbnailCacheKey = getThumbnailCacheKey({ uuid: file.uuid }).cacheKey

    if(canCompressThumbnail(getFileExt(striptags(metadata.name)))){
        try{
            var thumbnailCache = storage.getString(thumbnailCacheKey)
        }
        catch(e){
            //console.log(e)
        }

        if(typeof thumbnailCache == "string"){
            if(thumbnailCache.length > 0){
                thumbnailCachePath = thumbnailCache
            }
        }
    }

    return {
        id: file.uuid,
        type: "file",
        uuid: file.uuid,
        name: striptags(metadata.name),
        mime: striptags(metadata.mime),
        size: parseInt(file.size),
        key: striptags(metadata.key),
        lastModified: parseInt(typeof metadata.lastModified == "number" ? metadata.lastModified : file.timestamp),
        bucket: file.bucket,
        region: file.region,
        parent: file.parent || "base",
        rm: file.rm,
        chunks: file.chunks,
        date: uploadDate[1] + " " + uploadDate[2] + " " + uploadDate[3] + " " + uploadDate[4],
        timestamp: parseInt(file.timestamp),
        receiverId: typeof file.receiverId == "number" ? file.receiverId : 0,
        receiverEmail: typeof file.receiverEmail == "string" ? file.receiverEmail : undefined,
        sharerId: typeof file.sharerId == "number" ? file.sharerId : 0,
        sharerEmail: typeof file.sharerEmail == "string" ? file.sharerEmail : undefined,
        offline: typeof email !== "undefined" ? (storage.getBoolean(email + ":offlineItems:" + file.uuid) ? true : false) : false,
        version: parseInt(file.version),
        favorited: file.favorited,
        thumbnail: thumbnailCachePath,
        selected: false
    }
}

export const sortItems = ({ items, passedRoute = undefined }) => {
    let routeURL = ""

    if(typeof passedRoute !== "undefined"){
        routeURL = getRouteURL(passedRoute)
    }
    else{
        routeURL = getRouteURL()
    }

    if(routeURL.indexOf("photos") !== -1){
        return items.sort((a, b) => {
            return b.lastModified > a.lastModified
        })
    }

    if(routeURL.indexOf("recents") !== -1){
        items = items
    }
    else{
        items = orderItemsByType(items, "nameAsc")
    }

    return items
}

export const loadItems = async ({ parent, prevItems, setItems, masterKeys, setLoadDone, bypassCache = false, isFollowUpRequest = false, callStack = 0, navigation, isMounted, route, setProgress }) => {
    const updateProgress = (done, total) => {
        return false

        if(typeof isMounted == "function"){
            if(isMounted() && typeof setProgress == "function"){
                setProgress({ itemsDone: done, totalItems: total })
            }
        }
    }

    try{
        var email = storage.getString("email")

        if(typeof email !== "string"){
            console.log("email in storage !== string")

            return false
        }

        if(email.length < 1){
            console.log("email in storage invalid length")

            return false
        }
    }
    catch(e){
        console.log(e)

        return false
    }
    
    let items = []
    let isDeviceOnline = true //TODO
    const routeURL = getRouteURL(route)
    const cacheKey = "loadItemsCache:" + routeURL

    try{
        var cache = JSON.parse(storage.getString(cacheKey))
    }
    catch(e){
        //console.log(e)
    }

    if(!isDeviceOnline){
		bypassCache = false
	}

    if(typeof cache == "object" && !bypassCache){
        if(callStack == 0 && isDeviceOnline){
            setLoadDone(true)

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

        if(getParent(route) == parent){
            items = items = sortItems({ items, passedRoute: route })

            if(isMounted()){
                setItems(items)
                setLoadDone(true)
            }
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

        updateProgress(0, response.data.folders.length)

        let done = 0

        for(let i = 0; i < response.data.folders.length; i++){
			let folder = response.data.folders[i]

			let item = await buildFolder({ folder, masterKeys, email, routeURL })

			items.push(item)

			try{
                storage.set("itemCache:folder:" + folder.uuid, JSON.stringify(item))
            }
            catch(e){
                //console.log(e)
            }

            done += 1

            updateProgress(done, response.data.folders.length)
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

        updateProgress(0, response.data.length)

        let done = 0

        for(let i = 0; i < response.data.length; i++){
            let file = response.data[i]
            
            let item = await buildFile({ file, masterKeys, email })

            items.push(item)

			try{
                storage.set("itemCache:file:" + file.uuid, JSON.stringify(item))
            }
            catch(e){
                //console.log(e)
            }

            done += 1

            updateProgress(done, response.data.length)
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

        try{
            var privateKey = storage.getString("privateKey")
        }
        catch(e){
            console.log(e)

            return false
        }

        updateProgress(0, (response.data.folders.length + response.data.uploads.length))

        let done = 0

        for(let i = 0; i < response.data.folders.length; i++){
			let folder = response.data.folders[i]
			
            let item = await buildFolder({ folder, masterKeys, sharedIn: true, privateKey, email, routeURL })

			items.push(item)

			try{
                storage.set("itemCache:folder:" + folder.uuid, JSON.stringify(item))
            }
            catch(e){
                //console.log(e)
            }

            done += 1

            updateProgress(done, (response.data.folders.length + response.data.uploads.length))
		}

        for(let i = 0; i < response.data.uploads.length; i++){
            let file = response.data.uploads[i]

            let item = await buildFile({ file, masterKeys, sharedIn: true, privateKey, email })

            items.push(item)

			try{
                storage.set("itemCache:file:" + file.uuid, JSON.stringify(item))
            }
            catch(e){
                //console.log(e)
            }

            done += 1

            updateProgress(done, (response.data.folders.length + response.data.uploads.length))
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

        try{
            var privateKey = storage.getString("privateKey")
        }
        catch(e){
            console.log(e)

            return false
        }

        updateProgress(0, (response.data.folders.length + response.data.uploads.length))

        let done = 0

        for(let i = 0; i < response.data.folders.length; i++){
			let folder = response.data.folders[i]

            folder.name = folder.metadata
			
            let item = await buildFolder({ folder, masterKeys, email, routeURL })

			items.push(item)

			try{
                storage.set("itemCache:folder:" + folder.uuid, JSON.stringify(item))
            }
            catch(e){
                //console.log(e)
            }

            done += 1

            updateProgress(done, (response.data.folders.length + response.data.uploads.length))
		}

        for(let i = 0; i < response.data.uploads.length; i++){
            let file = response.data.uploads[i]

            let item = await buildFile({ file, masterKeys, email })

            items.push(item)

			try{
                storage.set("itemCache:file:" + file.uuid, JSON.stringify(item))
            }
            catch(e){
                //console.log(e)
            }

            done += 1

            updateProgress(done, (response.data.folders.length + response.data.uploads.length))
        }
    }
    else if(parent == "photos"){
        try{
            var cameraUploadParent = storage.getString("cameraUploadFolderUUID:" + email)
        }
        catch(e){
            //console.log(e)
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
        
                for(let i = 0; i < response.data.uploads.length; i++){
                    let file = response.data.uploads[i]
        
                    let item = await buildFile({ file, masterKeys, email })
        
                    if(getFilePreviewType(getFileExt(item.name)) == "image"){
                        items.push(item)
                    }
        
                    try{
                        storage.set("itemCache:file:" + file.uuid, JSON.stringify(item))
                    }
                    catch(e){
                        //console.log(e)
                    }
                }
            }
        }
    }
    else if(parent == "offline"){
        try{
            var list = await getOfflineList()
        }
        catch(e){
            console.log(e)

            return false
        }

        for(let i = 0; i < list.length; i++){
            let file = list[i]

            file.offline = true

            items.push(file)
        }

        const offlineFilesToFetchInfo = items.map(item => item.uuid)

        if(offlineFilesToFetchInfo.length > 0){
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
                                        const uploadDate = (new Date(offlineFilesInfo[prop].versionedInfo.timestamp * 1000)).toString().split(" ")

                                        newItem.uuid = offlineFilesInfo[prop].versionedUUID
                                        newItem.region = offlineFilesInfo[prop].versionedInfo.region
                                        newItem.bucket = offlineFilesInfo[prop].versionedInfo.bucket
                                        newItem.chunks = offlineFilesInfo[prop].versionedInfo.chunks
                                        newItem.timestamp = offlineFilesInfo[prop].versionedInfo.timestamp
                                        newItem.rm = offlineFilesInfo[prop].versionedInfo.rm
                                        newItem.thumbnail = undefined
                                        newItem.date = uploadDate[1] + " " + uploadDate[2] + " " + uploadDate[3] + " " + uploadDate[4]
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

                                                return resolve()
                                            }).catch(reject)
                                        })
                                    }
                                }
                            }
                        }
                        catch(e){
                            //console.log(e)
                        }
                    }
                    else{
                        try{
                            await removeFromOfflineStorage({ item: items[i] })
                        }
                        catch(e){
                            //console.log(e)
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

        updateProgress(0, (response.data.folders.length + response.data.uploads.length))

        let done = 0

        for(let i = 0; i < response.data.folders.length; i++){
			let folder = response.data.folders[i]
			
            let item = await buildFolder({ folder, masterKeys, email, routeURL })

			items.push(item)

			try{
                storage.set("itemCache:folder:" + folder.uuid, JSON.stringify(item))
            }
            catch(e){
                //console.log(e)
            }

            done += 1

            updateProgress(done, (response.data.folders.length + response.data.uploads.length))
		}

        for(let i = 0; i < response.data.uploads.length; i++){
            let file = response.data.uploads[i]

            let item = await buildFile({ file, masterKeys, email })

            items.push(item)

			try{
                storage.set("itemCache:file:" + file.uuid, JSON.stringify(item))
            }
            catch(e){
                //console.log(e)
            }

            done += 1

            updateProgress(done, (response.data.folders.length + response.data.uploads.length))
        }
    }

    items = sortItems({ items, passedRoute: route })

    try{
        storage.set(cacheKey, JSON.stringify(items))
    }
    catch(e){
        //console.log(e)
    }

    if(getParent(route) == parent){
        if(isMounted()){
            setItems(items)
            setLoadDone(true)
        }
    }

    return true
}

export const getFolderSizeCacheKey = ({ folder, routeURL }) => {
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

export const getFolderSizeFromCache = ({ folder, routeURL }) => {
    const cacheKey = getFolderSizeCacheKey({ folder, routeURL })

    try{
        var cache = storage.getNumber(cacheKey)
        var timeout = storage.getNumber(cacheKey + ":timeout")
    }
    catch(e){
        return 0
    }

    if(Math.floor(+new Date()) > timeout){
        fetchFolderSize({ folder, routeURL }).then((size) => {
            try{
                storage.set(cacheKey, size)
                storage.set(cacheKey + ":timeout", (Math.floor(+new Date()) + 60000))
            }
            catch(e){
                console.log(e)
            }
    
            DeviceEventEmitter.emit("event", {
                type: "folder-size",
                data: {
                    uuid: folder.uuid,
                    size
                }
            })
        }).catch((err) => {
            console.log(err)
        })
    }

    return cache
}

export const getThumbnailCacheKey = ({ uuid }) => {
    const width = 512, height = 512, quality = 0.7, thumbnailVersion = "2.0.4"
    const cacheKey = "thumbnailCache:" + uuid + ":" + width + ":" + height + ":" + quality + ":" + thumbnailVersion

    return {
        width,
        height,
        quality,
        thumbnailVersion,
        cacheKey
    }
}

export const generateItemThumbnail = ({ item }) => {
    if(typeof item.thumbnail == "string"){
        return false
    }

    if(typeof global.visibleItems[item.uuid] == "undefined"){
        return false
    }

    if(typeof global.cachedThumbnailPaths[item.uuid] !== "undefined"){
        DeviceEventEmitter.emit("event", {
            type: "thumbnail-generated",
            data: {
                uuid: item.uuid,
                path: global.cachedThumbnailPaths[item.uuid]
            }
        })

        return true 
    }

    const { width, height, quality, cacheKey } = getThumbnailCacheKey({ uuid: item.uuid })

    try{
        var cache = storage.getString(cacheKey)
    }
    catch(e){
        //console.log(e)
    }

    if(typeof cache == "string"){
        if(cache.length > 0){
            global.cachedThumbnailPaths[item.uuid] = cache

            DeviceEventEmitter.emit("event", {
                type: "thumbnail-generated",
                data: {
                    uuid: item.uuid,
                    path: cache
                }
            })

            return true
        }
    }

    const appState = useStore.getState() 

    if(!appState.netInfo.isConnected || !appState.netInfo.isInternetReachable){
        return false
    }

    if(typeof isGeneratingThumbnailForItemUUID[item.uuid] !== "undefined"){
        return false
    }

    isGeneratingThumbnailForItemUUID[item.uuid] = true

    global.generateThumbnailSemaphore.acquire().then(() => {
        if(typeof global.visibleItems[item.uuid] == "undefined"){
            delete isGeneratingThumbnailForItemUUID[item.uuid]
        
            global.generateThumbnailSemaphore.release()

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
                    Image.compress(path, {
                        compressionMethod: "manual",
                        maxWidth: width,
                        maxHeight: height,
                        quality,
                        input: "uri",
                        output: "jpg",
                        returnableOutputType: "uri"
                    }).then((compressed) => {
                        RNFS.moveFile(compressed, dest).then(() => {
                            try{
                                storage.set(cacheKey, dest)
                            }
                            catch(e){
                                console.log(e)
                            }
        
                            global.cachedThumbnailPaths[item.uuid] = dest
            
                            DeviceEventEmitter.emit("event", {
                                type: "thumbnail-generated",
                                data: {
                                    uuid: item.uuid,
                                    path: dest
                                }
                            })
    
                            delete isGeneratingThumbnailForItemUUID[item.uuid]
            
                            global.generateThumbnailSemaphore.release()
                        }).catch((err) => {
                            console.log(err)
    
                            delete isGeneratingThumbnailForItemUUID[item.uuid]
            
                            global.generateThumbnailSemaphore.release()
                        })
                    }).catch((err) => {
                        console.log(err)
    
                        delete isGeneratingThumbnailForItemUUID[item.uuid]
            
                        global.generateThumbnailSemaphore.release()
                    })
                }).catch((err) => {
                    console.log(err)
    
                    delete isGeneratingThumbnailForItemUUID[item.uuid]
                })
            }).catch((err) => {
                console.log(err)
    
                delete isGeneratingThumbnailForItemUUID[item.uuid]
            })
        }
    })
}

export const previewItem = async ({ item, setCurrentActionSheetItem = true }) => {
    const previewType = getFilePreviewType(getFileExt(item.name))

    if(!["image", "video", "text", "code", "pdf", "doc", "audio"].includes(previewType)){
        DeviceEventEmitter.emit("event", {
            type: "open-item-actionsheet",
            data: item
        })

        return false
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

    const open = (path) => {
        setTimeout(() => {
            useStore.setState({ fullscreenLoadingModalVisible: false })

            if(previewType == "image"){
                /*const currentImages = []

                const imgPath = decodeURIComponent(path.indexOf("file://") == -1 ? "file://" + path : path)

                currentImages.push({
                    uri: imgPath
                })

                if(setCurrentActionSheetItem){
                    useStore.setState({ currentActionSheetItem: item })
                }

                useStore.setState({ imageViewerImages: currentImages })

                setStatusBarStyle(true)

                useStore.setState({ imageViewerModalVisible: true })*/

                FileViewer.open(path, {
                    displayName: item.name,
                    showOpenWithDialog: true
                }).then(() => {
                    //console.log(path)
                }).catch((err) => {
                    console.log(err)

                    showToast({ message: i18n(storage.getString("lang"), "couldNotOpenFileLocally", true, ["__NAME__"], [item.name]) })
                })
            }
            else if(previewType == "video"){
                FileViewer.open(path, {
                    displayName: item.name,
                    showOpenWithDialog: true
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
                    showOpenWithDialog: true
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

                    useStore.setState({ textViewerModalContent: content })
                    useStore.setState({ textViewerModalType: previewType })
                    useStore.setState({ textViewerModalVisible: true })
                }).catch((err) => {
                    console.log(err)
                })
            }
        }, existsOffline ? 1 : 250)
    }

    if(existsOffline){
        return open(offlinePath)
    }

    const appState = useStore.getState() 

    if(!appState.netInfo.isConnected || !appState.netInfo.isInternetReachable){
        return showToast({ message: i18n(storage.getString("lang"), "deviceOffline") })
    }

    useStore.setState({ fullscreenLoadingModalVisible: true })

    downloadWholeFileFSStream({
        file: item
    }).then((path) => {
        open(path)
    }).catch((err) => {
        useStore.setState({ fullscreenLoadingModalVisible: false })

        console.log(err)
    })
}