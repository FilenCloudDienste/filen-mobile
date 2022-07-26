import React, { memo } from "react"
import { Text, View, Pressable } from "react-native"
import storage from "../lib/storage"
import { useMMKVBoolean, useMMKVString, useMMKVNumber } from "react-native-mmkv"
import { SheetManager } from "react-native-actions-sheet"
import { useStore, navigationAnimation } from "../lib/state"
import Ionicon from "@expo/vector-icons/Ionicons"
import { i18n } from "../i18n/i18n"
import { getParent, getRouteURL } from "../lib/helpers"
import { CommonActions } from "@react-navigation/native"
import { getColor } from "../lib/style/colors"

export interface BottomBarProps {
    navigation: any,
    route: any
}

export const BottomBar = memo(({ navigation, route }: BottomBarProps) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const currentRoutes = useStore(state => state.currentRoutes) as any
    const [lang, setLang] = useMMKVString("lang", storage)
    const netInfo = useStore(state => state.netInfo)
    const setBottomBarHeight = useStore(state => state.setBottomBarHeight)
    const [userId, setUserId] = useMMKVNumber("userId", storage)
    const [defaultDriveOnly, setDefaultDriveOnly] = useMMKVBoolean("defaultDriveOnly:" + userId, storage)
    const [defaultDriveUUID, setDefaultDriveUUID] = useMMKVString("defaultDriveUUID:" + userId, storage)

    const parent: string = getParent(route)
    const routeURL: string = getRouteURL(route)
    const baseName: string = defaultDriveOnly ? defaultDriveUUID as string : "base"

    let currentScreenName: string = "MainScreen"
    let isRecentsScreen: boolean = false
    let isTrashScreen: boolean = false
    let isSharedScreen: boolean = false
    let isPhotosScreen: boolean = false
    let isFavoritesScreen: boolean = false
    let isBaseScreen: boolean = false
    let isOfflineScreen: boolean = false

    if(typeof currentRoutes == "object"){
        if(currentRoutes.length > 0){
            const currentRoute = currentRoutes[currentRoutes.length - 1]

            currentScreenName = currentRoute.name

            isRecentsScreen = (routeURL.indexOf("recents") !== -1)
            isTrashScreen = (routeURL.indexOf("trash") !== -1)
            isPhotosScreen = (routeURL.indexOf("photos") !== -1)
            isFavoritesScreen = (routeURL.indexOf("favorites") !== -1)
            isSharedScreen = ((routeURL.indexOf("shared-in") !== -1) || (routeURL.indexOf("shared-out") !== -1) || (routeURL.indexOf("links") !== -1))
            isBaseScreen = (routeURL.indexOf(baseName) !== -1)
            isOfflineScreen = (routeURL.indexOf("offline") !== -1)
        }
    }

    const canOpenBottomAddActionSheet = currentScreenName == "MainScreen"
        && !isOfflineScreen 
        && !isTrashScreen 
        && !isFavoritesScreen 
        && !isPhotosScreen 
        && !isRecentsScreen 
        && routeURL.indexOf("shared-in") == -1 
        && parent !== "shared-out" 
        && parent !== "links"

    const showCloud = isBaseScreen 
        && !isRecentsScreen 
        && !isTrashScreen 
        && !isSharedScreen 
        && currentScreenName !== "SettingsAccountScreen" 
        && currentScreenName !== "LanguageScreen" 
        && currentScreenName !== "SettingsAdvancedScreen" 
        && currentScreenName !== "CameraUploadScreen" 
        && currentScreenName !== "SettingsScreen" 
        && currentScreenName !== "TransfersScreen" 
        && currentScreenName !== "EventsScreen" 
        && currentScreenName !== "EventsInfoScreen"
        && currentScreenName !== "GDPRScreen"
        && currentScreenName !== "InviteScreen"
        && currentScreenName !== "TwoFactorScreen"
        && currentScreenName !== "ChangeEmailPasswordScreen"
    
    const showSettings = currentScreenName == "SettingsScreen" 
        || currentScreenName == "LanguageScreen" 
        || currentScreenName == "SettingsAccountScreen" 
        || currentScreenName == "SettingsAdvancedScreen" 
        || currentScreenName == "CameraUploadScreen" 
        || currentScreenName == "EventsScreen" 
        || currentScreenName == "EventsInfoScreen" 
        || isTrashScreen
        || currentScreenName == "GDPRScreen"
        || currentScreenName == "InviteScreen"
        || currentScreenName == "TwoFactorScreen"
        || currentScreenName == "ChangeEmailPasswordScreen"
    
    const showHome = isSharedScreen
        || isRecentsScreen 
        || isFavoritesScreen  
        || isOfflineScreen

    return (
        <View
            style={{
                paddingTop: 6,
                height: 80,
                flexDirection: "row",
                justifyContent: "space-between",
                borderTopColor: getColor(darkMode, "primaryBorder"),
                borderTopWidth: 1
            }}
            onLayout={(e) => setBottomBarHeight(e.nativeEvent.layout.height)}
        >
            <Pressable
                style={{
                    alignItems: "center",
                    width: "20%",
                }}
                onPress={() => {
                    navigationAnimation({ enable: false }).then(() => {
                        navigation.current.dispatch(CommonActions.reset({
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
                <Ionicon
                    name={showHome ? "home" : "home-outline"}
                    size={22}
                    color={showHome ? "#0A84FF" : (darkMode ? "gray" : "gray")}
                />
                <Text
                    style={{
                        color: showHome ? "#0A84FF" : (darkMode ? "gray" : "gray"),
                        fontSize: 10,
                        marginTop: 3
                    }}
                >
                    {i18n(lang, "home")}
                </Text>
            </Pressable>
            <Pressable
                style={{
                    alignItems: "center",
                    width: "20%",
                }}
                onPress={() => {
                    navigationAnimation({ enable: false }).then(() => {
                        navigation.current.dispatch(CommonActions.reset({
                            index: 0,
                            routes: [
                                {
                                    name: "MainScreen",
                                    params: {
                                        parent: (defaultDriveOnly ? defaultDriveUUID : "base")
                                    }
                                }
                            ]
                        }))
                    })
                }}
            >
                <Ionicon
                    name={showCloud ? "cloud" : "cloud-outline"}
                    size={22}
                    color={showCloud ? "#0A84FF" : (darkMode ? "gray" : "gray")}
                />
                <Text
                    style={{
                        color: showCloud ? "#0A84FF" : (darkMode ? "gray" : "gray"),
                        fontSize: 10,
                        marginTop: 3
                    }}
                >
                    {i18n(lang, "cloud")}
                </Text>
            </Pressable>
            <Pressable
                style={{
                    alignItems: "center",
                    width: "20%",
                    paddingTop: 2
                }}
                onPress={() => {
                    if(canOpenBottomAddActionSheet && netInfo.isConnected && netInfo.isInternetReachable){
                        SheetManager.show("BottomBarAddActionSheet")
                    }
                }}
            >
                <Ionicon
                    name={netInfo.isConnected && netInfo.isInternetReachable ? (canOpenBottomAddActionSheet ? "add-circle-outline" : "close-circle-outline") : "cloud-offline-outline"}
                    size={30}
                    color={netInfo.isConnected && netInfo.isInternetReachable && canOpenBottomAddActionSheet ? darkMode ? "white" : "gray" : darkMode ? "gray" : "lightgray"}
                />
            </Pressable>
            <Pressable
                style={{
                    alignItems: "center",
                    width: "20%"
                }}
                onPress={() => {
                    navigationAnimation({ enable: false }).then(() => {
                        navigation.current.dispatch(CommonActions.reset({
                            index: 0,
                            routes: [
                                {
                                    name: "MainScreen",
                                    params: {
                                        parent: "photos"
                                    }
                                }
                            ]
                        }))
                    })
                }}
            >
                <Ionicon
                    name={isPhotosScreen ? "image" : "image-outline"}
                    size={22}
                    color={isPhotosScreen ? "#0A84FF" : (darkMode ? "gray" : "gray")}
                />
                <Text
                    style={{
                        color: isPhotosScreen ? "#0A84FF" : (darkMode ? "gray" : "gray"),
                        fontSize: 10,
                        marginTop: 3
                    }}
                >
                    {i18n(lang, "photos")}
                </Text>
            </Pressable>
            <Pressable
                style={{
                    alignItems: "center",
                    width: "20%",
                }}
                onPress={() => {
                    navigationAnimation({ enable: false }).then(() => {
                        navigation.current.dispatch(CommonActions.reset({
                            index: 0,
                            routes: [
                                {
                                    name: "SettingsScreen"
                                }
                            ]
                        }))
                    })
                }}
            >
                <Ionicon
                    name={showSettings ? "settings" : "settings-outline"}
                    size={22}
                    color={showSettings ? "#0A84FF" : (darkMode ? "gray" : "gray")}
                />
                <Text
                    style={{
                        color: showSettings ? "#0A84FF" : (darkMode ? "gray" : "gray"),
                        fontSize: 10,
                        marginTop: 3
                    }}
                >
                    {i18n(lang, "settings")}
                </Text>
            </Pressable>
        </View>
    )
})