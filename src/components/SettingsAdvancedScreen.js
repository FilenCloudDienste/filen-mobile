import React from "react"
import { View, Text, Platform, ScrollView, TouchableOpacity, Alert } from "react-native"
import { storage } from "../lib/storage"
import { useMMKVBoolean, useMMKVString } from "react-native-mmkv"
import Ionicon from "react-native-vector-icons/Ionicons"
import { i18n } from "../i18n/i18n"
import { SettingsGroup, SettingsButtonLinkHighlight } from "./SettingsScreen"
import { useStore } from "../lib/state"
import { showToast } from "./Toasts"
import RNFS from "react-native-fs"
import { getDownloadPath } from "../lib/download"
import DeviceInfo from "react-native-device-info"

export const SettingsAdvancedScreen = ({ navigation, route }) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const [lang, setLang] = useMMKVString("lang", storage)

    return (
        <>
            <View style={{
                flexDirection: "row",
                justifyContent: "flex-start",
                backgroundColor: darkMode ? "black" : "white"
            }}>
                <TouchableOpacity style={{
                    marginTop: Platform.OS == "ios" ? 17 : 4,
                    marginLeft: 15,
                }} onPress={() => navigation.goBack()}>
                    <Ionicon name="chevron-back" size={24} color={darkMode ? "white" : "black"}></Ionicon>
                </TouchableOpacity>
                <Text style={{
                    color: darkMode ? "white" : "black",
                    fontWeight: "bold",
                    fontSize: 24,
                    marginLeft: 10,
                    marginTop: Platform.OS == "ios" ? 15 : 0
                }}>
                    {i18n(lang, "advanced")}
                </Text>
            </View>
            <ScrollView style={{
                height: "100%",
                width: "100%",
                backgroundColor: darkMode ? "black" : "white"
            }}>
                <SettingsGroup>
                    <SettingsButtonLinkHighlight title={i18n(lang, "clearThumbnailCache")} onPress={() => {
                        Alert.alert(i18n(lang, "clearThumbnailCache"), i18n(lang, "clearThumbnailCacheInfo"), [
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
                                    Alert.alert(i18n(lang, "clearThumbnailCache"), i18n(lang, "areYouReallySure"), [
                                        {
                                            text: i18n(lang, "cancel"),
                                            onPress: () => {
                                                return false
                                            },
                                            style: "cancel"
                                        },
                                        {
                                            text: i18n(lang, "ok"),
                                            onPress: async () => {
                                                useStore.setState({ fullscreenLoadingModalVisible: true })

                                                let keys = []

                                                try{
                                                    keys = storage.getAllKeys()
                                                }
                                                catch(e){
                                                    console.log(e)
                                                }
            
                                                for(let i = 0; i < keys.length; i++){
                                                    if(keys[i].indexOf("thumbnailCache:") !== -1){
                                                        try{
                                                            storage.delete(keys[i])
                                                        }
                                                        catch(e){
                                                            console.log(e)
                                                        }
                                                    }
                                                }

                                                try{
                                                    var thumbPath = await getDownloadPath({ type: "thumbnail" })
                                                    var dirList = await RNFS.readDir(thumbPath.slice(0, (thumbPath.length - 1)))

                                                    for(let i = 0; i < dirList.length; i++){
                                                        await RNFS.unlink(dirList[i].path)
                                                    }
                                                }
                                                catch(e){
                                                    console.log(e)
                                                }

                                                setTimeout(() => {
                                                    showToast({ message: i18n(lang, "thumbnailCacheCleared") })

                                                    useStore.setState({ fullscreenLoadingModalVisible: false })
                                                }, 2000)
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
                    }} />
                </SettingsGroup>
                <View style={{
                    marginTop: 15,
                    justifyContent: "center",
                    alignItems: "center"
                }}>
                    <Text style={{
                        color: darkMode ? "white" : "black"
                    }}>
                        {i18n(lang, "version")} {DeviceInfo.getVersion()}
                    </Text>
                </View>
                <View style={{ height: 25 }}></View>
            </ScrollView>
        </>
    )
}