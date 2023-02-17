import React, { useEffect, useState, memo } from "react"
import { View, Text, Switch, Platform, ScrollView, Alert } from "react-native"
import storage from "../../lib/storage"
import { useMMKVBoolean, useMMKVString, useMMKVNumber } from "react-native-mmkv"
import { i18n } from "../../i18n"
import { StackActions } from "@react-navigation/native"
import { navigationAnimation } from "../../lib/state"
import { SettingsGroup, SettingsButtonLinkHighlight } from "../SettingsScreen/SettingsScreen"
import { showToast } from "../../components/Toasts"
import { hasStoragePermissions, hasPhotoLibraryPermissions } from "../../lib/permissions"
import { getColor } from "../../style/colors"
import DefaultTopBar from "../../components/TopBar/DefaultTopBar"
import useDarkMode from "../../lib/hooks/useDarkMode"
import useLang from "../../lib/hooks/useLang"
import { NavigationContainerRef } from "@react-navigation/native"

export interface CameraUploadScreenProps {
    navigation: NavigationContainerRef<ReactNavigation.RootParamList>
}

export const CameraUploadScreen = memo(({ navigation }: CameraUploadScreenProps) => {
    const darkMode = useDarkMode()
    const lang = useLang()
    const [userId, setUserId] = useMMKVNumber("userId", storage)
    const [cameraUploadEnabled, setCameraUploadEnabled] = useMMKVBoolean("cameraUploadEnabled:" + userId, storage)
    const [cameraUploadIncludeImages, setCameraUploadIncludeImages] = useMMKVBoolean("cameraUploadIncludeImages:" + userId, storage)
    const [cameraUploadIncludeVideos, setCameraUploadIncludeVideos] = useMMKVBoolean("cameraUploadIncludeVideos:" + userId, storage)
    const [cameraUploadFolderUUID, setCameraUploadFolderUUID] = useMMKVString("cameraUploadFolderUUID:" + userId, storage)
    const [cameraUploadFolderName, setCameraUploadFolderName] = useMMKVString("cameraUploadFolderName:" + userId, storage)
    const [hasPermissions, setHasPermissions] = useState<boolean>(false)
    const [cameraUploadEnableHeic, setCameraUploadEnableHeic] = useMMKVBoolean("cameraUploadEnableHeic:" + userId, storage)
    const [cameraUploadAfterEnabled, setCameraUploadAfterEnabled] = useMMKVBoolean("cameraUploadAfterEnabled:" + userId, storage)
    const [cameraUploadOnlyUploadOriginal, setCameraUploadOnlyUploadOriginal] = useMMKVBoolean("cameraUploadOnlyUploadOriginal:" + userId, storage)
    const [cameraUploadConvertLiveAndBurst, setCameraUploadConvertLiveAndBurst] = useMMKVBoolean("cameraUploadConvertLiveAndBurst:" + userId, storage)
    const [cameraUploadConvertLiveAndBurstAndKeepOriginal, setCameraUploadConvertLiveAndBurstAndKeepOriginal] = useMMKVBoolean("cameraUploadConvertLiveAndBurstAndKeepOriginal:" + userId, storage)

    const chooseFolder = async () => {
        await navigationAnimation({ enable: true })

        showToast({ type: "cameraUploadChooseFolder", message: i18n(lang, "cameraUploadChooseFolder"), navigation })

        navigation.dispatch(StackActions.push("MainScreen", {
            parent: storage.getBoolean("defaultDriveOnly:" + userId) ? storage.getString("defaultDriveUUID:" + userId) : "base"
        }))
    }

    useEffect(() => {
        if(!cameraUploadOnlyUploadOriginal && !cameraUploadConvertLiveAndBurst && !cameraUploadConvertLiveAndBurstAndKeepOriginal){
            setCameraUploadOnlyUploadOriginal(true)
        }
    }, [cameraUploadOnlyUploadOriginal, cameraUploadConvertLiveAndBurst, cameraUploadConvertLiveAndBurstAndKeepOriginal])

    useEffect(() => {
        Promise.all([
            hasStoragePermissions(),
            hasPhotoLibraryPermissions()
        ]).then(() => {
            setHasPermissions(true)
        }).catch((err) => {
            setHasPermissions(false)

            console.log(err)
        })
    }, [])

    return (
        <>
            <DefaultTopBar
                onPressBack={() => navigation.goBack()}
                leftText={i18n(lang, "settings")}
                middleText={i18n(lang, "cameraUpload")}
            />
            <ScrollView
                style={{
                    height: "100%",
                    width: "100%",
                    backgroundColor: getColor(darkMode, "backgroundPrimary"),
                    marginTop: 10
                }}
            >
                <SettingsGroup
                    marginTop={5}
                >
                    <SettingsButtonLinkHighlight
                        title={i18n(lang, "enabled")}
                        borderBottomRadius={10}
                        borderTopRadius={10}
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
                                fontSize: 12,
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
                            <SettingsButtonLinkHighlight
                                title={i18n(lang, "cameraUploadFolder")}
                                borderBottomRadius={10}
                                borderTopRadius={10}
                                withBottomBorder={true}
                                rightComponent={
                                    <Text
                                        style={{
                                            color: "gray",
                                            paddingRight: 5,
                                            fontSize: 17,
                                            maxWidth: 200
                                        }}
                                        numberOfLines={1}
                                    >
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
                                borderBottomRadius={10}
                                borderTopRadius={10}
                                title={i18n(lang, "cameraUploadFolder")}
                                withBottomBorder={true}
                            />
                        )
                    }
                    <SettingsButtonLinkHighlight
                        title={i18n(lang, "cameraUploadIncludeImages")}
                        withBottomBorder={true}
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
                    <SettingsButtonLinkHighlight
                        title={i18n(lang, "cameraUploadIncludeVideos")}
                        withBottomBorder={true}
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
                    <SettingsButtonLinkHighlight
                        title={i18n(lang, "cameraUploadAfterEnabled")}
                        withBottomBorder={true}
                        rightComponent={
                            <Switch
                                trackColor={getColor(darkMode, "switchTrackColor")}
                                thumbColor={cameraUploadAfterEnabled ? getColor(darkMode, "switchThumbColorEnabled") : getColor(darkMode, "switchThumbColorDisabled")}
                                ios_backgroundColor={getColor(darkMode, "switchIOSBackgroundColor")}
                                onValueChange={() => {
                                    const newValue = !cameraUploadAfterEnabled

                                    setCameraUploadAfterEnabled(newValue)

                                    if(newValue){
                                        storage.set("cameraUploadAfterEnabledTime:" + userId, new Date().getTime())
                                    }
                                    else{
                                        storage.set("cameraUploadAfterEnabledTime:" + userId, 0)
                                    }
                                }}
                                value={cameraUploadAfterEnabled}
                            />
                        }
                    />
                    <SettingsButtonLinkHighlight
                        onPress={() => {
                            navigationAnimation({ enable: true }).then(() => {
                                navigation.dispatch(StackActions.push("CameraUploadAlbumsScreen"))
                            })
                        }}
                        title={i18n(lang, "albums")}
                        borderBottomRadius={10}
                    />
                </SettingsGroup>
                {
                    Platform.OS == "ios" && (
                        <SettingsGroup>
                            <SettingsButtonLinkHighlight
                                title={i18n(lang, "cameraUploadEnableHeic")}
                                borderBottomRadius={10}
                                withBottomBorder={true}
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
                            <SettingsButtonLinkHighlight
                                title={i18n(lang, "cameraUploadOnlyUploadOriginal")}
                                borderBottomRadius={10}
                                withBottomBorder={true}
                                rightComponent={
                                    <Switch
                                        trackColor={getColor(darkMode, "switchTrackColor")}
                                        thumbColor={cameraUploadOnlyUploadOriginal ? getColor(darkMode, "switchThumbColorEnabled") : getColor(darkMode, "switchThumbColorDisabled")}
                                        ios_backgroundColor={getColor(darkMode, "switchIOSBackgroundColor")}
                                        onValueChange={() => {
                                            const newValue = !cameraUploadOnlyUploadOriginal

                                            setCameraUploadOnlyUploadOriginal(newValue)

                                            if(newValue){
                                                setCameraUploadConvertLiveAndBurst(false)
                                                setCameraUploadConvertLiveAndBurstAndKeepOriginal(false)
                                            }
                                        }}
                                        value={cameraUploadOnlyUploadOriginal}
                                    />
                                }
                            />
                            <SettingsButtonLinkHighlight
                                title={i18n(lang, "cameraUploadConvertLiveAndBurst")}
                                borderBottomRadius={10}
                                withBottomBorder={true}
                                rightComponent={
                                    <Switch
                                        trackColor={getColor(darkMode, "switchTrackColor")}
                                        thumbColor={cameraUploadConvertLiveAndBurst ? getColor(darkMode, "switchThumbColorEnabled") : getColor(darkMode, "switchThumbColorDisabled")}
                                        ios_backgroundColor={getColor(darkMode, "switchIOSBackgroundColor")}
                                        onValueChange={() => {
                                            const newValue = !cameraUploadConvertLiveAndBurst

                                            setCameraUploadConvertLiveAndBurst(newValue)

                                            if(newValue){
                                                setCameraUploadOnlyUploadOriginal(false)
                                                setCameraUploadConvertLiveAndBurstAndKeepOriginal(false)
                                            }
                                        }}
                                        value={cameraUploadConvertLiveAndBurst}
                                    />
                                }
                            />
                            <SettingsButtonLinkHighlight
                                title={i18n(lang, "cameraUploadConvertLiveAndBurstAndKeepOriginal")}
                                borderBottomRadius={10}
                                rightComponent={
                                    <Switch
                                        trackColor={getColor(darkMode, "switchTrackColor")}
                                        thumbColor={cameraUploadConvertLiveAndBurstAndKeepOriginal ? getColor(darkMode, "switchThumbColorEnabled") : getColor(darkMode, "switchThumbColorDisabled")}
                                        ios_backgroundColor={getColor(darkMode, "switchIOSBackgroundColor")}
                                        onValueChange={() => {
                                            const newValue = !cameraUploadConvertLiveAndBurstAndKeepOriginal

                                            setCameraUploadConvertLiveAndBurstAndKeepOriginal(newValue)

                                            if(newValue){
                                                setCameraUploadOnlyUploadOriginal(false)
                                                setCameraUploadConvertLiveAndBurst(false)
                                            }
                                        }}
                                        value={cameraUploadConvertLiveAndBurstAndKeepOriginal}
                                    />
                                }
                            />
                        </SettingsGroup>
                    )
                }
                <View
                    style={{
                        height: 25
                    }}
                />
            </ScrollView>
        </>
    )
})