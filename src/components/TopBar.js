import React, { useState, useEffect, useCallback } from "react"
import { Text, View, TextInput, TouchableOpacity, DeviceEventEmitter, Keyboard, Pressable, Platform } from "react-native"
import { storage } from "../lib/storage"
import { useMMKVBoolean, useMMKVString } from "react-native-mmkv"
import { i18n } from "../i18n/i18n"
import Ionicon from "react-native-vector-icons/Ionicons"
import { SheetManager } from "react-native-actions-sheet"
import { useStore, navigationAnimation } from "../lib/state"
import { getParent, getRouteURL } from "../lib/helpers"
import { CommonActions } from "@react-navigation/native"
import { getColor } from "../lib/style/colors"

export const getTopBarTitle = ({ route, lang = "en" }) => {
    let title = "Cloud"
    const parent = getParent(route)

    const isMainScreen = (route.name == "MainScreen")
    const isTransfersScreen = (route.name == "TransfersScreen")
    const isSettingsScreen = (route.name == "SettingsScreen")
    const isBaseScreen = (parent.indexOf("base") !== -1)
    const isRecentsScreen = (parent.indexOf("recents") !== -1)
    const isTrashScreen = (parent.indexOf("trash") !== -1)
    const isSharedInScreen = (parent.indexOf("shared-in") !== -1)
    const isSharedOutScreen = (parent.indexOf("shared-out") !== -1)
    const isPublicLinksScreen = (parent.indexOf("links") !== -1)
    const isOfflineScreen = (parent.indexOf("offline") !== -1)
    const isFavoritesScreen = (parent.indexOf("favorites") !== -1)
    const isPhotosScreen = (parent.indexOf("photos") !== -1)

    if(isTransfersScreen){
        title = i18n(lang, "transfers")
    }
    else if(isSettingsScreen){
        title = i18n(lang, "settings")
    }
    else if(isRecentsScreen){
        title = i18n(lang, "home")
    }
    else if(isTrashScreen){
        title = i18n(lang, "trash")
    }
    else if(isSharedInScreen){
        title = i18n(lang, "home")
    }
    else if(isSharedOutScreen){
        title = i18n(lang, "home")
    }
    else if(isPublicLinksScreen){
        title = i18n(lang, "home")
    }
    else if(isFavoritesScreen){
        title = i18n(lang, "home")
    }
    else if(isOfflineScreen){
        title = i18n(lang, "home")
    }
    else if(isPhotosScreen){
        title = i18n(lang, "photos")
    }
    else{
        if(parent == "base"){
            title = i18n(lang, "cloud")
        }
        else{
            try{
                var folderCache = JSON.parse(storage.getString("itemCache:folder:" + parent))
            }
            catch(e){
                //console.log(e)
            }
    
            if(typeof folderCache == "object"){
                title = folderCache.name
            }
            else{
                title = i18n(lang, "cloud")
            }
        }
    }

    return title
}

export const TopBar = ({ navigation, route, setLoadDone, searchTerm, setSearchTerm }) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const itemsSelectedCount = useStore(state => state.itemsSelectedCount)
    const [lang, setLang] = useMMKVString("lang", storage)
    const [showTextClearButton, setShowTextClearButton] = useState(false)
    const [title, setTitle] = useState(getTopBarTitle({ route, lang }))
    const setTopBarHeight = useStore(state => state.setTopBarHeight)

    const parent = getParent(route)
    const routeURL = getRouteURL(route)

    const isMainScreen = (route.name == "MainScreen")
    const isTransfersScreen = (route.name == "TransfersScreen")
    const isSettingsScreen = (route.name == "SettingsScreen")
    const isBaseScreen = (parent.indexOf("base") !== -1)
    const isRecentsScreen = (parent.indexOf("recents") !== -1)
    const isTrashScreen = (parent.indexOf("trash") !== -1)
    const isSharedInScreen = (parent.indexOf("shared-in") !== -1)
    const isSharedOutScreen = (parent.indexOf("shared-out") !== -1)
    const isPublicLinksScreen = (parent.indexOf("links") !== -1)
    const isOfflineScreen = (parent.indexOf("offline") !== -1)
    const isFavoritesScreen = (parent.indexOf("favorites") !== -1)
    const isPhotosScreen = (parent.indexOf("photos") !== -1)
    const showHomeTabBar = (["shared-in", "shared-out", "links", "recents", "offline", "favorites"].includes(parent))

    let showBackButton = (typeof route.params !== "undefined" && !isBaseScreen && !isRecentsScreen && !isSharedInScreen && !isSharedOutScreen && !isPublicLinksScreen && !isFavoritesScreen && !isOfflineScreen && !isPhotosScreen)

    if(isTransfersScreen && !showBackButton){
        showBackButton = true
    }

    useEffect(() => {
        setTitle(getTopBarTitle({ route, lang }))
    }, [])

    const goBack = useCallback(() => {
        if(typeof setLoadDone !== "undefined"){
            setLoadDone(false)
        }

        navigation.goBack()
    })

    return (
        <View onLayout={(e) => setTopBarHeight(e.nativeEvent.layout.height)}>
            <View style={{
                height: showHomeTabBar ? 75 : isMainScreen && !isPhotosScreen ? 80 : 35,
                borderBottomColor: getColor(darkMode, "primaryBorder"),
                borderBottomWidth: 0, //showHomeTabBar || routeURL.indexOf("photos") !== -1 ? 0 : 1
                marginTop: Platform.OS == "ios" ? 10 : 0
            }}>
                <View style={{
                    justifyContent: "space-between",
                    flexDirection: "row",
                    paddingLeft: 15,
                    paddingRight: 15
                }}>
                    {
                        itemsSelectedCount > 0 && isMainScreen ? (
                            <TouchableOpacity style={{
                                marginTop: Platform.OS == "android" ? 1 : 0
                            }} onPress={() => {
                                DeviceEventEmitter.emit("event", {
                                    type: "unselect-all-items"
                                })
                            }}>
                                <Ionicon name="chevron-back" size={24} color={darkMode ? "white" : "black"}></Ionicon>
                            </TouchableOpacity>
                        ) : (
                            showBackButton && (
                                <TouchableOpacity style={{
                                    marginTop: Platform.OS == "android" ? 1 : 0
                                }} onPress={() => goBack()}>
                                    <Ionicon name="chevron-back" size={24} color={darkMode ? "white" : "black"}></Ionicon>
                                </TouchableOpacity>
                            )
                        )
                    }
                    <View style={{
                        marginLeft: showBackButton ? 5 : 0,
                        width: showBackButton ? "80%" : "85%"
                    }}>
                        <Text style={{
                            fontSize: 20,
                            color: darkMode ? "white" : "black",
                            fontWeight: "bold"
                        }} numberOfLines={1}>{itemsSelectedCount > 0 && isMainScreen ? itemsSelectedCount + " " + i18n(lang, "items", false) : title}</Text>
                    </View>
                    <TouchableOpacity hitSlop={{
                        top: 10,
                        right: 10,
                        left: 10,
                        bottom: 10
                    }} style={{
                        alignItems: "flex-end",
                        flexDirection: "row",
                        backgroundColor: "transparent",
                        height: "100%",
                        paddingLeft: 0
                    }} onPress={() => SheetManager.show("TopBarActionSheet")}>
                        {
                            !isSettingsScreen && (
                                <View>
                                    <Ionicon name="ellipsis-horizontal-sharp" size={24} color={darkMode ? "white" : "black"}></Ionicon>
                                </View>
                            )
                        }
                    </TouchableOpacity>
                </View>
                {
                    isMainScreen && !isPhotosScreen && (
                        <View style={{
                            paddingLeft: 15,
                            paddingRight: 15
                        }}>
                            <Ionicon name="search-outline" size={18} color="gray" style={{
                                position: "absolute",
                                zIndex: 2,
                                marginTop: 17,
                                marginLeft: 23
                            }} />
                            <TouchableOpacity hitSlop={{
                                top: 10,
                                left: 10,
                                right: 10,
                                bottom: 10
                            }} style={{
                                position: "absolute",
                                zIndex: 2,
                                right: 0,
                                marginTop: 17,
                                display: showTextClearButton ? "flex" : "none",
                                width: 43,
                                height: 30
                            }} onPress={() => {
                                setSearchTerm("")

                                Keyboard.dismiss()

                                setShowTextClearButton(false)
                            }}>
                                <Ionicon name="close-circle" size={18} color="gray" />
                            </TouchableOpacity>
                            <TextInput onChangeText={(val) => {
                                if(val.length > 0){
                                    setShowTextClearButton(true)
                                }
                                else{
                                    setShowTextClearButton(false)
                                }

                                setSearchTerm(val)
                            }} value={searchTerm} placeholder={i18n(lang, "searchInThisFolder")} placeholderTextColor={"gray"} autoCapitalize="none" autoComplete="off" style={{
                                height: 32,
                                marginTop: 10,
                                zIndex: 1,
                                padding: 5,
                                backgroundColor: darkMode ? "#171717" : "lightgray",
                                color: "gray",
                                borderRadius: 10,
                                paddingLeft: 35,
                                paddingRight: 40
                            }} />
                        </View>
                    )
                }
            </View>
            {
                showHomeTabBar && (
                    <View style={{
                        paddingTop: 4,
                        height: 40,
                        flexDirection: "row",
                        paddingLeft: 15,
                        paddingRight: 15,
                        borderBottomWidth: 0,
                        borderBottomColor: getColor(darkMode, "primaryBorder"),
                        justifyContent: "space-between"
                    }}>
                        <TouchableOpacity style={{
                            borderBottomWidth: isRecentsScreen ? 1.5 : 0,
                            borderBottomColor: isRecentsScreen ? "#0A84FF" : "#171717",
                            height: 27
                        }} onPress={() => {
                            navigationAnimation({ enable: false }).then(() => {
                                navigation.dispatch(CommonActions.reset({
                                    index: 0,
                                    routes: [
                                        {
                                            name: "MainScreen",
                                            params: {
                                                parent: "recents"
                                            }
                                        }
                                    ]
                                }))
                            })
                        }}>
                            <Text style={{
                                color: isRecentsScreen ? "#0A84FF" : "gray",
                                fontWeight: "bold",
                                fontSize: 13,
                                paddingTop: 3
                            }}>
                                {i18n(lang, "recents")}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{
                            borderBottomWidth: isSharedInScreen ? 1.5 : 0,
                            borderBottomColor: isSharedInScreen ? "#0A84FF" : "#171717",
                            height: 27
                        }} onPress={() => {
                            navigationAnimation({ enable: false }).then(() => {
                                navigation.dispatch(CommonActions.reset({
                                    index: 0,
                                    routes: [
                                        {
                                            name: "MainScreen",
                                            params: {
                                                parent: "shared-in"
                                            }
                                        }
                                    ]
                                }))
                            })
                        }}>
                            <Text style={{
                                color: isSharedInScreen ? "#0A84FF" : "gray",
                                fontWeight: "bold",
                                fontSize: 13,
                                paddingTop: 3
                            }}>
                                {i18n(lang, "sharedIn")}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{
                            borderBottomWidth: isSharedOutScreen ? 1.5 : 0,
                            borderBottomColor: isSharedOutScreen ? "#0A84FF" : "#171717",
                            height: 27
                        }} onPress={() => {
                            navigationAnimation({ enable: false }).then(() => {
                                navigation.dispatch(CommonActions.reset({
                                    index: 0,
                                    routes: [
                                        {
                                            name: "MainScreen",
                                            params: {
                                                parent: "shared-out"
                                            }
                                        }
                                    ]
                                }))
                            })
                        }}>
                            <Text style={{
                                color: isSharedOutScreen ? "#0A84FF" : "gray",
                                fontWeight: "bold",
                                fontSize: 13,
                                paddingTop: 3
                            }}>
                                {i18n(lang, "sharedOut")}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{
                            borderBottomWidth: isPublicLinksScreen ? 1.5 : 0,
                            borderBottomColor: isPublicLinksScreen ? "#0A84FF" : "#171717",
                            height: 27
                        }} onPress={() => {
                            navigationAnimation({ enable: false }).then(() => {
                                navigation.dispatch(CommonActions.reset({
                                    index: 0,
                                    routes: [
                                        {
                                            name: "MainScreen",
                                            params: {
                                                parent: "links"
                                            }
                                        }
                                    ]
                                }))
                            })
                        }}>
                            <Text style={{
                                color: isPublicLinksScreen ? "#0A84FF" : "gray",
                                fontWeight: "bold",
                                fontSize: 13,
                                paddingTop: 3
                            }}>
                                {i18n(lang, "publicLinks")}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{
                            borderBottomWidth: isFavoritesScreen ? 1.5 : 0,
                            borderBottomColor: isFavoritesScreen ? "#0A84FF" : "#171717",
                            height: 27
                        }} onPress={() => {
                            navigationAnimation({ enable: false }).then(() => {
                                navigation.dispatch(CommonActions.reset({
                                    index: 0,
                                    routes: [
                                        {
                                            name: "MainScreen",
                                            params: {
                                                parent: "favorites"
                                            }
                                        }
                                    ]
                                }))
                            })
                        }}>
                            <Text style={{
                                color: isFavoritesScreen ? "#0A84FF" : "gray",
                                fontWeight: "bold",
                                fontSize: 13,
                                paddingTop: 3
                            }}>
                                {i18n(lang, "favorites")}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{
                            borderBottomWidth: isOfflineScreen ? 1.5 : 0,
                            borderBottomColor: isOfflineScreen ? "#0A84FF" : "#171717",
                            height: 27
                        }} onPress={() => {
                            navigationAnimation({ enable: false }).then(() => {
                                navigation.dispatch(CommonActions.reset({
                                    index: 0,
                                    routes: [
                                        {
                                            name: "MainScreen",
                                            params: {
                                                parent: "offline"
                                            }
                                        }
                                    ]
                                }))
                            })
                        }}>
                            <Text style={{
                                color: isOfflineScreen ? "#0A84FF" : "gray",
                                fontWeight: "bold",
                                fontSize: 13,
                                paddingTop: 3
                            }}>
                                {i18n(lang, "offlineFiles")}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )
            }
        </View>
    )
}