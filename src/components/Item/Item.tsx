import React, { memo, useEffect, useMemo } from "react"
import { Text, View, TouchableOpacity, TouchableHighlight, DeviceEventEmitter, useWindowDimensions, ScaledSize, Pressable, Platform } from "react-native"
import Ionicon from "@expo/vector-icons/Ionicons"
import { getImageForItem } from "../../assets/thumbnails"
import { formatBytes, getFolderColor, calcPhotosGridSize, getRouteURL, getParent, getFileExt, getFilePreviewType } from "../../lib/helpers"
import { i18n } from "../../i18n"
import { getColor } from "../../style/colors"
import type { EdgeInsets } from "react-native-safe-area-context"
import type { Item } from "../../types"
import { fetchFolderSize } from "../../lib/api"
import storage from "../../lib/storage"
import { THUMBNAIL_BASE_PATH } from "../../lib/constants"
import FastImage from "react-native-fast-image"
import { isOnline } from "../../lib/services/isOnline"

export interface ItemBaseProps {
    item: Item,
    index: number,
    darkMode: boolean,
    selected: boolean,
    thumbnail: string,
    name: string,
    size: number,
    color: string | undefined | null,
    favorited: boolean,
    offline: boolean,
    hideFileNames: boolean,
    hideThumbnails: boolean,
    lang: string | undefined,
    hideSizes: boolean,
    insets: EdgeInsets
}

export interface ListItemProps extends ItemBaseProps {
    route: any
}

export const ListItem = memo(({ item, index, darkMode, hideFileNames, hideSizes, hideThumbnails, lang, route }: ListItemProps) => {
    useEffect(() => {
        if(item.type == "folder" && isOnline()){
            fetchFolderSize({ folder: item, routeURL: getRouteURL(route) }).then((fetchedSize) => {
                storage.set("folderSizeCache:" + item.uuid, fetchedSize)

                DeviceEventEmitter.emit("event", {
                    type: "folder-size",
                    data: {
                        uuid: item.uuid,
                        size: fetchedSize
                    }
                })
            }).catch(console.error)
        }
    }, [item.uuid, item.name, index, route])

    return (
        <TouchableHighlight
            key={item.uuid}
            underlayColor={getColor(darkMode, "backgroundTertiary")}
            style={{
                width: "100%",
                height: 60
            }}
            onPress={() => {
                DeviceEventEmitter.emit("event", {
                    type: "item-onpress",
                    data: item
                })
            }}
            onLongPress={() => {
                DeviceEventEmitter.emit("event", {
                    type: "item-onlongpress",
                    data: item
                })
            }}
        >
            <View
                style={{
                    backgroundColor: item.selected ? getColor(darkMode, "backgroundTertiary") : getColor(darkMode, "backgroundPrimary"),
                    width: "100%",
                    height: 60,
                    flexDirection: "row",
                    alignItems: "center",
                    paddingLeft: 15,
                    paddingRight: 25
                }}
            >
                <View
                    style={{
                        width: 40
                    }}
                >
                    {
                        item.type == "folder" ? (
                            <Ionicon
                                name="ios-folder"
                                size={40}
                                color={getFolderColor(item.color)}
                            />
                        ) : (
                            <FastImage
                                source={hideThumbnails ? getImageForItem(item) : typeof item.thumbnail !== "undefined" ? { uri: "file://" + THUMBNAIL_BASE_PATH + item.thumbnail } : getImageForItem(item)}
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 5
                                }}
                                onError={() => {
                                    if(typeof item.thumbnail == "string"){
                                        DeviceEventEmitter.emit("event", {
                                            type: "check-thumbnail",
                                            item
                                        })
                                    }
                                }}
                            />
                        )
                    }
                </View>
                <View
                    style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        width: "100%",
                        height: "100%",
                        marginLeft: 15,
                        borderBottomColor: getColor(darkMode, "primaryBorder"),
                        borderBottomWidth: 0.5
                    }}
                >
                    <View
                        style={{
                            paddingTop: 2,
                            width: "75%"
                        }}
                    >
                        <Text
                            style={{
                                color: getColor(darkMode, "textPrimary"),
                                fontSize: 15,
                                fontWeight: "400"
                            }}
                            numberOfLines={1}
                        >
                            {hideFileNames ? i18n(lang, item.type == "folder" ? "folder" : "file") : item.name}
                        </Text>
                        <Text
                            style={{
                                color: "gray",
                                fontSize: 11,
                                marginTop: 4
                            }}
                            numberOfLines={1}
                        >
                            {
                                item.offline ? (
                                    <>
                                        <Ionicon
                                            name="arrow-down-circle"
                                            size={12}
                                            color={"green"}
                                        />
                                        <Text>&nbsp;&nbsp;</Text>
                                    </>
                                ) : <></>
                            }
                            {
                                item.favorited ? (
                                    <>
                                        <Ionicon
                                            name="heart"
                                            size={12}
                                            color={getColor(darkMode, "textPrimary")}
                                        />
                                        <Text>&nbsp;&nbsp;</Text>
                                    </>
                                ) : <></>
                            }
                            {hideSizes ? formatBytes(0) : formatBytes(item.size)}
                            {
                                typeof item.sharerEmail == "string" && item.sharerEmail.length > 0 && getParent(route).length < 32 && (
                                    <>
                                        <Text>&nbsp;&#8226;&nbsp;</Text>
                                        <Text>{item.sharerEmail}</Text>
                                    </>
                                )
                            }
                            {
                                typeof item.receivers !== "undefined" && Array.isArray(item.receivers) && item.receivers.length > 0 && getParent(route).length < 32 && (
                                    <>
                                        <Text>&nbsp;&#8226;&nbsp;</Text>
                                        <Ionicon
                                            name="people-outline"
                                            size={12}
                                            color={getColor(darkMode, "textPrimary")}
                                        />
                                        <Text>&nbsp;{item.receivers.length}</Text>
                                    </>
                                )
                            }
                            &nbsp;&nbsp;&#8226;&nbsp;&nbsp;
                            {item.date}
                        </Text>
                    </View>
                    <TouchableOpacity
                        hitSlop={{
                            top: 15,
                            bottom: 15,
                            right: 15,
                            left: 15
                        }}
                        style={{
                            backgroundColor: "transparent",
                            position: "absolute",
                            right: 45
                        }}
                        onPress={() => {
                            DeviceEventEmitter.emit("event", {
                                type: "open-item-actionsheet",
                                data: item
                            })
                        }}
                    >
                        <Ionicon
                            name="ellipsis-horizontal-sharp"
                            size={18}
                            color={getColor(darkMode, "textSecondary")}
                        />
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableHighlight>
    )
})

export interface GridItemProps extends ItemBaseProps {
    itemsPerRow: number,
    route: any
}

export const GridItem = memo(({ insets, item, index, darkMode, hideFileNames, hideThumbnails, lang, itemsPerRow, hideSizes, route }: GridItemProps) => {
    const dimensions: ScaledSize = useWindowDimensions()

    const windowWidth: number = useMemo(() => {
        return (dimensions.width - (insets.left + insets.right)) - 40
    }, [dimensions, insets])

    useEffect(() => {
        if(item.type == "folder" && isOnline()){
            fetchFolderSize({ folder: item, routeURL: getRouteURL(route) }).then((fetchedSize) => {
                storage.set("folderSizeCache:" + item.uuid, fetchedSize)

                DeviceEventEmitter.emit("event", {
                    type: "folder-size",
                    data: {
                        uuid: item.uuid,
                        size: fetchedSize
                    }
                })
            }).catch(console.error)
        }
    }, [item.uuid, item.name, index, route])

    return (
        <Pressable
            key={item.uuid}
            style={{
                margin: 2,
                backgroundColor: item.selected ? getColor(darkMode, "backgroundTertiary") : getColor(darkMode, "backgroundPrimary"),
                height: Math.floor(windowWidth / itemsPerRow) + 55,
                width: Math.floor(windowWidth / itemsPerRow),
                borderRadius: 10,
                marginTop: 2,
                paddingTop: 10
            }}
            onPress={() => {
                DeviceEventEmitter.emit("event", {
                    type: "item-onpress",
                    data: item
                })
            }}
            onLongPress={() => {
                DeviceEventEmitter.emit("event", {
                    type: "item-onlongpress",
                    data: item
                })
            }}
        >
            <View
                style={{
                    width: "100%",
                    height: "100%"
                }}
            >
                <View
                    style={{
                        width: "100%",
                        height: Math.floor(windowWidth / itemsPerRow),
                        alignItems: "center"
                    }}
                >
                    {
                        item.type == "folder" ? (
                            <>
                                <Ionicon
                                    name="ios-folder"
                                    size={75} 
                                    color={getFolderColor(item.color)} 
                                />
                            </>
                        ) : (
                            <>
                                <FastImage 
                                    source={hideThumbnails ? getImageForItem(item) : typeof item.thumbnail !== "undefined" ? { uri: "file://" + THUMBNAIL_BASE_PATH + item.thumbnail } : getImageForItem(item)}
                                    style={{
                                        width: typeof item.thumbnail !== "undefined" && !hideThumbnails ? 75 : 50,
                                        height: typeof item.thumbnail !== "undefined" && !hideThumbnails ? 75 : 50,
                                        borderRadius: 5,
                                        marginTop: typeof item.thumbnail !== "undefined" && !hideThumbnails ? 0 : 15
                                    }}
                                    onError={() => {
                                        if(typeof item.thumbnail == "string"){
                                            DeviceEventEmitter.emit("event", {
                                                type: "check-thumbnail",
                                                item
                                            })
                                        }
                                    }}
                                />
                            </>
                        )
                    }
                </View>
                <Pressable
                    style={{
                        width: "100%",
                        height: "100%",
                        flexDirection: "column",
                        marginTop: -30,
                        paddingLeft: 10,
                        paddingRight: 10
                    }}
                    onPress={() => {
                        DeviceEventEmitter.emit("event", {
                            type: "open-item-actionsheet",
                            data: item
                        })
                    }}
                >
                    <Text
                        style={{
                            color: getColor(darkMode, "textPrimary"),
                            fontWeight: "400",
                            fontSize: 15,
                            textAlign: "center"
                        }}
                        numberOfLines={2}
                    >
                        {hideFileNames ? i18n(lang, item.type == "folder" ? "folder" : "file") : item.name}
                    </Text>
                    <Text
                        style={{
                            color: "gray",
                            fontSize: 11,
                            paddingTop: 3,
                            textAlign: "center"
                        }}
                        numberOfLines={1}
                    >
                        {
                            item.offline ? (
                                <>
                                    <Ionicon
                                        name="arrow-down-circle"
                                        size={11}
                                        color={"green"}
                                    />
                                    <Text>&nbsp;</Text>
                                </>
                            ) : <></>
                        }
                        {
                            item.favorited ? (
                                <>
                                    <Ionicon
                                        name="heart"
                                        size={11}
                                        color={getColor(darkMode, "textPrimary")}
                                    />
                                    <Text>&nbsp;</Text>
                                </>
                            ) : <></>
                        }
                        {new Date(item.lastModified).toLocaleDateString()}
                    </Text>
                    <Text
                        style={{
                            color: "gray",
                            fontSize: 11,
                            paddingTop: 2,
                            textAlign: "center"
                        }}
                        numberOfLines={1}
                    >
                        {hideSizes ? formatBytes(0) : formatBytes(item.size)}
                    </Text>
                </Pressable>
            </View>
        </Pressable>
    )
})

export interface PhotosItemProps extends ItemBaseProps {
    photosGridSize: number
}

export const PhotosItem = memo(({ item, index, darkMode, photosGridSize, insets, hideThumbnails }: PhotosItemProps) => {
    const dimensions: ScaledSize = useWindowDimensions()

    const [calcedGridSize, imageWidthAndHeight, previewType] = useMemo(() => {
        const calcedGridSize = calcPhotosGridSize(photosGridSize)
        const windowWidth = (dimensions.width - (insets.left + insets.right))
        const imageWidthAndHeight = Math.floor(windowWidth / calcedGridSize) - 1.5

        return [calcedGridSize, imageWidthAndHeight, getFilePreviewType(getFileExt(item.name))]
    }, [photosGridSize, dimensions, insets, item.name])

    return (
        <Pressable
            key={index}
            style={{
                height: imageWidthAndHeight,
                width: imageWidthAndHeight,
                margin: 1,
                alignItems: "center",
                justifyContent: "center"
            }}
            onPress={() => {
                DeviceEventEmitter.emit("event", {
                    type: "item-onpress",
                    data: item
                })
            }}
            onLongPress={() => {
                DeviceEventEmitter.emit("event", {
                    type: "open-item-actionsheet",
                    data: item
                })
            }}
        >
            <FastImage
                source={hideThumbnails ? getImageForItem(item) : typeof item.thumbnail !== "undefined" ? { uri: "file://" + THUMBNAIL_BASE_PATH + item.thumbnail } : getImageForItem(item)}
                style={{
                    width: typeof item.thumbnail !== "undefined" && !hideThumbnails ? imageWidthAndHeight : 40,
                    height: typeof item.thumbnail !== "undefined" && !hideThumbnails ? imageWidthAndHeight : 40,
                    zIndex: 2
                }}
                onError={() => {
                    if(typeof item.thumbnail == "string"){
                        DeviceEventEmitter.emit("event", {
                            type: "check-thumbnail",
                            item
                        })
                    }
                }}
            />
            {
                calcedGridSize <= 5 && (
                    <>
                        {
                            typeof item.favorited == "boolean" && item.favorited && (
                                <Ionicon
                                    name="heart"
                                    size={19}
                                    color={"white"}
                                    style={{
                                        position: "absolute",
                                        bottom: 3,
                                        left: 3,
                                        zIndex: 100
                                    }}
                                />
                            )
                        }
                        {
                            typeof item.offline == "boolean" && item.offline && (
                                <>
                                    <Ionicon
                                        name="arrow-down-circle"
                                        size={18}
                                        color={"green"}
                                        style={{
                                            position: "absolute",
                                            top: 3,
                                            right: 2.8,
                                            zIndex: 100
                                        }}
                                    />
                                    <View
                                        style={{
                                            position: "absolute",
                                            top: 3,
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
                            previewType == "video" && (
                                <>
                                    <Ionicon
                                        name="play"
                                        size={16}
                                        color="black"
                                        style={{
                                            position: "absolute",
                                            left: 5.5,
                                            top: 4,
                                            zIndex: 100
                                        }}
                                    />
                                    <View
                                        style={{
                                            position: "absolute",
                                            left: 3,
                                            top: 3,
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
                    </>
                )
            }
        </Pressable>
    )
})

export interface PhotosRangeItemProps extends ItemBaseProps {
    photosRangeItemClick: Function,
    photosGridSize: number,
    photosRange: string,
    item: any
}

export const PhotosRangeItem = memo(({ item, index, darkMode, hideThumbnails, photosRangeItemClick }: PhotosRangeItemProps) => {
    const dimensions: ScaledSize = useWindowDimensions()

    const imageWidthAndHeight = useMemo(() => {
        const imageWidthAndHeight = Math.floor(dimensions.width - 30)

        return imageWidthAndHeight
    }, [dimensions])

    return (
        <TouchableOpacity
            activeOpacity={0.6}
            key={index}
            style={{
                height: imageWidthAndHeight,
                width: imageWidthAndHeight,
                paddingLeft: 30,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 25
            }}
            onPress={() => photosRangeItemClick(item)}
        >
            <FastImage
                source={hideThumbnails ? getImageForItem(item) : typeof item.thumbnail !== "undefined" ? { uri: "file://" + THUMBNAIL_BASE_PATH + item.thumbnail } : getImageForItem(item)}
                style={{
                    width: typeof item.thumbnail !== "undefined" && !hideThumbnails ? imageWidthAndHeight : 40,
                    height: typeof item.thumbnail !== "undefined" && !hideThumbnails ? imageWidthAndHeight : 40,
                    zIndex: 2,
                    borderRadius: typeof item.thumbnail !== "undefined" ? 15 : 0
                }}
                onError={() => {
                    if(typeof item.thumbnail == "string"){
                        DeviceEventEmitter.emit("event", {
                            type: "check-thumbnail",
                            item
                        })
                    }
                }}
            />
            <View
                style={{
                    backgroundColor: darkMode ? "rgba(34, 34, 34, 0.5)" : "rgba(128, 128, 128, 0.6)",
                    position: "absolute",
                    zIndex: 100,
                    top: 15,
                    left: 30,
                    padding: 5,
                    paddingLeft: 10,
                    paddingRight: 10,
                    borderRadius: 15
                }}
            >
                <Text
                    style={{
                        color: "white",
                        fontWeight: "bold",
                        fontSize: 20
                    }}
                >
                    {item.title}
                </Text>
            </View>
            {
                typeof item.remainingItems == "number" && item.remainingItems > 1 && (
                    <View
                        style={{
                            backgroundColor: darkMode ? "rgba(34, 34, 34, 0.7)" : "rgba(128, 128, 128, 0.7)",
                            width: "auto",
                            height: "auto",
                            borderRadius: 15,
                            position: "absolute",
                            zIndex: 100,
                            padding: 5,
                            paddingLeft: 10,
                            top: 15,
                            right: 0,
                            flexDirection: "row"
                        }}
                        pointerEvents="box-none"
                    >
                        <Text
                            style={{
                                color: "white",
                                fontSize: 15
                            }}
                        >
                            {item.remainingItems}
                        </Text>
                        <Ionicon
                            name="chevron-forward-outline"
                            size={16}
                            color="white"
                            style={{
                                marginTop: Platform.OS == "android" ? 2.25 : 0.5,
                                marginLeft: 2
                            }}
                        />
                    </View>
                )
            }
        </TouchableOpacity>
    )
})