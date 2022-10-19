import React, { useState, useEffect, memo, useMemo, useCallback } from "react"
import { Text, View, TextInput, TouchableOpacity, DeviceEventEmitter, Keyboard, Platform } from "react-native"
import storage from "../../lib/storage"
import { useMMKVBoolean, useMMKVString } from "react-native-mmkv"
import { i18n } from "../../i18n"
import Ionicon from "@expo/vector-icons/Ionicons"
import { SheetManager } from "react-native-actions-sheet"
import { useStore, navigationAnimation } from "../../lib/state"
import { getParent, getRouteURL } from "../../lib/helpers"
import { CommonActions } from "@react-navigation/native"
import { getColor } from "../../lib/style/colors"
import type { NavigationContainerRef } from "@react-navigation/native"

export interface TopBarProps {
    navigation: NavigationContainerRef<{}>,
    route: any,
    setLoadDone: React.Dispatch<React.SetStateAction<boolean>>,
    searchTerm: string,
    setSearchTerm: React.Dispatch<React.SetStateAction<string>>,
}

export const TopBar = memo(({ navigation, route, setLoadDone, searchTerm, setSearchTerm }: TopBarProps) => {
    const getTopBarTitle = useCallback(({ route, lang = "en" }: { route: any, lang: string | undefined }): string => {
        let title: string = "Cloud"
        const parent: string = getParent(route)
        const routeURL: string = getRouteURL(route)
    
        const isMainScreen: boolean = (route.name == "MainScreen")
        const isTransfersScreen: boolean = (route.name == "TransfersScreen")
        const isSettingsScreen: boolean = (route.name == "SettingsScreen")
        const isBaseScreen: boolean = (parent.indexOf("base") !== -1)
        const isRecentsScreen: boolean = (parent.indexOf("recents") !== -1)
        const isTrashScreen: boolean = (parent.indexOf("trash") !== -1)
        const isSharedInScreen: boolean = (parent.indexOf("shared-in") !== -1)
        const isSharedOutScreen: boolean = (parent.indexOf("shared-out") !== -1)
        const isPublicLinksScreen: boolean = (parent.indexOf("links") !== -1)
        const isOfflineScreen: boolean = (parent.indexOf("offline") !== -1)
        const isFavoritesScreen: boolean = (parent.indexOf("favorites") !== -1)
        const isPhotosScreen: boolean = (parent.indexOf("photos") !== -1)
    
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
                if((routeURL.split("/").length - 1) > 0){
                    let folderCache: any = undefined

                    try{
                        folderCache = JSON.parse(storage.getString("itemCache:folder:" + parent) as string)
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
                else{
                    title = i18n(lang, "cloud")
                }
            }
        }
    
        return title
    }, [route])

    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const itemsSelectedCount = useStore(state => state.itemsSelectedCount)
    const [lang, setLang] = useMMKVString("lang", storage)
    const [showTextClearButton, setShowTextClearButton] = useState(false)
    const [title, setTitle] = useState<string>(getTopBarTitle({ route, lang }))
    const setTopBarHeight = useStore(state => state.setTopBarHeight)
    const [publicKey, setPublicKey] = useMMKVString("publicKey", storage)
    const [privateKey, setPrivateKey] = useMMKVString("privateKey", storage)

    const [parent, routeURL] = useMemo(() => {
        const parent: string = getParent(route)
        const routeURL: string = getRouteURL(route)

        return [parent, routeURL]
    }, [route])

    const [isMainScreen, isTransfersScreen, isSettingsScreen, isBaseScreen, isRecentsScreen, isTrashScreen, isSharedInScreen, isSharedOutScreen, isPublicLinksScreen, isOfflineScreen, isFavoritesScreen, isPhotosScreen, showHomeTabBar, showBackButton] = useMemo(() => {
        const isMainScreen: boolean = (route.name == "MainScreen")
        const isTransfersScreen: boolean = (route.name == "TransfersScreen")
        const isSettingsScreen: boolean = (route.name == "SettingsScreen")
        const isBaseScreen: boolean = (parent.indexOf("base") !== -1)
        const isRecentsScreen: boolean = (parent.indexOf("recents") !== -1)
        const isTrashScreen: boolean = (parent.indexOf("trash") !== -1)
        const isSharedInScreen: boolean = (parent.indexOf("shared-in") !== -1)
        const isSharedOutScreen: boolean = (parent.indexOf("shared-out") !== -1)
        const isPublicLinksScreen: boolean = (parent.indexOf("links") !== -1)
        const isOfflineScreen: boolean = (parent.indexOf("offline") !== -1)
        const isFavoritesScreen: boolean = (parent.indexOf("favorites") !== -1)
        const isPhotosScreen: boolean = (parent.indexOf("photos") !== -1)
        const showHomeTabBar: boolean = (["shared-in", "shared-out", "links", "recents", "offline", "favorites"].includes(parent))
        let showBackButton: boolean = (typeof route.params !== "undefined" && !isBaseScreen && !isRecentsScreen && !isSharedInScreen && !isSharedOutScreen && !isPublicLinksScreen && !isFavoritesScreen && !isOfflineScreen && !isPhotosScreen)

        if(isTransfersScreen && !showBackButton){
            showBackButton = true
        }

        if(isMainScreen && (routeURL.split("/").length - 1) == 0){
            showBackButton = false
        }

        if(isTrashScreen){
            showBackButton = true
        }

        return [isMainScreen, isTransfersScreen, isSettingsScreen, isBaseScreen, isRecentsScreen, isTrashScreen, isSharedInScreen, isSharedOutScreen, isPublicLinksScreen, isOfflineScreen, isFavoritesScreen, isPhotosScreen, showHomeTabBar, showBackButton]
    }, [route, parent])

    useEffect(() => {
        setTitle(getTopBarTitle({ route, lang }))
    }, [])

    const goBack = (): void => {
        if(typeof setLoadDone !== "undefined"){
            setLoadDone(false)
        }

        navigation.goBack()
    }

    return (
        <View onLayout={(e) => setTopBarHeight(e.nativeEvent.layout.height)}>
            <View
                style={{
                    height: showHomeTabBar ? 75 : isMainScreen && !isPhotosScreen ? 80 : 35,
                    borderBottomColor: getColor(darkMode, "primaryBorder"),
                    borderBottomWidth: 0, //showHomeTabBar || routeURL.indexOf("photos") !== -1 ? 0 : 1
                    marginTop: Platform.OS == "ios" ? 10 : 0
                }}
            >
                <View
                    style={{
                        justifyContent: "space-between",
                        flexDirection: "row",
                        paddingLeft: 15,
                        paddingRight: 15
                    }}
                >
                    {
                        itemsSelectedCount > 0 && isMainScreen ? (
                            <TouchableOpacity
                                style={{
                                    marginTop: Platform.OS == "android" ? 1 : 0
                                }}
                                onPress={() => {
                                    DeviceEventEmitter.emit("event", {
                                        type: "unselect-all-items"
                                    })
                                }}
                            >
                                <Ionicon
                                    name="chevron-back"
                                    size={24}
                                    color={darkMode ? "white" : "black"}
                                />
                            </TouchableOpacity>
                        ) : (
                            showBackButton && (
                                <TouchableOpacity
                                    style={{
                                        marginTop: Platform.OS == "android" ? 1 : 0
                                    }}
                                    onPress={() => goBack()}
                                >
                                    <Ionicon
                                        name="chevron-back"
                                        size={24}
                                        color={darkMode ? "white" : "black"}
                                    />
                                </TouchableOpacity>
                            )
                        )
                    }
                    <View
                        style={{
                            marginLeft: showBackButton ? 5 : 0,
                            width: showBackButton ? "80%" : "85%"
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 20,
                                color: darkMode ? "white" : "black",
                                fontWeight: "bold"
                            }}
                            numberOfLines={1}
                        >
                            {itemsSelectedCount > 0 && isMainScreen ? itemsSelectedCount + " " + i18n(lang, "items", false) : title}
                        </Text>
                    </View>
                    <TouchableOpacity
                        hitSlop={{
                            top: 10,
                            right: 10,
                            left: 10,
                            bottom: 10
                        }}
                        style={{
                            alignItems: "flex-end",
                            flexDirection: "row",
                            backgroundColor: "transparent",
                            height: "100%",
                            paddingLeft: 0
                        }}
                        onPress={() => SheetManager.show("TopBarActionSheet")}
                    >
                        {
                            !isSettingsScreen && (
                                <View>
                                    <Ionicon
                                        name="ellipsis-horizontal-sharp"
                                        size={24}
                                        color={darkMode ? "white" : "black"}
                                    />
                                </View>
                            )
                        }
                    </TouchableOpacity>
                </View>
                {
                    isMainScreen && !isPhotosScreen && (
                        <View
                            style={{
                                paddingLeft: 15,
                                paddingRight: 15
                            }}
                        >
                            <Ionicon
                                name="search-outline"
                                size={18}
                                color="gray"
                                style={{
                                    position: "absolute",
                                    zIndex: 2,
                                    marginTop: 17,
                                    marginLeft: 23
                                }}
                            />
                            <TouchableOpacity
                                hitSlop={{
                                    top: 10,
                                    left: 10,
                                    right: 10,
                                    bottom: 10
                                }}
                                style={{
                                    position: "absolute",
                                    zIndex: 2,
                                    right: 0,
                                    marginTop: 17,
                                    display: showTextClearButton ? "flex" : "none",
                                    width: 43,
                                    height: 30
                                }}
                                onPress={() => {
                                    setSearchTerm("")

                                    Keyboard.dismiss()

                                    setShowTextClearButton(false)
                                }}
                            >
                                <Ionicon
                                    name="close-circle"
                                    size={18}
                                    color="gray"
                                />
                            </TouchableOpacity>
                            <TextInput
                                onChangeText={(val) => {
                                    if(val.length > 0){
                                        setShowTextClearButton(true)
                                    }
                                    else{
                                        setShowTextClearButton(false)
                                    }

                                    setSearchTerm(val)
                                }}
                                value={searchTerm}
                                placeholder={i18n(lang, "searchInThisFolder")}
                                placeholderTextColor="gray"
                                autoCapitalize="none"
                                autoComplete="off"
                                style={{
                                    height: 32,
                                    marginTop: 10,
                                    zIndex: 1,
                                    padding: 5,
                                    backgroundColor: darkMode ? "#171717" : "lightgray",
                                    color: "gray",
                                    borderRadius: 10,
                                    paddingLeft: 35,
                                    paddingRight: 40
                                }}
                            />
                        </View>
                    )
                }
            </View>
            {
                showHomeTabBar && (
                    <View
                        style={{
                            paddingTop: 3,
                            height: 40,
                            flexDirection: "row",
                            paddingLeft: 15,
                            paddingRight: 15,
                            borderBottomWidth: 0,
                            borderBottomColor: getColor(darkMode, "primaryBorder"),
                            justifyContent: "space-between"
                        }}
                    >
                        <TouchableOpacity
                            style={{
                                borderBottomWidth: isRecentsScreen ? Platform.OS == "ios" ? 2 : 2 : 0,
                                borderBottomColor: isRecentsScreen ? "#0A84FF" : "#171717",
                                height: 27
                            }}
                            onPress={() => {
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
                            }}
                        >
                            <Text
                                style={{
                                    color: isRecentsScreen ? "#0A84FF" : "gray",
                                    fontWeight: "bold",
                                    fontSize: 13,
                                    paddingTop: 3
                                }}
                            >
                                {i18n(lang, "recents")}
                            </Text>
                        </TouchableOpacity>
                        {
                            typeof privateKey == "string" && typeof publicKey == "string" && privateKey.length > 16 && publicKey.length > 16 && (
                                <>
                                    <TouchableOpacity
                                        style={{
                                            borderBottomWidth: isSharedInScreen ? Platform.OS == "ios" ? 1.5 : 2 : 0,
                                            borderBottomColor: isSharedInScreen ? "#0A84FF" : "#171717",
                                            height: 27
                                        }}
                                        onPress={() => {
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
                                        }}
                                    >
                                        <Text
                                            style={{
                                                color: isSharedInScreen ? "#0A84FF" : "gray",
                                                fontWeight: "bold",
                                                fontSize: 13,
                                                paddingTop: 3
                                            }}
                                        >
                                            {i18n(lang, "sharedIn")}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={{
                                            borderBottomWidth: isSharedOutScreen ? Platform.OS == "ios" ? 1.5 : 2 : 0,
                                            borderBottomColor: isSharedOutScreen ? "#0A84FF" : "#171717",
                                            height: 27
                                        }}
                                        onPress={() => {
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
                                        }}
                                    >
                                        <Text
                                            style={{
                                                color: isSharedOutScreen ? "#0A84FF" : "gray",
                                                fontWeight: "bold",
                                                fontSize: 13,
                                                paddingTop: 3
                                            }}
                                        >
                                            {i18n(lang, "sharedOut")}
                                        </Text>
                                    </TouchableOpacity>
                                </>
                            )
                        }
                        <TouchableOpacity
                            style={{
                                borderBottomWidth: isPublicLinksScreen ? Platform.OS == "ios" ? 1.5 : 2 : 0,
                                borderBottomColor: isPublicLinksScreen ? "#0A84FF" : "#171717",
                                height: 27
                            }}
                            onPress={() => {
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
                            }}
                        >
                            <Text
                                style={{
                                    color: isPublicLinksScreen ? "#0A84FF" : "gray",
                                    fontWeight: "bold",
                                    fontSize: 13,
                                    paddingTop: 3
                                }}
                            >
                                {i18n(lang, "publicLinks")}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={{
                                borderBottomWidth: isFavoritesScreen ? Platform.OS == "ios" ? 1.5 : 2 : 0,
                                borderBottomColor: isFavoritesScreen ? "#0A84FF" : "#171717",
                                height: 27
                            }}
                            onPress={() => {
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
                            }}
                        >
                            <Text
                                style={{
                                    color: isFavoritesScreen ? "#0A84FF" : "gray",
                                    fontWeight: "bold",
                                    fontSize: 13,
                                    paddingTop: 3
                                }}
                            >
                                {i18n(lang, "favorites")}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={{
                                borderBottomWidth: isOfflineScreen ? Platform.OS == "ios" ? 1.5 : 2 : 0,
                                borderBottomColor: isOfflineScreen ? "#0A84FF" : "#171717",
                                height: 27
                            }}
                            onPress={() => {
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
                            }}
                        >
                            <Text
                                style={{
                                    color: isOfflineScreen ? "#0A84FF" : "gray",
                                    fontWeight: "bold",
                                    fontSize: 13,
                                    paddingTop: 3
                                }}
                            >
                                {i18n(lang, "offlineFiles")}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )
            }
        </View>
    )
})