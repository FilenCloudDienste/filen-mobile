import React, { useEffect, useState, memo, useCallback, useRef } from "react"
import { View, Text, Switch, Platform, ScrollView, ActivityIndicator, Image } from "react-native"
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
import { getAssetURI } from "../../lib/services/cameraUpload"
import { isNameAllowed, getLastImageOfAlbum } from "../SelectMediaScreen/SelectMediaScreen"
import { useMountedState } from "react-use"

const fetchAssetsSemaphore = new Semaphore(3)

export interface CameraUploadAlbumsScreenProps {
    navigation: any
}

export interface Album {
    album: MediaLibrary.Album,
    path: string
}

export interface AlbumItemProps {
    index: number,
    darkMode: boolean,
    album: Album,
    hasPermissions: boolean,
    excludedAlbums: { [key: string]: boolean },
    userId: number
}

export const AlbumItem = memo(({ index, darkMode, album, hasPermissions, excludedAlbums, userId }: AlbumItemProps) => {
    const [image, setImage] = useState<string>("")
    const isMounted = useMountedState()

    useEffect(() => {
        getLastImageOfAlbum(album.album).then((uri) => {
            if(uri.length > 0 && isMounted()){
                setImage(uri)
            }
        }).catch(console.error)
    }, [])

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
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center"
                        }}
                    >
                        {
                            image.length > 0 ? (
                                <Image
                                    source={{
                                        uri: image
                                    }}
                                    style={{
                                        width: 30,
                                        height: 30,
                                        borderRadius: 5
                                    }}
                                />
                            ) : (
                                <View
                                    style={{
                                        width: 30,
                                        height: 30,
                                        borderRadius: 5,
                                        backgroundColor: getColor(darkMode, "backgroundTertiary")
                                    }}
                                />
                            )
                        }
                        <Text
                            style={{
                                color: getColor(darkMode, "textPrimary"),
                                fontSize: 17,
                                marginLeft: 10
                            }}
                            numberOfLines={1}
                        >
                            {album.album.title + " (" + album.album.assetCount + ")"}
                        </Text>
                    </View>
                    {
                        Platform.OS == "android" && typeof album.path == "string" && album.path.length > 0 && (
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

export const CameraUploadAlbumsScreen = memo(({ navigation }: CameraUploadAlbumsScreenProps) => {
    const darkMode = useDarkMode()
    const lang = useLang()
    const [userId, setUserId] = useMMKVNumber("userId", storage)
    const [cameraUploadExcludedAlbumns, setCameraUploadAlbums] = useMMKVString("cameraUploadExcludedAlbums:" + userId, storage)
    const [excludedAlbums, setExcludedAlbums] = useState<{ [key: string]: boolean }>({})
    const cachedAlbums = useRef<string | undefined>(storage.getString("cachedLocalAlbums")).current
    const [fetchedAlbums, setFetchedAlbums] = useState<Album[]>(typeof cachedAlbums !== "undefined" ? JSON.parse(cachedAlbums) : [])
    const [hasPermissions, setHasPermissions] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(typeof cachedAlbums == "undefined")
    const isMounted = useMountedState()

    const fetchAlbums = useCallback(() => {
        return new Promise<Album[]>((resolve, reject) => {
            MediaLibrary.getAlbumsAsync({
                includeSmartAlbums: true
            }).then((fetched) => {
                const promises: Promise<Album>[] = []

                for(let i = 0; i < fetched.length; i++){
                    promises.push(new Promise<Album>((resolve, reject) => {
                        fetchAssetsSemaphore.acquire().then(() => {
                            if(fetched[i].assetCount <= 0){
                                fetchAssetsSemaphore.release()

                                return resolve({
                                    album: fetched[i],
                                    path: ""
                                })
                            }

                            MediaLibrary.getAssetsAsync({
                                album: fetched[i],
                                mediaType: ["photo", "video", "unknown"],
                                first: 128
                            }).then(async (assets) => {
                                const paths: string[] = []

                                for(let x = 0; x < assets.assets.length; x++){
                                    if(isNameAllowed(assets.assets[x].filename)){
                                        if(Platform.OS == "ios"){
                                            paths.push(assets.assets[x].uri)
                                        }
                                        else{
                                            try{
                                                const uri = await getAssetURI(assets.assets[x])
    
                                                paths.push(uri)
                                            }
                                            catch{
                                                continue
                                            }
                                        }
                                    }
                                }

                                const sorted = Platform.OS == "android" ? paths.map(path => pathModule.dirname(path)).sort((a, b) => a.length - b.length) : paths

                                fetchAssetsSemaphore.release()

                                return resolve({
                                    album: fetched[i],
                                    path: sorted.length == 0 ? "" : sorted[0]
                                })
                            }).catch((err) => {
                                fetchAssetsSemaphore.release()

                                return reject(err)
                            })
                        })
                    }))
                }

                Promise.all(promises).then((albums) => resolve(albums.sort((a, b) => b.album.assetCount - a.album.assetCount))).catch((err) => {
                    showToast({ message: err.toString() })

                    setLoading(false)
    
                    console.log(err)
                })
            }).catch(reject)
        })
    }, [])

    useEffect(() => {
        try{
            setExcludedAlbums(JSON.parse(cameraUploadExcludedAlbumns || "{}"))
        }
        catch(e){
            console.log(e)

            setExcludedAlbums({})
        }
    }, [cameraUploadExcludedAlbumns])

    useEffect(() => {
        Promise.all([
            hasStoragePermissions(),
            hasPhotoLibraryPermissions()
        ]).then(() => {
            if(typeof cachedAlbums == "undefined"){
                setLoading(true)
            }

            setHasPermissions(true)

            fetchAlbums().then((fetched) => {
                storage.set("cachedLocalAlbums", JSON.stringify(fetched))

                if(isMounted()){
                    setFetchedAlbums(fetched)
                    setLoading(false)
                }
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
                    backgroundColor: getColor(darkMode, "backgroundPrimary"),
                    marginTop: 10
                }}
            >
                <SettingsGroup
                    marginTop={5}
                >
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
                                    fontWeight: "400",
                                    padding: 15
                                }}
                            >
                                {i18n(lang, "pleaseGrantPermission")}
                            </Text>
                        ) : fetchedAlbums.length > 0 ? (
                            <>
                                {
                                    fetchedAlbums.map((album, index) => {
                                        if(album.album.assetCount <= 0){
                                            return null
                                        }

                                        return (
                                            <AlbumItem
                                                index={index}
                                                key={index}
                                                album={album}
                                                darkMode={darkMode}
                                                excludedAlbums={excludedAlbums}
                                                userId={userId}
                                                hasPermissions={hasPermissions}
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