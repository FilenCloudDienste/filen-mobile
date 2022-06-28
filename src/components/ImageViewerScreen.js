import React, { useCallback, memo, useEffect, useState, useRef } from "react"
import { ActivityIndicator, Text, View, TouchableOpacity, Platform, FlatList, ImageBackground, Animated, Pressable, Dimensions, StatusBar } from "react-native"
import { useStore } from "../lib/state"
import { storage } from "../lib/storage"
import { useMMKVBoolean, useMMKVString } from "react-native-mmkv"
import Image from "react-native-fast-image"
import Ionicon from "react-native-vector-icons/Ionicons"
import ReactNativeZoomableView from "@dudigital/react-native-zoomable-view/src/ReactNativeZoomableView"
import { downloadWholeFileFSStream } from "../lib/download"
import RNFS from "react-native-fs"
import { navigationAnimation } from "../lib/state"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { setStatusBarStyle } from "../lib/statusbar"
import { useMountedState } from "react-use"
import { hideNavigationBar, showNavigationBar } from "react-native-navigation-bar-color"
import { generateItemThumbnail } from "../lib/services/items"
import { getImageForItem } from "../assets/thumbnails"
import { i18n } from "../i18n/i18n"

const THUMBNAIL_BASE_PATH = RNFS.DocumentDirectoryPath + (RNFS.DocumentDirectoryPath.slice(-1) == "/" ? "" : "/") + "thumbnailCache/"
const minZoom = 0.99999999999

const ImageViewerScreen = memo(({ navigation, route }) => {
    const screenDimensions = Dimensions.get("screen")
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const [lang, setLang] = useMMKVString("lang", storage)
    const [imagePreviewModalItems, setImagePreviewModalItems] = useState(route.params.items || [])
    const [imagePreviewModalIndex, setImagePreviewModalIndex] = useState(route.params.index || 0)
    const setCurrentActionSheetItem = useStore(useCallback(state => state.setCurrentActionSheetItem))
    const [images, setImages] = useState({})
    const [currentName, setCurrentName] = useState("")
    const [isZooming, setIsZooming] = useState(false)
    const [isSwiping, setIsSwiping] = useState(false)
    const zoomLevel = useRef(minZoom)
    const thumbnailListRef = useRef()
    const listRef = useRef()
    const [currentIndex, setCurrentIndex] = useState(imagePreviewModalIndex)
    const [showControls, setShowControls] = useState(true)
    const insets = useSafeAreaInsets()
    const viewRefs = useRef({}).current
    const isMounted = useMountedState()
    const tapCount = useRef(0)
    const tapTimer = useRef(undefined)
    const [portrait, setPortrait] = useState(screenDimensions.height >= screenDimensions.width)
    const didNavBack = useRef(false)
    const currentImagePreviewDownloads = useRef({}).current
    const setListScrollAgain = useRef(false)
    const imageActionsContainerHeight = new Animated.Value(120)
    const imageActionsVisible = useRef(false)

    const loadImage = useCallback((image, index) => {
        if(!isMounted()){
            return false
        }

        zoomLevel.current = minZoom

        setCurrentName(image.file.name)
        setCurrentActionSheetItem(image.file)
        setCurrentIndex(index)

        thumbnailListRef?.current?.scrollToIndex({
            animated: true,
            index,
            viewPosition: 0.5
        })

        if(setListScrollAgain.current){
            setListScrollAgain.current = false

            listRef?.current?.scrollToIndex({
                animated: false,
                index
            })
        }

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

            generateItemThumbnail({
                item: image.file,
                skipInViewCheck: true,
                callback: (err, thumbPath) => {
                    if(!isMounted()){
                        return false
                    }

                    if(!err && typeof thumbPath == "string"){
                        updateItemThumbnail(image.file, thumbPath)
                    }

                    return setImages(prev => ({
                        ...prev,
                        [image.uuid]: path
                    }))
                }
            })
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

    const updateItemThumbnail = useCallback((item, path) => {
        if(typeof path !== "string"){
            return false
        }

        if(path.length < 4){
            return false
        }
    
        if(isMounted()){
            setImagePreviewModalItems(prev => [...prev.map(mapItem => mapItem.file.uuid == item.uuid && typeof mapItem.thumbnail == "undefined" ? {...mapItem, thumbnail: item.uuid + ".jpg" } : mapItem)])
        }
    })

    const viewabilityConfigRef = useRef({
        minimumViewTime: 0,
        viewAreaCoveragePercentThreshold: 95,
        viewAreaCoveragePercentThreshold: 95,
        waitForInteraction: false
    })

    useEffect(() => {
        if(!isMounted()){
            return false
        }

        setShowControls(isZooming)
    }, [isZooming])

    useEffect(() => {
        if(imagePreviewModalItems.length == 0){
            return navigation.goBack()
        }

        if(Platform.OS == "ios"){
            setStatusBarStyle(true)
        }
        
        if(Platform.OS == "android"){
            hideNavigationBar()

            StatusBar.setHidden(true)
        }

        if(typeof imagePreviewModalItems[imagePreviewModalIndex] !== "undefined"){
            setTimeout(() => {
                loadImage(imagePreviewModalItems[imagePreviewModalIndex], imagePreviewModalIndex)
            }, 50)
        }

        const dimensionsListener = Dimensions.addEventListener("change", ({ screen }) => {
            if(!isMounted()){
                return false
            }

            setPortrait(screen.height >= screen.width)
        })

        return () => {
            dimensionsListener.remove()

            if(Platform.OS == "ios"){
                setStatusBarStyle(darkMode)
                setTimeout(() => setStatusBarStyle(darkMode), 500)
                setTimeout(() => setStatusBarStyle(darkMode), 1000)
            }

            if(Platform.OS == "android"){
                showNavigationBar()

                StatusBar.setHidden(false)
            }
        }
    }, [])

    const renderImage = useCallback((item, index) => {
        const image = item

        if(typeof image.thumbnail !== "string"){
            return (
                <View
                    key={image.uuid}
                    style={{
                        width: screenDimensions.width,
                        height: screenDimensions.height
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
                contentWidth={screenDimensions.width}
                contentHeight={screenDimensions.height}
                style={{
                    width: screenDimensions.width,
                    height: screenDimensions.height
                }}
                onZoomBefore={(e, state, view) => {
                    setIsZooming(view.zoomLevel > 1)
                    
                    zoomLevel.current = view.zoomLevel
                }}
                onZoomAfter={(e, state, view) => {
                    setIsZooming(view.zoomLevel > 1)
                    
                    zoomLevel.current = view.zoomLevel

                    if(view.zoomLevel <= 1.05){
                        listRef?.current?.scrollToIndex({
                            animated: false,
                            index
                        })

                        thumbnailListRef?.current?.scrollToIndex({
                            animated: false,
                            index,
                            viewPosition: 0.5
                        })
                    }
                }}
                onShiftingBefore={(e, state, view) => {
                    setIsZooming(view.zoomLevel > 1)
                    
                    zoomLevel.current = view.zoomLevel
                }}
                onShiftingAfter={(e, state, view) => {
                    setIsZooming(view.zoomLevel > 1)

                    if((view.distanceTop >= 50 || view.distanceBottom >= 50) && !didNavBack.current && zoomLevel.current <= 1 && !isSwiping && !isZooming){
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
                            if(zoomLevel.current >= 1.01){
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
                                width: screenDimensions.width,
                                height: screenDimensions.height
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
                                            width: screenDimensions.width,
                                            height: screenDimensions.height
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

        return (
            <View
                style={{
                    width: 30,
                    height: 50
                }}
            >
                <TouchableOpacity
                    key={image.uuid}
                    style={{
                        width: 30,
                        height: 50,
                        backgroundColor: "transparent",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        alignItems: "center"
                    }}
                    onPress={async () => {
                        try{
                            await viewRefs[imagePreviewModalItems[currentIndex].uuid]?.zoomTo(1)
                        }
                        catch(e){
                            console.log(e)
                        }

                        setListScrollAgain.current = true

                        thumbnailListRef?.current?.scrollToIndex({
                            animated: false,
                            index,
                            viewPosition: 0.5
                        })

                        listRef?.current?.scrollToOffset({
                            animated: false,
                            offset: screenDimensions.width * index + 1
                        })

                        loadImage(imagePreviewModalItems[index], index)
                    }}
                >
                    {
                        typeof image.thumbnail !== "string" ? (
                            <Image
                                source={getImageForItem(image.file)}
                                resizeMode="cover"
                                style={{
                                    width: 25,
                                    height: 35,
                                    marginTop: 2.5,
                                    marginLeft: 2.5
                                }}
                            />
                        ) : (
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
                        )
                    }
                    <View style={{
                        backgroundColor: currentIndex == index ? "gray" : "transparent",
                        width: 15,
                        height: 5,
                        borderRadius: 20
                    }}></View>
                </TouchableOpacity>
            </View>
        )
    })

    return (
        <View style={{
            backgroundColor: "black",
            height: screenDimensions.height,
            width: screenDimensions.width,
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            right: 0
        }}>
            <View style={{
                opacity: showControls ? 0 : 1,
                flexDirection: "row",
                height: "auto",
                width: screenDimensions.width,
                justifyContent: "space-between",
                alignItems: "center",
                position: "absolute",
                top: 0,
                zIndex: showControls ? 0 : 1000,
                backgroundColor: "rgba(0, 0, 0, 0.6)",
                paddingLeft: 10,
                paddingRight: 15,
                paddingTop: Platform.OS == "android" ? (insets.top + 5) : ((!portrait ? 10 : insets.top) + 5),
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
                    }} onPress={() => {
                        imageActionsVisible.current = !imageActionsVisible.current

                        Animated.timing(                    // Animate over time
                            imageActionsContainerHeight,             // The animated value to drive, this would be a new Animated.Value(0) object.
                            {
                            toValue: imageActionsVisible.current ? 300 : 120,                   // Animate the value
                            duration: 100,                 // Make it take a while
                            useNativeDriver: false
                            }
                        ).start()
                    }}>
                        <Ionicon name="ellipsis-horizontal-sharp" size={24} color={"white"}></Ionicon>
                    </TouchableOpacity>
                </View>
            </View>
            <FlatList
                style={{
                    position: "absolute",
                    width: screenDimensions.width,
                    height: screenDimensions.height,
                    zIndex: 10
                }}
                ref={listRef}
                data={imagePreviewModalItems}
                initialScrollIndex={currentIndex}
                renderItem={({ item, index }) => {
                    return renderImage(item, index)
                }}
                key={portrait ? "portrait" : "landscape"}
                extraData={portrait ? "portrait" : "landscape"}
                keyExtractor={(item, index) => item.uuid}
                windowSize={3}
                initialNumToRender={1}
                horizontal={true}
                bounces={true}
                getItemLayout={(data, index) => ({ length: screenDimensions.width, offset: screenDimensions.width * index, index })}
                scrollEnabled={!isZooming}
                pagingEnabled={true}
                onViewableItemsChanged={onViewableItemsChangedRef?.current}
                viewabilityConfig={viewabilityConfigRef?.current}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                onScrollBeginDrag={() => setIsSwiping(true)}
                onScrollEndDrag={() => setIsSwiping(false)}
                removeClippedSubviews={false}
            />
            <Animated.View
                style={{
                    position: "absolute",
                    bottom: -30,
                    width: screenDimensions.width,
                    height: imageActionsContainerHeight,
                    zIndex: showControls ? 0 : 10000,
                    backgroundColor: "rgba(0, 0, 0, 1)",
                    paddingTop: 1,
                    paddingBottom: insets.bottom + insets.top,
                    opacity: showControls ? 0 : 1,
                    paddingBottom: insets.bottom
                }}
            >
                <FlatList
                    style={{
                        position: "absolute",
                        width: screenDimensions.width,
                        height: 120,
                        paddingTop: 3
                    }}
                    ref={thumbnailListRef}
                    data={imagePreviewModalItems}
                    renderItem={({ item, index }) => {
                        return renderThumb(item, index)
                    }}
                    getItemLayout={(data, index) => ({ length: 30, offset: 30 * index, index })}
                    keyExtractor={(item, index) => item.uuid}
                    horizontal={true}
                    scrollEnabled={true}
                    bounces={false}
                    showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}
                    removeClippedSubviews={false}
                />
                <View style={{
                    marginTop: 60,
                    borderTopColor: "gray",
                    borderTopWidth: 1,
                    opacity: 0
                }}>
                    <View style={{
                        width: "100%",
                        height: 45,
                        flexDirection: "row",
                        justifyContent: "space-between",
                        borderBottomColor: "gray",
                        borderBottomWidth: 1,
                        paddingLeft: 15,
                        paddingRight: 15
                    }}>
                        <Text style={{
                            color: "white",
                            paddingTop: 12
                        }}>
                            {i18n(lang, "publicLinkEnabled")}
                        </Text>
                        <View style={{
                            paddingTop: Platform.OS == "ios" ? 6 : 8
                        }}>

                        </View>
                    </View>
                </View>
            </Animated.View>
        </View>
    )
})

export default ImageViewerScreen