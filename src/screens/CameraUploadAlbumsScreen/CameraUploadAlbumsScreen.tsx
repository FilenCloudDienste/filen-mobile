import React, { useEffect, useState, memo } from "react"
import { View, Text, Switch, Platform, ScrollView, ActivityIndicator } from "react-native"
import storage from "../../lib/storage"
import { useMMKVString, useMMKVNumber } from "react-native-mmkv"
import { i18n } from "../../i18n"
import { SettingsGroup, SettingsButton } from "../SettingsScreen/SettingsScreen"
import { showToast } from "../../components/Toasts"
import { getColor } from "../../style/colors"
import * as MediaLibrary from "expo-media-library"
import { hasStoragePermissions, hasPhotoLibraryPermissions } from "../../lib/permissions"
import { Semaphore } from "../../lib/helpers"
import pathModule from "path"
import DefaultTopBar from "../../components/TopBar/DefaultTopBar"
import useDarkMode from "../../lib/hooks/useDarkMode"
import useLang from "../../lib/hooks/useLang"

const fetchAssetsSemaphore = new Semaphore(3)

export interface CameraUploadAlbumsScreenProps {
    navigation: any
}

export const CameraUploadAlbumsScreen = memo(({ navigation }: CameraUploadAlbumsScreenProps) => {
    const darkMode = useDarkMode()
    const lang = useLang()
    const [userId, setUserId] = useMMKVNumber("userId", storage)
    const [cameraUploadExcludedAlbumns, setCameraUploadAlbums] = useMMKVString("cameraUploadExcludedAlbums:" + userId, storage)
    const [excludedAlbums, setExcludedAlbums] = useState<any>({})
    const [fetchedAlbums, setFetchedAlbums] = useState<{ album: MediaLibrary.Album, path: string }[]>([])
    const [hasPermissions, setHasPermissions] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(true)

    useEffect(() => {
        try{
            setExcludedAlbums(JSON.parse(cameraUploadExcludedAlbumns || "{}"))
        }
        catch(e){
            console.log(e)

            setExcludedAlbums([])
        }
    }, [cameraUploadExcludedAlbumns])

    useEffect(() => {
        hasStoragePermissions().then(() => {
            hasPhotoLibraryPermissions().then(() => {
                setHasPermissions(true)

                MediaLibrary.getAlbumsAsync({
                    includeSmartAlbums: true
                }).then((fetched) => {
                    const promises = []

                    for(let i = 0; i < fetched.length; i++){
                        promises.push(new Promise<{ album: MediaLibrary.Album, path: string }>((resolve, reject) => {
                            fetchAssetsSemaphore.acquire().then(() => {
                                if(fetched[i].assetCount <= 0){
                                    return resolve({
                                        album: fetched[i],
                                        path: ""
                                    })
                                }

                                MediaLibrary.getAssetsAsync({
                                    album: fetched[i],
                                    mediaType: ["photo", "video"],
                                    first: fetched[i].assetCount >= 128 ? 128 : fetched[i].assetCount
                                }).then(async (assets) => {
                                    const paths: string[] = []

                                    for(let x = 0; x < assets.assets.length; x++){
                                        try{
                                            const stat = await MediaLibrary.getAssetInfoAsync(assets.assets[x])

                                            if(stat.localUri && stat.localUri.length > 0){
                                                paths.push(stat.localUri)
                                            }
                                        }
                                        catch{
                                            continue
                                        }
                                    }

                                    const sorted = paths.map(path => pathModule.dirname(path)).sort((a, b) => a.length - b.length)

                                    fetchAssetsSemaphore.release()

                                    return resolve({
                                        album: fetched[i],
                                        path: sorted[0]
                                    })
                                }).catch((err) => {
                                    fetchAssetsSemaphore.release()

                                    return reject(err)
                                })
                            })
                        }))
                    }

                    Promise.all(promises).then((albums) => {
                        setFetchedAlbums(albums.filter(alb => alb.album.assetCount > 0))
                        setLoading(false)
                    }).catch((err) => {
                        showToast({ message: err.toString() })

                        setLoading(false)
        
                        console.log(err)
                    })
                }).catch((err) => {
                    showToast({ message: err.toString() })

                    setLoading(false)
    
                    console.log(err)
                })
            }).catch((err) => {
                setHasPermissions(false)
                setLoading(false)

                console.log(err)
            })
        }).catch((err) => {
            setHasPermissions(false)
            setLoading(false)

            console.log(err)
        })
    }, [])

    return (
        <>
            <DefaultTopBar
                onPressBack={() => navigation.goBack()}
                leftText={i18n(lang, "cameraUpload")}
                middleText={i18n(lang, "albums")}
            />
            <ScrollView
                style={{
                    height: "100%",
                    width: "100%",
                    backgroundColor: getColor(darkMode, "backgroundPrimary")
                }}
            >
                <SettingsGroup>
                    {
                        loading ? (
                            <View
                                style={{
                                    padding: 15
                                }}
                            >
                                <ActivityIndicator
                                    size="small"
                                    color={getColor(darkMode, "textPrimary")}
                                />
                            </View>
                        ) : !hasPermissions ? (
                            <Text
                                style={{
                                    color: getColor(darkMode, "textPrimary"),
                                    fontSize: 17,
                                    fontWeight: "400"
                                }}
                            >
                                {i18n(lang, "pleaseGrantPermission")}
                            </Text>
                        ) : fetchedAlbums.length > 0 ? (
                            <>
                                {
                                    fetchedAlbums.map((album, index) => {
                                        return (
                                            <SettingsButton
                                                key={index.toString()}
                                                title={
                                                    <View
                                                        style={{
                                                            flexDirection: "column",
                                                            width: "100%"
                                                        }}
                                                    >
                                                        <Text
                                                            style={{
                                                                color: getColor(darkMode, "textPrimary"),
                                                                paddingTop: (Platform.OS == "android" ? 3 : 7),
                                                                fontSize: 17
                                                            }}
                                                            numberOfLines={1}
                                                        >
                                                            {album.album.title + " (" + album.album.assetCount + ")"}
                                                        </Text>
                                                        {
                                                            typeof album.path == "string" && album.path.length > 0 && (
                                                                <Text
                                                                    style={{
                                                                        color: "gray",
                                                                        marginTop: 5,
                                                                        fontSize: 14
                                                                    }}
                                                                >
                                                                    {album.path.split("file://").join("")}
                                                                </Text>
                                                            )
                                                        }
                                                    </View>
                                                }
                                                rightComponent={
                                                    <Switch
                                                        trackColor={getColor(darkMode, "switchTrackColor")}
                                                        thumbColor={typeof excludedAlbums[album.album.id] == "undefined" ? getColor(darkMode, "switchThumbColorEnabled") : getColor(darkMode, "switchThumbColorDisabled")}
                                                        ios_backgroundColor={getColor(darkMode, "switchIOSBackgroundColor")}
                                                        disabled={!hasPermissions}
                                                        onValueChange={(value): void => {
                                                            const excluded = excludedAlbums

                                                            if(value){
                                                                delete excluded[album.album.id]
                                                            }
                                                            else{
                                                                excluded[album.album.id] = true
                                                            }

                                                            storage.set("cameraUploadExcludedAlbums:" + userId, JSON.stringify(excluded))
                                                        }}
                                                        value={typeof excludedAlbums[album.album.id] == "undefined"}
                                                    />
                                                }
                                            />
                                        )
                                    })
                                }
                            </>
                        ) : (
                            <Text
                                style={{
                                    color: getColor(darkMode, "textPrimary"),
                                    padding: 10,
                                    fontSize: 17,
                                    fontWeight: "400"
                                }}
                            >
                                {i18n(lang, "cameraUploadNoAlbumsFound")}
                            </Text>
                        )
                    }
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