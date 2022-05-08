import React, { useCallback, memo, useEffect, useState, useRef } from "react"
import { ActivityIndicator, Text, View, TouchableOpacity, Platform, FlatList, ImageBackground, DeviceEventEmitter, Pressable, Dimensions } from "react-native"
import { useStore } from "../lib/state"
import { storage } from "../lib/storage"
import { useMMKVBoolean } from "react-native-mmkv"
import Image from "react-native-fast-image"
import Ionicon from "react-native-vector-icons/Ionicons"
import ReactNativeZoomableView from "@dudigital/react-native-zoomable-view/src/ReactNativeZoomableView"
import { downloadWholeFileFSStream } from "../lib/download"
import { SheetManager } from "react-native-actions-sheet"
import RNFS from "react-native-fs"
import { navigationAnimation } from "../lib/state"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { setStatusBarStyle } from "../lib/statusbar"
import { canCompressThumbnail, getFileExt } from "../lib/helpers"
import { useMountedState } from "react-use"
import GestureRecognizer from "react-native-swipe-gestures"

const THUMBNAIL_BASE_PATH = RNFS.DocumentDirectoryPath + (RNFS.DocumentDirectoryPath.slice(-1) == "/" ? "" : "/") + "thumbnailCache/"
const currentImagePreviewDownloads = {}
const minZoom = 0.99999999999

const ImageViewerScreen = memo(({ navigation, route }) => {
    const screenDimensions = Dimensions.get("screen")
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const imagePreviewModalItems = useStore(useCallback(state => state.imagePreviewModalItems))
    const imagePreviewModalIndex = useStore(useCallback(state => state.imagePreviewModalIndex))
    const setCurrentActionSheetItem = useStore(useCallback(state => state.setCurrentActionSheetItem))
    const dimensions = useStore(useCallback(state => state.dimensions))
    const [images, setImages] = useState({})
    const [currentName, setCurrentName] = useState("")
    const [isZooming, setIsZooming] = useState(false)
    const [isSwiping, setIsSwiping] = useState(false)
    const zoomLevel = useRef(minZoom)
    const thumbnailListRef = useRef()
    const listRef = useRef()
    const [currentIndex, setCurrentIndex] = useState(0)
    const [showControls, setShowControls] = useState(true)
    const insets = useSafeAreaInsets()
    const viewRefs = useRef({}).current
    const isMounted = useMountedState()
    const tapCount = useRef(0)
    const tapTimer = useRef(undefined)
    const [portrait, setPortrait] = useState(screenDimensions.height >= screenDimensions.width)
    const lastIndex = useRef(0)
    const didNavBack = useRef(false)

    const loadImage = useCallback((image, index) => {
        if(!isMounted()){
            return false
        }

        lastIndex.current = index

        setCurrentName(image.file.name)
        setCurrentActionSheetItem(image.file)
        setCurrentIndex(index)

        thumbnailListRef?.current?.scrollToIndex({
            animated: true,
            index,
            viewPosition: 0.5
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

            if(!isMounted()){
                return false
            }

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

    const getThumbnail = useCallback(({ item }) => {
        if(item.type == "file"){
            if(canCompressThumbnail(getFileExt(item.name))){
                if(typeof item.thumbnail !== "string"){
                    DeviceEventEmitter.emit("event", {
                        type: "generate-thumbnail",
                        item
                    })
                }
                else{
                    //DeviceEventEmitter.emit("event", {
                    //    type: "check-thumbnail",
                    //    item
                    //})
                }
            }
        }
    })

    const updateItemThumbnail = useCallback((item, path) => {
        if(typeof path !== "string"){
            return false
        }

        if(path.length < 4){
            return false
        }
    
        if(isMounted()){
            useStore.setState(prev => ({
                ...prev,
                imagePreviewModalItems: prev.imagePreviewModalItems.map(mapItem => mapItem.file.uuid == item.uuid && typeof mapItem.thumbnail == "undefined" ? {...mapItem, thumbnail: item.uuid + ".jpg" } : mapItem)
            }))
        }
    })

    const viewabilityConfigRef = useRef({
        minimumViewTime: 0,
        viewAreaCoveragePercentThreshold: 95
    })

    const onViewableItemsChangedThumbnailsRef = useRef(useCallback(({ viewableItems }) => {
        const visible = {}

        for(let i = 0; i < viewableItems.length; i++){
            const item = viewableItems[i].item.file

            visible[item.uuid] = true
            global.visibleItems[item.uuid] = true

            getThumbnail({ item })
        }

        for(let prop in global.visibleItems){
            if(typeof visible[prop] !== "undefined"){
                global.visibleItems[prop] = true
            }
            else{
                delete global.visibleItems[prop]
            }
        }
    }))

    const viewabilityConfigThumbnailsRef = useRef({
        minimumViewTime: 0,
        viewAreaCoveragePercentThreshold: 95
    })

    useEffect(() => {
        if(!isMounted()){
            return false
        }

        setShowControls(isZooming)
    }, [isZooming])

    useEffect(() => {
        setStatusBarStyle(true)

        if(typeof imagePreviewModalItems[imagePreviewModalIndex] !== "undefined"){
            loadImage(imagePreviewModalItems[imagePreviewModalIndex], imagePreviewModalIndex)
        }

        const deviceListener = DeviceEventEmitter.addListener("event", (data) => {
            if(!isMounted()){
                return false
            }

            if(data.type == "thumbnail-generated"){
                updateItemThumbnail(data.data, data.data.path)
            }
        })

        const dimensionsListener = Dimensions.addEventListener("change", ({ screen }) => {
            if(!isMounted()){
                return false
            }

            setPortrait(screen.height >= screen.width)

            listRef?.current?.scrollToIndex({
                animated: false,
                index: lastIndex.current
            })

            thumbnailListRef?.current?.scrollToIndex({
                animated: false,
                index: lastIndex.current,
                viewPosition: 0.5
            })
        })

        return () => {
            setStatusBarStyle(darkMode)
            deviceListener.remove()
            dimensionsListener.remove()
        }
    }, [])

    const renderImage = useCallback((item, index) => {
        const image = item

        if(typeof image.thumbnail !== "string"){
            return (
                <View
                    key={image.uuid}
                    style={{
                        width: dimensions.window.width,
                        height: dimensions.window.height
                    }}
                >
                    <ActivityIndicator size={"small"} color={"white"} style={{
                        margin: "auto",
                        position: "absolute",
                        top: 0,
                        left: 0,
                        bottom: 0,
                        right: 0
                    }} />
                </View>
            )
        }

        return (
            <ReactNativeZoomableView
                key={image.uuid}
                ref={(ref) => viewRefs[image.uuid] = ref}
                maxZoom={3}
                minZoom={minZoom}
                zoomStep={2}
                initialZoom={minZoom}
                bindToBorders={true}
                contentWidth={dimensions.window.width}
                contentHeight={dimensions.window.height}
                style={{
                    width: dimensions.window.width,
                    height: dimensions.window.height
                }}
                onZoomBefore={(e, state, view) => {
                    setIsZooming(view.zoomLevel > 1)
                    
                    zoomLevel.current = view.zoomLevel
                }}
                onZoomAfter={(e, state, view) => {
                    setIsZooming(view.zoomLevel > 1)
                    
                    zoomLevel.current = view.zoomLevel

                    if(view.zoomLevel <= 1.1){
                        listRef?.current?.scrollToIndex({
                            animated: true,
                            index
                        })
                    }
                }}
                onShiftingBefore={(e, state, view) => {
                    setIsZooming(view.zoomLevel > 1)
                    
                    zoomLevel.current = view.zoomLevel
                }}
                onShiftingAfter={(e, state, view) => {
                    setIsZooming(view.zoomLevel > 1)

                    if(view.distanceTop >= 75 && !didNavBack.current && zoomLevel.current <= 1){
                        didNavBack.current = true

                        navigation.goBack()

                        return true
                    }
                    
                    zoomLevel.current = view.zoomLevel
                }}
                captureEvent={true}
            >
                <Pressable
                    onPress={() => {
                        if(isSwiping){
                            return false
                        }

                        tapCount.current += 1

                        if(tapCount.current >= 2){
                            if(zoomLevel.current >= 1.1){
                                viewRefs[image.uuid]?.zoomTo(1)

                                zoomLevel.current = 1

                                setIsZooming(false)
                            }
                            else{
                                viewRefs[image.uuid]?.zoomTo(2)

                                zoomLevel.current = 2

                                setIsZooming(true)
                            }

                            tapCount.current = 0

                            return clearTimeout(tapTimer.current)
                        }

                        clearTimeout(tapTimer.current)

                        tapTimer.current = setTimeout(() => {
                            if(tapCount.current >= 2){
                                if(zoomLevel.current >= 2){
                                    viewRefs[image.uuid]?.zoomTo(1)

                                    zoomLevel.current = 1

                                    setIsZooming(false)
                                }
                                else{
                                    viewRefs[image.uuid]?.zoomTo(2)

                                    zoomLevel.current = 2

                                    setIsZooming(true)
                                }
                            }
                            else{
                                setShowControls(prev => !prev)
                            }

                            tapCount.current = 0
                        }, 300)
                    }}
                >
                    <>
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
                                <ActivityIndicator size={"small"} color={"white"} style={{
                                    margin: "auto",
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    bottom: 0,
                                    right: 0
                                }} />
                            )
                        }
                    </>
                </Pressable>
            </ReactNativeZoomableView>
        )
    })

    const renderThumb = useCallback((item, index) => {
        const image = item

        if(typeof image.thumbnail !== "string"){
            return (
                <TouchableOpacity
                    key={image.uuid}
                    style={{
                        width: 30,
                        height: 50,
                        backgroundColor: "black"
                    }}
                    onPress={() => listRef?.current?.scrollToIndex({
                        animated: false,
                        index
                    })}
                >
                    <ActivityIndicator size={"small"} color={"white"} style={{
                        margin: "auto",
                        position: "absolute",
                        top: 0,
                        left: 0,
                        bottom: 10,
                        right: 0
                    }} />
                </TouchableOpacity>
            )
        }

        return (
            <TouchableOpacity
                key={image.uuid}
                style={{
                    width: 30,
                    height: 50,
                    backgroundColor: "black",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    alignItems: "center"
                }}
                onPress={() => listRef?.current?.scrollToIndex({
                    animated: false,
                    index
                })}
            >
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
                <View style={{
                    backgroundColor: currentIndex == index ? "gray" : "transparent",
                    width: 15,
                    height: 5,
                    borderRadius: 20
                }}></View>
            </TouchableOpacity>
        )
    })

    return (
        <View style={{
            backgroundColor: "black",
            height: dimensions.window.height + insets.top + insets.bottom,
            width: dimensions.screen.width,
            marginTop: 0
        }}>
            <View style={{
                display: showControls ? "none" : "flex",
                flexDirection: "row",
                height: "auto",
                width: dimensions.screen.width,
                justifyContent: "space-between",
                alignItems: "center",
                position: "absolute",
                top: 0,
                zIndex: 1000,
                backgroundColor: "black",
                paddingLeft: 10,
                paddingRight: 15,
                paddingTop: portrait ? (insets.top + 5) : 5,
                paddingBottom: 10,
                marginTop: 0
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
                    }} onPress={() => {
                        navigationAnimation({ enable: true }).then(() => {
                            navigation.goBack()
                        })
                    }}>
                        <Ionicon name="chevron-back" size={24} color={"white"}></Ionicon>
                    </TouchableOpacity>
                    <Text numberOfLines={1} style={{
                        color: "white",
                        width: "93%",
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
                <View style={{
                    display: "none"
                }}>
                    <TouchableOpacity style={{
                        marginTop: Platform.OS == "android" ? 1 : 0
                    }} hitSlop={{
                        top: 10,
                        left: 10,
                        bottom: 10,
                        right: 10
                    }} onPress={() => SheetManager.show("ItemActionSheet")}>
                        <Ionicon name="ellipsis-horizontal-sharp" size={24} color={"white"}></Ionicon>
                    </TouchableOpacity>
                </View>
            </View>
            <FlatList
                style={{
                    position: "absolute",
                    width: dimensions.screen.width,
                    height: dimensions.screen.height,
                    zIndex: 10
                }}
                ref={listRef}
                data={imagePreviewModalItems}
                initialScrollIndex={imagePreviewModalIndex <= imagePreviewModalItems.length ? imagePreviewModalIndex : 0}
                renderItem={({ item, index }) => {
                    return renderImage(item, index)
                }}
                keyExtractor={(item, index) => item.uuid}
                windowSize={8}
                initialNumToRender={16}
                removeClippedSubviews={true}
                horizontal={true}
                bounces={true}
                getItemLayout={(data, index) => ({ length: dimensions.window.width, offset: dimensions.window.width * index, index })}
                scrollEnabled={!isZooming}
                pagingEnabled={true}
                onViewableItemsChanged={onViewableItemsChangedRef?.current}
                viewabilityConfig={viewabilityConfigRef?.current}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                onScrollBeginDrag={() => setIsSwiping(true)}
                onScrollEndDrag={() => setIsSwiping(false)}
            />
            <FlatList
                style={{
                    position: "absolute",
                    bottom: insets.bottom + insets.top,
                    width: "100%",
                    height: 90,
                    zIndex: 1000,
                    backgroundColor: "black",
                    paddingTop: 1,
                    paddingBottom: insets.bottom + insets.top,
                    display: showControls ? "none" : "flex",
                    paddingBottom: insets.bottom
                }}
                ref={thumbnailListRef}
                data={imagePreviewModalItems}
                initialScrollIndex={imagePreviewModalIndex <= imagePreviewModalItems.length ? imagePreviewModalIndex : 0}
                renderItem={({ item, index }) => {
                    return renderThumb(item, index)
                }}
                getItemLayout={(data, index) => ({ length: 30, offset: 30 * index, index })}
                keyExtractor={(item, index) => item.uuid}
                windowSize={8}
                initialNumToRender={32}
                removeClippedSubviews={true}
                horizontal={true}
                scrollEnabled={true}
                pagingEnabled={false}
                bounces={false}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                onViewableItemsChanged={onViewableItemsChangedThumbnailsRef?.current}
                viewabilityConfig={viewabilityConfigThumbnailsRef?.current}
            />
        </View>
    )
})

export default ImageViewerScreen