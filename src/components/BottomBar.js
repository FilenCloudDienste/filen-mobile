import React from "react"
import { Text, View, Pressable } from "react-native"
import { storage } from "../lib/storage"
import { useMMKVBoolean, useMMKVString } from "react-native-mmkv"
import { SheetManager } from "react-native-actions-sheet"
import { useStore, navigationAnimation } from "../lib/state"
import Ionicon from "react-native-vector-icons/Ionicons"
import { i18n } from "../i18n/i18n"
import { getParent, getRouteURL } from "../lib/helpers"
import { CommonActions } from "@react-navigation/native"
import { getColor } from "../lib/style/colors"

export const BottomBar = ({ navigation, route }) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const currentRoutes = useStore(state => state.currentRoutes)
    const [lang, setLang] = useMMKVString("lang", storage)
    const netInfo = useStore(state => state.netInfo)

    const parent = getParent(route)
    const routeURL = getRouteURL(route)

    let currentScreenName = "MainScreen"
    let isRecentsScreen = false
    let isTrashScreen = false
    let isSharedScreen = false
    let isPhotosScreen = false
    let isFavoritesScreen = false
    let isBaseScreen = false
    let isOfflineScreen = false

    if(typeof currentRoutes == "object"){
        if(currentRoutes.length > 0){
            const currentRoute = currentRoutes[currentRoutes.length - 1]

            currentScreenName = currentRoute.name

            isRecentsScreen = (routeURL.indexOf("recents") !== -1)
            isTrashScreen = (routeURL.indexOf("trash") !== -1)
            isPhotosScreen = (routeURL.indexOf("photos") !== -1)
            isFavoritesScreen = (routeURL.indexOf("favorites") !== -1)
            isSharedScreen = ((routeURL.indexOf("shared-in") !== -1) || (routeURL.indexOf("shared-out") !== -1) || (routeURL.indexOf("links") !== -1))
            isBaseScreen = (routeURL.indexOf("base") !== -1)
            isOfflineScreen = (routeURL.indexOf("offline") !== -1)
        }
    }

    const canOpenBottomAddActionSheet = (currentScreenName == "MainScreen" && !isOfflineScreen && !isTrashScreen && !isFavoritesScreen && !isPhotosScreen && !isRecentsScreen && routeURL.indexOf("shared-in") == -1 && parent !== "shared-out" && parent !== "links")

    return (
        <View style={{
            paddingTop: 6,
            height: 80,
            flexDirection: "row",
            justifyContent: "space-between",
            borderTopColor: getColor(darkMode, "primaryBorder"),
            borderTopWidth: 0
        }}>
            <Pressable style={{
                alignItems: "center",
                width: "20%",
            }} onPress={() => {
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
            }}>
                <Ionicon name={isSharedScreen || isRecentsScreen || isFavoritesScreen  || isOfflineScreen? "home" : "home-outline"} size={22} color={isSharedScreen || isRecentsScreen || isFavoritesScreen || isOfflineScreen ? "#0A84FF" : (darkMode ? "gray" : "gray")} />
                <Text style={{
                    color: isSharedScreen || isRecentsScreen || isFavoritesScreen || isOfflineScreen ? "#0A84FF" : (darkMode ? "gray" : "gray"),
                    fontSize: 10,
                    marginTop: 3
                }}>{i18n(lang, "home")}</Text>
            </Pressable>
            <Pressable style={{
                alignItems: "center",
                width: "20%",
            }} onPress={() => {
                navigationAnimation({ enable: false }).then(() => {
                    navigation.current.dispatch(CommonActions.reset({
                        index: 0,
                        routes: [
                            {
                                name: "MainScreen",
                                params: {
                                    parent: "base"
                                }
                            }
                        ]
                    }))
                })
            }}>
                <Ionicon name={isBaseScreen && !isRecentsScreen && !isTrashScreen && !isSharedScreen && currentScreenName !== "SettingsAccountScreen" && currentScreenName !== "LanguageScreen" && currentScreenName !== "SettingsAdvancedScreen" && currentScreenName !== "CameraUploadScreen" && currentScreenName !== "SettingsScreen" && currentScreenName !== "TransfersScreen" && currentScreenName !== "EventsScreen" && currentScreenName !== "EventsInfoScreen" ? "cloud" : "cloud-outline"} size={22} color={isBaseScreen && !isRecentsScreen && !isTrashScreen && !isSharedScreen && currentScreenName !== "SettingsAccountScreen" && currentScreenName !== "LanguageScreen" && currentScreenName !== "SettingsAdvancedScreen" && currentScreenName !== "SettingsScreen" && currentScreenName !== "TransfersScreen" && currentScreenName !== "CameraUploadScreen" && currentScreenName !== "EventsScreen" && currentScreenName !== "EventsInfoScreen" ? "#0A84FF" : (darkMode ? "gray" : "gray")} />
                <Text style={{
                    color: isBaseScreen && !isRecentsScreen && !isTrashScreen && !isSharedScreen && currentScreenName !== "SettingsAccountScreen" && currentScreenName !== "LanguageScreen" && currentScreenName !== "SettingsAdvancedScreen" && currentScreenName !== "CameraUploadScreen" && currentScreenName !== "SettingsScreen" && currentScreenName !== "TransfersScreen" && currentScreenName !== "EventsScreen" && currentScreenName !== "EventsInfoScreen" ? "#0A84FF" : (darkMode ? "gray" : "gray"),
                    fontSize: 10,
                    marginTop: 3
                }}>{i18n(lang, "cloud")}</Text>
            </Pressable>
            <Pressable style={{
                alignItems: "center",
                width: "20%",
                paddingTop: 2
            }} onPress={() => {
                if(canOpenBottomAddActionSheet && netInfo.isConnected && netInfo.isInternetReachable){
                    SheetManager.show("BottomBarAddActionSheet")
                }
            }}>
                <Ionicon name={netInfo.isConnected && netInfo.isInternetReachable ? (canOpenBottomAddActionSheet ? "add-circle-outline" : "close-circle-outline") : "cloud-offline-outline"} size={30} color={darkMode ? "white" : "gray"} />
            </Pressable>
            <Pressable style={{
                alignItems: "center",
                width: "20%"
            }} onPress={() => {
                if(!isPhotosScreen){
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
                }
            }}>
                <Ionicon name={isPhotosScreen ? "image" : "image-outline"} size={22} color={isPhotosScreen ? "#0A84FF" : (darkMode ? "gray" : "gray")} />
                <Text style={{
                    color: isPhotosScreen ? "#0A84FF" : (darkMode ? "gray" : "gray"),
                    fontSize: 10,
                    marginTop: 3
                }}>{i18n(lang, "photos")}</Text>
            </Pressable>
            <Pressable style={{
                alignItems: "center",
                width: "20%",
            }} onPress={() => {
                if(currentScreenName !== "SettingsScreen"){
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
                }
            }}>
                <Ionicon name={currentScreenName == "SettingsScreen" || currentScreenName == "LanguageScreen" || currentScreenName == "SettingsAccountScreen" || currentScreenName == "SettingsAdvancedScreen" || currentScreenName == "CameraUploadScreen" || currentScreenName == "EventsScreen" || currentScreenName == "EventsInfoScreen" || isTrashScreen ? "settings" : "settings-outline"} size={22} color={currentScreenName == "SettingsScreen" || currentScreenName == "LanguageScreen" || currentScreenName == "SettingsAccountScreen" || currentScreenName == "SettingsAdvancedScreen" || currentScreenName == "CameraUploadScreen" || currentScreenName == "EventsScreen" || currentScreenName == "EventsInfoScreen" || isTrashScreen ? "#0A84FF" : (darkMode ? "gray" : "gray")} />
                <Text style={{
                    color: currentScreenName == "SettingsScreen" || currentScreenName == "LanguageScreen" || currentScreenName == "SettingsAccountScreen" || currentScreenName == "SettingsAdvancedScreen" || currentScreenName == "CameraUploadScreen" || currentScreenName == "EventsScreen" || currentScreenName == "EventsInfoScreen" || isTrashScreen ? "#0A84FF" : (darkMode ? "gray" : "gray"),
                    fontSize: 10,
                    marginTop: 3
                }}>{i18n(lang, "settings")}</Text>
            </Pressable>
        </View>
    )
}