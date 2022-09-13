import React, { memo, useState, useEffect } from "react"
import { Text, View, TouchableOpacity, TouchableHighlight, DeviceEventEmitter, Dimensions, Pressable, Platform } from "react-native"
import FastImage from "react-native-fast-image"
import Ionicon from "@expo/vector-icons/Ionicons"
import { getImageForItem } from "../../assets/thumbnails"
import { formatBytes, getFolderColor, calcPhotosGridSize, getRouteURL } from "../../lib/helpers"
import { i18n } from "../../i18n"
import { getColor } from "../../lib/style/colors"
import RNFS from "react-native-fs"
import type { ScaledSize } from "react-native"
import type { EdgeInsets } from "react-native-safe-area-context"
import type { Item } from "../../lib/services/items"
import { fetchFolderSize } from "../../lib/api"
import storage from "../../lib/storage"
import { useMountedState } from "react-use"

const window = Dimensions.get("window")
const THUMBNAIL_BASE_PATH = RNFS.DocumentDirectoryPath + (RNFS.DocumentDirectoryPath.slice(-1) == "/" ? "" : "/") + "thumbnailCache/"

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
    dimensions: { window: ScaledSize, screen: ScaledSize }
    hideSizes: boolean,
    insets: EdgeInsets
}

export interface ListItemProps extends ItemBaseProps { }

export const ListItem = memo(({ item, index, darkMode, hideFileNames, hideSizes, hideThumbnails, lang }: ListItemProps) => {
    const [folderSize, setFolderSize] = useState<number>(item.type == "folder" ? storage.getNumber("folderSizeCache:" + item.uuid) : 0)
    const isMounted: () => boolean = useMountedState()

    useEffect(() => {
        if(item.type == "folder"){
            const fetchFolderSizeTimeout = storage.getNumber("fetchFolderSizeTimeout:" + item.uuid)

            if(fetchFolderSizeTimeout > new Date().getTime()){
                return
            }

            fetchFolderSize({ folder: item, routeURL: getRouteURL() }).then((fetchedSize) => {
                storage.set("folderSizeCache:" + item.uuid, fetchedSize)
                storage.set("fetchFolderSizeTimeout:" + item.uuid, (new Date().getTime() + 30000))

                if(isMounted()){
                    setFolderSize(fetchedSize)
                }
            }).catch(console.error)
        }
    }, [])

    return (
        <TouchableHighlight
            key={index.toString()}
            underlayColor="#171717"
            style={{
                width: "100%",
                height: 55
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
                    backgroundColor: darkMode ? (item.selected ? "#171717" : "black") : (item.selected ? "lightgray" : "white"),
                    width: "100%",
                    height: 55,
                    flexDirection: "row",
                    alignItems: "flex-start",
                    paddingLeft: 15,
                    paddingRight: 15,
                    marginBottom: 0,
                    paddingTop: 10
                }}
            >
                <View
                    style={{
                        width: 30,
                        height: 30
                    }}
                >
                    {
                        item.type == "folder" ? (
                            <Ionicon
                                name="folder"
                                size={29}
                                color={getFolderColor(item.color)}
                                style={{
                                    paddingLeft: 3,
                                    paddingTop: 2
                                }}
                            />
                        ) : (
                            <FastImage
                                source={hideThumbnails ? getImageForItem(item) : typeof item.thumbnail !== "undefined" ? { uri: "file://" + THUMBNAIL_BASE_PATH + item.thumbnail } : getImageForItem(item)}
                                style={{
                                    width: 30,
                                    height: 30,
                                    marginTop: 4,
                                    marginLeft: 2,
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
                        height: "100%",
                        width: "100%",
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
                                color: darkMode ? "white" : "black",
                                fontWeight: "bold",
                                fontSize: 12
                            }} numberOfLines={1}
                        >
                            {hideFileNames ? i18n(lang, item.type == "folder" ? "folder" : "file") : item.name}
                        </Text>
                        <Text
                            style={{
                                color: darkMode ? "white" : "black",
                                fontSize: 11,
                                paddingTop: 3
                            }}
                            numberOfLines={1}
                        >
                            {
                                typeof item.offline == "boolean" && item.offline && (
                                    <>
                                        <Ionicon
                                            name="arrow-down-circle" size={12}
                                            color={"green"}
                                        />
                                        <Text>&nbsp;&nbsp;&#8226;&nbsp;&nbsp;</Text>
                                    </>
                                )
                            }
                            {
                                typeof item.favorited == "boolean" && item.favorited && (
                                    <>
                                        <Ionicon
                                            name="heart"
                                            size={12}
                                            color={darkMode ? "white" : "black"}
                                        />
                                        <Text>&nbsp;&nbsp;&#8226;&nbsp;&nbsp;</Text>
                                    </>
                                )
                            }
                            {hideSizes ? formatBytes(0) : formatBytes(item.type == "file" ? item.size : folderSize)}
                            {
                                typeof item.sharerEmail == "string" && item.sharerEmail.length > 0 && (
                                    <>
                                        <Text>&nbsp;&nbsp;&#8226;&nbsp;&nbsp;</Text>
                                        <Text>{item.sharerEmail}</Text>
                                    </>
                                )
                            }
                            {
                                typeof item.receiverEmail == "string" && item.receiverEmail.length > 0 && (
                                    <>
                                        <Text>&nbsp;&nbsp;&#8226;&nbsp;&nbsp;</Text>
                                        <Text>{item.receiverEmail}</Text>
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
                            paddingTop: 5,
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
                            size={20} color={darkMode ? "white" : "black"}
                        />
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableHighlight>
    )
})

export interface GridItemProps extends ItemBaseProps { }

export const GridItem = memo(({ dimensions, insets, item, index, darkMode, hideFileNames, hideThumbnails, lang }: GridItemProps) => {
    const windowWidth = ((dimensions.window.width || window.width) - (insets.left + insets.right))

    return (
        <Pressable
            key={index.toString()}
            style={{
                margin: 2,
                backgroundColor: darkMode ? (item.selected ? "#171717" : "black") : (item.selected ? "lightgray" : "white"),
                borderRadius: 5,
                height: Math.floor(windowWidth / 2) - 19 + 40,
                width: Math.floor(windowWidth / 2) - 19,
                borderColor: getColor(darkMode, "primaryBorder"),
                borderWidth: 1,
                marginTop: index <= 1 ? 10 : 0
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
                        height: Math.floor(windowWidth / 2) - 19,
                        alignItems: "center",
                        justifyContent: "center"
                    }}
                >
                    {
                        item.type == "folder" ? (
                            <Ionicon
                                name="folder"
                                size={40} 
                                color={getFolderColor(item.color)} 
                            />
                        ) : (
                            <>
                                <FastImage 
                                    source={hideThumbnails ? getImageForItem(item) : typeof item.thumbnail !== "undefined" ? { uri: "file://" + THUMBNAIL_BASE_PATH + item.thumbnail } : getImageForItem(item)}
                                    style={{
                                        width: typeof item.thumbnail !== "undefined" && !hideThumbnails ? "100%" : 35,
                                        height: typeof item.thumbnail !== "undefined" && !hideThumbnails ? "100%" : 35,
                                        borderTopLeftRadius: 4,
                                        borderTopRightRadius: 4
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
                            </>
                        )
                    }
                </View>
                <Pressable
                    style={{
                        width: "100%",
                        height: "100%",
                        flexDirection: "row",
                        alignItems: "flex-start",
                        justifyContent: "space-between"
                    }}
                    onPress={() => {
                        DeviceEventEmitter.emit("event", {
                            type: "open-item-actionsheet",
                            data: item
                        })
                    }}
                >
                    <View
                        style={{
                            width: "80%",
                            paddingTop: 5,
                            paddingLeft: 8
                        }}
                    >
                        <Text
                            style={{
                                color: darkMode ? "white" : "black",
                                fontWeight: "bold",
                                fontSize: 11
                            }}
                            numberOfLines={1}
                        >
                            {hideFileNames ? i18n(lang, item.type == "folder" ? "folder" : "file") : item.name}
                        </Text>
                        <Text
                            style={{
                                color: darkMode ? "white" : "black",
                                fontSize: 10,
                                paddingTop: 1
                            }}
                            numberOfLines={1}
                        >
                            {item.date}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={{
                            paddingTop: 9,
                            paddingRight: 5
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
                            color={darkMode ? "white" : "black"} 
                        />
                    </TouchableOpacity>
                </Pressable>
            </View>
        </Pressable>
    )
})

export interface PhotosItemProps extends ItemBaseProps {
    photosGridSize: number
}

export const PhotosItem = memo(({ item, index, darkMode, photosGridSize, insets, dimensions, hideThumbnails }: PhotosItemProps) => {
    const calcedGridSize = calcPhotosGridSize(photosGridSize)
    const windowWidth = ((dimensions.window.width || window.width) - (insets.left + insets.right))
    const imageWidthAndHeight = Math.floor(windowWidth / calcedGridSize) - 1.5

    return (
        <Pressable
            key={index.toString()}
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

export const PhotosRangeItem = memo(({ item, index, darkMode, dimensions, hideThumbnails, photosRangeItemClick }: PhotosRangeItemProps) => {
    const windowWidth = dimensions.window.width || window.width
    const imageWidthAndHeight = Math.floor(windowWidth - 30)

    return (
        <TouchableOpacity
            activeOpacity={0.6}
            key={index.toString()}
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