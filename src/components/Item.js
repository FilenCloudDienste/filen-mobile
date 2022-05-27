import React, { Component } from "react"
import { Text, View, TouchableOpacity, TouchableHighlight, DeviceEventEmitter, Dimensions, Pressable, Platform } from "react-native"
import FastImage from "react-native-fast-image"
import Ionicon from "react-native-vector-icons/Ionicons"
import { getImageForItem } from "../assets/thumbnails"
import { formatBytes, getFolderColor, calcPhotosGridSize } from "../lib/helpers"
import { i18n } from "../i18n/i18n"
import { getColor } from "../lib/style/colors"
import RNFS from "react-native-fs"

const isEqual = require("react-fast-compare")
const window = Dimensions.get("window")

const THUMBNAIL_BASE_PATH = RNFS.DocumentDirectoryPath + (RNFS.DocumentDirectoryPath.slice(-1) == "/" ? "" : "/") + "thumbnailCache/"

export class ListItem extends Component {
    shouldComponentUpdate(nextProps){
        return !isEqual(this.props, nextProps)
    }

    render(){
        const { item, index, darkMode } = this.props

        return (
            <TouchableHighlight key={index.toString()} underlayColor={"#171717"} style={{
                width: "100%",
                height: 55
            }} onPress={() => {
                DeviceEventEmitter.emit("event", {
                    type: "item-onpress",
                    data: item
                })
            }} onLongPress={() => {
                DeviceEventEmitter.emit("event", {
                    type: "item-onlongpress",
                    data: item
                })
            }}>
                <View style={{
                    backgroundColor: darkMode ? (item.selected ? "#171717" : "black") : (item.selected ? "lightgray" : "white"),
                    width: "100%",
                    height: 55,
                    flexDirection: "row",
                    alignItems: "flex-start",
                    paddingLeft: 15,
                    paddingRight: 15,
                    marginBottom: 0,
                    paddingTop: 10
                }}>
                    <View style={{
                        width: 30,
                        height: 30
                    }}>
                        {
                            item.type == "folder" ? (
                                <Ionicon name="folder" size={29} color={getFolderColor(item.color)} style={{
                                    paddingLeft: 3,
                                    paddingTop: 2
                                }} />
                            ) : (
                                <FastImage source={this.props.hideThumbnails ? getImageForItem(item) : typeof item.thumbnail !== "undefined" ? { uri: "file://" + THUMBNAIL_BASE_PATH + item.thumbnail } : getImageForItem(item)} style={{
                                    width: 30,
                                    height: 30,
                                    marginTop: item.type == "folder" ? 1 : 4,
                                    marginLeft: 2,
                                    borderRadius: 5
                                }} onError={() => {
                                    if(typeof item.thumbnail == "string"){
                                        DeviceEventEmitter.emit("event", {
                                            type: "check-thumbnail",
                                            item
                                        })
                                    }
                                }} />
                            )
                        }
                    </View>
                    <View style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        height: "100%",
                        width: "100%",
                        marginLeft: 15,
                        borderBottomColor: getColor(darkMode, "primaryBorder"),
                        borderBottomWidth: 1
                    }}>
                        <View style={{
                            paddingTop: 2,
                            width: "75%"
                        }}>
                            <Text style={{
                                color: darkMode ? "white" : "black",
                                fontWeight: "bold",
                                fontSize: 12
                            }} numberOfLines={1}>{this.props.hideFileNames ? i18n(this.props.lang, item.type == "folder" ? "folder" : "file") : item.name}</Text>
                            <Text style={{
                                color: darkMode ? "white" : "black",
                                fontSize: 11,
                                paddingTop: 3
                            }} numberOfLines={1}>
                                {
                                    item.offline && (
                                        <>
                                            <Ionicon name="arrow-down-circle" size={12} color={"green"} />
                                            <Text>&nbsp;&nbsp;&#8226;&nbsp;&nbsp;</Text>
                                        </>
                                    )
                                }
                                {
                                    item.favorited == 1 && (
                                        <>
                                            <Ionicon name="heart" size={12} color={darkMode ? "white" : "black"} />
                                            <Text>&nbsp;&nbsp;&#8226;&nbsp;&nbsp;</Text>
                                        </>
                                    )
                                }
                                {this.props.hideSizes ? formatBytes(0) : formatBytes(item.size)}
                                {
                                    typeof item.sharerEmail == "string" && (
                                        <>
                                            <Text>&nbsp;&nbsp;&#8226;&nbsp;&nbsp;</Text>
                                            <Text>{item.sharerEmail}</Text>
                                        </>
                                    )
                                }
                                {
                                    typeof item.receiverEmail == "string" && (
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
                        <TouchableOpacity hitSlop={{
                            top: 15,
                            bottom: 15,
                            right: 15,
                            left: 15
                        }} style={{
                            paddingTop: 5,
                            backgroundColor: "transparent",
                            position: "absolute",
                            right: 45
                        }} onPress={() => {
                            DeviceEventEmitter.emit("event", {
                                type: "open-item-actionsheet",
                                data: item
                            })
                        }}>
                            <Ionicon name="ellipsis-horizontal-sharp" size={20} color={darkMode ? "white" : "black"} />
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableHighlight>
        )
    }
}

export class GridItem extends Component {
    shouldComponentUpdate(nextProps){
        return !isEqual(this.props, nextProps)
    }

    render(){
        const { item, index, darkMode } = this.props

        const windowWidth = ((this.props.dimensions.window.width || window.width) - (this.props.insets.left + this.props.insets.right))

        return (
            <Pressable key={index.toString()} style={{
                margin: 2,
                backgroundColor: darkMode ? (item.selected ? "#171717" : "black") : (item.selected ? "lightgray" : "white"),
                borderRadius: 5,
                height: Math.floor(windowWidth / 2) - 19 + 40,
                width: Math.floor(windowWidth / 2) - 19,
                borderColor: getColor(darkMode, "primaryBorder"),
                borderWidth: 1,
                marginTop: index <= 1 ? 10 : 0
            }} onPress={() => {
                DeviceEventEmitter.emit("event", {
                    type: "item-onpress",
                    data: item
                })
            }} onLongPress={() => {
                DeviceEventEmitter.emit("event", {
                    type: "item-onlongpress",
                    data: item
                })
            }}>
                <View style={{
                    width: "100%",
                    height: "100%"
                }}>
                    <View style={{
                        width: "100%",
                        height: Math.floor(windowWidth / 2) - 19,
                        alignItems: "center",
                        justifyContent: "center"
                    }}>
                        {
                            item.type == "folder" ? (
                                <Ionicon name="folder" size={40} color={getFolderColor(item.color)} />
                            ) : (
                                <>
                                    <FastImage source={this.props.hideThumbnails ? getImageForItem(item) : typeof item.thumbnail !== "undefined" ? { uri: "file://" + THUMBNAIL_BASE_PATH + item.thumbnail } : getImageForItem(item)} style={{
                                        width: item.type == "folder" ? 35 : typeof item.thumbnail !== "undefined" && !this.props.hideThumbnails ? "100%" : 35,
                                        height: item.type == "folder" ? 35 : typeof item.thumbnail !== "undefined" && !this.props.hideThumbnails ? "100%" : 35,
                                        borderTopLeftRadius: 4,
                                        borderTopRightRadius: 4
                                    }} onError={() => {
                                        if(typeof item.thumbnail == "string"){
                                            DeviceEventEmitter.emit("event", {
                                                type: "check-thumbnail",
                                                item
                                            })
                                        }
                                    }} />
                                    {
                                        item.favorited == 1 && (
                                            <Ionicon name="heart" size={19} color={"white"} style={{
                                                position: "absolute",
                                                bottom: 3,
                                                left: 3,
                                                zIndex: 100
                                            }} />
                                        )
                                    }
                                    {
                                        item.offline && (
                                            <>
                                                <Ionicon name="arrow-down-circle" size={18} color={"green"} style={{
                                                    position: "absolute",
                                                    top: 3,
                                                    right: 2.8,
                                                    zIndex: 100
                                                }} />
                                                <View style={{
                                                    position: "absolute",
                                                    top: 3,
                                                    right: 3,
                                                    width: 19,
                                                    height: 19,
                                                    borderRadius: 19,
                                                    zIndex: 10,
                                                    backgroundColor: "white"
                                                }}></View>
                                            </>
                                        )
                                    }
                                    {
                                        item.selected && (
                                            <>
                                                <Ionicon name="checkmark-circle" size={18} color="#0A84FF" style={{
                                                    position: "absolute",
                                                    bottom: 2.5,
                                                    right: 2.8,
                                                    zIndex: 100
                                                }} />
                                                <View style={{
                                                    position: "absolute",
                                                    bottom: 3,
                                                    right: 3,
                                                    width: 19,
                                                    height: 19,
                                                    borderRadius: 19,
                                                    zIndex: 10,
                                                    backgroundColor: "white"
                                                }}></View>
                                            </>
                                        )
                                    }
                                </>
                            )
                        }
                    </View>
                    <Pressable style={{
                        width: "100%",
                        height: "100%",
                        flexDirection: "row",
                        alignItems: "flex-start",
                        justifyContent: "space-between"
                    }} onPress={() => {
                        DeviceEventEmitter.emit("event", {
                            type: "open-item-actionsheet",
                            data: item
                        })
                    }}>
                        <View style={{
                            width: "80%",
                            paddingTop: 5,
                            paddingLeft: 8
                        }}>
                            <Text style={{
                                color: darkMode ? "white" : "black",
                                fontWeight: "bold",
                                fontSize: 11
                            }} numberOfLines={1}>{this.props.hideFileNames ? i18n(this.props.lang, item.type == "folder" ? "folder" : "file") : item.name}</Text>
                            <Text style={{
                                color: darkMode ? "white" : "black",
                                fontSize: 10,
                                paddingTop: 1
                            }} numberOfLines={1}>
                                {item.date}
                            </Text>
                        </View>
                        <TouchableOpacity style={{
                            paddingTop: 9,
                            paddingRight: 5
                        }} onPress={() => {
                            DeviceEventEmitter.emit("event", {
                                type: "open-item-actionsheet",
                                data: item
                            })
                        }}>
                            <Ionicon name="ellipsis-horizontal-sharp" size={18} color={darkMode ? "white" : "black"} />
                        </TouchableOpacity>
                    </Pressable>
                </View>
            </Pressable>
        )
    }
}

export class PhotosItem extends Component {
    shouldComponentUpdate(nextProps){
        return !isEqual(this.props, nextProps)
    }

    render(){
        const { item, index, darkMode } = this.props

        const calcedGridSize = calcPhotosGridSize(this.props.photosGridSize)
        const windowWidth = ((this.props.dimensions.window.width || window.width) - (this.props.insets.left + this.props.insets.right))
        const imageWidthAndHeight = Math.floor(windowWidth / calcedGridSize) - 1.5

        return (
            <Pressable key={index.toString()} style={{
                height: imageWidthAndHeight,
                width: imageWidthAndHeight,
                margin: 1,
                alignItems: "center",
                justifyContent: "center"
            }} onPress={() => {
                DeviceEventEmitter.emit("event", {
                    type: "item-onpress",
                    data: item
                })
            }} onLongPress={() => {
                DeviceEventEmitter.emit("event", {
                    type: "open-item-actionsheet",
                    data: item
                })
            }}>
                <FastImage source={this.props.hideThumbnails ? getImageForItem(item) : typeof item.thumbnail !== "undefined" ? { uri: "file://" + THUMBNAIL_BASE_PATH + item.thumbnail } : getImageForItem(item)} style={{
                    width: typeof item.thumbnail !== "undefined" && !this.props.hideThumbnails ? imageWidthAndHeight : 40,
                    height: typeof item.thumbnail !== "undefined" && !this.props.hideThumbnails ? imageWidthAndHeight : 40,
                    zIndex: 2
                }} onError={() => {
                    if(typeof item.thumbnail == "string"){
                        DeviceEventEmitter.emit("event", {
                            type: "check-thumbnail",
                            item
                        })
                    }
                }} />
                {
                    calcPhotosGridSize(this.props.photosGridSize) <= 5 && (
                        <>
                            {
                                item.favorited == 1 && (
                                    <Ionicon name="heart" size={19} color={"white"} style={{
                                        position: "absolute",
                                        bottom: 3,
                                        left: 3,
                                        zIndex: 100
                                    }} />
                                )
                            }
                            {
                                item.offline && (
                                    <>
                                        <Ionicon name="arrow-down-circle" size={18} color={"green"} style={{
                                            position: "absolute",
                                            top: 3,
                                            right: 2.8,
                                            zIndex: 100
                                        }} />
                                        <View style={{
                                            position: "absolute",
                                            top: 3,
                                            right: 3,
                                            width: 19,
                                            height: 19,
                                            borderRadius: 19,
                                            zIndex: 10,
                                            backgroundColor: "white"
                                        }}></View>
                                    </>
                                )
                            }
                            {
                                item.selected && (
                                    <>
                                        <Ionicon name="checkmark-circle" size={18} color="#0A84FF" style={{
                                            position: "absolute",
                                            bottom: 2.5,
                                            right: 2.8,
                                            zIndex: 100
                                        }} />
                                        <View style={{
                                            position: "absolute",
                                            bottom: 3,
                                            right: 3,
                                            width: 19,
                                            height: 19,
                                            borderRadius: 19,
                                            zIndex: 10,
                                            backgroundColor: "white"
                                        }}></View>
                                    </>
                                )
                            }
                        </>
                    )
                }
            </Pressable>
        )
    }
}

export class PhotosRangeItem extends Component {
    shouldComponentUpdate(nextProps){
        return !isEqual(this.props, nextProps)
    }

    render(){
        const { item, index, darkMode } = this.props

        const windowWidth = this.props.dimensions.window.width || window.width
        const imageWidthAndHeight = Math.floor(windowWidth - 30)

        return (
            <TouchableOpacity activeOpacity={0.6} key={index.toString()} style={{
                height: imageWidthAndHeight,
                width: imageWidthAndHeight,
                paddingLeft: 30,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 25
            }} onPress={() => this.props.photosRangeItemClick(item)}>
                <FastImage source={this.props.hideThumbnails ? getImageForItem(item) : typeof item.thumbnail !== "undefined" ? { uri: "file://" + THUMBNAIL_BASE_PATH + item.thumbnail } : getImageForItem(item)} style={{
                    width: typeof item.thumbnail !== "undefined" && !this.props.hideThumbnails ? imageWidthAndHeight : 40,
                    height: typeof item.thumbnail !== "undefined" && !this.props.hideThumbnails ? imageWidthAndHeight : 40,
                    zIndex: 2,
                    borderRadius: typeof item.thumbnail !== "undefined" ? 15 : 0
                }} onError={() => {
                    if(typeof item.thumbnail == "string"){
                        DeviceEventEmitter.emit("event", {
                            type: "check-thumbnail",
                            item
                        })
                    }
                }} />
                <View style={{
                    backgroundColor: darkMode ? "rgba(34, 34, 34, 0.5)" : "rgba(128, 128, 128, 0.6)",
                    position: "absolute",
                    zIndex: 100,
                    top: 15,
                    left: 30,
                    zIndex: 100,
                    padding: 5,
                    paddingLeft: 10,
                    paddingRight: 10,
                    borderRadius: 15
                }}>
                    <Text style={{
                        color: "white",
                        fontWeight: "bold",
                        fontSize: 20
                    }}>
                        {item.title}
                    </Text>
                </View>
                {
                    typeof item.remainingItems == "number" && item.remainingItems > 1 && (
                        <View style={{
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
                        }} pointerEvents="box-none">
                            <Text style={{
                                color: "white",
                                fontSize: 15
                            }}>{item.remainingItems}</Text>
                            <Ionicon name="chevron-forward-outline" size={16} color="white" style={{
                                marginTop: Platform.OS == "android" ? 2.25 : 0.5,
                                marginLeft: 2
                            }} />
                        </View>
                    )
                }
            </TouchableOpacity>
        )
    }
}