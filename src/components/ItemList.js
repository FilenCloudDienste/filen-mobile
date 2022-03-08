import React, { useState, useRef, useCallback, useEffect } from "react"
import { Text, View, FlatList, RefreshControl, ActivityIndicator, DeviceEventEmitter, TouchableOpacity, Platform } from "react-native"
import { storage } from "../lib/storage"
import { useMMKVBoolean, useMMKVString, useMMKVNumber } from "react-native-mmkv"
import { canCompressThumbnail, getFileExt, getParent, getRouteURL, calcPhotosGridSize, calcCameraUploadCurrentDate } from "../lib/helpers"
import { ListItem, GridItem, PhotosItem } from "./Item"
import { useStore } from "../lib/state"
import { i18n } from "../i18n/i18n"
import Ionicon from "react-native-vector-icons/Ionicons"
import { navigationAnimation } from "../lib/state"
import { StackActions } from "@react-navigation/native"
import { ListEmpty } from "./ListEmpty"

export const ItemList = ({ navigation, route, items, showLoader, setItems, searchTerm, isMounted, fetchItemList, progress, setProgress, loadDone }) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const [refreshing, setRefreshing] = useState(false)
    const [itemViewMode, setItemViewMode] = useMMKVString("itemViewMode", storage)
    const dimensions = useStore(state => state.dimensions)
    const [lang, setLang] = useMMKVString("lang", storage)
    const cameraUploadTotal = useStore(state => state.cameraUploadTotal)
    const cameraUploadUploaded = useStore(state => state.cameraUploadUploaded)
    const [email, setEmail] = useMMKVString("email", storage)
    const [cameraUploadEnabled, setCameraUploadEnabled] = useMMKVBoolean("cameraUploadEnabled:" + email, storage)
    const [scrollDate, setScrollDate] = useState("")
    const [photosGridSize, setPhotosGridSize] = useMMKVNumber("photosGridSize", storage)
    const [hideThumbnails, setHideThumbnails] = useMMKVBoolean("hideThumbnails:" + email, storage)
    const [hideFileNames, setHideFileNames] = useMMKVBoolean("hideFileNames:" + email, storage)
    const [hideSizes, setHideSizes] = useMMKVBoolean("hideSizes:" + email, storage)

    const parent = getParent(route)
    const routeURL = getRouteURL(route)

    const getThumbnail = useCallback(({ item }) => {
        if(item.type == "file"){
            if(canCompressThumbnail(getFileExt(item.name)) && typeof item.thumbnail !== "string"){
                DeviceEventEmitter.emit("event", {
                    type: "generate-thumbnail",
                    item
                })
            }
        }
    })

    const onViewableItemsChangedRef = useRef(useCallback(({ viewableItems }) => {
        const visible = {}

        for(let i = 0; i < viewableItems.length; i++){
            let item = viewableItems[i].item

            getThumbnail({ item })

            visible[item.uuid] = true
            global.visibleItems[item.uuid] = true
        }

        if(typeof viewableItems[0] == "object" && typeof viewableItems[viewableItems.length - 1] == "object" && routeURL.indexOf("photos") !== -1){
            setScrollDate(calcCameraUploadCurrentDate(viewableItems[0].item.lastModified, viewableItems[viewableItems.length - 1].item.lastModified, lang))
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

    const viewabilityConfigRef = useRef({
        minimumViewTime: 0,
        viewAreaCoveragePercentThreshold: 0
    })

    const renderItem = useCallback(({ item, index, viewMode }) => {
        if(viewMode == "photos"){
            return (
                <PhotosItem item={item} index={index} darkMode={darkMode} selected={item.selected} thumbnail={item.thumbnail} name={item.name} size={item.size} color={item.color} favorited={item.favorited} offline={item.offline} photosGridSize={photosGridSize} hideFileNames={hideFileNames} hideThumbnails={hideThumbnails} lang={lang} dimensions={dimensions} hideSizes={hideSizes} />
            )
        }

        if(viewMode == "grid"){
            return (
                <GridItem item={item} index={index} darkMode={darkMode} selected={item.selected} thumbnail={item.thumbnail} name={item.name} size={item.size} color={item.color} favorited={item.favorited} offline={item.offline} hideFileNames={hideFileNames} hideThumbnails={hideThumbnails} lang={lang} dimensions={dimensions} hideSizes={hideSizes} />
            )
        }

        return (
            <ListItem item={item} index={index} darkMode={darkMode} selected={item.selected} thumbnail={item.thumbnail} name={item.name} size={item.size} color={item.color} favorited={item.favorited} offline={item.offline} hideFileNames={hideFileNames} hideThumbnails={hideThumbnails} lang={lang} dimensions={dimensions} hideSizes={hideSizes} />
        )
    })

    useEffect(() => {
        const max = 32

        for(let i = 0; i < items.length; i++){
            if(i < max){
                getThumbnail({ item: items[i] })
            }
        }
    }, [items, itemViewMode])

    useEffect(() => {
        if(calcPhotosGridSize(photosGridSize) >= 6){
            DeviceEventEmitter.emit("event", {
                type: "unselect-all-items"
            })
        }
    }, [photosGridSize])

    return (
        <View style={{
            width: "100%",
            height: "100%",
            paddingLeft: itemViewMode == "grid" && routeURL.indexOf("photos") == -1 ? 15 : 0,
            paddingRight: itemViewMode == "grid" && routeURL.indexOf("photos") == -1 ? 15 : 0
        }}>
            {
                routeURL.indexOf("photos") !== -1 && (
                    <>
                        <View style={{
                            paddingBottom: 10,
                            paddingTop: 5,
                            borderBottomColor: darkMode ? "#111111" : "gray",
                            borderBottomWidth: items.length > 0 ? 0 : 1,
                            marginBottom: 3,
                            height: 35
                        }}>
                            {
                                cameraUploadEnabled ? (
                                    <View style={{
                                        flexDirection: "row",
                                        justifyContent: "flex-start",
                                        paddingLeft: 15,
                                        paddingRight: 15
                                    }}>
                                        {
                                            cameraUploadTotal > cameraUploadUploaded ? (
                                                <>
                                                    <ActivityIndicator color={darkMode ? "white" : "black"} size="small" />
                                                    <Text style={{
                                                        marginLeft: 10,
                                                        color: "gray",
                                                        paddingTop: Platform.OS == "ios" ? 2 : 1
                                                    }}>
                                                        {i18n(lang, "cameraUploadProgress", true, ["__TOTAL__", "__UPLOADED__"], [cameraUploadTotal, cameraUploadUploaded])}
                                                    </Text>
                                                </>
                                            ) : (
                                                <>
                                                    <Ionicon name="checkmark-done-circle-outline" size={20} color="green" />
                                                    <Text style={{
                                                        marginLeft: 10,
                                                        color: "gray",
                                                        paddingTop: Platform.OS == "ios" ? 2 : 1
                                                    }}>
                                                        {i18n(lang, "cameraUploadEverythingUploaded")}
                                                    </Text>
                                                </>
                                            )
                                        }
                                    </View>
                                ) : (
                                    <View style={{
                                        flexDirection: "row",
                                        justifyContent: "space-between",
                                        paddingLeft: 5,
                                        paddingRight: 15
                                    }}>
                                        <Text style={{
                                            marginLeft: 10,
                                            color: "gray"
                                        }}>
                                            {i18n(lang, "cameraUploadNotEnabled")}
                                        </Text>
                                        <TouchableOpacity onPress={() => {
                                            navigationAnimation({ enable: true }).then(() => {
                                                navigation.dispatch(StackActions.push("CameraUploadScreen"))
                                            })
                                        }}>
                                            <Text style={{
                                                color: "#0A84FF",
                                                fontWeight: "bold"
                                            }}>
                                                {i18n(lang, "enable")}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )
                            }
                        </View>
                        {
                            scrollDate.length > 0 && items.length > 0 && (
                                <View style={{
                                    backgroundColor: "rgba(34, 34, 34, 0.6)",
                                    width: "auto",
                                    height: "auto",
                                    borderRadius: 15,
                                    position: "absolute",
                                    marginTop: 50,
                                    marginLeft: 15,
                                    zIndex: 100,
                                    paddingTop: 5,
                                    paddingBottom: 5,
                                    paddingLeft: 8,
                                    paddingRight: 8
                                }} pointerEvents="box-none">
                                    <Text style={{
                                        color: "white",
                                        fontSize: 15
                                    }}>{scrollDate}</Text>
                                </View>
                            )
                        }
                        {
                            items.length > 0 && (
                                <View style={{
                                    backgroundColor: "rgba(34, 34, 34, 0.6)",
                                    width: "auto",
                                    height: "auto",
                                    borderRadius: 15,
                                    position: "absolute",
                                    marginTop: 50,
                                    zIndex: 100,
                                    paddingTop: 5,
                                    paddingBottom: 5,
                                    paddingLeft: 8,
                                    paddingRight: 8,
                                    right: 15,
                                    flexDirection: "row"
                                }}>
                                    <TouchableOpacity onPress={() => {
                                        let gridSize = calcPhotosGridSize(photosGridSize)
        
                                        if(photosGridSize >= 16){
                                            gridSize = 16
                                        }
                                        else{
                                            gridSize = gridSize + 1
                                        }
        
                                        setPhotosGridSize(gridSize)
                                    }}>
                                        <Ionicon name="remove-outline" size={24} color={photosGridSize >= 16 ? "gray" : "white"} />
                                    </TouchableOpacity>
                                    <Text style={{
                                        color: "gray",
                                        fontSize: 17,
                                        marginLeft: 5
                                    }}>|</Text>
                                    <TouchableOpacity style={{
                                        marginLeft: 6
                                    }} onPress={() => {
                                        let gridSize = calcPhotosGridSize(photosGridSize)
        
                                        if(photosGridSize <= 2){
                                            gridSize = 2
                                        }
                                        else{
                                            gridSize = gridSize - 1
                                        }
        
                                        setPhotosGridSize(gridSize)
                                    }}>
                                        <Ionicon name="add-outline" size={24} color={photosGridSize <= 2 ? "gray" : "white"} />
                                    </TouchableOpacity>
                                </View>
                            )
                        }
                    </>
                )
            }
            <FlatList
                data={items}
                key={routeURL.indexOf("photos") !== -1 ? "photos:" + calcPhotosGridSize(photosGridSize) : itemViewMode == "grid" ? "grid" : "list"}
                renderItem={({ item, index }) => {
                    return renderItem({ item, index, viewMode: routeURL.indexOf("photos") !== -1 ? "photos" : itemViewMode })
                }}
                keyExtractor={(item, index) => index.toString()}
                windowSize={8}
                initialNumToRender={32}
                removeClippedSubviews={true}
                numColumns={routeURL.indexOf("photos") !== -1 ? calcPhotosGridSize(photosGridSize) : itemViewMode == "grid" ? 2 : 1}
                ListEmptyComponent={() => {
                    return (
                        <View style={{
                            width: "100%",
                            height: Math.floor(dimensions.screen.height - 255),
                            justifyContent: "center",
                            alignItems: "center",
                            alignContent: "center"
                        }}>
                            {
                                !loadDone ? (
                                    <View>
                                        <ActivityIndicator color={darkMode ? "white" : "black"} size="small" />
                                        <Text style={{
                                            color: darkMode ? "white" : "black",
                                            marginTop: 15
                                        }}>
                                            {i18n(lang, "loadingItemList")}
                                        </Text>
                                    </View>
                                ) : (
                                    <ListEmpty route={route} searchTerm={searchTerm} />
                                )
                            }
                        </View>
                    )
                }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={async () => {
                            if(!loadDone){
                                return false
                            }

                            setRefreshing(true)
        
                            if(typeof fetchItemList == "function"){
                                await new Promise((resolve) => setTimeout(resolve, 500))
                                await fetchItemList({ bypassCache: true, callStack: 1 })

                                setRefreshing(false)
                            }
                        }}
                        tintColor={darkMode ? "white" : "black"}
                        size="default"
                    />
                }
                style={{
                    height: "100%",
                    width: "100%"
                }}
                onViewableItemsChanged={onViewableItemsChangedRef.current}
                viewabilityConfig={viewabilityConfigRef.current}
            />
        </View>
    )
}