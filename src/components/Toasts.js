import React, { useState, useEffect, useCallback, memo, useRef } from "react"
import { View, Text, Platform, TouchableOpacity, DeviceEventEmitter } from "react-native"
import { storage } from "../lib/storage"
import { useMMKVBoolean, useMMKVString } from "react-native-mmkv"
import { useStore, navigationAnimation } from "../lib/state"
import { getParent, getFilenameFromPath, getRouteURL, getRandomArbitrary } from "../lib/helpers"
import { moveFile, moveFolder, folderExists, fileExists, bulkMove } from "../lib/api"
import { i18n } from "../i18n/i18n"
import { CommonActions } from "@react-navigation/native"
import ReactNativeBlobUtil from "react-native-blob-util"
import RNFS from "react-native-fs"
import { getDownloadPath } from "../lib/download"
import { queueFileUpload } from "../lib/upload"
import getPath from "@flyerhq/react-native-android-uri-path"
import BackgroundTimer from "react-native-background-timer"

const mime = require("mime-types")

let moveToastId = undefined
let uploadToastId = undefined
let cameraUploadChooseFolderToastId = undefined
const toastQueueLimit = 3
let currentToastQueue = 0

export const showToast = ({ type = "normal", message, swipeEnabled = false, duration = 5000, animationType = "slide-in", animationDuration = 100, bottomOffset = 0, offset = 50, offsetBottom = 50, offsetTop = 50, placement = "bottom", navigation = undefined }) => {
    if(currentToastQueue >= toastQueueLimit){
        return BackgroundTimer.setTimeout(() => {
            showToast({
                type,
                message,
                swipeEnabled,
                duration,
                animationType,
                animationDuration,
                bottomOffset,
                offset,
                offsetBottom,
                offsetTop,
                placement,
                navigation
            })
        }, 100)
    }

    currentToastQueue += 1

    BackgroundTimer.setTimeout(() => {
        currentToastQueue -= 1
    }, (duration + getRandomArbitrary(500, 1000)))
    
    const darkMode = storage.getBoolean("darkMode")
    const insets = useStore.getState().insets

    if(typeof insets !== "undefined"){
        offsetBottom = insets.bottom + 55
        offsetTop = insets.top + 80
    }

    useStore.setState({
        toastBottomOffset: offsetBottom,
        toastTopOffset: offsetTop
    })

    if(type == "normal"){
        var toastId = global.toast.show(<NormalToast message={message} />, {
            type: "custom",
            style: {
                backgroundColor: darkMode ? "#171717" : "lightgray",
                borderRadius: 10
            },
            swipeEnabled,
            duration,
            animationType,
            animationDuration,
            placement
        })
    }
    else if(type == "move"){
        hideAllToasts()
        
        var toastId = global.toast.show(<MoveToast message={message} />, {
            type: "custom",
            style: {
                backgroundColor: darkMode ? "#171717" : "lightgray",
                borderRadius: 10
            },
            swipeEnabled,
            duration: 86400000,
            animationType,
            animationDuration,
            placement
        })

        moveToastId = toastId
    }
    else if(type == "moveBulk"){
        hideAllToasts()
        
        var toastId = global.toast.show(<MoveBulkToast message={message} />, {
            type: "custom",
            style: {
                backgroundColor: darkMode ? "#171717" : "lightgray",
                borderRadius: 10
            },
            swipeEnabled,
            duration: 86400000,
            animationType,
            animationDuration,
            placement
        })

        moveToastId = toastId
    }
    else if(type == "upload"){
        hideAllToasts()
        
        var toastId = global.toast.show(<UploadToast message={message} />, {
            type: "custom",
            style: {
                backgroundColor: darkMode ? "#171717" : "lightgray",
                borderRadius: 10
            },
            swipeEnabled,
            duration: 86400000,
            animationType,
            animationDuration,
            placement
        })

        uploadToastId = toastId
    }
    else if(type == "cameraUploadChooseFolder"){
        hideAllToasts()

        var toastId = global.toast.show(<CameraUploadChooseFolderToast message={message} navigation={navigation} />, {
            type: "custom",
            style: {
                backgroundColor: darkMode ? "#171717" : "lightgray",
                borderRadius: 10
            },
            swipeEnabled,
            duration: 86400000,
            animationType,
            animationDuration,
            placement
        })

        cameraUploadChooseFolderToastId = toastId
    }

    return toastId
}

export const hideToast = ({ id }) => {
    return global.toast.hide(id)
}

export const hideAllToasts = () => {
    return global.toast.hideAll()
}

export const NormalToast = memo(({ message }) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)

    return (
        <View pointerEvents="box-none" style={{
            zIndex: 99999
        }}>
            <Text style={{
                color: darkMode ? "white" : "black"
            }}>
                {message}
            </Text>
        </View>
    )
})

export const MoveToast = memo(({ message }) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const currentActionSheetItem = useStore(useCallback(state => state.currentActionSheetItem))
    const [buttonsDisabled, setButtonsDisabled] = useState(false)
    const [lang, setLang] = useMMKVString("lang", storage)
    const initParent = useRef()
    const currentRoutes = useStore(useCallback(state => state.currentRoutes))
    const [currentParent, setCurrentParent] = useState("")
    const [currentRouteURL, setCurrentRouteURL] = useState("")

    useEffect(() => {
        if(Array.isArray(currentRoutes)){
            const parent = getParent(currentRoutes[currentRoutes.length - 1])

            if(typeof parent == "string" && parent.length > 0){
                setCurrentParent(parent)
                setCurrentRouteURL(getRouteURL(currentRoutes[currentRoutes.length - 1]))
            }
        }
    }, [currentRoutes])

    useEffect(() => {
        DeviceEventEmitter.emit("event", {
            type: "unselect-all-items"
        })

        initParent.current = getParent()
    }, [])

    return (
        <View style={{
            flexDirection: "row",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            zIndex: 99999
        }}>
            <View style={{
                width: "50%"
            }}>
                <Text style={{
                    color: "white"
                }} numberOfLines={1}>
                    {message}
                </Text>
            </View>
            <View style={{
                flexDirection: "row",
                height: "100%"
            }}>
                <TouchableOpacity underlayColor={"transparent"} hitSlop={{
                    right: 20,
                    left: 20,
                    top: 10,
                    bottom: 10
                }} style={{
                    borderStartColor: "red",
                    height: "100%"
                }} onPress={() => {
                    if(buttonsDisabled){
                        return false
                    }

                    hideAllToasts()
                }}>
                    <Text style={{
                        color: "white",
                        fontWeight: "bold"
                    }}>
                        {i18n(lang, "cancel")}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity underlayColor={"transparent"} hitSlop={{
                    right: 20,
                    left: 20,
                    top: 10,
                    bottom: 10
                }} style={{
                    marginLeft: 20
                }} onPress={() => {
                    if(buttonsDisabled){
                        return false
                    }

                    if(
                        currentRouteURL.indexOf("shared-in") !== -1 ||
                        currentRouteURL.indexOf("recents") !== -1 ||
                        currentRouteURL.indexOf("trash") !== -1 ||
                        currentRouteURL.indexOf("photos") !== -1 ||
                        currentRouteURL.indexOf("offline") !== -1
                    ){
                        showToast({ message: i18n(lang, "cannotMoveFileHere") })

                        return false
                    }

                    const parent = getParent()

                    if([
                        "recents",
                        "shared-in",
                        "shared-out",
                        "links",
                        "favorites",
                        "offline",
                        "cloud",
                        "photos",
                        "settings"
                    ].includes(parent)){
                        showToast({ message: i18n(lang, "cannotMoveFileHere") })

                        return false
                    }

                    if(parent.length <= 32){ //&& currentActionSheetItem.type == "file"
                        showToast({ message: i18n(lang, "cannotMoveFileHere") })

                        return false
                    }

                    if(typeof currentActionSheetItem !== "object"){
                        return false
                    }

                    if(currentActionSheetItem.parent == parent){
                        showToast({ message: i18n(lang, "moveSameParentFolder") })

                        return false
                    }

                    if(getRouteURL().indexOf("shared-in") !== -1){
                        showToast({ message: i18n(lang, "cannotMoveFileHere") })

                        return false
                    }

                    setButtonsDisabled(true)

                    useStore.setState({ fullscreenLoadingModalVisible: true })

                    if(currentActionSheetItem.type == "file"){
                        fileExists({
                            name: currentActionSheetItem.name,
                            parent
                        }).then((res) => {
                            if(res.exists){
                                setButtonsDisabled(false)

                                useStore.setState({ fullscreenLoadingModalVisible: false })
    
                                return showToast({ message: i18n(lang, "alreadyExistsInThisFolder", true, ["__NAME__"], [currentActionSheetItem.name]) })
                            }

                            moveFile({
                                file: currentActionSheetItem,
                                parent
                            }).then(() => {
                                DeviceEventEmitter.emit("event", {
                                    type: "reload-list",
                                    data: {
                                        parent: initParent.current
                                    }
                                })

                                DeviceEventEmitter.emit("event", {
                                    type: "reload-list",
                                    data: {
                                        parent
                                    }
                                })

                                setTimeout(() => {
                                    setButtonsDisabled(false)

                                    useStore.setState({ fullscreenLoadingModalVisible: false })

                                    hideAllToasts()

                                    //showToast({ message: i18n(lang, "itemMoved", true, ["__NAME__"], [currentActionSheetItem.name]) })
                                }, 500)
                            }).catch((err) => {
                                setButtonsDisabled(false)

                                useStore.setState({ fullscreenLoadingModalVisible: false })

                                showToast({ message: err.toString() })
                            })
                        }).catch((err) => {
                            setButtonsDisabled(false)

                            useStore.setState({ fullscreenLoadingModalVisible: false })

                            showToast({ message: err.toString() })
                        })
                    }
                    else{
                        folderExists({
                            name: currentActionSheetItem.name,
                            parent
                        }).then((res) => {
                            if(res.exists){
                                setButtonsDisabled(false)

                                useStore.setState({ fullscreenLoadingModalVisible: false })
    
                                return showToast({ message: i18n(lang, "alreadyExistsInThisFolder", true, ["__NAME__"], [currentActionSheetItem.name]) })
                            }

                            moveFolder({
                                folder: currentActionSheetItem,
                                parent
                            }).then(() => {
                                DeviceEventEmitter.emit("event", {
                                    type: "reload-list",
                                    data: {
                                        parent: initParent
                                    }
                                })

                                DeviceEventEmitter.emit("event", {
                                    type: "reload-list",
                                    data: {
                                        parent
                                    }
                                })

                                setTimeout(() => {
                                    setButtonsDisabled(false)

                                    useStore.setState({ fullscreenLoadingModalVisible: false })

                                    hideAllToasts()

                                    //showToast({ message: i18n(lang, "itemMoved", true, ["__NAME__"], [currentActionSheetItem.name]) })
                                }, 500)
                            }).catch((err) => {
                                setButtonsDisabled(false)

                                useStore.setState({ fullscreenLoadingModalVisible: false })

                                showToast({ message: err.toString() })
                            })
                        }).catch((err) => {
                            setButtonsDisabled(false)

                            useStore.setState({ fullscreenLoadingModalVisible: false })

                            showToast({ message: err.toString() })
                        })
                    }
                }}>
                    <Text style={{
                        color: (currentRouteURL.indexOf("shared-in") == -1 && currentRouteURL.indexOf("recents") == -1 && currentRouteURL.indexOf("trash") == -1 && currentRouteURL.indexOf("photos") == -1 && currentRouteURL.indexOf("offline") == -1 && currentParent.length > 32) ? darkMode ? "white" : "black" : "gray"
                    }}>
                        {i18n(lang, "move")}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    )
})

export const UploadToast = memo(({ message }) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const [lang, setLang] = useMMKVString("lang", storage)
    const currentShareItems = useStore(useCallback(state => state.currentShareItems))
    const setCurrentShareItems = useStore(useCallback(state => state.setCurrentShareItems))
    const [items, setItems] = useState([])
    const currentRoutes = useStore(useCallback(state => state.currentRoutes))
    const [currentParent, setCurrentParent] = useState("")
    const [currentRouteURL, setCurrentRouteURL] = useState("")

    useEffect(() => {
        if(Array.isArray(currentRoutes)){
            const parent = getParent(currentRoutes[currentRoutes.length - 1])

            if(typeof parent == "string" && parent.length > 0){
                setCurrentParent(parent)
                setCurrentRouteURL(getRouteURL(currentRoutes[currentRoutes.length - 1]))
            }
        }
    }, [currentRoutes])

    useEffect(() => {
        setItems([])

        if(typeof currentShareItems !== "undefined"){
            if(typeof currentShareItems.data !== "undefined"){
                if(currentShareItems !== null){
                    if(Platform.OS == "android"){
                        const arr = []
        
                        if(Array.isArray(currentShareItems.data)){
                            for(let i = 0; i < currentShareItems.data.length; i++){
                                arr.push(currentShareItems.data[i])
                            }
                        }
                        else{
                            arr.push(currentShareItems.data)
                        }
        
                        setItems(arr)
                    }
                    else{
                        const arr = []
        
                        for(let i = 0; i < currentShareItems.data.length; i++){
                            arr.push(currentShareItems.data[i].data)
                        }
        
                        setItems(arr)
                    }
                }
            }
        }
    }, [currentShareItems])

    if(items.length == 0){
        return <></>
    }

    return (
        <>
            {
                items.length > 0 && (
                    <View style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        width: "100%",
                        height: "100%",
                        zIndex: 99999
                    }}>
                        <View>
                            <Text style={{
                                color: darkMode ? "white" : "black"
                            }}>
                                {i18n(lang, "cameraUploadChooseFolder")}
                            </Text>
                        </View>
                        <View style={{
                            flexDirection: "row"
                        }}>
                            <TouchableOpacity underlayColor={"transparent"} hitSlop={{
                                right: 20,
                                left: 20,
                                top: 10,
                                bottom: 10
                            }} onPress={() => {
                                hideAllToasts()
                                setCurrentShareItems(undefined)
                            }}>
                                <Text style={{
                                    color: darkMode ? "white" : "black"
                                }}>
                                    {i18n(lang, "cancel")}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity underlayColor={"transparent"} hitSlop={{
                                right: 20,
                                left: 20,
                                top: 10,
                                bottom: 10
                            }} style={{
                                marginLeft: 20
                            }} onPress={() => {
                                if(
                                    currentRouteURL.indexOf("shared-in") !== -1 ||
                                    currentRouteURL.indexOf("recents") !== -1 ||
                                    currentRouteURL.indexOf("trash") !== -1 ||
                                    currentRouteURL.indexOf("photos") !== -1 ||
                                    currentRouteURL.indexOf("offline") !== -1
                                ){
                                    return false
                                }

                                if(!Array.isArray(items)){
                                    return false
                                }
                                
                                const parent = getParent()
            
                                if(parent.length < 16){
                                    return false
                                }

                                const copyFile = (item) => {
                                    return new Promise((resolve, reject) => {
                                        getDownloadPath({ type: "temp" }).then((path) => {
                                            path = path + Math.random().toString().slice(2) + "" + Math.random().toString().slice(2)

                                            if(item.indexOf("content://") !== -1 && Platform.OS == "android"){
                                                const name = getFilenameFromPath(getPath(item))

                                                if(typeof name !== "string"){
                                                    return reject("Could not get file name")
                                                }

                                                if(name.length <= 0){
                                                    return reject("Could not get file name")
                                                }

                                                ReactNativeBlobUtil.MediaCollection.copyToInternal(item, path).then(async () => {
                                                    await new Promise((resolve) => BackgroundTimer.setTimeout(resolve, 1000)) // somehow needs to sleep a bit, otherwise the stat call fails on older/slower devices

                                                    RNFS.stat(path).then((stat) => {
                                                        if(stat.isDirectory()){
                                                            return reject(i18n(lang, "cannotShareDirIntoApp"))
                                                        }

                                                        const type = mime.lookup(name)
                                                        const ext = mime.extension(type)
                                                        const size = stat.size

                                                        return resolve({ path, ext, type, size, name })
                                                    }).catch((err) => {
                                                        return reject(err)
                                                    })
                                                }).catch((err) => {
                                                    return reject(err)
                                                })
                                            }
                                            else{
                                                RNFS.copyFile(item, path).then(async () => {
                                                    await new Promise((resolve) => BackgroundTimer.setTimeout(resolve, 1000)) // somehow needs to sleep a bit, otherwise the stat call fails on older/slower devices

                                                    RNFS.stat(path).then((stat) => {
                                                        if(stat.isDirectory()){
                                                            return reject(i18n(lang, "cannotShareDirIntoApp"))
                                                        }

                                                        const name = getFilenameFromPath(item)
                                                        const type = mime.lookup(name)
                                                        const ext = mime.extension(type)
                                                        const size = stat.size
                                                        
                                                        return resolve({ path, ext, type, size, name })
                                                    }).catch((err) => {
                                                        return reject(err)
                                                    })
                                                }).catch((err) => {
                                                    return reject(err)
                                                })
                                            }
                                        }).catch((err) => {
                                            return reject(err)
                                        })
                                    })
                                }

                                const limit = 10

                                if(items.length >= limit){
                                    return showToast({ message: i18n(lang, "shareIntoAppLimit", true, ["__LIMIT__"], [limit]) })
                                }
            
                                for(let i = 0; i < items.length; i++){
                                    copyFile(items[i]).then((copyResult) => {
                                        const { path, type, size, name } = copyResult

                                        queueFileUpload({
                                            pickedFile: {
                                                name,
                                                size,
                                                type,
                                                uri: path.indexOf("file://") == -1 ? "file://" + path : path
                                            },
                                            parent,
                                            clear: Platform.OS == "android" ? false : true
                                        })
                                    }).catch((err) => {
                                        console.log(err)

                                        showToast({ message: err.toString() })
                                    })
                                }

                                setCurrentShareItems(undefined)
                                hideAllToasts()
                            }}>
                                <Text style={{
                                    color: (currentRouteURL.indexOf("shared-in") == -1 && currentRouteURL.indexOf("recents") == -1 && currentRouteURL.indexOf("trash") == -1 && currentRouteURL.indexOf("photos") == -1 && currentRouteURL.indexOf("offline") == -1 && currentParent.length > 32) ? darkMode ? "white" : "black" : "gray"
                                }}>
                                    {i18n(lang, "upload")}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )
            }
        </>
    )
})

export const CameraUploadChooseFolderToast = memo(({ message, navigation }) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const [lang, setLang] = useMMKVString("lang", storage)
    const currentRoutes = useStore(useCallback(state => state.currentRoutes))
    const [currentParent, setCurrentParent] = useState("")
    const [currentRouteURL, setCurrentRouteURL] = useState("")

    useEffect(() => {
        if(Array.isArray(currentRoutes)){
            const parent = getParent(currentRoutes[currentRoutes.length - 1])

            if(typeof parent == "string" && parent.length > 0){
                setCurrentParent(parent)
                setCurrentRouteURL(getRouteURL(currentRoutes[currentRoutes.length - 1]))
            }
        }
    }, [currentRoutes])

    return (
        <View style={{
            flexDirection: "row",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            zIndex: 99999
        }}>
            <View>
                <Text style={{
                    color: darkMode ? "white" : "black"
                }}>
                    {message}
                </Text>
            </View>
            <View style={{
                flexDirection: "row"
            }}>
                <TouchableOpacity underlayColor={"transparent"} hitSlop={{
                    right: 20,
                    left: 20,
                    top: 10,
                    bottom: 10
                }} style={{
                    width: "auto",
                    height: "auto",
                    paddingLeft: 10,
                    paddingRight: 10
                }} onPress={() => {
                    hideAllToasts()

                    navigationAnimation({ enable: false }).then(() => {
                        navigation.dispatch(CommonActions.reset({
                            index: 1,
                            routes: [
                                {
                                    name: "SettingsScreen"
                                },
                                {
                                    name: "CameraUploadScreen"
                                }
                            ]
                        }))
                    })
                }}>
                    <Text style={{
                        color: darkMode ? "white" : "black"
                    }}>
                        {i18n(lang, "cancel")}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity underlayColor={"transparent"} hitSlop={{
                    right: 20,
                    left: 20,
                    top: 10,
                    bottom: 10
                }} style={{
                    marginLeft: 20
                }} onPress={() => {
                    if(
                        currentRouteURL.indexOf("shared-in") !== -1 ||
                        currentRouteURL.indexOf("shared-out") !== -1 ||
                        currentRouteURL.indexOf("recents") !== -1 ||
                        currentRouteURL.indexOf("trash") !== -1 ||
                        currentRouteURL.indexOf("photos") !== -1 ||
                        currentRouteURL.indexOf("offline") !== -1 ||
                        currentRouteURL.split("/").length < 2
                    ){
                        return false
                    }

                    const parent = getParent()
                    let folderName = undefined

                    if(parent.length < 32){
                        return false
                    }

                    try{
                        var folderCache = JSON.parse(storage.getString("itemCache:folder:" + parent))
                    }
                    catch(e){
                        console.log(e)
                        console.log(currentRouteURL)

                        return false
                    }
            
                    if(typeof folderCache == "object"){
                        folderName = folderCache.name
                    }

                    if(typeof folderName == "undefined"){
                        return false
                    }

                    try{
                        storage.set("cameraUploadFolderUUID:" + storage.getNumber("userId"), parent)
                        storage.set("cameraUploadFolderName:" + storage.getNumber("userId"), folderName)
                        //storage.set("cameraUploadUploadedIds:" + storage.getNumber("userId"), "{}")
                        //storage.set("cameraUploadFetchNewAssetsTimeout", 0)
                        //storage.set("cachedCameraUploadAssets:" + storage.getNumber("userId"), "[]")
                        //storage.set("cameraUploadEnabled:" + storage.getNumber("userId"), true)
                    }
                    catch(e){
                        console.log(e)

                        return false
                    }

                    hideAllToasts()

                    navigationAnimation({ enable: false }).then(() => {
                        navigation.dispatch(CommonActions.reset({
                            index: 1,
                            routes: [
                                {
                                    name: "SettingsScreen"
                                },
                                {
                                    name: "CameraUploadScreen"
                                }
                            ]
                        }))
                    })
                }}>
                    <Text style={{
                        color: (currentRouteURL.indexOf("shared-in") == -1 && currentRouteURL.indexOf("recents") == -1 && currentRouteURL.indexOf("trash") == -1 && currentRouteURL.indexOf("photos") == -1 && currentRouteURL.indexOf("offline") == -1 && currentParent.length > 32 && currentRouteURL.split("/").length >= 2) ? darkMode ? "white" : "black" : "gray"
                    }}>
                        {i18n(lang, "choose")}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    )
})

export const MoveBulkToast = memo(({ message }) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const currentActionSheetItem = useStore(useCallback(state => state.currentActionSheetItem))
    const [buttonsDisabled, setButtonsDisabled] = useState(false)
    const [lang, setLang] = useMMKVString("lang", storage)
    const currentBulkItems = useStore(useCallback(state => state.currentBulkItems))
    const initParent = useRef()
    const currentRoutes = useStore(useCallback(state => state.currentRoutes))
    const [currentParent, setCurrentParent] = useState("")
    const [currentRouteURL, setCurrentRouteURL] = useState("")

    useEffect(() => {
        if(Array.isArray(currentRoutes)){
            const parent = getParent(currentRoutes[currentRoutes.length - 1])

            if(typeof parent == "string" && parent.length > 0){
                setCurrentParent(parent)
                setCurrentRouteURL(getRouteURL(currentRoutes[currentRoutes.length - 1]))
            }
        }
    }, [currentRoutes])

    useEffect(() => {
        DeviceEventEmitter.emit("event", {
            type: "unselect-all-items"
        })

        initParent.current = getParent()
    }, [])

    return (
        <View style={{
            flexDirection: "row",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            zIndex: 99999
        }}>
            <View style={{
                width: "50%"
            }}>
                <Text style={{
                    color: "white"
                }} numberOfLines={1}>
                    {message}
                </Text>
            </View>
            <View style={{
                flexDirection: "row",
                height: "100%"
            }}>
                <TouchableOpacity underlayColor={"transparent"} hitSlop={{
                    right: 20,
                    left: 20,
                    top: 10,
                    bottom: 10
                }} style={{
                    borderStartColor: "red",
                    height: "100%"
                }} onPress={() => {
                    if(buttonsDisabled){
                        return false
                    }

                    hideAllToasts()
                }}>
                    <Text style={{
                        color: "white",
                        fontWeight: "bold"
                    }}>
                        {i18n(lang, "cancel")}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity underlayColor={"transparent"} hitSlop={{
                    right: 20,
                    left: 20,
                    top: 10,
                    bottom: 10
                }} style={{
                    marginLeft: 20
                }} onPress={() => {
                    if(buttonsDisabled){
                        return false
                    }

                    if(
                        currentRouteURL.indexOf("shared-in") !== -1 ||
                        currentRouteURL.indexOf("recents") !== -1 ||
                        currentRouteURL.indexOf("trash") !== -1 ||
                        currentRouteURL.indexOf("photos") !== -1 ||
                        currentRouteURL.indexOf("offline") !== -1
                    ){
                        showToast({ message: i18n(lang, "cannotMoveItemsHere") })

                        return false
                    }

                    if(currentBulkItems.length == 0){
                        hideAllToasts()

                        return false
                    }

                    const parent = getParent()

                    if([
                        "recents",
                        "shared-in",
                        "shared-out",
                        "links",
                        "favorites",
                        "offline",
                        "cloud",
                        "photos",
                        "settings"
                    ].includes(parent)){
                        showToast({ message: i18n(lang, "cannotMoveItemsHere") })

                        return false
                    }

                    if(parent.length <= 32 && currentBulkItems.filter(item => item.type == "file").length >= 1){
                        showToast({ message: i18n(lang, "cannotMoveItemsHere") })

                        return false
                    }

                    if(typeof currentActionSheetItem !== "object"){
                        return false
                    }

                    if(currentActionSheetItem.parent == parent){
                        showToast({ message: i18n(lang, "moveSameParentFolder") })

                        return false
                    }

                    if(getRouteURL().indexOf("shared-in") !== -1){
                        showToast({ message: i18n(lang, "cannotMoveItemsHere") })

                        return false
                    }

                    setButtonsDisabled(true)

                    useStore.setState({ fullscreenLoadingModalVisible: true })

                    bulkMove({ items: currentBulkItems, parent }).then(() => {
                        DeviceEventEmitter.emit("event", {
                            type: "reload-list",
                            data: {
                                parent: initParent.current
                            }
                        })

                        DeviceEventEmitter.emit("event", {
                            type: "reload-list",
                            data: {
                                parent
                            }
                        })

                        setTimeout(() => {
                            setButtonsDisabled(false)

                            useStore.setState({ fullscreenLoadingModalVisible: false })
    
                            hideAllToasts()

                            //showToast({ message: i18n(lang, "itemsMoved", true, ["__COUNT__"], [currentBulkItems.length]) })
                        }, 500)
                    }).catch((err) => {
                        console.log(err)

                        showToast({ message: err.toString() })
                    })
                }}>
                    <Text style={{
                        color: (currentRouteURL.indexOf("shared-in") == -1 && currentRouteURL.indexOf("recents") == -1 && currentRouteURL.indexOf("trash") == -1 && currentRouteURL.indexOf("photos") == -1 && currentRouteURL.indexOf("offline") == -1 && currentParent.length > 32) ? darkMode ? "white" : "black" : "gray"
                    }}>
                        {i18n(lang, "move")}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    )
})