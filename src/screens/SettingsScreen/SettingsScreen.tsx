import React, { useEffect, memo } from "react"
import { View, TouchableHighlight, Text, Switch, Pressable, Platform, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native"
import storage from "../../lib/storage"
import { useMMKVBoolean, useMMKVString, useMMKVObject, useMMKVNumber } from "react-native-mmkv"
import Ionicon from "@expo/vector-icons/Ionicons"
import { formatBytes, getFilenameFromPath } from "../../lib/helpers"
import { i18n } from "../../i18n"
import { StackActions } from "@react-navigation/native"
import { navigationAnimation } from "../../lib/state"
import { waitForStateUpdate } from "../../lib/state"
import { showToast } from "../../components/Toasts"
import { getColor } from "../../style/colors"
import { updateUserInfo } from "../../lib/services/user/info"
import RNFS from "react-native-fs"
import { getDownloadPath } from "../../lib/services/download/download"
import { hasStoragePermissions } from "../../lib/permissions"
import { SheetManager } from "react-native-actions-sheet"
import { setStatusBarStyle } from "../../lib/statusbar"
import { isOnline } from "../../lib/services/isOnline"
import useDarkMode from "../../lib/hooks/useDarkMode"
import useLang from "../../lib/hooks/useLang"
import { MISC_BASE_PATH } from "../../lib/constants"
import FastImage from "react-native-fast-image"

export interface SettingsButtonLinkHighlightProps {
    onPress?: () => any,
    title?: string,
    rightText?: string,
    iconBackgroundColor?: string,
    iconName?: string,
    borderBottomRadius?: number,
    borderTopRadius?: number,
    withBottomBorder?: boolean,
    rightComponent?: React.ReactNode
}

export const SettingsButtonLinkHighlight = memo(({ onPress, title, rightText, iconBackgroundColor, iconName, borderBottomRadius, borderTopRadius, withBottomBorder, rightComponent }: SettingsButtonLinkHighlightProps) => {
    const darkMode = useDarkMode()
    const withIcon: boolean = typeof iconBackgroundColor == "string" && typeof iconName == "string"

    return (
        <TouchableHighlight
            underlayColor={getColor(darkMode, "underlaySettingsButton")}
            style={{
                width: "100%",
                height: 45,
                borderBottomLeftRadius: typeof borderBottomRadius !== "undefined" ? borderBottomRadius : 0,
                borderBottomRightRadius: typeof borderBottomRadius !== "undefined" ? borderBottomRadius : 0,
                borderTopLeftRadius: typeof borderTopRadius !== "undefined" ? borderTopRadius : 0,
                borderTopRightRadius: typeof borderTopRadius !== "undefined" ? borderTopRadius : 0,
            }}
            onPress={typeof onPress !== "undefined" ? onPress : undefined}
        >
            <View
                style={{
                    flexDirection: "row",
                    width: "100%",
                    height: 45
                }}
            >
                {
                    withIcon && (
                        <View
                            style={{
                                alignItems: "center",
                                justifyContent: "center",
                                flexDirection: "row",
                                paddingLeft: 15
                            }}
                        >
                            <View
                                style={{
                                    width: 30,
                                    height: 30,
                                    borderRadius: 5,
                                    backgroundColor: iconBackgroundColor as string,
                                    alignItems: "center",
                                    justifyContent: "center"
                                }}
                            >
                                <Ionicon
                                    name={iconName as any}
                                    color="white"
                                    size={22}
                                    style={{
                                        marginLeft: 1
                                    }}
                                />
                            </View>
                        </View>
                    )
                }
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginLeft: 15,
                        borderBottomWidth: withBottomBorder ? 0.5 : undefined,
                        borderBottomColor: withBottomBorder ? (darkMode ? "rgba(84, 84, 88, 0.3)" : "rgba(84, 84, 88, 0.15)") : undefined, 
                        height: 45,
                        flex: 1
                    }}
                >
                    <Text
                        style={{
                            color: getColor(darkMode, "textPrimary"),
                            fontWeight: "400",
                            fontSize: 17,
                            flex: 1,
                            paddingRight: 15
                        }}
                        numberOfLines={1}
                        lineBreakMode="middle"
                    >
                        {title}
                    </Text>
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginRight: typeof rightComponent !== "undefined" ? 15 : 10
                        }}
                    >
                        {
                            typeof rightComponent !== "undefined" ? rightComponent : (
                                <>
                                    {
                                        typeof rightText !== "undefined" && (
                                            <>
                                                {
                                                    rightText == "ActivityIndicator" ? (
                                                        <ActivityIndicator
                                                            size="small"
                                                            color={darkMode ? "white" : "gray"}
                                                            style={{
                                                                marginRight: 5
                                                            }}
                                                        />
                                                    ) : (
                                                        <Text
                                                            style={{
                                                                color: "gray",
                                                                paddingRight: 10,
                                                                fontSize: 17
                                                            }}
                                                            numberOfLines={1}
                                                            lineBreakMode="middle"
                                                        >
                                                            {rightText}
                                                        </Text>
                                                    )
                                                }
                                            </>
                                        )
                                    }
                                    <Ionicon
                                        name="chevron-forward-outline"
                                        size={18}
                                        color="gray"
                                        style={{
                                            marginTop: 2
                                        }}
                                    />
                                </>
                            )
                        }
                    </View>
                </View>
            </View>
        </TouchableHighlight>
    )
})

export interface SettingsButtonProps {
    title?: any,
    rightComponent?: any
}

export const SettingsButton = memo(({ title, rightComponent }: SettingsButtonProps) => {
    const darkMode = useDarkMode()

    return (
        <View
            style={{
                width: "100%",
                height: "auto"
            }}
        >
            <View
                style={{
                    width: "100%",
                    height: "auto",
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingLeft: 15,
                    paddingRight: 15,
                    paddingTop: 10,
                    paddingBottom: 10,
                }}
            >
                <View
                    style={{
                        maxWidth: typeof rightComponent !== "undefined" ? "80%" : "100%"
                    }}
                >
                    {
                        typeof title == "string" ? (
                            <Text
                                style={{
                                    color: getColor(darkMode, "textPrimary"),
                                    paddingTop: typeof rightComponent !== "undefined" ? (Platform.OS == "android" ? 3 : 7) : 0
                                }}
                                numberOfLines={1}
                            >
                                {title}
                            </Text>
                        ) : title
                    }
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

export interface SettingsHeaderProps {
    navigation: any,
    navigationEnabled?: boolean
}

export const SettingsHeader = memo(({ navigation, navigationEnabled = true }: SettingsHeaderProps) => {
    const darkMode = useDarkMode()
    const [userId, setUserId] = useMMKVNumber("userId", storage)
    const [email, setEmail] = useMMKVString("email", storage)
    const lang = useLang()
    const [userInfo, setUserInfo]: any[] = useMMKVObject("userInfo:" + userId, storage)
    const [userAvatarCached, setUserAvatarCached] = useMMKVString("userAvatarCached:" + userId, storage)

    const cacheUserAvatar = () => {
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
    }

    useEffect(() => {
        cacheUserAvatar()
    }, [userInfo])

    useEffect(() => {
        updateUserInfo()
    }, [])

    return (
        <Pressable
            style={{
                width: "100%",
                height: 80,
                flexDirection: "row",
                justifyContent: "space-between",
                paddingLeft: 10,
                paddingRight: 10,
                paddingBottom: 10,
                paddingTop: 10,
                alignItems: "center"
            }}
            onPress={() => {
                if(!navigationEnabled){
                    return
                }

                if(!isOnline()){
                    showToast({ message: i18n(lang, "deviceOffline") })

                    return
                }

                navigationAnimation({ enable: true }).then(() => {
                    navigation.dispatch(StackActions.push("SettingsAccountScreen"))
                })
            }}
        >
            <TouchableOpacity
                onPress={() => {
                    return

                    if(Platform.OS == "android"){ // @ TODO fix android avatar upload
                        return
                    }

                    if(!isOnline()){
                        showToast({ message: i18n(lang, "deviceOffline") })

                        return
                    }
                    
                    SheetManager.show("ProfilePictureActionSheet")
                }}
            >
                <FastImage
                    source={typeof userAvatarCached == "string" && userAvatarCached.length > 4 ? ({ uri: "file://" + MISC_BASE_PATH + userAvatarCached }) : (typeof userInfo !== "undefined" && userInfo.avatarURL.indexOf("https://down.") !== -1 ? { uri: userInfo.avatarURL } : require("../../assets/images/appstore.png"))}
                    style={{
                        width: 60,
                        height: 60,
                        borderRadius: 60
                    }}
                />
            </TouchableOpacity>
            <View
                style={{
                    width: "75%",
                    paddingLeft: 15
                }}
            >
                <Text
                    style={{
                        color: getColor(darkMode, "textPrimary"),
                        fontWeight: "500",
                        fontSize: 22
                    }}
                    numberOfLines={1}
                >
                    {email}
                </Text>
                <Text
                    style={{
                        color: getColor(darkMode, "textPrimary"),
                        fontSize: 13,
                        marginTop: 5,
                        fontWeight: "400"
                    }}
                    numberOfLines={1}
                >
                    {
                        typeof userInfo !== "undefined" ?
                            i18n(lang, "settingsHeaderUsage", true, ["__USAGE__", "__MAX__", "__PERCENT__"], [formatBytes(userInfo.storageUsed), formatBytes(userInfo.maxStorage), (isNaN((userInfo.storageUsed / userInfo.maxStorage * 100)) ? 0 : ((userInfo.storageUsed / userInfo.maxStorage * 100) >= 100) ? 100 : (userInfo.storageUsed / userInfo.maxStorage * 100).toFixed(2))])
                        :
                            i18n(lang, "settingsHeaderUsage", true, ["__USAGE__", "__MAX__", "__PERCENT__"], [formatBytes(0), formatBytes(0), 0])
                    }
                </Text>
            </View>
            <Ionicon
                name="chevron-forward-outline"
                size={22}
                color={navigationEnabled ? "gray" : "transparent"}
            />
        </Pressable>
    )
})

export interface SettingsGroupProps {
    marginTop?: number,
    children: any
}

export const SettingsGroup = memo((props: SettingsGroupProps) => {
    const darkMode = useDarkMode()

    return (
        <View
            style={{
                height: "auto",
                width: "100%",
                paddingLeft: 15,
                paddingRight: 15,
                marginTop: typeof props.marginTop !== "undefined" ? props.marginTop : 20
            }}
        >
            <View
                style={{
                    height: "auto",
                    width: "100%",
                    backgroundColor: getColor(darkMode, "backgroundSecondary"),
                    borderRadius: 10
                }}
            >
                {props.children}
            </View>
        </View>
    )
})

export interface SettingsScreenProps {
    navigation: any,
    route: any
}

export const SettingsScreen = memo(({ navigation, route }: SettingsScreenProps) => {
    const darkMode = useDarkMode()
    const lang = useLang()
    const [userId, setUserId] = useMMKVNumber("userId", storage)
    const [onlyWifiUploads, setOnlyWifiUploads] = useMMKVBoolean("onlyWifiUploads:" + userId, storage)
    const [onlyWifiDownloads, setOnlyWifiDownloads] = useMMKVBoolean("onlyWifiDownloads:" + userId, storage)
    const [hideThumbnails, setHideThumbnails] = useMMKVBoolean("hideThumbnails:" + userId, storage)
    const [hideFileNames, setHideFileNames] = useMMKVBoolean("hideFileNames:" + userId, storage)
    const [hideSizes, setHideSizes] = useMMKVBoolean("hideSizes:" + userId, storage)
    const [biometricPinAuth, setBiometricPinAuth] = useMMKVBoolean("biometricPinAuth:" + userId, storage)
    const [startOnCloudScreen, setStartOnCloudScreen] = useMMKVBoolean("startOnCloudScreen:" + userId, storage)
    const [userSelectedTheme, setUserSelectedTheme] = useMMKVString("userSelectedTheme", storage)
    const [onlyUsePINCode, setOnlyUsePINCode] = useMMKVBoolean("onlyUsePINCode:" + userId, storage)
    const [lockAppAfter, setLockAppAfter] = useMMKVNumber("lockAppAfter:" + userId, storage)
    const [keepAppAwake, setKeepAppAwake] = useMMKVBoolean("keepAppAwake", storage)
    const [dontFollowSystemTheme, setDontFollowSystemTheme] = useMMKVBoolean("dontFollowSystemTheme", storage)
    const [hideRecents, setHideRecents] = useMMKVBoolean("hideRecents:" + userId, storage)

    return (
        <ScrollView
            style={{
                height: "100%",
                width: "100%",
                backgroundColor: getColor(darkMode, "backgroundPrimary")
            }}
        >
            <Text
                style={{
                    color: getColor(darkMode, "textPrimary"),
                    fontWeight: "bold",
                    fontSize: 24,
                    marginLeft: 15,
                    marginTop: Platform.OS == "ios" ? 20 : 0
                }}
            >
                {i18n(lang, "settings")}
            </Text>
            <SettingsGroup marginTop={15}>
                <SettingsHeader navigation={navigation} />
            </SettingsGroup>
            <SettingsGroup>
                <SettingsButtonLinkHighlight
                    onPress={() => {
                        if(!isOnline()){
                            return showToast({ message: i18n(lang, "deviceOffline") })
                        }

                        navigationAnimation({ enable: true }).then(() => {
                            navigation.dispatch(StackActions.push("MainScreen", {
                                parent: "trash"
                            }))
                        })
                    }}
                    title={i18n(lang, "trash")}
                    withBottomBorder={true}
                    borderTopRadius={10}
                    iconBackgroundColor={getColor(darkMode, "red")}
                    iconName="trash-outline"
                />
                <SettingsButtonLinkHighlight
                    onPress={() => {
                        if(!isOnline()){
                            return showToast({ message: i18n(lang, "deviceOffline") })
                        }

                        navigationAnimation({ enable: true }).then(() => {
                            navigation.dispatch(StackActions.push("TransfersScreen"))
                        })
                    }}
                    title={i18n(lang, "transfers")}
                    withBottomBorder={true}
                    iconBackgroundColor={getColor(darkMode, "blue")}
                    iconName="repeat-outline"
                />
                <SettingsButtonLinkHighlight
                    onPress={() => {
                        if(!isOnline()){
                            return showToast({ message: i18n(lang, "deviceOffline") })
                        }
                        
                        navigationAnimation({ enable: true }).then(() => {
                            navigation.dispatch(StackActions.push("EventsScreen"))
                        })
                    }}
                    title={i18n(lang, "events")}
                    borderBottomRadius={10}
                    iconBackgroundColor={getColor(darkMode, "orange")}
                    iconName="list-outline"
                />
            </SettingsGroup>
            <SettingsGroup>
                <SettingsButtonLinkHighlight
                    onPress={() => {
                        if(!isOnline()){
                            return showToast({ message: i18n(lang, "deviceOffline") })
                        }

                        navigationAnimation({ enable: true }).then(() => {
                            navigation.dispatch(StackActions.push("CameraUploadScreen"))
                        })
                    }}
                    title={i18n(lang, "cameraUpload")}
                    borderBottomRadius={10}
                    iconBackgroundColor={getColor(darkMode, "green")}
                    iconName="camera-outline"
                    borderTopRadius={10}
                />
            </SettingsGroup>
            <SettingsGroup>
                <SettingsButtonLinkHighlight
                    title={i18n(lang, "darkMode")}
                    withBottomBorder={true}
                    borderTopRadius={10}
                    iconBackgroundColor="gray"
                    iconName="contrast-outline"
                    rightComponent={
                        <Switch
                            trackColor={getColor(darkMode, "switchTrackColor")}
                            thumbColor={userSelectedTheme == "dark" ? getColor(darkMode, "switchThumbColorEnabled") : getColor(darkMode, "switchThumbColorDisabled")}
                            ios_backgroundColor={getColor(darkMode, "switchIOSBackgroundColor")}
                            onValueChange={(value) => {
                                if(value){
                                    setUserSelectedTheme("dark")
                                    setStatusBarStyle(true)

                                    storage.set("darkMode", true)
                                }
                                else{
                                    setUserSelectedTheme("light")
                                    setStatusBarStyle(false)

                                    storage.set("darkMode", false)
                                }
                            }}
                            value={typeof userSelectedTheme == "string" && userSelectedTheme.length > 1 ? userSelectedTheme == "dark" : darkMode}
                        />
                    }
                />
                <SettingsButtonLinkHighlight
                    title={i18n(lang, "followSystemTheme")}
                    withBottomBorder={true}
                    iconBackgroundColor="gray"
                    iconName="contrast-outline"
                    rightComponent={
                        <Switch
                            trackColor={getColor(darkMode, "switchTrackColor")}
                            thumbColor={!dontFollowSystemTheme ? getColor(darkMode, "switchThumbColorEnabled") : getColor(darkMode, "switchThumbColorDisabled")}
                            ios_backgroundColor={getColor(darkMode, "switchIOSBackgroundColor")}
                            onValueChange={(value) => setDontFollowSystemTheme(!dontFollowSystemTheme)}
                            value={!dontFollowSystemTheme}
                        />
                    }
                />
                <SettingsButtonLinkHighlight
                    title={i18n(lang, "startOnCloudScreen")}
                    withBottomBorder={true}
                    iconBackgroundColor={getColor(darkMode, "orange")}
                    iconName="home-outline"
                    rightComponent={
                        <Switch
                            trackColor={getColor(darkMode, "switchTrackColor")}
                            thumbColor={startOnCloudScreen ? getColor(darkMode, "switchThumbColorEnabled") : getColor(darkMode, "switchThumbColorDisabled")}
                            ios_backgroundColor={getColor(darkMode, "switchIOSBackgroundColor")}
                            onValueChange={() => setStartOnCloudScreen(!startOnCloudScreen)}
                            value={startOnCloudScreen}
                        />
                    }
                />
                <SettingsButtonLinkHighlight
                    title={i18n(lang, "hideRecents")}
                    withBottomBorder={true}
                    iconBackgroundColor={getColor(darkMode, "purple")}
                    iconName="time-outline"
                    rightComponent={
                        <Switch
                            trackColor={getColor(darkMode, "switchTrackColor")}
                            thumbColor={hideRecents ? getColor(darkMode, "switchThumbColorEnabled") : getColor(darkMode, "switchThumbColorDisabled")}
                            ios_backgroundColor={getColor(darkMode, "switchIOSBackgroundColor")}
                            onValueChange={() => setHideRecents(!hideRecents)}
                            value={hideRecents}
                        />
                    }
                />
                <SettingsButtonLinkHighlight
                    title={i18n(lang, "onlyWifiUploads")}
                    iconBackgroundColor={getColor(darkMode, "blue")}
                    iconName="wifi-outline"
                    withBottomBorder={true}
                    rightComponent={
                        <Switch
                            trackColor={getColor(darkMode, "switchTrackColor")}
                            thumbColor={onlyWifiUploads ? getColor(darkMode, "switchThumbColorEnabled") : getColor(darkMode, "switchThumbColorDisabled")}
                            ios_backgroundColor={getColor(darkMode, "switchIOSBackgroundColor")}
                            onValueChange={() => setOnlyWifiUploads(!onlyWifiUploads)}
                            value={onlyWifiUploads}
                        />
                    }
                />
                <SettingsButtonLinkHighlight
                    title={i18n(lang, "onlyWifiDownloads")}
                    iconBackgroundColor={getColor(darkMode, "blue")}
                    iconName="wifi-outline"
                    rightComponent={
                        <Switch
                            trackColor={getColor(darkMode, "switchTrackColor")}
                            thumbColor={onlyWifiDownloads ? getColor(darkMode, "switchThumbColorEnabled") : getColor(darkMode, "switchThumbColorDisabled")}
                            ios_backgroundColor={getColor(darkMode, "switchIOSBackgroundColor")}
                            onValueChange={() => setOnlyWifiDownloads(!onlyWifiDownloads)}
                            value={onlyWifiDownloads}
                        />
                    }
                />
            </SettingsGroup>
            <SettingsGroup>
                <SettingsButtonLinkHighlight
                    title={i18n(lang, "hideThumbnails")}
                    withBottomBorder={true}
                    iconBackgroundColor={getColor(darkMode, "indigo")}
                    iconName="image-outline"
                    rightComponent={
                        <Switch
                            trackColor={getColor(darkMode, "switchTrackColor")}
                            thumbColor={hideThumbnails ? getColor(darkMode, "switchThumbColorEnabled") : getColor(darkMode, "switchThumbColorDisabled")}
                            ios_backgroundColor={getColor(darkMode, "switchIOSBackgroundColor")}
                            onValueChange={() => setHideThumbnails(!hideThumbnails)}
                            value={hideThumbnails}
                        />
                    }
                />
                <SettingsButtonLinkHighlight
                    title={i18n(lang, "hideFileNames")}
                    withBottomBorder={true}
                    iconBackgroundColor={getColor(darkMode, "indigo")}
                    iconName="text-outline"
                    rightComponent={
                        <Switch
                            trackColor={getColor(darkMode, "switchTrackColor")}
                            thumbColor={hideFileNames ? getColor(darkMode, "switchThumbColorEnabled") : getColor(darkMode, "switchThumbColorDisabled")}
                            ios_backgroundColor={getColor(darkMode, "switchIOSBackgroundColor")}
                            onValueChange={() => setHideFileNames(!hideFileNames)}
                            value={hideFileNames}
                        />
                    }
                />
                <SettingsButtonLinkHighlight
                    title={i18n(lang, "hideFileFolderSize")}
                    iconBackgroundColor={getColor(darkMode, "indigo")}
                    iconName="analytics-outline"
                    rightComponent={
                        <Switch
                            trackColor={getColor(darkMode, "switchTrackColor")}
                            thumbColor={hideSizes ? getColor(darkMode, "switchThumbColorEnabled") : getColor(darkMode, "switchThumbColorDisabled")}
                            ios_backgroundColor={getColor(darkMode, "switchIOSBackgroundColor")}
                            onValueChange={() => setHideSizes(!hideSizes)}
                            value={hideSizes}
                        />
                    }
                />
            </SettingsGroup>
            <SettingsGroup>
                <SettingsButtonLinkHighlight
                    title={i18n(lang, "biometricPinAuth")}
                    withBottomBorder={true}
                    iconBackgroundColor={getColor(darkMode, "red")}
                    iconName="lock-closed-outline"
                    rightComponent={
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
                    }
                />
                <SettingsButtonLinkHighlight
                    title={i18n(lang, "onlyUsePINCode")}
                    withBottomBorder={true}
                    iconBackgroundColor={getColor(darkMode, "red")}
                    iconName="barcode-outline"
                    rightComponent={
                        <Switch
                            trackColor={getColor(darkMode, "switchTrackColor")}
                            thumbColor={onlyUsePINCode ? getColor(darkMode, "switchThumbColorEnabled") : getColor(darkMode, "switchThumbColorDisabled")}
                            ios_backgroundColor={getColor(darkMode, "switchIOSBackgroundColor")}
                            onValueChange={() => setOnlyUsePINCode(!onlyUsePINCode)}
                            value={onlyUsePINCode}
                        />
                    }
                />
                <SettingsButtonLinkHighlight
                    onPress={() => SheetManager.show("LockAppAfterActionSheet")}
                    title={i18n(lang, "lockAppAfter")}
                    iconBackgroundColor={getColor(darkMode, "pink")}
                    withBottomBorder={true}
                    iconName="time-outline"
                    rightText={
                        lockAppAfter == 0
                        ? i18n(lang, "fiveMinutes")
                        : lockAppAfter == 1 
                        ? i18n(lang, "immediately")
                        : lockAppAfter == 60
                        ? i18n(lang, "oneMinute")
                        : lockAppAfter == 180
                        ? i18n(lang, "threeMinutes")
                        : lockAppAfter == 300
                        ? i18n(lang, "fiveMinutes")
                        : lockAppAfter == 600
                        ? i18n(lang, "tenMinutes")
                        : lockAppAfter == 900
                        ? i18n(lang, "fifteenMinutes")
                        : lockAppAfter == 1800
                        ? i18n(lang, "thirtyMinutes")
                        : i18n(lang, "oneHour")
                    }
                />
                <SettingsButtonLinkHighlight
                    title={i18n(lang, "keepAppAwake")}
                    iconBackgroundColor={getColor(darkMode, "blue")}
                    iconName="hourglass-outline"
                    borderBottomRadius={10}
                    rightComponent={
                        <Switch
                            trackColor={getColor(darkMode, "switchTrackColor")}
                            thumbColor={keepAppAwake ? getColor(darkMode, "switchThumbColorEnabled") : getColor(darkMode, "switchThumbColorDisabled")}
                            ios_backgroundColor={getColor(darkMode, "switchIOSBackgroundColor")}
                            onValueChange={() => setKeepAppAwake(!keepAppAwake)}
                            value={keepAppAwake}
                        />
                    }
                />
            </SettingsGroup>
            <SettingsGroup>
                <SettingsButtonLinkHighlight
                    onPress={() => {
                        navigationAnimation({ enable: true }).then(() => {
                            navigation.dispatch(StackActions.push("LanguageScreen"))
                        })
                    }}
                    title={i18n(lang, "language")}
                    iconBackgroundColor={getColor(darkMode, "purple")}
                    iconName="language-outline"
                    borderTopRadius={10}
                    withBottomBorder={true}
                />
                <SettingsButtonLinkHighlight
                    onPress={() => {
                        navigationAnimation({ enable: true }).then(() => {
                            navigation.dispatch(StackActions.push("SettingsAdvancedScreen"))
                        })
                    }}
                    title={i18n(lang, "advanced")}
                    iconBackgroundColor="gray"
                    iconName="cog-outline"
                    borderBottomRadius={10}
                />
            </SettingsGroup>
            <View
                style={{
                    height: 25
                }}
            />
        </ScrollView>
    )
})