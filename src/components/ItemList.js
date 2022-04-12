import React, { useState, useRef, useCallback, useEffect, memo } from "react"
import { Text, View, FlatList, RefreshControl, ActivityIndicator, DeviceEventEmitter, TouchableOpacity, Platform } from "react-native"
import { storage } from "../lib/storage"
import { useMMKVBoolean, useMMKVString, useMMKVNumber } from "react-native-mmkv"
import { canCompressThumbnail, getFileExt, getRouteURL, calcPhotosGridSize, calcCameraUploadCurrentDate, normalizePhotosRange } from "../lib/helpers"
import { ListItem, GridItem, PhotosItem, PhotosRangeItem } from "./Item"
import { useStore, waitForStateUpdate } from "../lib/state"
import { i18n } from "../i18n/i18n"
import Ionicon from "react-native-vector-icons/Ionicons"
import { navigationAnimation } from "../lib/state"
import { StackActions } from "@react-navigation/native"
import { ListEmpty } from "./ListEmpty"
import { getFolderSizeFromCache } from "../lib/services/items"

export const ItemList = memo(({ navigation, route, items, showLoader, setItems, searchTerm, isMounted, fetchItemList, progress, setProgress, loadDone }) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const [refreshing, setRefreshing] = useState(false)
    const [itemViewMode, setItemViewMode] = useMMKVString("itemViewMode", storage)
    const dimensions = useStore(useCallback(state => state.dimensions))
    const [lang, setLang] = useMMKVString("lang", storage)
    const cameraUploadTotal = useStore(useCallback(state => state.cameraUploadTotal))
    const cameraUploadUploaded = useStore(useCallback(state => state.cameraUploadUploaded))
    const [userId, setUserId] = useMMKVNumber("userId", storage)
    const [cameraUploadEnabled, setCameraUploadEnabled] = useMMKVBoolean("cameraUploadEnabled:" + userId, storage)
    const [scrollDate, setScrollDate] = useState(typeof items == "object" && items.length > 0 ? calcCameraUploadCurrentDate(items[0].lastModified, items[items.length - 1].lastModified, lang) : "")
    const [photosGridSize, setPhotosGridSize] = useMMKVNumber("photosGridSize", storage)
    const [hideThumbnails, setHideThumbnails] = useMMKVBoolean("hideThumbnails:" + userId, storage)
    const [hideFileNames, setHideFileNames] = useMMKVBoolean("hideFileNames:" + userId, storage)
    const [hideSizes, setHideSizes] = useMMKVBoolean("hideSizes:" + userId, storage)
    const [photosRange, setPhotosRange] = useMMKVString("photosRange:" + userId, storage)
    const itemListRef = useRef()
    const [routeURL, setRouteURL] = useState(useCallback(getRouteURL(route)))
    const netInfo = useStore(useCallback(state => state.netInfo))
    const [scrollIndex, setScrollIndex] = useState(0)
    const [currentItems, setCurrentItems] = useState([])

    const generateItemsForItemList = useCallback((items, range, lang = "en") => {
        range = normalizePhotosRange(range)
    
        if(range == "all"){
            return items
        }
    
        let sortedItems = []
    
        if(range == "years"){
            const occupied = {}
    
            for(let i = 0; i < items.length; i++){
                const itemDate = new Date(items[i].lastModified * 1000)
                const itemYear = itemDate.getFullYear()
                const occKey = itemYear
    
                if(typeof occupied[occKey] == "undefined"){
                    occupied[occKey] = {
                        ...items[i],
                        title: itemYear,
                        remainingItems: 0,
                        including: []
                    }
                }
    
                occupied[occKey].remainingItems = occupied[occKey].remainingItems + 1
                occupied[occKey].including.push(items[i].uuid)
            }
    
            for(let prop in occupied){
                sortedItems.push(occupied[prop])
            }
    
            sortedItems = sortedItems.reverse()
        }
        else if(range == "months"){
            const occupied = {}
    
            for(let i = 0; i < items.length; i++){
                const itemDate = new Date(items[i].lastModified * 1000)
                const itemYear = itemDate.getFullYear()
                const itemMonth = itemDate.getMonth()
                const occKey = itemYear + ":" + itemMonth
    
                if(typeof occupied[occKey] == "undefined"){
                    occupied[occKey] = {
                        ...items[i],
                        title: i18n(lang, "month_" + itemMonth) + " " + itemYear,
                        remainingItems: 0,
                        including: []
                    }
                }
    
                occupied[occKey].remainingItems = occupied[occKey].remainingItems + 1
                occupied[occKey].including.push(items[i].uuid)
            }
    
            for(let prop in occupied){
                sortedItems.push(occupied[prop])
            }
        }
        else if(range == "days"){
            const occupied = {}
    
            for(let i = 0; i < items.length; i++){
                const itemDate = new Date(items[i].lastModified * 1000)
                const itemYear = itemDate.getFullYear()
                const itemMonth = itemDate.getMonth()
                const itemDay = itemDate.getDate()
                const occKey = itemYear + ":" + itemMonth + ":" + itemDay
    
                if(typeof occupied[occKey] == "undefined"){
                    occupied[occKey] = {
                        ...items[i],
                        title: itemDay + ". " + i18n(lang, "monthShort_" + itemMonth) + " " + itemYear,
                        remainingItems: 0,
                        including: []
                    }
                }
    
                occupied[occKey].remainingItems = occupied[occKey].remainingItems + 1
                occupied[occKey].including.push(items[i].uuid)
            }
    
            for(let prop in occupied){
                sortedItems.push(occupied[prop])
            }
        }
        
        return sortedItems
    }, [items, photosRange, lang])

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

    const onViewableItemsChangedRef = useRef(useCallback(({ viewableItems }) => {
        if(typeof viewableItems[0] == "object"){
            if(typeof viewableItems[0].index == "number"){
                setScrollIndex(viewableItems[0].index >= 0 ? viewableItems[0].index : 0)
            }
        }

        const visible = {}

        for(let i = 0; i < viewableItems.length; i++){
            let item = viewableItems[i].item

            visible[item.uuid] = true
            global.visibleItems[item.uuid] = true

            getThumbnail({ item })
            
            if(item.type == "folder"){
                getFolderSizeFromCache({ folder: item, routeURL })
            }
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

    const photosRangeItemClick = useCallback((item) => {
        const currentRangeSelection = normalizePhotosRange(photosRange)
        let nextRangeSelection = "all"

        if(currentRangeSelection == "years"){
            nextRangeSelection = "months"
        }
        else if(currentRangeSelection == "months"){
            nextRangeSelection = "days"
        }
        else if(currentRangeSelection == "days"){
            nextRangeSelection = "all"
        }
        else{
            nextRangeSelection = "all"
        }

        const itemsForIndexLoop = generateItemsForItemList(items, nextRangeSelection, lang)
        let scrollToIndex = 0

        for(let i = 0; i < itemsForIndexLoop.length; i++){
            if(nextRangeSelection == "all"){
                if(itemsForIndexLoop[i].uuid == item.uuid){
                    scrollToIndex = i
                }
            }
            else{
                if(itemsForIndexLoop[i].including.includes(item.uuid)){
                    scrollToIndex = i
                }
            }
        }

        setScrollIndex(scrollToIndex >= 0 && scrollToIndex <= itemsForIndexLoop.length ? scrollToIndex : 0)
        setPhotosRange(nextRangeSelection)
    })

    const getInitialScrollInex = useCallback(() => {
        const range = normalizePhotosRange(photosRange)
        const gridSize = calcPhotosGridSize(photosGridSize)
        const viewMode = routeURL.indexOf("photos") !== -1 ? "photos" : itemViewMode
        const itemsLength = currentItems.length > 0 ? currentItems.length : items.length

        if(viewMode == "list"){
            return scrollIndex >= 0 && scrollIndex <= itemsLength ? scrollIndex : 0
        }

        if(range == "all"){
            const calcedIndex = Math.floor(scrollIndex / gridSize)

            return calcedIndex >= 0 && calcedIndex <= itemsLength ? calcedIndex : 0
        }
        else{
            return scrollIndex >= 0 && scrollIndex <= itemsLength ? scrollIndex : 0
        }
    })

    const renderItem = useCallback(({ item, index, viewMode }) => {
        if(viewMode == "photos"){
            if(normalizePhotosRange(photosRange) !== "all"){
                return (
                    <PhotosRangeItem item={item} index={index} darkMode={darkMode} selected={item.selected} thumbnail={item.thumbnail} name={item.name} size={item.size} color={item.color} favorited={item.favorited} offline={item.offline} photosGridSize={photosGridSize} hideFileNames={hideFileNames} hideThumbnails={hideThumbnails} lang={lang} dimensions={dimensions} hideSizes={hideSizes} photosRange={normalizePhotosRange(photosRange)} photosRangeItemClick={photosRangeItemClick} />
                )
            }

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
        setCurrentItems(generateItemsForItemList(items, normalizePhotosRange(photosRange), lang))
    }, [items, photosRange, lang])

    useEffect(() => {
        if(items.length > 0){
            const max = 32

            for(let i = 0; i < items.length; i++){
                if(i < max){
                    global.visibleItems[items[i].uuid] = true

                    getThumbnail({ item: items[i] })
                }
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
                            //borderBottomWidth: items.length > 0 ? 0 : 1,
                            borderBottomWidth: 0,
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
                                            cameraUploadTotal > 0 ? cameraUploadTotal > cameraUploadUploaded ? (
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
                                            ) : (
                                                <>
                                                    <ActivityIndicator color={darkMode ? "white" : "black"} size="small" />
                                                    <Text style={{
                                                        marginLeft: 10,
                                                        color: "gray",
                                                        paddingTop: Platform.OS == "ios" ? 2 : 1
                                                    }}>
                                                        {i18n(lang, "cameraUploadFetchingAssetsFromLocal")}
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
                                        {
                                            netInfo.isConnected && netInfo.isInternetReachable && (
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
                                            )
                                        }
                                    </View>
                                )
                            }
                        </View>
                        {
                            scrollDate.length > 0 && items.length > 0 && normalizePhotosRange(photosRange) == "all" && (
                                <View style={{
                                    backgroundColor: darkMode ? "rgba(34, 34, 34, 0.6)" : "rgba(128, 128, 128, 0.6)",
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
                                <>
                                    {
                                        normalizePhotosRange(photosRange) == "all" && (
                                            <View style={{
                                                backgroundColor: darkMode ? "rgba(34, 34, 34, 0.6)" : "rgba(128, 128, 128, 0.6)",
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
                    
                                                    if(photosGridSize >= 10){
                                                        gridSize = 10
                                                    }
                                                    else{
                                                        gridSize = gridSize + 1
                                                    }
                    
                                                    setPhotosGridSize(gridSize)
                                                }}>
                                                    <Ionicon name="remove-outline" size={24} color={photosGridSize >= 10 ? "gray" : "white"} />
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
                    
                                                    if(photosGridSize <= 1){
                                                        gridSize = 1
                                                    }
                                                    else{
                                                        gridSize = gridSize - 1
                                                    }
                    
                                                    setPhotosGridSize(gridSize)
                                                }}>
                                                    <Ionicon name="add-outline" size={24} color={photosGridSize <= 1 ? "gray" : "white"} />
                                                </TouchableOpacity>
                                            </View>
                                        )
                                    }
                                    <View style={{
                                        backgroundColor: darkMode ? "rgba(34, 34, 34, 0.7)" : "rgba(128, 128, 128, 0.8)",
                                        width: "auto",
                                        height: "auto",
                                        borderRadius: 15,
                                        position: "absolute",
                                        zIndex: 100,
                                        alignSelf: "center",
                                        flexDirection: "row",
                                        bottom: 10,
                                        paddingTop: 3,
                                        paddingBottom: 3,
                                        paddingLeft: 3,
                                        paddingRight: 3
                                    }}>
                                        {
                                            ["years", "months", "days", "all"].map((key, index) => {
                                                return (
                                                    <TouchableOpacity key={index} style={{
                                                        backgroundColor: normalizePhotosRange(photosRange) == key ? darkMode ? "gray" : "darkgray" : "transparent",
                                                        width: "auto",
                                                        height: "auto",
                                                        paddingTop: 5,
                                                        paddingBottom: 5,
                                                        paddingLeft: 10,
                                                        paddingRight: 10,
                                                        borderRadius: 15,
                                                        marginLeft: index == 0 ? 0 : 10
                                                    }} onPress={() => {
                                                        DeviceEventEmitter.emit("event", {
                                                            type: "unselect-all-items"
                                                        })

                                                        setScrollIndex(0)
                                                        setPhotosRange(key)
                                                    }}>
                                                        <Text style={{
                                                            color: "white"
                                                        }}>
                                                            {i18n(lang, "photosRange_" + key)}
                                                        </Text>
                                                    </TouchableOpacity>
                                                )
                                            })
                                        }
                                    </View>
                                </>
                            )
                        }
                    </>
                )
            }
            <FlatList
                data={generateItemsForItemList(items, normalizePhotosRange(photosRange), lang)}
                key={routeURL.indexOf("photos") !== -1 ? "photos:" + (normalizePhotosRange(photosRange) == "all" ? calcPhotosGridSize(photosGridSize) : normalizePhotosRange(photosRange)) : itemViewMode == "grid" ? "grid" : "list"}
                renderItem={({ item, index }) => {
                    return renderItem({ item, index, viewMode: routeURL.indexOf("photos") !== -1 ? "photos" : itemViewMode })
                }}
                keyExtractor={(item, index) => index.toString()}
                windowSize={8}
                initialNumToRender={32}
                ref={itemListRef}
                removeClippedSubviews={true}
                initialScrollIndex={(currentItems.length > 0 ? currentItems.length : generateItemsForItemList(items, normalizePhotosRange(photosRange), lang).length) > 0 ? getInitialScrollInex() : undefined}
                numColumns={routeURL.indexOf("photos") !== -1 ? (normalizePhotosRange(photosRange) == "all" ? calcPhotosGridSize(photosGridSize) : 1) : itemViewMode == "grid" ? 2 : 1}
                getItemLayout={(data, index) => ({ length: (routeURL.indexOf("photos") !== -1 ? (photosRange == "all" ? (Math.floor(dimensions.window.width / calcPhotosGridSize(photosGridSize))) : (Math.floor(dimensions.window.width - 5))) : (itemViewMode == "grid" ? (Math.floor(dimensions.window.width / 2) - 19 + 40) : (55))), offset: (routeURL.indexOf("photos") !== -1 ? (photosRange == "all" ? (Math.floor(dimensions.window.width / calcPhotosGridSize(photosGridSize))) : (Math.floor(dimensions.window.width - 5))) : (itemViewMode == "grid" ? (Math.floor(dimensions.window.width / 2) - 19 + 40) : (55))) * index, index })}
                ListEmptyComponent={() => {
                    return (
                        <View style={{
                            width: "100%",
                            height: Math.floor(dimensions.screen.height - 250),
                            justifyContent: "center",
                            alignItems: "center",
                            alignContent: "center"
                        }}>
                            {
                                !loadDone ? (
                                    <View>
                                        <ActivityIndicator color={darkMode ? "white" : "black"} size="small" />
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
                                try{
                                    await new Promise((resolve) => setTimeout(resolve, 500))
                                    await fetchItemList({ bypassCache: true, callStack: 1 })
                                }
                                catch(e){
                                    console.log(e)
                                }

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
})