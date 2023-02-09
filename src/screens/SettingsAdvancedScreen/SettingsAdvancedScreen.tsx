import React, { useState, useEffect, memo, useCallback } from "react"
import { View, Text, ScrollView, Alert, Share } from "react-native"
import storage from "../../lib/storage"
import useLang from "../../lib/hooks/useLang"
import { i18n } from "../../i18n"
import { SettingsGroup, SettingsButtonLinkHighlight } from "../SettingsScreen/SettingsScreen"
import { useStore } from "../../lib/state"
import { showToast } from "../../components/Toasts"
import { getDownloadPath } from "../../lib/services/download/download"
import DeviceInfo from "react-native-device-info"
import { formatBytes, toExpoFsPath } from "../../lib/helpers"
import memoryCache from "../../lib/memoryCache"
import * as FileSystem from "expo-file-system"
import pathModule from "path"
import RNFS from "react-native-fs"
import DefaultTopBar from "../../components/TopBar/DefaultTopBar"
import useDarkMode from "../../lib/hooks/useDarkMode"
import FastImage from "react-native-fast-image"

export const calculateFolderSize = async (folderPath: string, size: number = 0): Promise<number> => {
    if(folderPath.slice(0, -1) == "/"){
        folderPath = folderPath.slice(0, -1)
    }

    const dirList = await FileSystem.readDirectoryAsync(toExpoFsPath(folderPath))
  
    for(let i = 0; i < dirList.length; i++){
        const item = dirList[i]

        try{
            const stat = await FileSystem.getInfoAsync(toExpoFsPath(folderPath + "/" + item))

            if(!stat.exists){
                continue
            }

            if(stat.isDirectory){
                size = await calculateFolderSize(toExpoFsPath(folderPath + "/" + item), size)
            }
            else{
                size = size + (stat.size || 0)
            }
        }
        catch(e){
            console.error(e)
        }
    }
    
    return size
}

export interface SettingsAdvancedScreenProps {
    navigation: any
}

export const SettingsAdvancedScreen = memo(({ navigation }: SettingsAdvancedScreenProps) => {
    const darkMode = useDarkMode()
    const lang = useLang()
    const [thumbnailCacheLocalFolderSize, setThumbnailCacheLocalFolderSize] = useState<number>(0)
    const [cachesLocalFolderSize, setCachesLocalFolderSize] = useState<number>(0)
    const [isCalculatingFolderSizes, setIsCalculatingFolderSizes] = useState<boolean>(true)

    const calculateFolderSizes = useCallback(async () => {
        setIsCalculatingFolderSizes(true)

        try{
            const thumbnailCachePath = await getDownloadPath({ type: "thumbnail" })

            const [thumbnailCacheSize, cachesSize] = await Promise.all([
                calculateFolderSize(thumbnailCachePath),
                calculateFolderSize(FileSystem.cacheDirectory as string)
            ])

            setThumbnailCacheLocalFolderSize(thumbnailCacheSize)
            setCachesLocalFolderSize(cachesSize)
        }
        catch(e: any){
            console.error(e)

            showToast({ message: e.toString() })
        }

        setIsCalculatingFolderSizes(false)
    }, [])

    useEffect(() => {
        calculateFolderSizes()
    }, [])

    return (
        <>
            <DefaultTopBar
                onPressBack={() => navigation.goBack()}
                leftText={i18n(lang, "settings")}
                middleText={i18n(lang, "advanced")}
            />
            <ScrollView
                style={{
                    height: "100%",
                    width: "100%",
                    backgroundColor: darkMode ? "black" : "white",
                    marginTop: 10
                }}
            >
                <SettingsGroup
                    marginTop={5}
                >
                    <SettingsButtonLinkHighlight
                        title={i18n(lang, "clearThumbnailCache")}
                        rightText={isCalculatingFolderSizes ? "ActivityIndicator" : formatBytes(thumbnailCacheLocalFolderSize)}
                        borderTopRadius={10}
                        withBottomBorder={true}
                        onPress={() => {
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
                                                                cache = JSON.parse(storage.getString(keys[i]) as string)
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
                                                        const tempPath = await getDownloadPath({ type: "thumbnail" })
                                                        var dirList = await FileSystem.readDirectoryAsync(toExpoFsPath(tempPath))

                                                        for(let i = 0; i < dirList.length; i++){
                                                            await FileSystem.deleteAsync(toExpoFsPath(tempPath + dirList[i]))
                                                        }

                                                        await Promise.all([
                                                            FastImage.clearDiskCache(),
                                                            FastImage.clearMemoryCache()
                                                        ])
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
                        }}
                    />
                    <SettingsButtonLinkHighlight
                        title={i18n(lang, "clearCachesDirectory")}
                        rightText={isCalculatingFolderSizes ? "ActivityIndicator" : formatBytes(cachesLocalFolderSize)}
                        borderBottomRadius={10}
                        onPress={() => {
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
                                                        if(FileSystem.cacheDirectory){
                                                            var dirList = await FileSystem.readDirectoryAsync(FileSystem.cacheDirectory)

                                                            for(let i = 0; i < dirList.length; i++){
                                                                await FileSystem.deleteAsync(toExpoFsPath(FileSystem.cacheDirectory + "/" + dirList[i]))
                                                            }
                                                        }

                                                        await Promise.all([
                                                            FastImage.clearDiskCache(),
                                                            FastImage.clearMemoryCache()
                                                        ])
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
                        }}
                    />
                </SettingsGroup>
                <SettingsGroup>
                    <SettingsButtonLinkHighlight
                        title={i18n(lang, "saveLogs")}
                        borderBottomRadius={10}
                        borderTopRadius={10}
                        onPress={async () => {
                            useStore.setState({ fullscreenLoadingModalVisible: true })

                            try{
                                const logFiles = await RNFS.readDir(RNFS.DocumentDirectoryPath + "/logs")

                                const logs = await Promise.all(logFiles.map(file => new Promise<{ log: string, name: string }>((resolve, reject) => {
                                    if(file.name == "logs.txt"){
                                        return resolve({
                                            log: "",
                                            name: file.name
                                        })
                                    }

                                    RNFS.readFile(file.path, "utf8").then((log) => {
                                        return resolve({
                                            log,
                                            name: file.name
                                        })
                                    }).catch(reject)
                                })))

                                let comment: string[] = []

                                for(let i = 0; i < logs.length; i++){
                                    comment.push(logs[i].name)
                                    comment.push(logs[i].log)
                                }

                                const logPath = RNFS.DocumentDirectoryPath + "/logs/logs.txt"

                                if((await RNFS.exists(logPath))){
                                    await RNFS.unlink(logPath)
                                }

                                await RNFS.writeFile(logPath, comment.join("\n\n"), "utf8")

                                useStore.setState({ fullscreenLoadingModalVisible: false })

                                await Share.share({
                                    title: "logs.txt",
                                    url: logPath.indexOf("file://") == -1 ? "file://" + logPath : logPath
                                })
                            }
                            catch(e: any){
                                console.error(e)

                                showToast({ message: e.toString() })
                            }

                            useStore.setState({ fullscreenLoadingModalVisible: false })
                        }}
                    />
                </SettingsGroup>
                <View
                    style={{
                        marginTop: 15,
                        paddingLeft: 17
                    }}
                >
                    <Text
                        style={{
                            color: darkMode ? "gray" : "gray",
                            fontSize: 11
                        }}
                    >
                        {i18n(lang, "version")} {DeviceInfo.getVersion()}
                    </Text>
                </View>
                <View
                    style={{
                        height: 25
                    }} 
                />
            </ScrollView>
        </>
    )
})