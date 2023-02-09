import React, { useEffect, useState, useRef, memo, useCallback, useMemo } from "react"
import type { NavigationContainerRef, NavigationState } from "@react-navigation/native"
import useDarkMode from "../../lib/hooks/useDarkMode"
import useLang from "../../lib/hooks/useLang"
import { useWindowDimensions, View, Text, FlatList, TouchableHighlight, TouchableOpacity, Pressable, Image, DeviceEventEmitter } from "react-native"
import { getColor } from "../../style"
import DefaultTopBar from "../../components/TopBar/DefaultTopBar"
import { i18n } from "../../i18n"
import * as MediaLibrary from "expo-media-library"
import { videoExts, photoExts, getAssetURI } from "../../lib/services/cameraUpload"
import { CommonActions } from "@react-navigation/native"
import { navigationAnimation } from "../../lib/state"
import { getFileExt, getFilePreviewType, Semaphore, msToMinutesAndSeconds, getParent, toExpoFsPath } from "../../lib/helpers"
import Ionicon from "@expo/vector-icons/Ionicons"
import { memoize } from "lodash"
import * as VideoThumbnails from "expo-video-thumbnails"
import { useMountedState } from "react-use"
import { StackActions } from "@react-navigation/native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import storage from "../../lib/storage"
import { useIsFocused } from "@react-navigation/native"

const videoThumbnailSemaphore = new Semaphore(3)
const ALBUM_ROW_HEIGHT = 70

export const isNameAllowed = memoize((name: string) => {
    const ext = getFileExt(name)
    const allowed: string[] = [...videoExts, ...photoExts]

    return allowed.filter(allowedExt => allowedExt == ext).length > 0
})

export const fetchAssets = (album: MediaLibrary.AlbumRef | "allAssetsCombined"): Promise<Asset[]> => {
    return new Promise((resolve, reject) => {
        const assets: Asset[] = []

        const fetch = (after: MediaLibrary.AssetRef | undefined) => {
            MediaLibrary.getAssetsAsync({
                ...(typeof after !== "undefined" ? { after } : {}),
                first: 256,
                mediaType: ["photo", "video", "unknown"],
                sortBy: [
                    [MediaLibrary.SortBy.creationTime, false]
                ],
                ...(album !== "allAssetsCombined" ? { album } : {})
            }).then((fetched) => {
                for(let i = 0; i < fetched.assets.length; i++){
                    assets.push({
                        selected: false,
                        type: getFilePreviewType(getFileExt(fetched.assets[i].filename)),
                        asset: fetched.assets[i]
                    })
                }

                if(fetched.hasNextPage){
                    return fetch(fetched.endCursor)
                }

                const sorted: Asset[] = assets.sort((a, b) => b.asset.creationTime - a.asset.creationTime).filter(asset => isNameAllowed(asset.asset.filename))

                return resolve(sorted)
            }).catch(reject)
        }

        return fetch(undefined)
    })
}

export const getLastImageOfAlbum = async (album: MediaLibrary.AlbumRef): Promise<string> => {
    const result = await MediaLibrary.getAssetsAsync({
        first: 64,
        mediaType: ["photo", "video", "unknown"],
        sortBy: [
            [MediaLibrary.SortBy.creationTime, false]
        ],
        album
    })

    if(result.assets.length == 0){
        return ""
    }

    const filtered = result.assets.filter(asset => isNameAllowed(asset.filename)).sort((a, b) => b.creationTime - a.creationTime)

    if(filtered.length == 0){
        return ""
    }

    const asset = filtered[0]

    if(getFilePreviewType(getFileExt(asset.filename)) == "video"){
        await videoThumbnailSemaphore.acquire()

        try{
            const assetURI = await getAssetURI(asset)
            const { uri } = await VideoThumbnails.getThumbnailAsync(toExpoFsPath(assetURI), {
                quality: 0.1
            })

            videoThumbnailSemaphore.release()

            return uri
        }
        catch(e){
            console.error(e)

            videoThumbnailSemaphore.release()

            return ""
        }
    }

    return asset.uri
}

export const fetchAlbums = async (): Promise<Album[]> => {
    const result: Album[] = []

    const albums = await MediaLibrary.getAlbumsAsync({
        includeSmartAlbums: true
    })

    for(let i = 0; i < albums.length; i++){
        if(albums[i].assetCount > 0){
            result.push({
                title: albums[i].title,
                assetCount: albums[i].assetCount,
                lastImage: undefined,
                ref: albums[i]
            })
        }
    }

    return result.sort((a, b) => b.assetCount - a.assetCount)
}

export const AssetItem = memo(({ item, index, setAssets }: { item: Asset, index: number, setAssets: React.Dispatch<React.SetStateAction<Asset[]>> }) => {
    const darkMode = useDarkMode()
    const dimensions = useWindowDimensions()
    const [image, setImage] = useState<string | undefined>(item.type == "image" ? item.asset.uri : undefined)
    const isMounted = useMountedState()
    const insets = useSafeAreaInsets()

    const size = useMemo(() => {
        return Math.floor((dimensions.width - insets.left - insets.right) / 4) - 1
    }, [dimensions, insets])

    useEffect(() => {
        if(item.type == "video"){
            videoThumbnailSemaphore.acquire().then(() => {
                getAssetURI(item.asset).then((assetURI) => {
                    VideoThumbnails.getThumbnailAsync(toExpoFsPath(assetURI), {
                        quality: 0.1
                    }).then(({ uri }) => {
                        videoThumbnailSemaphore.release()

                        if(isMounted()){
                            setImage(uri)
                        }
                    }).catch((err) => {
                        videoThumbnailSemaphore.release()

                        console.error(err)
                    })
                }).catch((err) => {
                    videoThumbnailSemaphore.release()

                    console.error(err)
                })
            })
        }
    }, [])

    return (
        <Pressable
            style={{
                width: size,
                height: size,
                margin: 1
            }}
            key={index.toString()}
            onPress={() => {
                if(typeof image == "undefined"){
                    return
                }

                setAssets(prev => prev.map(asset => {
                    if(asset.asset.id == item.asset.id){
                        return {
                            ...asset,
                            selected: !asset.selected
                        }
                    }

                    return asset
                }))
            }}
        >
            {
                typeof image == "undefined" ? (
                    <View
                        style={{
                            width: size,
                            height: size,
                            backgroundColor: getColor(darkMode, "backgroundSecondary")
                        }}
                    />
                ) : (
                    <Image
                        source={{
                            uri: item.asset.uri
                        }}
                        style={{
                            width: size,
                            height: size
                        }}
                    />
                )
            }
            {
                typeof item.selected == "boolean" && item.selected && (
                    <>
                        <Ionicon
                            name="checkmark-circle"
                            size={18}
                            color="#0A84FF"
                            style={{
                                position: "absolute",
                                bottom: 2.5,
                                right: 2.8,
                                zIndex: 100
                            }}
                        />
                        <View
                            style={{
                                position: "absolute",
                                bottom: 3,
                                right: 3,
                                width: 19,
                                height: 19,
                                borderRadius: 19,
                                zIndex: 10,
                                backgroundColor: "white"
                            }}
                        />
                    </>
                )
            }
            {
                item.type == "video" && (
                    <>
                        <View
                            style={{
                                position: "absolute",
                                left: 3,
                                top: 3,
                                width: "auto",
                                height: "auto",
                                borderRadius: 19,
                                padding: 3,
                                zIndex: 10
                            }}
                        >
                            <Text
                                style={{
                                    color: "white",
                                    fontSize: 12,
                                    fontWeight: "700"
                                }}
                            >
                                {msToMinutesAndSeconds(item.asset.duration * 1000)}
                            </Text>
                        </View>
                    </>
                )
            }
        </Pressable>
    )
})

export interface AlbumItemProps {
    darkMode: boolean,
    index: number,
    item: Album,
    params: SelectMediaScreenParams,
    navigation: NavigationContainerRef<ReactNavigation.RootParamList>
}

export const AlbumItem = memo(({ darkMode, index, item, params, navigation }: AlbumItemProps) => {
    const [image, setImage] = useState<string>("")
    const isMounted = useMountedState()

    useEffect(() => {
        getLastImageOfAlbum(item.ref).then((uri) => {
            if(uri.length > 0 && isMounted()){
                setImage(uri)
            }
        }).catch(console.error)
    }, [])

    return (
        <TouchableHighlight
            style={{
                width: "100%",
                height: ALBUM_ROW_HEIGHT,
                flexDirection: "row",
                justifyContent: "space-between",
                paddingLeft: 15,
                paddingRight: 15,
                borderBottomWidth: 0.5,
                borderBottomColor: getColor(darkMode, "primaryBorder")
            }}
            key={index.toString()}
            underlayColor={getColor(darkMode, "backgroundTertiary")}
            onPress={() => {
                if(typeof params.prevNavigationState !== "undefined" && item.assetCount > 0){
                    navigationAnimation({ enable: true }).then(() => {
                        navigation.dispatch(StackActions.push("SelectMediaScreen", {
                            prevNavigationState: params.prevNavigationState,
                            album: item.ref
                        }))
                    })
                }
            }}
        >
            <>
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
                                    width: 50,
                                    height: 50,
                                    borderRadius: 5
                                }}
                            />
                        ) : (
                            <View
                                style={{
                                    width: 50,
                                    height: 50,
                                    borderRadius: 5,
                                    backgroundColor: getColor(darkMode, "backgroundSecondary")
                                }}
                            />
                        )
                    }
                    <View
                        style={{
                            flexDirection: "column",
                            marginLeft: 10
                        }}
                    >
                        <Text
                            style={{
                                color: getColor(darkMode, "textPrimary"),
                                fontSize: 16,
                                fontWeight: "400"
                            }}
                        >
                            {item.title}
                        </Text>
                        <Text
                            style={{
                                color: getColor(darkMode, "textSecondary"),
                                fontSize: 14,
                                fontWeight: "400",
                                marginTop: 2
                            }}
                        >
                            {item.assetCount}
                        </Text>
                    </View>
                </View>
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center"
                    }}
                >
                    <Ionicon
                        name="chevron-forward-outline"
                        size={18}
                        color={getColor(darkMode, "textSecondary")}
                    />
                </View>
            </>
        </TouchableHighlight>
    )
}) 

export interface SelectMediaScreenParams {
    prevNavigationState: NavigationState,
    album: MediaLibrary.AlbumRef | "allAssetsCombined" | undefined
}

export interface SelectMediaScreenProps {
    route: any,
    navigation: NavigationContainerRef<ReactNavigation.RootParamList>
}

export interface Album {
    title: string,
    assetCount: number,
    lastImage: string | undefined,
    ref: MediaLibrary.AlbumRef
}

export interface Asset {
    selected: boolean,
    type: ReturnType<typeof getFilePreviewType>,
    asset: MediaLibrary.Asset
}

const SelectMediaScreen = memo(({ route, navigation }: SelectMediaScreenProps) => {
    const darkMode = useDarkMode()
    const lang = useLang()
    const dimensions = useWindowDimensions()
    const params = useRef<SelectMediaScreenParams>(route?.params || undefined).current
    const cachedAlbums = useRef<string | undefined>(storage.getString("selectMediaScreenCachedAlbums")).current
    const cachedAssets = useRef<string | undefined>(storage.getString("selectMediaScreenCachedAssets:" + params?.album)).current
    const [assets, setAssets] = useState<Asset[]>(typeof cachedAssets !== "undefined" ? JSON.parse(cachedAssets) : [])
    const [albums, setAlbums] = useState<Album[]>(typeof cachedAlbums !== "undefined" ? JSON.parse(cachedAlbums) : [])
    const isMounted = useMountedState()
    const insets = useSafeAreaInsets()
    const isFocused = useIsFocused()

    const [selectedAssets, photoCount, videoCount] = useMemo(() => {
        const selectedAssets = assets.filter(asset => asset.selected)
        const photoCount = assets.filter(asset => asset.type == "image").length
        const videoCount = assets.filter(asset => asset.type == "video").length

        return [selectedAssets, photoCount, videoCount]
    }, [assets])

    const keyExtractor = useCallback((_, index: number) => index.toString(), [])

    const getItemLayoutAlbum = useCallback((_, index: number) => {
        const length: number = ALBUM_ROW_HEIGHT

        return {
            length,
            offset: length * index,
            index
        }
    }, [ALBUM_ROW_HEIGHT])

    const getItemLayoutAsset = useCallback((_, index: number) => {
        const length: number = Math.floor((dimensions.width - insets.left - insets.right) / 4) - 1

        return {
            length,
            offset: length * index,
            index
        }
    }, [dimensions, insets])

    const renderAlbum = useCallback(({ item, index }: { item: Album, index: number }) => {
        return (
            <AlbumItem
                item={item}
                index={index}
                darkMode={darkMode}
                navigation={navigation}
                params={params}
            />
        )
    }, [navigation, params, darkMode])

    const renderAsset = useCallback(({ item, index }: { item: Asset, index: number }) => {
        return (
            <AssetItem
                item={item}
                index={index}
                setAssets={setAssets}
            />
        )
    }, [])

    useEffect(() => {
        if(typeof params !== "undefined" && isFocused){
            if(typeof params.album == "undefined"){
                fetchAlbums().then((fetched) => {
                    storage.set("selectMediaScreenCachedAlbums", JSON.stringify(fetched))

                    if(isMounted()){
                        setAlbums(fetched)
                    }
                }).catch(console.error)
            }
            else{
                fetchAssets(params.album).then((fetched) => {
                    storage.set("selectMediaScreenCachedAssets:" + params.album, JSON.stringify(fetched))

                    if(isMounted()){
                        setAssets(fetched)
                    }
                }).catch(console.error)
            }
        }
    }, [])

    if(typeof params == "undefined"){
        return (
            <>
                <DefaultTopBar
                    onPressBack={() => navigation.goBack()}
                    leftText={i18n(lang, "back")}
                    middleText={"Error"}
                />
            </>
        )
    }

    return (
        <>
            {
                typeof route.params.album == "undefined" ? (
                    <>
                        <DefaultTopBar
                            onPressBack={() => {
                                if(typeof params.prevNavigationState !== "undefined"){
                                    navigationAnimation({ enable: true }).then(() => {
                                        const newRoutes = [...params.prevNavigationState.routes.map(route => ({ name: route.name, params: route.params })), ...[
                                            {
                                                name: "SelectMediaScreen",
                                                params: {
                                                    prevNavigationState: params.prevNavigationState,
                                                    album: undefined
                                                }
                                            }
                                        ]]
                    
                                        navigation.dispatch(CommonActions.reset({
                                            index: newRoutes.length - 1,
                                            routes: newRoutes
                                        }))
                                    })
                                }
                            }}
                            leftText={i18n(lang, "back")}
                            middleText={i18n(lang, "albums")}
                            hideLeftComponent={true}
                            rightComponent={
                                <TouchableOpacity
                                    style={{
                                        width: "33%",
                                        justifyContent: "center",
                                        alignItems: "flex-end",
                                        paddingRight: 15
                                    }}
                                    onPress={() => navigation.goBack()}
                                >
                                    <Text
                                        style={{
                                            color: getColor(darkMode, "linkPrimary"),
                                            fontSize: 17,
                                            fontWeight: "400"
                                        }}
                                    >
                                        {i18n(lang, "cancel")}
                                    </Text>
                                </TouchableOpacity>
                            }
                        />
                        <FlatList
                            data={albums}
                            renderItem={renderAlbum}
                            keyExtractor={keyExtractor}
                            windowSize={32}
                            getItemLayout={getItemLayoutAlbum}
                            style={{
                                height: "100%",
                                width: "100%",
                                marginTop: 10
                            }}
                        />
                    </>
                ) : (
                    <>
                        <DefaultTopBar
                            onPressBack={() => navigation.goBack()}
                            leftText={i18n(lang, "albums")}
                            middleText={i18n(lang, "select")}
                            rightComponent={selectedAssets.length > 0 ? (
                                <TouchableOpacity
                                    style={{
                                        width: "33%",
                                        justifyContent: "center",
                                        alignItems: "flex-end",
                                        paddingRight: 15
                                    }}
                                    onPress={() => {
                                        if(typeof params.prevNavigationState !== "undefined"){
                                            DeviceEventEmitter.emit("selectMediaScreenUpload", {
                                                assets: selectedAssets,
                                                parent: getParent(params.prevNavigationState.routes[params.prevNavigationState.routes.length - 1])
                                            })

                                            navigation.dispatch(StackActions.pop(2))
                                        }
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: getColor(darkMode, "linkPrimary"),
                                            fontSize: 17,
                                            fontWeight: "400"
                                        }}
                                    >
                                        {i18n(lang, "upload")} ({selectedAssets.length})
                                    </Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    style={{
                                        width: "33%",
                                        justifyContent: "center",
                                        alignItems: "flex-end",
                                        paddingRight: 15
                                    }}
                                    onPress={() => navigation.dispatch(StackActions.pop(2))}
                                >
                                    <Text
                                        style={{
                                            color: getColor(darkMode, "linkPrimary"),
                                            fontSize: 17,
                                            fontWeight: "400"
                                        }}
                                    >
                                        {i18n(lang, "cancel")}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        />
                        <FlatList
                            data={assets}
                            renderItem={renderAsset}
                            keyExtractor={keyExtractor}
                            windowSize={32}
                            getItemLayout={getItemLayoutAsset}
                            numColumns={4}
                            ListFooterComponent={
                                <View
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        width: "100%",
                                        height: "auto",
                                        marginTop: 10
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: getColor(darkMode, "textSecondary"),
                                            fontSize: 15,
                                            fontWeight: "400"
                                        }}
                                    >
                                        {photoCount} {i18n(lang, "photos")}, {videoCount} {i18n(lang, "videos")}
                                    </Text>
                                </View>
                            }
                            style={{
                                height: "100%",
                                width: "100%",
                                marginTop: 5
                            }}
                        />
                    </>
                )
            }
        </>
    )
})

export default SelectMediaScreen