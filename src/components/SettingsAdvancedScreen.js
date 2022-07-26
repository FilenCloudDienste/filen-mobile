import React, { useState, useEffect, useCallback, memo } from "react"
import { View, Text, Platform, ScrollView, TouchableOpacity, Alert } from "react-native"
import storage from "../lib/storage"
import { useMMKVBoolean, useMMKVString } from "react-native-mmkv"
import Ionicon from "@expo/vector-icons/Ionicons"
import { i18n } from "../i18n/i18n"
import { SettingsGroup, SettingsButtonLinkHighlight } from "./SettingsScreen"
import { useStore } from "../lib/state"
import { showToast } from "./Toasts"
import RNFS from "react-native-fs"
import { getDownloadPath } from "../lib/download"
import DeviceInfo from "react-native-device-info"
import { formatBytes } from "../lib/helpers"
import memoryCache from "../lib/memoryCache"

export const calculateFolderSize = async (folderPath, size = 0) => {
    const dirList = await RNFS.readDir(folderPath)
  
    dirList.map(async (item) => {
        if(item.isDirectory()){
            size = await calculateFolderSize(folderPath + "/" + item.name, size)
        }
        else{
            size = size + item.size
        }
    })
  
    return size
}

export const SettingsAdvancedScreen = memo(({ navigation, route }) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const [lang, setLang] = useMMKVString("lang", storage)
    const [thumbnailCacheLocalFolderSize, setThumbnailCacheLocalFolderSize] = useState(0)
    const [cachesLocalFolderSize, setCachesLocalFolderSize] = useState(0)
    const [tempLocalFolderSize, setTempLocalFolderSize] = useState(0)
    const [isCalculatingFolderSizes, setIsCalculatingFolderSizes] = useState(true)

    const calculateFolderSizes = useCallback(() => {
        setIsCalculatingFolderSizes(true)

        getDownloadPath({ type: "thumbnail" }).then((thumbnailCachePath) => {
            calculateFolderSize(thumbnailCachePath).then((thumbnailCacheSize) => {
                setThumbnailCacheLocalFolderSize(thumbnailCacheSize)

                calculateFolderSize(RNFS.CachesDirectoryPath).then((cachesSize) => {
                    setCachesLocalFolderSize(cachesSize)

                    calculateFolderSize(RNFS.TemporaryDirectoryPath).then((tempSize) => {
                        setTempLocalFolderSize(tempSize)
                        setIsCalculatingFolderSizes(false)
                    })
                })
            })
        })
    })

    useEffect(() => {
        calculateFolderSizes()
    }, [])

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
                    <SettingsButtonLinkHighlight title={i18n(lang, "clearThumbnailCache")} rightText={isCalculatingFolderSizes ? "ActivityIndicator" : formatBytes(thumbnailCacheLocalFolderSize)} onPress={() => {
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

                                                const keys = storage.getAllKeys()
            
                                                for(let i = 0; i < keys.length; i++){
                                                    if(keys[i].indexOf("thumbnailCache:") !== -1){
                                                        storage.delete(keys[i])
                                                    }

                                                    if(keys[i].indexOf("loadItemsCache:") !== -1){
                                                        let cache = []

                                                        try{
                                                            cache = JSON.parse(storage.getString(keys[i]))
                                                        }
                                                        catch(e){
                                                            console.log(e)
                                                        }

                                                        for(let x = 0; x < cache.length; x++){
                                                            cache[x]['thumbnail'] = undefined
                                                        }

                                                        storage.set(keys[i], JSON.stringify(cache))
                                                    }
                                                }

                                                memoryCache.cache.forEach((value, key) => {
                                                    if(key.indexOf("thumbnailCache:") !== -1 || key.indexOf("cachedThumbnailPaths:") !== -1){
                                                        memoryCache.delete(key)
                                                    }
                                                })

                                                try{
                                                    var dirList = await RNFS.readDir(await getDownloadPath({ type: "thumbnail" }))

                                                    for(let i = 0; i < dirList.length; i++){
                                                        await RNFS.unlink(dirList[i].path)
                                                    }
                                                }
                                                catch(e){
                                                    console.log(e)
                                                }

                                                showToast({ message: i18n(lang, "thumbnailCacheCleared") })

                                                useStore.setState({ fullscreenLoadingModalVisible: false })

                                                calculateFolderSizes()
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
                    <SettingsButtonLinkHighlight title={i18n(lang, "clearCachesDirectory")} rightText={isCalculatingFolderSizes ? "ActivityIndicator" : formatBytes(cachesLocalFolderSize)} onPress={() => {
                        Alert.alert(i18n(lang, "clearCachesDirectory"), i18n(lang, "clearCachesDirectoryInfo"), [
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
                                    Alert.alert(i18n(lang, "clearCachesDirectory"), i18n(lang, "areYouReallySure"), [
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

                                                try{
                                                    var dirList = await RNFS.readDir(RNFS.CachesDirectoryPath)

                                                    for(let i = 0; i < dirList.length; i++){
                                                        await RNFS.unlink(dirList[i].path)
                                                    }
                                                }
                                                catch(e){
                                                    console.log(e)
                                                }

                                                showToast({ message: i18n(lang, "clearCachesDirectoryCleared") })

                                                useStore.setState({ fullscreenLoadingModalVisible: false })

                                                calculateFolderSizes()
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
                    <SettingsButtonLinkHighlight title={i18n(lang, "clearTempDirectory")} rightText={isCalculatingFolderSizes ? "ActivityIndicator" : formatBytes(tempLocalFolderSize)} onPress={() => {
                        Alert.alert(i18n(lang, "clearTempDirectory"), i18n(lang, "clearTempDirectoryInfo"), [
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
                                    Alert.alert(i18n(lang, "clearTempDirectory"), i18n(lang, "areYouReallySure"), [
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

                                                try{
                                                    var dirList = await RNFS.readDir(RNFS.TemporaryDirectoryPath)

                                                    for(let i = 0; i < dirList.length; i++){
                                                        await RNFS.unlink(dirList[i].path)
                                                    }
                                                }
                                                catch(e){
                                                    console.log(e)
                                                }

                                                showToast({ message: i18n(lang, "clearTempDirectoryCleared") })

                                                useStore.setState({ fullscreenLoadingModalVisible: false })

                                                calculateFolderSizes()
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
                    paddingLeft: 17
                }}>
                    <Text style={{
                        color: darkMode ? "gray" : "gray",
                        fontSize: 11
                    }}>
                        {i18n(lang, "version")} {DeviceInfo.getVersion()}
                    </Text>
                </View>
                <View style={{ height: 25 }}></View>
            </ScrollView>
        </>
    )
})