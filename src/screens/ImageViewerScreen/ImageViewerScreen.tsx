import React, { memo, useEffect, useState, useRef, useCallback } from "react"
import { ActivityIndicator, Text, View, TouchableOpacity, Platform, FlatList, ImageBackground, Animated, Pressable, ScaledSize, useWindowDimensions, Image } from "react-native"
import { useStore } from "../../lib/state"
import Ionicon from "@expo/vector-icons/Ionicons"
import ReactNativeZoomableView from "@dudigital/react-native-zoomable-view/src/ReactNativeZoomableView"
import { downloadFile } from "../../lib/services/download/download"
import { navigationAnimation } from "../../lib/state"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useMountedState } from "react-use"
import { generateItemThumbnail, convertHeic } from "../../lib/services/items"
import { getImageForItem } from "../../assets/thumbnails"
import type { NavigationContainerRef } from "@react-navigation/native"
import type { EdgeInsets } from "react-native-safe-area-context"
import { showToast } from "../../components/Toasts"
import { getFileExt, isBetween } from "../../lib/helpers"
import { THUMBNAIL_BASE_PATH } from "../../lib/constants"

const minZoom: number = 0.99999999999

export interface ImageViewerScreenProps {
    navigation: NavigationContainerRef<{}>,
    route: any
}

const ImageViewerScreen = memo(({ navigation, route }: ImageViewerScreenProps) => {
    const [imagePreviewModalItems, setImagePreviewModalItems] = useState<any[]>(route?.params?.items || [])
    const [imagePreviewModalIndex, setImagePreviewModalIndex] = useState<number>(route?.params?.index || 0)
    const setCurrentActionSheetItem = useStore(state => state.setCurrentActionSheetItem)
    const [images, setImages] = useState<any>({})
    const [currentName, setCurrentName] = useState<string>("")
    const [isZooming, setIsZooming] = useState<boolean>(false)
    const [isSwiping, setIsSwiping] = useState<boolean>(false)
    const zoomLevel = useRef<number>(minZoom)
    const thumbnailListRef = useRef<any>()
    const listRef = useRef<any>()
    const [currentIndex, setCurrentIndex] = useState<number>(imagePreviewModalIndex)
    const [showControls, setShowControls] = useState<boolean>(false)
    const insets: EdgeInsets = useSafeAreaInsets()
    const viewRefs = useRef<any>({}).current
    const isMounted: () => boolean = useMountedState()
    const tapCount = useRef<number>(0)
    const tapTimer = useRef<any>(undefined)
    const didNavBack = useRef<boolean>(false)
    const currentImagePreviewDownloads = useRef<any>({}).current
    const setListScrollAgain = useRef<boolean>(false)
    const imageActionsContainerHeight: Animated.Value = new Animated.Value(120)
    const imageActionsVisible = useRef<boolean>(false)
    const dimensions: ScaledSize = useWindowDimensions()
    const [portrait, setPortrait] = useState<boolean>(dimensions.height >= dimensions.width)

    const loadImage = (image: any, index: number) => {
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

        downloadFile(image.file, false, true).then((path) => {
            delete currentImagePreviewDownloads[image.uuid]

            if(!isMounted()){
                return false
            }

            generateItemThumbnail({
                item: image.file,
                skipInViewCheck: true,
                callback: (err: any, thumbPath: string) => {
                    if(!isMounted()){
                        return false
                    }

                    if(!err && typeof thumbPath == "string"){
                        updateItemThumbnail(image.file, thumbPath)
                    }

                    if(Platform.OS == "android" && ["heic"].includes(getFileExt(image.file.name))){
                        convertHeic(image.file, path).then((output) => {
                            return setImages((prev: any) => ({
                                ...prev,
                                [image.uuid]: output
                            }))
                        }).catch((err) => {
                            delete currentImagePreviewDownloads[image.uuid]
                
                            console.log(err)
                
                            return showToast({ message: err.toString() })
                        })
                    }
                    else{
                        return setImages((prev: any) => ({
                            ...prev,
                            [image.uuid]: path
                        }))
                    }
                }
            })
        }).catch((err) => {
            delete currentImagePreviewDownloads[image.uuid]

            console.log(err)

            return showToast({ message: err.toString() })
        })
    }

    const onViewableItemsChangedRef = useRef(({ viewableItems }: { viewableItems: any }): void => {
        const indexItem = viewableItems[viewableItems.length - 1]

        if(typeof indexItem !== "object"){
            return
        }

        if(typeof indexItem.item !== "object"){
            return
        }

        loadImage(indexItem.item, indexItem.index)
    })

    const updateItemThumbnail = useCallback((item: any, path: string): void => {
        if(typeof path !== "string"){
            return
        }

        if(path.length < 4){
            return
        }
    
        if(isMounted()){
            setImagePreviewModalItems(prev => [...prev.map(mapItem => mapItem.file.uuid == item.uuid && typeof mapItem.thumbnail == "undefined" ? {...mapItem, thumbnail: item.uuid + ".jpg" } : mapItem)])
        }
    }, [setImagePreviewModalItems])

    const viewabilityConfigRef = useRef({
        minimumViewTime: 0,
        viewAreaCoveragePercentThreshold: 95,
        waitForInteraction: false
    })

    useEffect(() => {
        if(isMounted()){
            setPortrait(dimensions.height >= dimensions.width)
        }
    }, [dimensions])

    useEffect(() => {
        if(isMounted()){
            setShowControls(isZooming)
        }
    }, [isZooming])

    useEffect(() => {
        if(imagePreviewModalItems.length == 0){
            return navigation.goBack()
        }

        if(typeof imagePreviewModalItems[imagePreviewModalIndex] !== "undefined"){
            setTimeout(() => {
                loadImage(imagePreviewModalItems[imagePreviewModalIndex], imagePreviewModalIndex)
            }, 50)
        }
    }, [])

    const renderImage = useCallback((item: any, index: number) => {
        const image = item

        if(typeof image.thumbnail !== "string"){
            return (
                <View
                    key={image.uuid}
                    style={{
                        width: dimensions.width,
                        height: dimensions.height
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
                ref={(ref: any) => viewRefs[image.uuid] = ref}
                maxZoom={3}
                minZoom={minZoom}
                zoomStep={2}
                initialZoom={minZoom}
                bindToBorders={true}
                contentWidth={dimensions.width}
                contentHeight={dimensions.height}
                style={{
                    width: dimensions.width,
                    height: dimensions.height
                }}
                onZoomBefore={(e: any, state: any, view: any) => {
                    setIsZooming(view.zoomLevel > 1)
                    
                    zoomLevel.current = view.zoomLevel
                }}
                onZoomAfter={(e: any, state: any, view: any) => {
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
                onShiftingBefore={(e: any, state: any, view: any) => {
                    setIsZooming(view.zoomLevel > 1)
                    
                    zoomLevel.current = view.zoomLevel
                }}
                onShiftingAfter={(e: any, state: any, view: any) => {
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
                                width: dimensions.width,
                                height: dimensions.height
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
                                            width: dimensions.width,
                                            height: dimensions.height
                                        }}
                                    />
                                )
                            }
                        </ImageBackground>
                        {
                            typeof images[image.uuid] !== "string" && (
                                <ActivityIndicator
                                    size="small"
                                    color={"white"}
                                    style={{
                                        margin: "auto",
                                        position: "absolute",
                                        top: 0,
                                        left: 0,
                                        bottom: 0,
                                        right: 0
                                    }}
                                />
                            )
                        }
                    </>
                </Pressable>
            </ReactNativeZoomableView>
        )
    }, [dimensions, images, THUMBNAIL_BASE_PATH, zoomLevel.current, viewRefs, tapCount.current, didNavBack.current, navigation, thumbnailListRef.current, listRef.current, setIsZooming, minZoom])

    const renderThumb = useCallback((item: any, index: number) => {
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
                            offset: dimensions.width * index + 1
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
                    <View
                        style={{
                            backgroundColor: currentIndex == index ? "gray" : "transparent",
                            width: 15,
                            height: 5,
                            borderRadius: 20
                        }}
                    />
                </TouchableOpacity>
            </View>
        )
    }, [THUMBNAIL_BASE_PATH, imagePreviewModalItems, setListScrollAgain.current, thumbnailListRef.current, listRef.current, viewRefs, currentIndex])

    return (
        <View
            style={{
                backgroundColor: "black",
                height: dimensions.height,
                width: dimensions.width
            }}
        >
            <View
                style={{
                    opacity: showControls ? 0 : 1,
                    flexDirection: "row",
                    height: "auto",
                    width: dimensions.width,
                    justifyContent: "space-between",
                    alignItems: "center",
                    position: "absolute",
                    top: 0,
                    zIndex: showControls ? 0 : 1000,
                    backgroundColor: "rgba(0, 0, 0, 0.6)",
                    paddingLeft: 10,
                    paddingRight: 15,
                    paddingTop: 10,
                    paddingBottom: 10,
                    marginTop: 0
                }}
            >
                <View
                    style={{
                        flexDirection: "row",
                        justifyContent: "flex-start",
                        alignItems: "center"
                    }}
                >
                    <TouchableOpacity
                        style={{
                            flexDirection: "row",
                            justifyContent: "flex-start",
                            alignItems: "center"
                        }}
                        hitSlop={{
                            top: 10,
                            left: 10,
                            bottom: 10,
                            right: 10
                        }}
                        onPress={() => navigationAnimation({ enable: true }).then(() => navigation.goBack())}
                    >
                        <Ionicon
                            name="chevron-back-outline"
                            size={28}
                            color="white"
                        />
                        <Text
                            numberOfLines={1}
                            style={{
                                color: "white",
                                fontWeight: "400",
                                width: "93%",
                                fontSize: 17,
                                flexDirection: "row",
                                justifyContent: "flex-start",
                                alignItems: "center"
                            }}
                        >
                            {currentName}
                        </Text>
                    </TouchableOpacity>
                </View>
                <View
                    style={{
                        display: "none"
                    }}
                >
                    <TouchableOpacity
                        style={{
                            marginTop: Platform.OS == "android" ? 1 : 0
                        }}
                        hitSlop={{
                            top: 10,
                            left: 10,
                            bottom: 10,
                            right: 10
                        }}
                        onPress={() => {
                            imageActionsVisible.current = !imageActionsVisible.current

                            Animated.timing(imageActionsContainerHeight, {
                                toValue: imageActionsVisible.current ? 300 : 120,
                                duration: 100,
                                useNativeDriver: false
                            }).start()
                        }}
                    >
                        <Ionicon
                            name="ellipsis-horizontal-sharp"
                            size={24}
                            color="white"
                        />
                    </TouchableOpacity>
                </View>
            </View>
            <FlatList
                style={{
                    position: "absolute",
                    width: dimensions.width,
                    height: dimensions.height,
                    zIndex: 10,
                    top: 0,
                    bottom: 0,
                    left: 0,
                    right: 0,
                    marginTop: -insets.top
                }}
                ref={listRef}
                data={imagePreviewModalItems}
                initialScrollIndex={currentIndex >= 0 ? (isBetween(currentIndex, 0, imagePreviewModalItems.length) ? currentIndex : 0) : 0}
                renderItem={({ item, index }) => renderImage(item, index)}
                key={portrait ? "portrait" : "landscape"}
                extraData={portrait ? "portrait" : "landscape"}
                keyExtractor={(item) => item.uuid}
                windowSize={5}
                initialNumToRender={1}
                horizontal={true}
                bounces={true}
                getItemLayout={(_, index) => ({ length: dimensions.width, offset: dimensions.width * index, index })}
                scrollEnabled={!isZooming}
                pagingEnabled={true}
                onViewableItemsChanged={onViewableItemsChangedRef?.current}
                viewabilityConfig={viewabilityConfigRef?.current}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                onScrollBeginDrag={() => setIsSwiping(true)}
                onScrollEndDrag={() => setIsSwiping(false)}
            />
            <Animated.View
                style={{
                    position: "absolute",
                    bottom: -30,
                    width: dimensions.width,
                    height: imageActionsContainerHeight,
                    zIndex: showControls ? 0 : 10000,
                    backgroundColor: "rgba(0, 0, 0, 1)",
                    paddingTop: 1,
                    opacity: showControls ? 0 : 1,
                    paddingBottom: insets.bottom,
                    display: imagePreviewModalItems.length >= 2 ? "flex" : "none"
                }}
            />
            <FlatList
                style={{
                    height: 1000,
                    position: "absolute",
                    width: dimensions.width,
                    top: (dimensions.height - insets.bottom - 120),
                    opacity: showControls ? 0 : 1,
                    zIndex: showControls ? 0 : 10000,
                    backgroundColor: "rgba(0, 0, 0, 1)",
                    display: imagePreviewModalItems.length >= 2 ? "flex" : "none"
                }}
                ref={thumbnailListRef}
                data={imagePreviewModalItems}
                initialScrollIndex={currentIndex >= 0 ? (isBetween(currentIndex, 0, imagePreviewModalItems.length) ? currentIndex : 0) : 0}
                renderItem={({ item, index }) => renderThumb(item, index)}
                getItemLayout={(_, index) => ({ length: 30, offset: 30 * index, index })}
                keyExtractor={(item, _) => item.uuid}
                horizontal={true}
                scrollEnabled={true}
                bounces={false}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
            />
        </View>
    )
})

export default ImageViewerScreen