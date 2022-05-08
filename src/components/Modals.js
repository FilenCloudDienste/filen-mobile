import React, { useCallback, memo, useEffect, useState, useRef } from "react"
import { Pressable, ActivityIndicator, Text, View, TouchableOpacity, Platform, FlatList, ImageBackground, SafeAreaView, Modal as RNModal } from "react-native"
import { useStore } from "../lib/state"
import ModalBox from "react-native-modalbox"
import { storage } from "../lib/storage"
import { useMMKVBoolean, useMMKVString } from "react-native-mmkv"
import Image from "react-native-fast-image"
import Ionicon from "react-native-vector-icons/Ionicons"
import { getColor } from "../lib/style/colors"
import ReactNativeZoomableView from "@dudigital/react-native-zoomable-view/src/ReactNativeZoomableView"
import RNFS from "react-native-fs"
import { downloadWholeFileFSStream } from "../lib/download"
import { SheetManager } from "react-native-actions-sheet"

const THUMBNAIL_BASE_PATH = RNFS.DocumentDirectoryPath + (RNFS.DocumentDirectoryPath.slice(-1) == "/" ? "" : "/") + "thumbnailCache/"
const currentImagePreviewDownloads = {}

export const FullscreenLoadingModal = memo(() => {
    const fullscreenLoadingModalVisible = useStore(useCallback(state => state.fullscreenLoadingModalVisible))
    const setFullscreenLoadingModalVisible = useStore(useCallback(state => state.setFullscreenLoadingModalVisible))
    const setFullscreenLoadingModalDismissable = useStore(useCallback(state => state.setFullscreenLoadingModalDismissable))
    const fullscreenLoadingModalDismissable = useStore(useCallback(state => state.fullscreenLoadingModalDismissable))

    if(!fullscreenLoadingModalVisible){
        return null
    }

    return (
        <Pressable style={{
            position: "absolute",
            height: "100%",
            width: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            justifyContent: "center",
            alignItems: "center"
        }} onPress={() => {
            if(fullscreenLoadingModalDismissable){
                setFullscreenLoadingModalVisible(false)
                setFullscreenLoadingModalDismissable(false)
            }
        }}>
            <ActivityIndicator size={"small"} color="white" />
        </Pressable>
    )
})

export const ImagePreviewModal = memo(() => {
    const imagePreviewModalVisible = useStore(useCallback(state => state.imagePreviewModalVisible))
    const setImagePreviewModalVisible = useStore(useCallback(state => state.setImagePreviewModalVisible))
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const imagePreviewModalItems = useStore(useCallback(state => state.imagePreviewModalItems))
    const imagePreviewModalIndex = useStore(useCallback(state => state.imagePreviewModalIndex))
    const setCurrentActionSheetItem = useStore(useCallback(state => state.setCurrentActionSheetItem))
    const dimensions = useStore(useCallback(state => state.dimensions))
    const [images, setImages] = useState({})
    const [currentName, setCurrentName] = useState("")
    const [isZooming, setIsZooming] = useState(false)
    const thumbnailListRef = useRef()
    const listRef = useRef()
    const [showControls, setShowControls] = useState(true)
    const [currentIndex, setCurrentIndex] = useState(0)
    const [layout, setLayout] = useState({ width: 0, height: 0 })
    const [zoomLevel, setZoomLevel] = useState(1)

    const loadImage = useCallback((image, index) => {
        setCurrentName(image.file.name)
        setCurrentActionSheetItem(image.file)
        setCurrentIndex(index)

        thumbnailListRef.current.scrollToIndex({
            animated: true,
            index
        })

        const currentImages = {...images}

        if(typeof currentImages[image.uuid] == "string"){
            return false
        }

        if(typeof currentImagePreviewDownloads[image.uuid] !== "undefined"){
            return false
        }

        currentImagePreviewDownloads[image.uuid] = true

        downloadWholeFileFSStream({
            file: image.file
        }).then((path) => {
            delete currentImagePreviewDownloads[image.uuid]

            return setImages(prev => ({
                ...prev,
                [image.uuid]: path
            }))
        }).catch((err) => {
            delete currentImagePreviewDownloads[image.uuid]

            console.log(err)

            return showToast({ message: err.toString() })
        })
    })

    const onViewableItemsChangedRef = useRef(useCallback(({ viewableItems }) => {
        const indexItem = viewableItems[viewableItems.length - 1]

        if(typeof indexItem !== "object"){
            return false
        }

        if(typeof indexItem.item !== "object"){
            return false
        }

        loadImage(indexItem.item, indexItem.index)
    }))

    const viewabilityConfigRef = useRef({
        minimumViewTime: 0,
        viewAreaCoveragePercentThreshold: 0
    })

    useEffect(() => {
        console.log("isZooming", isZooming)
    }, [isZooming])

    const renderImage = useCallback((item, index) => {
        const image = item

        if(typeof image.thumbnail !== "string"){
            return (
                <View
                    key={index.toString()}
                    style={{
                        width: dimensions.window.width,
                        height: dimensions.window.height
                    }}
                >
                    <ReactNativeZoomableView
                        maxZoom={1}
                        minZoom={1}
                        zoomStep={1}
                        initialZoom={1}
                        bindToBorders={true}
                        style={{
                            width: dimensions.window.width,
                            height: dimensions.window.height
                        }}
                    >
                        <ActivityIndicator size={"small"} color={darkMode ? "white" : "black"} style={{
                            margin: "auto",
                            position: "absolute",
                            top: 0,
                            left: 0,
                            bottom: 0,
                            right: 0
                        }} />
                    </ReactNativeZoomableView>
                </View>
            )
        }

        return (
            <View
                key={index.toString()}
                style={{
                    width: dimensions.window.width,
                    height: dimensions.window.height
                }}
            >
                <ReactNativeZoomableView
                    maxZoom={3}
                    minZoom={1}
                    zoomStep={1}
                    initialZoom={1}
                    bindToBorders={true}
                    style={{
                        width: dimensions.window.width,
                        height: dimensions.window.height
                    }}
                    onTransform={(view) => {
                        setIsZooming(view.zoomLevel > 1)
                        setZoomLevel(view.zoomLevel)
                    }}
                    onShiftingBefore={(e, state, view) => {
                        setIsZooming(view.zoomLevel > 1)
                        setZoomLevel(view.zoomLevel)
                    }}
                    onShiftingAfter={(e, state, view) => {
                        setIsZooming(view.zoomLevel > 1)
                        setZoomLevel(view.zoomLevel)
                    }}
                    onShiftingEnd={(e, state, view) => {
                        setIsZooming(view.zoomLevel > 1)
                        setZoomLevel(view.zoomLevel)
                    }}
                    onZoomBefore={(e, state, view) => {
                        setIsZooming(view.zoomLevel > 1)
                        setZoomLevel(view.zoomLevel)
                    }}
                    onZoomAfter={(e, state, view) => {
                        setIsZooming(view.zoomLevel > 1)
                        setZoomLevel(view.zoomLevel)
                    }}
                    onZoomEnd={(e, state, view) => {
                        setIsZooming(view.zoomLevel > 1)
                        setZoomLevel(view.zoomLevel)
                    }}
                    movementSensibility={isZooming && zoomLevel > 2 ? 1.9 : 100000}
                    onPress={() => {
                        if(isZooming){
                            return false
                        }

                        setShowControls(!showControls)
                    }}
                >
                    <ImageBackground
                        source={{
                            uri: decodeURIComponent("file://" + THUMBNAIL_BASE_PATH + image.thumbnail)
                        }}
                        resizeMode="contain"
                        style={{
                            width: dimensions.window.width,
                            height: dimensions.window.height
                        }}
                    >
                        {
                            typeof images[image.uuid] == "string" && (
                                <Image
                                    source={{
                                        uri: decodeURIComponent(images[image.uuid].startsWith("file://") ? images[image.uuid] : "file://" + images[image.uuid])
                                    }}
                                    resizeMode="contain"
                                    style={{
                                        width: dimensions.window.width,
                                        height: dimensions.window.height
                                    }}
                                />
                            )
                        }
                    </ImageBackground>
                    {
                        typeof images[image.uuid] !== "string" && (
                            <ActivityIndicator size={"small"} color={darkMode ? "white" : "black"} style={{
                                margin: "auto",
                                position: "absolute",
                                top: 0,
                                left: 0,
                                bottom: 0,
                                right: 0
                            }} />
                        )
                    }
                </ReactNativeZoomableView>
            </View>
        )
    })

    const renderThumb = useCallback((item, index) => {
        const image = item

        if(typeof image.thumbnail !== "string"){
            return (
                <TouchableOpacity
                    key={index.toString()}
                    style={{
                        width: 40,
                        height: 40,
                        backgroundColor: "black",
                        borderRadius: 5
                    }}
                    onPress={() => listRef.current.scrollToIndex({
                        animated: false,
                        index
                    })}
                ></TouchableOpacity>
            )
        }

        return (
            <TouchableOpacity
                key={index.toString()}
                style={{
                    width: 30,
                    height: 50,
                    backgroundColor: "black",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    alignItems: "center"
                }}
                onPress={() => listRef.current.scrollToIndex({
                    animated: false,
                    index
                })}
            >
                <View style={{
                    backgroundColor: currentIndex == index ? "gray" : "transparent",
                    width: 15,
                    height: 5,
                    borderRadius: 20
                }}></View>
                <Image
                    source={{
                        uri: decodeURIComponent("file://" + THUMBNAIL_BASE_PATH + image.thumbnail)
                    }}
                    resizeMode="cover"
                    style={{
                        width: 30,
                        height: 40
                    }}
                />
            </TouchableOpacity>
        )
    })

    useEffect(() => {
        setShowControls(!isZooming)
    }, [isZooming])

    return (
        <RNModal
            visible={imagePreviewModalVisible}
            animationType="slide"
            backButtonClose={true}
            style={{
                backgroundColor: darkMode ? "black" : "white",
                width: dimensions.screen.width,
                height: dimensions.screen.height,
                pointerEvents: "box-none"
            }}
            transparent={true}
            hardwareAccelerated={true}
            onRequestClose={() => {
                setImages({})
                setIsZooming(false)
                setShowControls(true)
                setCurrentIndex(0)
                setImagePreviewModalVisible(false)
                setZoomLevel(1)
            }}
            onShow={() => {
                if(typeof imagePreviewModalItems[imagePreviewModalIndex] !== "undefined"){
                    loadImage(imagePreviewModalItems[imagePreviewModalIndex], imagePreviewModalIndex)
                }
            }}
        >
            <SafeAreaView style={{ flex: 0, backgroundColor: darkMode ? "black" : "white" }} />
            <SafeAreaView style={{
                backgroundColor: darkMode ? "black" : "white",
                height: "100%",
                width: "100%",
                flex: 2
            }} onLayout={(e) => setLayout({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
                {
                    showControls && (
                        <View style={{
                            flexDirection: "row",
                            height: 50,
                            width: "100%",
                            justifyContent: "space-between",
                            alignItems: "center",
                            borderBottomWidth: 0,
                            borderBottomColor: getColor(darkMode, "primaryBorder"),
                            position: "relative",
                            top: 0,
                            zIndex: 1000,
                            backgroundColor: darkMode ? "black" : "white",
                            paddingLeft: 10,
                            paddingRight: 15,
                            paddingTop: 5
                        }}>
                            <View style={{
                                flexDirection: "row",
                                justifyContent: "flex-start",
                                alignItems: "center"
                            }}>
                                <TouchableOpacity style={{
                                    marginTop: Platform.OS == "android" ? 1 : 0,
                                    flexDirection: "row",
                                    justifyContent: "flex-start",
                                    alignItems: "center"
                                }} hitSlop={{
                                    top: 10,
                                    left: 10,
                                    bottom: 10,
                                    right: 10
                                }} onPress={() => setImagePreviewModalVisible(false)}>
                                    <Ionicon name="chevron-back" size={24} color={darkMode ? "white" : "black"}></Ionicon>
                                </TouchableOpacity>
                                <Text numberOfLines={1} style={{
                                    color: darkMode ? "white" : "black",
                                    width: "85%",
                                    fontSize: 17,
                                    paddingLeft: 10,
                                    flexDirection: "row",
                                    justifyContent: "flex-start",
                                    alignItems: "center",
                                    fontWeight: "bold"
                                }}>
                                    {currentName}
                                </Text>
                            </View>
                            <View>
                                <TouchableOpacity style={{
                                    marginTop: Platform.OS == "android" ? 1 : 0
                                }} hitSlop={{
                                    top: 10,
                                    left: 10,
                                    bottom: 10,
                                    right: 10
                                }} onPress={() => SheetManager.show("ItemActionSheet")}>
                                    <Ionicon name="ellipsis-horizontal-sharp" size={24} color={darkMode ? "white" : "black"}></Ionicon>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )
                }
                <FlatList
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: dimensions.window.width,
                        height: dimensions.window.height,
                        zIndex: 10,
                        marginTop: -50
                    }}
                    ref={listRef}
                    data={imagePreviewModalItems}
                    initialScrollIndex={imagePreviewModalIndex <= imagePreviewModalItems.length ? imagePreviewModalIndex : 0}
                    renderItem={({ item, index }) => {
                        return renderImage(item, index)
                    }}
                    keyExtractor={(item, index) => index.toString()}
                    windowSize={3}
                    initialNumToRender={6}
                    removeClippedSubviews={true}
                    horizontal={true}
                    bounces={true}
                    getItemLayout={(data, index) => ({ length: dimensions.window.width, offset: dimensions.window.width * index, index })}
                    scrollEnabled={!isZooming}
                    pagingEnabled={true}
                    onViewableItemsChanged={onViewableItemsChangedRef.current}
                    viewabilityConfig={viewabilityConfigRef.current}
                    showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}
                />
                {
                    showControls && (
                        <FlatList
                            style={{
                                position: "absolute",
                                top: layout.height - 90,
                                width: "100%",
                                height: 300,
                                zIndex: 1000,
                                backgroundColor: darkMode ? "black" : "white",
                                paddingTop: 5,
                                paddingBottom: 5
                            }}
                            ref={thumbnailListRef}
                            data={imagePreviewModalItems}
                            initialScrollIndex={imagePreviewModalIndex <= imagePreviewModalItems.length ? imagePreviewModalIndex : 0}
                            renderItem={({ item, index }) => {
                                return renderThumb(item, index)
                            }}
                            getItemLayout={(data, index) => ({ length: 30, offset: 25 * index, index })}
                            keyExtractor={(item, index) => index.toString()}
                            windowSize={3}
                            initialNumToRender={32}
                            removeClippedSubviews={true}
                            horizontal={true}
                            scrollEnabled={true}
                            pagingEnabled={false}
                            bounces={false}
                            showsVerticalScrollIndicator={false}
                            showsHorizontalScrollIndicator={false}
                        />
                    )
                }
            </SafeAreaView>
        </RNModal>
    )
})