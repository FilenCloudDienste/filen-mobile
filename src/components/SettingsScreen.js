import React from "react"
import { View, TouchableHighlight, Text, Switch, Pressable, Platform, ScrollView } from "react-native"
import { storage } from "../lib/storage"
import { useMMKVBoolean, useMMKVString } from "react-native-mmkv"
import Ionicon from "react-native-vector-icons/Ionicons"
import FastImage from "react-native-fast-image"
import { formatBytes } from "../lib/helpers"
import { i18n } from "../i18n/i18n"
import { StackActions } from "@react-navigation/native"
import { navigationAnimation } from "../lib/state"
import { useStore } from "../lib/state"
import { showToast } from "./Toasts"
import { getColor } from "../lib/style/colors"
import { hasBiometricPermissions } from "../lib/permissions"

export const SettingsButtonLinkHighlight = ({ onPress, title, rightText }) => {
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
                    <Ionicon name="chevron-forward-outline" size={22} color="gray" style={{
                        marginTop: 1
                    }} />
                </View>
            </View>
        </TouchableHighlight>
    )
}

export const SettingsButton = ({ title, rightComponent }) => {
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
}

export const SettingsHeader = ({ navigation, route, navigationEnabled = true }) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const [email, setEmail] = useMMKVString("email", storage)
    const [lang, setLang] = useMMKVString("lang", storage)
    const netInfo = useStore(state => state.netInfo)

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
            <View>
                <FastImage source={require("../assets/images/appstore.png")} style={{
                    width: 50,
                    height: 50,
                    borderRadius: 50
                }} />
            </View>
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
                    {i18n(lang, "settingsHeaderUsage", true, ["__USAGE__", "__MAX__", "__PERCENT__"], [formatBytes(storage.getNumber("storageUsage")), formatBytes(storage.getNumber("maxStorage")), storage.getNumber("storageUsedPercent")])}
                </Text>
            </View>
            <Ionicon name="chevron-forward-outline" size={22} color={navigationEnabled ? "gray" : "transparent"} />
        </Pressable>
    )
}

export const SettingsGroup = (props) => {
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
}

export const SettingsScreen = ({ navigation, route }) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const [lang, setLang] = useMMKVString("lang", storage)
    const [email, setEmail] = useMMKVString("email", storage)
    const [onlyWifiUploads, setOnlyWifiUploads] = useMMKVBoolean("onlyWifiUploads:" + email, storage)
    const [onlyWifiDownloads, setOnlyWifiDownloads] = useMMKVBoolean("onlyWifiDownloads:" + email, storage)
    const [hideThumbnails, setHideThumbnails] = useMMKVBoolean("hideThumbnails:" + email, storage)
    const [hideFileNames, setHideFileNames] = useMMKVBoolean("hideFileNames:" + email, storage)
    const [hideSizes, setHideSizes] = useMMKVBoolean("hideSizes:" + email, storage)
    const [biometricPinAuth, setBiometricPinAuth] = useMMKVBoolean("biometricPinAuth:" + email, storage)
    const setBiometricAuthScreenState = useStore(state => state.setBiometricAuthScreenState)
    const netInfo = useStore(state => state.netInfo)

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
            <SettingsGroup>
                <SettingsButtonLinkHighlight onPress={() => {
                    navigationAnimation({ enable: true }).then(() => {
                        navigation.dispatch(StackActions.push("MainScreen", {
                            parent: "trash"
                        }))
                    })
                }} title={i18n(lang, "trash")} />
                <SettingsButtonLinkHighlight onPress={() => {
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
                    navigationAnimation({ enable: true }).then(() => {
                        navigation.dispatch(StackActions.push("CameraUploadScreen"))
                    })
                }} title={i18n(lang, "cameraUpload")} />
            </SettingsGroup>
            <SettingsGroup>
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
                                return setBiometricPinAuth(false)
                            }

                            hasBiometricPermissions().then(() => {
                                setBiometricAuthScreenState("setup")

                                navigationAnimation({ enable: true }).then(() => {
                                    navigation.dispatch(StackActions.push("BiometricAuthScreen"))
                                })
                            }).catch((err) => {
                                showToast({ message: err.toString() })

                                console.log(err)
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
            <View style={{ height: 75 }}></View>
        </ScrollView>
    )
}