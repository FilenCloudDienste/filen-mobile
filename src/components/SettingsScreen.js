import React, { useCallback, useEffect, memo } from "react"
import { View, TouchableHighlight, Text, Switch, Pressable, Platform, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native"
import storage from "../lib/storage"
import { useMMKVBoolean, useMMKVString, useMMKVObject, useMMKVNumber } from "react-native-mmkv"
import Ionicon from "@expo/vector-icons/Ionicons"
import FastImage from "react-native-fast-image"
import { formatBytes, getFilenameFromPath, getFileExt } from "../lib/helpers"
import { i18n } from "../i18n/i18n"
import { StackActions } from "@react-navigation/native"
import { navigationAnimation } from "../lib/state"
import { useStore, waitForStateUpdate } from "../lib/state"
import { showToast } from "./Toasts"
import { getColor } from "../lib/style/colors"
import { updateUserInfo } from "../lib/user/info"
import RNFS from "react-native-fs"
import { getDownloadPath } from "../lib/download"
import { hasStoragePermissions } from "../lib/permissions"
import { SheetManager } from "react-native-actions-sheet"
import { setStatusBarStyle } from "../lib/statusbar"
import * as MediaLibrary from "expo-media-library"
import * as FileSystem from "expo-file-system"

const MISC_BASE_PATH = RNFS.DocumentDirectoryPath + (RNFS.DocumentDirectoryPath.slice(-1) == "/" ? "" : "/") + "misc/"

export const SettingsButtonLinkHighlight = memo(({ onPress, title, rightText }) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)

    return (
        <TouchableHighlight underlayColor={getColor(darkMode, "underlaySettingsButton")} style={{
            width: "100%",
            height: "auto",
            borderRadius: 10
        }} onPress={onPress}>
            <View style={{
                width: "100%",
                height: "auto",
                flexDirection: "row",
                justifyContent: "space-between",
                paddingLeft: 10,
                paddingRight: 10,
                paddingTop: 8,
                paddingBottom: 8
            }}>
                <View>
                    <Text style={{
                        color: darkMode ? "white" : "black",
                        paddingTop: Platform.OS == "ios" ? 4 : 3
                    }}>
                        {title}
                    </Text>
                </View>
                <View style={{
                    flexDirection: "row"
                }}>
                    {
                        typeof rightText !== "undefined" && (
                            <>
                                {
                                    rightText == "ActivityIndicator" ? (
                                        <ActivityIndicator size={"small"} color={darkMode ? "white" : "gray"} style={{
                                            marginRight: 5
                                        }} />
                                    ) : (
                                        <Text style={{
                                            color: "gray",
                                            paddingTop: Platform.OS == "android" ? 3 : 4,
                                            paddingRight: 10,
                                            fontSize: 13
                                        }}>
                                            {rightText}
                                        </Text>
                                    )
                                }
                            </>
                        )
                    }
                    <Ionicon name="chevron-forward-outline" size={22} color="gray" style={{
                        marginTop: 1
                    }} />
                </View>
            </View>
        </TouchableHighlight>
    )
})

export const SettingsButton = memo(({ title, rightComponent }) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)

    return (
        <View style={{
            width: "100%",
            height: "auto"
        }}>
            <View style={{
                width: "100%",
                height: "auto",
                flexDirection: "row",
                justifyContent: "space-between",
                paddingLeft: 10,
                paddingRight: 10,
                paddingTop: 10,
                paddingBottom: 10
            }}>
                <View>
                    <Text style={{
                        color: darkMode ? "white" : "black",
                        paddingTop: typeof rightComponent !== "undefined" ? (Platform.OS == "android" ? 3 : 7) : 0
                    }}>
                        {title}
                    </Text>
                </View>
                {
                    typeof rightComponent !== "undefined" && (
                        <View>
                            {rightComponent}
                        </View>
                    )
                }
            </View>
        </View>
    )
})

export const SettingsHeader = memo(({ navigation, route, navigationEnabled = true }) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const [userId, setUserId] = useMMKVNumber("userId", storage)
    const [email, setEmail] = useMMKVString("email", storage)
    const [lang, setLang] = useMMKVString("lang", storage)
    const netInfo = useStore(useCallback(state => state.netInfo))
    const [userInfo, setUserInfo] = useMMKVObject("userInfo:" + userId, storage)
    const [userAvatarCached, setUserAvatarCached] = useMMKVString("userAvatarCached:" + userId, storage)

    const cacheUserAvatar = useCallback(() => {
        if(typeof userInfo !== "undefined"){
            if(userInfo.avatarURL.indexOf("https://down.") !== -1){
                const avatarName = getFilenameFromPath(userInfo.avatarURL)

                if(userAvatarCached !== avatarName){
                    hasStoragePermissions().then(() => {
                        getDownloadPath({ type: "misc" }).then(async (path) => {
                            const avatarPath = path + avatarName
        
                            try{
                                if((await RNFS.exists(avatarPath))){
                                    await RNFS.unlink(avatarPath)
                                }
                            }
                            catch(e){
                                //console.log(e)
                            }
        
                            RNFS.downloadFile({
                                fromUrl: userInfo.avatarURL,
                                toFile: avatarPath
                            }).promise.then(async () => {
                                try{
                                    if(typeof userAvatarCached == "string"){
                                        if(userAvatarCached.length > 4){
                                            if((await RNFS.exists(MISC_BASE_PATH + userAvatarCached))){
                                                await RNFS.unlink(MISC_BASE_PATH + userAvatarCached)
                                            }
                                        }
                                    }
                                }
                                catch(e){
                                    //console.log(e)
                                }

                                setUserAvatarCached(avatarName)
                            }).catch((err) => {
                                console.log(err)
                            })
                        }).catch((err) => {
                            console.log(err)
                        })
                    }).catch((err) => {
                        console.log(err)
                    })
                }
                else{
                    if(typeof userAvatarCached == "string"){
                        if(userAvatarCached.length > 4){
                            getDownloadPath({ type: "misc" }).then((path) => {
                                const avatarPath = path + userAvatarCached
            
                                RNFS.exists(avatarPath).then((exists) => {
                                    if(!exists){
                                        setUserAvatarCached("")
        
                                        setTimeout(() => {
                                            cacheUserAvatar()
                                        }, 500)
                                    }
                                }).catch((err) => {
                                    console.log(err)
                                })
                            }).catch((err) => {
                                console.log(err)
                            })
                        }
                    }
                }
            }
        }
    })

    useEffect(() => {
        updateUserInfo()
    }, [])

    useEffect(() => {
        cacheUserAvatar()
    }, [userInfo])

    return (
        <Pressable style={{
            width: "100%",
            height: "auto",
            flexDirection: "row",
            justifyContent: "space-between",
            paddingLeft: 10,
            paddingRight: 10,
            paddingBottom: 10,
            paddingTop: 10,
            alignItems: "center"
        }} onPress={() => {
            if(!navigationEnabled){
                return false
            }

            if(!netInfo.isConnected || !netInfo.isInternetReachable){
                return showToast({ message: i18n(lang, "deviceOffline") })
            }

            navigationAnimation({ enable: true }).then(() => {
                navigation.dispatch(StackActions.push("SettingsAccountScreen"))
            })
        }}>
            <TouchableOpacity onPress={() => {
                if(Platform.OS == "android"){ // @TODO fix android avatar upload
                    return false
                }

                if(!netInfo.isConnected || !netInfo.isInternetReachable){
                    return showToast({ message: i18n(lang, "deviceOffline") })
                }
                
                SheetManager.show("ProfilePictureActionSheet")
            }}>
                <FastImage source={typeof userAvatarCached == "string" && userAvatarCached.length > 4 ? ({ uri: "file://" + MISC_BASE_PATH + userAvatarCached }) : (typeof userInfo !== "undefined" && userInfo.avatarURL.indexOf("https://down.") !== -1 ? { uri: userInfo.avatarURL } : require("../assets/images/appstore.png"))} style={{
                    width: 50,
                    height: 50,
                    borderRadius: 50
                }} />
            </TouchableOpacity>
            <View style={{
                width: "79%",
                paddingLeft: 15
            }}>
                <Text style={{
                    color: darkMode ? "white" : "black",
                    fontWeight: "bold",
                    fontSize: 19
                }} numberOfLines={1}>
                    {email}
                </Text>
                <Text style={{
                    color: "gray",
                    fontSize: 12,
                    marginTop: 1
                }} numberOfLines={1}>
                    {
                        typeof userInfo !== "undefined" ?
                            i18n(lang, "settingsHeaderUsage", true, ["__USAGE__", "__MAX__", "__PERCENT__"], [formatBytes(userInfo.storageUsed), formatBytes(userInfo.maxStorage), (isNaN((userInfo.storageUsed / userInfo.maxStorage * 100)) ? 0 : ((userInfo.storageUsed / userInfo.maxStorage * 100) >= 100) ? 100 : (userInfo.storageUsed / userInfo.maxStorage * 100).toFixed(2))])
                        :
                            i18n(lang, "settingsHeaderUsage", true, ["__USAGE__", "__MAX__", "__PERCENT__"], [formatBytes(0), formatBytes(0), 0])
                    }
                </Text>
            </View>
            <Ionicon name="chevron-forward-outline" size={22} color={navigationEnabled ? "gray" : "transparent"} />
        </Pressable>
    )
})

export const SettingsGroup = memo((props) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)

    return (
        <View style={{
            height: "auto",
            width: "100%",
            paddingLeft: 15,
            paddingRight: 15,
            marginTop: typeof props.marginTop !== "undefined" ? props.marginTop : 20
        }}>
            <View style={{
                height: "auto",
                width: "100%",
                backgroundColor: darkMode ? "#171717" : "lightgray",
                borderRadius: 10
            }}>
                {props.children}
            </View>
        </View>
    )
})

export const SettingsScreen = memo(({ navigation, route }) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const [lang, setLang] = useMMKVString("lang", storage)
    const [userId, setUserId] = useMMKVNumber("userId", storage)
    const [onlyWifiUploads, setOnlyWifiUploads] = useMMKVBoolean("onlyWifiUploads:" + userId, storage)
    const [onlyWifiDownloads, setOnlyWifiDownloads] = useMMKVBoolean("onlyWifiDownloads:" + userId, storage)
    const [hideThumbnails, setHideThumbnails] = useMMKVBoolean("hideThumbnails:" + userId, storage)
    const [hideFileNames, setHideFileNames] = useMMKVBoolean("hideFileNames:" + userId, storage)
    const [hideSizes, setHideSizes] = useMMKVBoolean("hideSizes:" + userId, storage)
    const [biometricPinAuth, setBiometricPinAuth] = useMMKVBoolean("biometricPinAuth:" + userId, storage)
    const netInfo = useStore(useCallback(state => state.netInfo))
    const [startOnCloudScreen, setStartOnCloudScreen] = useMMKVBoolean("startOnCloudScreen:" + userId, storage)
    const [userSelectedTheme, setUserSelectedTheme] = useMMKVString("userSelectedTheme", storage)

    return (
        <ScrollView style={{
            height: "100%",
            width: "100%",
            backgroundColor: darkMode ? "black" : "white"
        }}>
            <Text style={{
                color: darkMode ? "white" : "black",
                fontWeight: "bold",
                fontSize: 24,
                marginLeft: 15,
                marginTop: Platform.OS == "ios" ? 20 : 0
            }}>
                {i18n(lang, "settings")}
            </Text>
            <SettingsGroup marginTop={15}>
                <SettingsHeader navigation={navigation} route={route} />
            </SettingsGroup>
            {
                __DEV__ && (
                    <>
                        <SettingsGroup>
                            <SettingsButtonLinkHighlight title={"Clear loadItemsCache"} onPress={() => {
                                const keys = storage.getAllKeys()

                                keys.forEach(key => {
                                    if(key.indexOf("loadItemsCache:") !== -1 || key.indexOf("folderSize:") !== -1){
                                        storage.delete(key)
                                    }
                                })

                                showToast({ message: "Cleared" })
                            }} />
                            <SettingsButtonLinkHighlight title={"get medialib"} onPress={() => {
                                MediaLibrary.getAssetsAsync().then((content) => {
                                    const asset = content.assets[1]

                                    FileSystem.copyAsync({
                                        from: asset.uri,
                                        to: FileSystem.cacheDirectory + asset.filename,
                                    }).then(() => {
                                        FileSystem.getInfoAsync(FileSystem.cacheDirectory + asset.filename).then(console.log)
                                    })
                                })
                            }} />
                        </SettingsGroup>
                    </>
                )
            }
            <SettingsGroup>
                <SettingsButtonLinkHighlight onPress={() => {
                    if(!netInfo.isConnected || !netInfo.isInternetReachable){
                        return showToast({ message: i18n(lang, "deviceOffline") })
                    }

                    navigationAnimation({ enable: true }).then(() => {
                        navigation.dispatch(StackActions.push("MainScreen", {
                            parent: "trash"
                        }))
                    })
                }} title={i18n(lang, "trash")} />
                <SettingsButtonLinkHighlight onPress={() => {
                    if(!netInfo.isConnected || !netInfo.isInternetReachable){
                        return showToast({ message: i18n(lang, "deviceOffline") })
                    }

                    navigationAnimation({ enable: true }).then(() => {
                        navigation.dispatch(StackActions.push("TransfersScreen"))
                    })
                }} title={i18n(lang, "transfers")} />
                <SettingsButtonLinkHighlight onPress={() => {
                    if(!netInfo.isConnected || !netInfo.isInternetReachable){
                        return showToast({ message: i18n(lang, "deviceOffline") })
                    }
                    
                    navigationAnimation({ enable: true }).then(() => {
                        navigation.dispatch(StackActions.push("EventsScreen"))
                    })
                }} title={i18n(lang, "events")} />
            </SettingsGroup>
            <SettingsGroup>
                <SettingsButtonLinkHighlight onPress={() => {
                    if(!netInfo.isConnected || !netInfo.isInternetReachable){
                        return showToast({ message: i18n(lang, "deviceOffline") })
                    }

                    navigationAnimation({ enable: true }).then(() => {
                        navigation.dispatch(StackActions.push("CameraUploadScreen"))
                    })
                }} title={i18n(lang, "cameraUpload")} />
            </SettingsGroup>
            <SettingsGroup>
                <SettingsButton title={i18n(lang, "darkMode")} rightComponent={
                    <Switch
                        trackColor={getColor(darkMode, "switchTrackColor")}
                        thumbColor={userSelectedTheme == "dark" ? getColor(darkMode, "switchThumbColorEnabled") : getColor(darkMode, "switchThumbColorDisabled")}
                        ios_backgroundColor={getColor(darkMode, "switchIOSBackgroundColor")}
                        onValueChange={(value) => {
                            if(value){
                                setUserSelectedTheme("dark")
                                setDarkMode(true)
                                setStatusBarStyle(true)
                            }
                            else{
                                setUserSelectedTheme("light")
                                setDarkMode(false)
                                setStatusBarStyle(false)
                            }
                        }}
                        value={typeof userSelectedTheme == "string" && userSelectedTheme.length > 1 ? userSelectedTheme == "dark" : darkMode}
                    />
                } />
                <SettingsButton title={i18n(lang, "startOnCloudScreen")} rightComponent={
                    <Switch
                        trackColor={getColor(darkMode, "switchTrackColor")}
                        thumbColor={startOnCloudScreen ? getColor(darkMode, "switchThumbColorEnabled") : getColor(darkMode, "switchThumbColorDisabled")}
                        ios_backgroundColor={getColor(darkMode, "switchIOSBackgroundColor")}
                        onValueChange={() => setStartOnCloudScreen(!startOnCloudScreen)}
                        value={startOnCloudScreen}
                    />
                } />
                <SettingsButton title={i18n(lang, "onlyWifiUploads")} rightComponent={
                    <Switch
                        trackColor={getColor(darkMode, "switchTrackColor")}
                        thumbColor={onlyWifiUploads ? getColor(darkMode, "switchThumbColorEnabled") : getColor(darkMode, "switchThumbColorDisabled")}
                        ios_backgroundColor={getColor(darkMode, "switchIOSBackgroundColor")}
                        onValueChange={() => setOnlyWifiUploads(!onlyWifiUploads)}
                        value={onlyWifiUploads}
                    />
                } />
                <SettingsButton title={i18n(lang, "onlyWifiDownloads")} rightComponent={
                    <Switch
                        trackColor={getColor(darkMode, "switchTrackColor")}
                        thumbColor={onlyWifiDownloads ? getColor(darkMode, "switchThumbColorEnabled") : getColor(darkMode, "switchThumbColorDisabled")}
                        ios_backgroundColor={getColor(darkMode, "switchIOSBackgroundColor")}
                        onValueChange={() => setOnlyWifiDownloads(!onlyWifiDownloads)}
                        value={onlyWifiDownloads}
                    />
                } />
                <SettingsButton title={i18n(lang, "hideThumbnails")} rightComponent={
                    <Switch
                        trackColor={getColor(darkMode, "switchTrackColor")}
                        thumbColor={hideThumbnails ? getColor(darkMode, "switchThumbColorEnabled") : getColor(darkMode, "switchThumbColorDisabled")}
                        ios_backgroundColor={getColor(darkMode, "switchIOSBackgroundColor")}
                        onValueChange={() => setHideThumbnails(!hideThumbnails)}
                        value={hideThumbnails}
                    />
                } />
                <SettingsButton title={i18n(lang, "hideFileNames")} rightComponent={
                    <Switch
                        trackColor={getColor(darkMode, "switchTrackColor")}
                        thumbColor={hideFileNames ? getColor(darkMode, "switchThumbColorEnabled") : getColor(darkMode, "switchThumbColorDisabled")}
                        ios_backgroundColor={getColor(darkMode, "switchIOSBackgroundColor")}
                        onValueChange={() => setHideFileNames(!hideFileNames)}
                        value={hideFileNames}
                    />
                } />
                <SettingsButton title={i18n(lang, "hideFileFolderSize")} rightComponent={
                    <Switch
                        trackColor={getColor(darkMode, "switchTrackColor")}
                        thumbColor={hideSizes ? getColor(darkMode, "switchThumbColorEnabled") : getColor(darkMode, "switchThumbColorDisabled")}
                        ios_backgroundColor={getColor(darkMode, "switchIOSBackgroundColor")}
                        onValueChange={() => setHideSizes(!hideSizes)}
                        value={hideSizes}
                    />
                } />
                <SettingsButton title={i18n(lang, "biometricPinAuth")} rightComponent={
                    <Switch
                        trackColor={getColor(darkMode, "switchTrackColor")}
                        thumbColor={biometricPinAuth ? getColor(darkMode, "switchThumbColorEnabled") : getColor(darkMode, "switchThumbColorDisabled")}
                        ios_backgroundColor={getColor(darkMode, "switchIOSBackgroundColor")}
                        onValueChange={() => {
                            if(biometricPinAuth){
                                return Alert.alert(i18n(lang, "disableBiometricPinAuth"), i18n(lang, "disableBiometricPinAuthWarning"), [
                                    {
                                        text: i18n(lang, "cancel"),
                                        onPress: () => {
                                            setBiometricPinAuth(true)

                                            return false
                                        },
                                        style: "cancel"
                                    },
                                    {
                                        text: i18n(lang, "ok"),
                                        onPress: () => {
                                            Alert.alert(i18n(lang, "disableBiometricPinAuth"), i18n(lang, "areYouReallySure"), [
                                                {
                                                    text: i18n(lang, "cancel"),
                                                    onPress: () => {
                                                        setBiometricPinAuth(true)

                                                        return false
                                                    },
                                                    style: "cancel"
                                                },
                                                {
                                                    text: i18n(lang, "ok"),
                                                    onPress: () => {
                                                        setBiometricPinAuth(false)

                                                        storage.delete("pinCode:" + userId)
                                                    },
                                                    style: "default"
                                                }
                                            ], {
                                                cancelable: true
                                            })
                                        },
                                        style: "default"
                                    }
                                ], {
                                    cancelable: true
                                })
                            }

                            waitForStateUpdate("biometricAuthScreenState", "setup").then(() => {
                                navigationAnimation({ enable: true }).then(() => {
                                    navigation.dispatch(StackActions.push("BiometricAuthScreen"))
                                })
                            })
                        }}
                        value={biometricPinAuth}
                    />
                } />
                <SettingsButtonLinkHighlight onPress={() => {
                    navigationAnimation({ enable: true }).then(() => {
                        navigation.dispatch(StackActions.push("LanguageScreen"))
                    })
                }} title={i18n(lang, "language")} />
            </SettingsGroup>
            <SettingsGroup>
                <SettingsButtonLinkHighlight onPress={() => {
                    navigationAnimation({ enable: true }).then(() => {
                        navigation.dispatch(StackActions.push("SettingsAdvancedScreen"))
                    })
                }} title={i18n(lang, "advanced")} />
            </SettingsGroup>
            <View style={{ height: 25 }}></View>
        </ScrollView>
    )
})