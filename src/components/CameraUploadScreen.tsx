import React, { useEffect, useState, memo } from "react"
import { View, Text, Switch, Platform, ScrollView, TouchableOpacity, Alert } from "react-native"
import storage from "../lib/storage"
import { useMMKVBoolean, useMMKVString, useMMKVNumber } from "react-native-mmkv"
import Ionicon from "@expo/vector-icons/Ionicons"
import { i18n } from "../i18n/i18n"
import { StackActions } from "@react-navigation/native"
import { navigationAnimation } from "../lib/state"
import { SettingsGroup, SettingsButton, SettingsButtonLinkHighlight } from "./SettingsScreen"
import { showToast } from "./Toasts"
import { hasStoragePermissions, hasPhotoLibraryPermissions } from "../lib/permissions"
import { getColor } from "../lib/style/colors"

export interface CameraUploadScreenProps {
    navigation: any
}

export const CameraUploadScreen = memo(({ navigation }: CameraUploadScreenProps) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const [lang, setLang] = useMMKVString("lang", storage)
    const [userId, setUserId] = useMMKVNumber("userId", storage)
    const [cameraUploadEnabled, setCameraUploadEnabled] = useMMKVBoolean("cameraUploadEnabled:" + userId, storage)
    const [cameraUploadIncludeImages, setCameraUploadIncludeImages] = useMMKVBoolean("cameraUploadIncludeImages:" + userId, storage)
    const [cameraUploadIncludeVideos, setCameraUploadIncludeVideos] = useMMKVBoolean("cameraUploadIncludeVideos:" + userId, storage)
    const [cameraUploadFolderUUID, setCameraUploadFolderUUID] = useMMKVString("cameraUploadFolderUUID:" + userId, storage)
    const [cameraUploadFolderName, setCameraUploadFolderName] = useMMKVString("cameraUploadFolderName:" + userId, storage)
    const [hasPermissions, setHasPermissions] = useState<boolean>(false)
    const [cameraUploadEnableHeic, setCameraUploadEnableHeic] = useMMKVBoolean("cameraUploadEnableHeic:" + userId, storage)

    const chooseFolder = (): void => {
        navigationAnimation({ enable: true }).then(() => {
            showToast({ type: "cameraUploadChooseFolder", message: i18n(lang, "cameraUploadChooseFolder"), navigation })

            navigation.dispatch(StackActions.push("MainScreen", {
                parent: storage.getBoolean("defaultDriveOnly:" + userId) ? storage.getString("defaultDriveUUID:" + userId) : "base"
            }))
        })
    }

    useEffect(() => {
        hasStoragePermissions().then(() => {
            hasPhotoLibraryPermissions().then(() => {
                setHasPermissions(true)
            }).catch((err) => {
                setHasPermissions(false)

                console.log(err)
            })
        }).catch((err) => {
            setHasPermissions(false)

            console.log(err)
        })
    }, [])

    return (
        <>
            <View
                style={{
                    flexDirection: "row",
                    justifyContent: "flex-start",
                    backgroundColor: darkMode ? "black" : "white"
                }}
            >
                <TouchableOpacity
                    style={{
                        marginTop: Platform.OS == "ios" ? 17 : 4,
                        marginLeft: 15,
                    }}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicon
                        name="chevron-back"
                        size={24}
                        color={darkMode ? "white" : "black"}
                    />
                </TouchableOpacity>
                <Text
                    style={{
                        color: darkMode ? "white" : "black",
                        fontWeight: "bold",
                        fontSize: 24,
                        marginLeft: 10,
                        marginTop: Platform.OS == "ios" ? 15 : 0
                    }}
                >
                    {i18n(lang, "cameraUpload")}
                </Text>
            </View>
            <ScrollView
                style={{
                    height: "100%",
                    width: "100%",
                    backgroundColor: darkMode ? "black" : "white"
                }}
            >
                <SettingsGroup>
                    <SettingsButton
                        title={i18n(lang, "enabled")}
                        rightComponent={
                            <Switch
                                trackColor={getColor(darkMode, "switchTrackColor")}
                                thumbColor={cameraUploadEnabled ? getColor(darkMode, "switchThumbColorEnabled") : getColor(darkMode, "switchThumbColorDisabled")}
                                ios_backgroundColor={getColor(darkMode, "switchIOSBackgroundColor")}
                                disabled={!hasPermissions}
                                onValueChange={(): void => {
                                    const newValue = !cameraUploadEnabled

                                    if(newValue){
                                        if(typeof cameraUploadFolderUUID !== "string"){
                                            setCameraUploadEnabled(false)
                                            chooseFolder()

                                            return
                                        }
                                    }

                                    if(newValue){
                                        setCameraUploadIncludeImages(true)
                                    }

                                    setCameraUploadEnabled(newValue)
                                }}
                                value={cameraUploadEnabled}
                            />
                        }
                    />
                </SettingsGroup>
                {
                    !hasPermissions && (
                        <Text
                            style={{
                                color: "gray",
                                fontSize: 11,
                                paddingLeft: 17,
                                paddingTop: 5,
                                paddingRight: 17
                            }}
                        >
                            {i18n(lang, "pleaseGrantPermission")}
                        </Text>
                    )
                }
                <SettingsGroup>
                    {
                        cameraUploadEnabled ? (
                            <SettingsButton
                                title={i18n(lang, "cameraUploadFolder")}
                                rightComponent={
                                    <Text style={{
                                        color: "gray",
                                        paddingTop: 3,
                                        paddingRight: 10,
                                        fontSize: 13
                                    }}>
                                        {cameraUploadFolderName}
                                    </Text>
                                }
                            />
                        ) : (
                            <SettingsButtonLinkHighlight
                                rightText={typeof cameraUploadFolderUUID == "string" && cameraUploadFolderUUID.length > 16 ? cameraUploadFolderName : i18n(lang, "cameraUploadChooseFolder")}
                                onPress={() => {
                                    chooseFolder()
                                }}
                                title={i18n(lang, "cameraUploadFolder")}
                            />
                        )
                    }
                    <SettingsButton
                        title={i18n(lang, "cameraUploadIncludeImages")}
                        rightComponent={
                            <Switch
                                trackColor={getColor(darkMode, "switchTrackColor")}
                                thumbColor={cameraUploadIncludeImages ? getColor(darkMode, "switchThumbColorEnabled") : getColor(darkMode, "switchThumbColorDisabled")}
                                ios_backgroundColor={getColor(darkMode, "switchIOSBackgroundColor")}
                                onValueChange={() => setCameraUploadIncludeImages(!cameraUploadIncludeImages)}
                                value={cameraUploadIncludeImages}
                            />
                        }
                    />
                    <SettingsButton
                        title={i18n(lang, "cameraUploadIncludeVideos")}
                        rightComponent={
                            <Switch
                                trackColor={getColor(darkMode, "switchTrackColor")}
                                thumbColor={cameraUploadIncludeVideos ? getColor(darkMode, "switchThumbColorEnabled") : getColor(darkMode, "switchThumbColorDisabled")}
                                ios_backgroundColor={getColor(darkMode, "switchIOSBackgroundColor")}
                                onValueChange={() => setCameraUploadIncludeVideos(!cameraUploadIncludeVideos)}
                                value={cameraUploadIncludeVideos}
                            />
                        }
                    />
                    {
                        Platform.OS == "ios" && (
                            <SettingsButton
                                title={i18n(lang, "cameraUploadEnableHeic")}
                                rightComponent={
                                    <Switch
                                        trackColor={getColor(darkMode, "switchTrackColor")}
                                        thumbColor={cameraUploadEnableHeic ? getColor(darkMode, "switchThumbColorEnabled") : getColor(darkMode, "switchThumbColorDisabled")}
                                        ios_backgroundColor={getColor(darkMode, "switchIOSBackgroundColor")}
                                        onValueChange={() => setCameraUploadEnableHeic(!cameraUploadEnableHeic)}
                                        value={cameraUploadEnableHeic}
                                    />
                                }
                            />
                        )
                    }
                    {
                        Platform.OS == "android" && (
                            <SettingsButtonLinkHighlight
                                onPress={() => {
                                    navigationAnimation({ enable: true }).then(() => {
                                        navigation.dispatch(StackActions.push("CameraUploadAlbumsScreen"))
                                    })
                                }}
                                title={i18n(lang, "albums")}
                            />
                        )
                    }
                </SettingsGroup>
                <SettingsGroup>
                    <SettingsButtonLinkHighlight
                        title={i18n(lang, "cameraUploadReset")}
                        onPress={() => {
                            Alert.alert(i18n(lang, "cameraUploadReset"), i18n(lang, "cameraUploadResetInfo"), [
                                {
                                    text: i18n(lang, "cancel"),
                                    onPress: () => {
                                        return false
                                    },
                                    style: "cancel"
                                },
                                {
                                    text: i18n(lang, "ok"),
                                    onPress: () => {
                                        Alert.alert(i18n(lang, "cameraUploadReset"), i18n(lang, "areYouReallySure"), [
                                            {
                                                text: i18n(lang, "cancel"),
                                                onPress: () => {
                                                    return false
                                                },
                                                style: "cancel"
                                            },
                                            {
                                                text: i18n(lang, "ok"),
                                                onPress: () => {
                                                    try{
                                                        storage.delete("cameraUploadUploadedIds:" + userId)
                                                        storage.delete("cameraUploadUploadedHashes:" + userId)
                                                        storage.delete("cameraUploadFetchRemoteAssetsTimeout:" + userId)
                                                        storage.delete("cameraUploadRemoteHashes:" + userId)
                                                        storage.delete("cameraUploadLastRemoteAssets:" + userId)
                                                    }
                                                    catch(e){
                                                        console.log(e)
                                                    }
                
                                                    return true
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
                        }}
                    />
                </SettingsGroup>
                <View
                    style={{
                        height: 25
                    }}
                />
            </ScrollView>
        </>
    )
})