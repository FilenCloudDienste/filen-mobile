import React, { useState, useRef, useCallback, useEffect, memo, useMemo } from "react"
import { Text, View, FlatList, RefreshControl, ActivityIndicator, DeviceEventEmitter, TouchableOpacity, Platform, useWindowDimensions, NativeSyntheticEvent, NativeScrollEvent, FlatListProps } from "react-native"
import storage from "../../lib/storage"
import { useMMKVBoolean, useMMKVString, useMMKVNumber } from "react-native-mmkv"
import { canCompressThumbnail, getFileExt, getRouteURL, calcPhotosGridSize, calcCameraUploadCurrentDate, normalizePhotosRange, isBetween, getFilePreviewType } from "../../lib/helpers"
import { ListItem, GridItem, PhotosItem, PhotosRangeItem } from "../Item"
import { i18n } from "../../i18n"
import Ionicon from "@expo/vector-icons/Ionicons"
import { navigationAnimation } from "../../lib/state"
import { StackActions, NavigationContainerRef } from "@react-navigation/native"
import { ListEmpty } from "../ListEmpty"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import useNetworkInfo from "../../lib/services/isOnline/useNetworkInfo"
import { Item } from "../../types"
import { useStore } from "../../lib/state"
import { getColor } from "../../style"
import useDarkMode from "../../lib/hooks/useDarkMode"
import useLang from "../../lib/hooks/useLang"
import { useMountedState } from "react-use"

export interface ItemListProps {
    navigation: NavigationContainerRef<ReactNavigation.RootParamList>,
    route: any,
    items: Item[],
    searchTerm: string,
    isMounted: () => boolean,
    populateList: Function,
    loadDone: boolean
}

export const ItemList = memo(({ navigation, route, items, searchTerm, populateList, loadDone }: ItemListProps) => {
    const darkMode = useDarkMode()
    const [refreshing, setRefreshing] = useState<boolean>(false)
    const [viewMode, setViewMode] = useMMKVString("viewMode", storage)
    const dimensions = useWindowDimensions()
    const lang = useLang()
    const [cameraUploadTotal, setCameraUploadTotal] = useMMKVNumber("cameraUploadTotal", storage)
    const [cameraUploadUploaded, setCameraUploadUploaded] = useMMKVNumber("cameraUploadUploaded", storage)
    const [userId, setUserId] = useMMKVNumber("userId", storage)
    const [cameraUploadEnabled, setCameraUploadEnabled] = useMMKVBoolean("cameraUploadEnabled:" + userId, storage)
    const [scrollDate, setScrollDate] = useState<string>(Array.isArray(items) && items.length > 0 ? calcCameraUploadCurrentDate(items[0].lastModified, items[items.length - 1].lastModified, lang) : "")
    const [photosGridSize, setPhotosGridSize] = useMMKVNumber("photosGridSize", storage)
    const [hideThumbnails, setHideThumbnails] = useMMKVBoolean("hideThumbnails:" + userId, storage)
    const [hideFileNames, setHideFileNames] = useMMKVBoolean("hideFileNames:" + userId, storage)
    const [hideSizes, setHideSizes] = useMMKVBoolean("hideSizes:" + userId, storage)
    const [photosRange, setPhotosRange] = useMMKVString("photosRange:" + userId, storage)
    const itemListRef = useRef<any>()
    const [routeURL, setRouteURL] = useState<string>(getRouteURL(route))
    const [scrollIndex, setScrollIndex] = useState<number>(0)
    const [currentItems, setCurrentItems] = useState<any>([])
    const insets = useSafeAreaInsets()
    const [onlyWifiUploads, setOnlyWifiUploads] = useMMKVBoolean("onlyWifiUploads:" + userId, storage)
    const networkInfo = useNetworkInfo()
    const [portrait, setPortrait] = useState<boolean>(dimensions.height >= dimensions.width)
    const setScrolledToBottom = useStore(state => state.setScrolledToBottom)
    const isMounted = useMountedState()

    const viewModeParsed = useMemo(() => {
		if(!viewMode){
			return {}
		}

		return JSON.parse(viewMode)
	}, [viewMode])

    const itemsPerRow: number = useMemo(() => {
        return Math.round(dimensions.width / 150)
    }, [dimensions])

    const generateItemsForItemList = useCallback((items: Item[], range: string, lang: string = "en") => {
        range = normalizePhotosRange(range)
    
        if(range == "all"){
            if(routeURL.indexOf("photos") !== -1){
                return items.filter(item => {
                    if(getFilePreviewType(getFileExt(item.name)) == "video"){
                        if(typeof item.thumbnail == "string" && item.thumbnail.length > 3){
                            return true
                        }
    
                        return false
                    }
                    
                    return true
                })
            }
            
            return items
        }
    
        let sortedItems = []
    
        if(range == "years"){
            const occupied: any = {}
    
            for(let i = 0; i < items.length; i++){
                const itemDate = new Date(items[i].lastModified)
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
            const occupied: any = {}
    
            for(let i = 0; i < items.length; i++){
                const itemDate = new Date(items[i].lastModified)
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
            const occupied: any = {}
    
            for(let i = 0; i < items.length; i++){
                const itemDate = new Date(items[i].lastModified)
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
    }, [items, photosRange, lang, itemsPerRow, viewModeParsed, routeURL])

    const getThumbnail = useCallback((item: Item) => {
        if(item.type == "file"){
            if(canCompressThumbnail(getFileExt(item.name))){
                if(typeof item.thumbnail !== "string" && isMounted()){
                    DeviceEventEmitter.emit("event", {
                        type: "generate-thumbnail",
                        item
                    })
                }
            }
        }
    }, [])

    const onViewableItemsChangedRef = useRef(({ viewableItems }: { viewableItems: any }) => {
        if(typeof viewableItems[0] == "object"){
            if(typeof viewableItems[0].index == "number"){
                setScrollIndex(viewableItems[0].index >= 0 ? viewableItems[0].index : 0)
            }
        }

        const visible: { [key: string]: boolean } = {}

        for(let i = 0; i < viewableItems.length; i++){
            let item = viewableItems[i].item

            visible[item.uuid] = true
            global.visibleItems[item.uuid] = true

            getThumbnail(item)
        }

        if(typeof viewableItems[0] == "object" && typeof viewableItems[viewableItems.length - 1] == "object" && routeURL.indexOf("photos") !== -1 && isMounted()){
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
    })

    const viewabilityConfigRef = useRef({
        minimumViewTime: 0,
        viewAreaCoveragePercentThreshold: 0
    })

    const photosRangeItemClick = useCallback((item: any) => {
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

        if(!isMounted()){
            return
        }

        setScrollIndex(scrollToIndex >= 0 && scrollToIndex <= itemsForIndexLoop.length ? scrollToIndex : 0)
        setPhotosRange(nextRangeSelection)
    }, [photosRange, items, lang])

    const getInitialScrollIndex = useCallback(() => {
        const range = normalizePhotosRange(photosRange)
        const gridSize = calcPhotosGridSize(photosGridSize)
        const viewMode = routeURL.indexOf("photos") !== -1 ? "photos" : viewModeParsed[routeURL]
        const itemsLength = currentItems.length > 0 ? currentItems.length : items.length

        if(!isMounted()){
            return 0
        }

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
    }, [photosRange, photosGridSize, routeURL, currentItems, items, viewModeParsed])

    const getItemLayout = useCallback((item: FlatListProps<Item> | any, index: number) => {
        const listItemHeight: number = 60
        const gridLengthDefault: number = (Math.floor((dimensions.width - (insets.left + insets.right)) / itemsPerRow) + 55)
        const gridLength: number = item.type == "folder" ? 40 : gridLengthDefault
        const photosAllLength: number = Math.floor(dimensions.width / calcPhotosGridSize(photosGridSize))
        const photosLength: number = Math.floor((dimensions.width - (insets.left + insets.right)) - 1.5)
        const length: number = routeURL.indexOf("photos") !== -1 ? photosRange == "all" ? photosAllLength : photosLength : viewModeParsed[routeURL] == "grid" ? gridLength : listItemHeight

        return {
            length,
            offset: length * index,
            index
        }
    }, [photosRange, dimensions, photosGridSize, insets, viewModeParsed, routeURL, itemsPerRow])

    const numColumns = useMemo(() => {
        return routeURL.indexOf("photos") !== -1 ? (normalizePhotosRange(photosRange) == "all" ? calcPhotosGridSize(photosGridSize) : 1) : viewModeParsed[routeURL] == "grid" ? itemsPerRow : 1
    }, [routeURL, photosRange, photosGridSize, viewModeParsed, itemsPerRow])

    const initScrollIndex = useMemo(() => {
        return (currentItems.length > 0 ? currentItems.length : generateItemsForItemList(items, normalizePhotosRange(photosRange), lang).length) > 0 ? getInitialScrollIndex() : 0
    }, [currentItems, items, photosRange, lang])

    const listKey = useMemo(() => {
        const base = routeURL.indexOf("photos") !== -1 ? "photos:" + (normalizePhotosRange(photosRange) == "all" ? calcPhotosGridSize(photosGridSize) : normalizePhotosRange(photosRange)) : viewModeParsed[routeURL] == "grid" ? "grid-" + itemsPerRow : "list"

        return base + "-" + (portrait ? "portrait" : "landscape") + "-" + itemsPerRow
    }, [routeURL, photosRange, photosGridSize, viewModeParsed, itemsPerRow, portrait])

    const generatedItemList = useMemo<Item[]>(() => {
        return generateItemsForItemList(items, normalizePhotosRange(photosRange), lang)
    }, [items, photosRange, lang])

    const onListScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
        if(e.nativeEvent.layoutMeasurement.height > e.nativeEvent.contentSize.height){
            return
        }

        setScrolledToBottom(e.nativeEvent.layoutMeasurement.height + e.nativeEvent.contentOffset.y >= e.nativeEvent.contentSize.height - 40)
    }, [])

    const keyExtractor = useCallback((item: Item) => item.uuid, [])

    const renderItemFn = useCallback(({ item, index }: { item: Item, index: number }) => {
        return renderItem({ item, index, viewMode: routeURL.indexOf("photos") !== -1 ? "photos" : (viewModeParsed[routeURL] == "grid" ? "grid" : "list") })
    }, [photosRange, darkMode, hideFileNames, hideThumbnails, lang, dimensions, hideSizes, insets, photosGridSize, photosRangeItemClick, itemsPerRow, portrait, listKey, viewModeParsed, route])

    const renderItem = useCallback(({ item, index, viewMode }: { item: Item, index: number, viewMode: string }) => {
        if(viewMode == "photos"){
            if(normalizePhotosRange(photosRange) !== "all"){
                return (
                    <PhotosRangeItem
                        item={item} 
                        index={index} 
                        darkMode={darkMode} 
                        selected={item.selected} 
                        thumbnail={item.thumbnail as string} 
                        name={item.name} 
                        size={item.size} 
                        color={item.color} 
                        favorited={item.favorited} 
                        offline={item.offline} 
                        photosGridSize={photosGridSize} 
                        hideFileNames={hideFileNames} 
                        hideThumbnails={hideThumbnails} 
                        lang={lang}
                        hideSizes={hideSizes} 
                        photosRange={normalizePhotosRange(photosRange)} 
                        photosRangeItemClick={photosRangeItemClick} 
                        insets={insets} 
                    />
                )
            }

            return (
                <PhotosItem 
                    item={item} 
                    index={index} 
                    darkMode={darkMode} 
                    selected={item.selected} 
                    thumbnail={item.thumbnail as string} 
                    name={item.name} 
                    size={item.size} 
                    color={item.color} 
                    favorited={item.favorited} 
                    offline={item.offline} 
                    photosGridSize={photosGridSize} 
                    hideFileNames={hideFileNames} 
                    hideThumbnails={hideThumbnails} 
                    lang={lang}
                    hideSizes={hideSizes}
                    insets={insets}
                />
            )
        }

        if(viewMode == "grid"){
            return (
                <GridItem
                    item={item}
                    index={index} 
                    darkMode={darkMode} 
                    selected={item.selected} 
                    thumbnail={item.thumbnail as string} 
                    name={item.name} 
                    size={item.size} 
                    color={item.color} 
                    favorited={item.favorited}
                    offline={item.offline} 
                    hideFileNames={hideFileNames} 
                    hideThumbnails={hideThumbnails} 
                    lang={lang}
                    hideSizes={hideSizes} 
                    insets={insets}
                    itemsPerRow={itemsPerRow}
                    route={route}
                />
            )
        }

        return (
            <ListItem
                item={item}
                index={index} 
                darkMode={darkMode} 
                selected={item.selected} 
                thumbnail={item.thumbnail as string} 
                name={item.name} 
                size={item.size} 
                color={item.color} 
                favorited={item.favorited} 
                offline={item.offline} 
                hideFileNames={hideFileNames} 
                hideThumbnails={hideThumbnails} 
                lang={lang}
                hideSizes={hideSizes} 
                insets={insets}
                route={route}
            />
        )
    }, [photosRange, darkMode, hideFileNames, hideThumbnails, lang, dimensions, hideSizes, insets, photosGridSize, photosRangeItemClick, itemsPerRow, route])

    useEffect(() => {
        if(isMounted()){
            setCurrentItems(generateItemsForItemList(items, normalizePhotosRange(photosRange), lang))
        }
    }, [items, photosRange, lang, viewModeParsed, portrait])

    useEffect(() => {
        if(items.length > 0 && isMounted()){
            const max = viewModeParsed[routeURL] == "grid" ? (itemsPerRow / (Math.floor(dimensions.height / itemsPerRow) + 55) + itemsPerRow) : Math.round(dimensions.height / 60 + 1)

            for(let i = 0; i < items.length; i++){
                if(i < max){
                    global.visibleItems[items[i].uuid] = true

                    getThumbnail(items[i])
                }
            }
        }
    }, [items, viewModeParsed, dimensions, routeURL, itemsPerRow])

    useEffect(() => {
        if(calcPhotosGridSize(photosGridSize) >= 6 && isMounted()){
            DeviceEventEmitter.emit("event", {
                type: "unselect-all-items"
            })
        }
    }, [photosGridSize])

    useEffect(() => {
        if(isMounted()){
            setScrolledToBottom(false)
        }
    }, [listKey, items])

    useEffect(() => {
        if(isMounted()){
            setPortrait(dimensions.height >= dimensions.width)
            setScrolledToBottom(false)
        }
    }, [dimensions])

    return (
        <View
            style={{
                width: "100%",
                height: "100%",
                paddingLeft: viewModeParsed[routeURL] == "grid" && routeURL.indexOf("photos") == -1 ? 15 : 0,
                paddingRight: viewModeParsed[routeURL] == "grid" && routeURL.indexOf("photos") == -1 ? 15 : 0
            }}
        >
            {
                routeURL.indexOf("photos") !== -1 && (
                    <>
                        <View
                            style={{
                                paddingBottom: 10,
                                paddingTop: 5,
                                marginBottom: 3,
                                height: 35
                            }}
                        >
                            {
                                cameraUploadEnabled ? (
                                    <View
                                        style={{
                                            flexDirection: "row",
                                            justifyContent: "flex-start",
                                            paddingLeft: 15,
                                            paddingRight: 15,
                                            alignItems: "center"
                                        }}
                                    >
                                        {
                                            networkInfo.online ? onlyWifiUploads && networkInfo.wifi ? (
                                                <>
                                                    <Ionicon
                                                        name="wifi-outline"
                                                        size={20}
                                                        color={"gray"}
                                                    />
                                                    <Text
                                                        style={{
                                                            marginLeft: 10,
                                                            color: "gray",
                                                            fontSize: 14,
                                                            paddingTop: Platform.OS == "ios" ? 2 : 0
                                                        }}
                                                    >
                                                        {i18n(lang, "onlyWifiUploads")}
                                                    </Text>
                                                </>
                                            ) : cameraUploadTotal > 0 ? cameraUploadTotal > cameraUploadUploaded ? (
                                                <>
                                                    <ActivityIndicator
                                                        color={getColor(darkMode, "textPrimary")}
                                                        size="small"
                                                    />
                                                    <Text
                                                        style={{
                                                            marginLeft: 10,
                                                            color: "gray",
                                                            fontSize: 14,
                                                            paddingTop: Platform.OS == "ios" ? 2 : 0
                                                        }}
                                                    >
                                                        {i18n(lang, "cameraUploadProgress", true, ["__TOTAL__", "__UPLOADED__"], [cameraUploadTotal, cameraUploadUploaded])}
                                                    </Text>
                                                </>
                                            ) : (
                                                <>
                                                    <Ionicon
                                                        name="checkmark-done-circle-outline"
                                                        size={20}
                                                        color="green"
                                                    />
                                                    <Text
                                                        style={{
                                                            marginLeft: 10,
                                                            color: "gray",
                                                            fontSize: 14,
                                                            paddingTop: Platform.OS == "ios" ? 2 : 0
                                                        }}
                                                    >
                                                        {i18n(lang, "cameraUploadEverythingUploaded")}
                                                    </Text>
                                                </>
                                            ) : cameraUploadTotal == 0 ? (
                                                <>
                                                    <Ionicon
                                                        name="checkmark-done-circle-outline"
                                                        size={20}
                                                        color="green"
                                                    />
                                                    <Text
                                                        style={{
                                                            marginLeft: 10,
                                                            color: "gray",
                                                            fontSize: 14,
                                                            paddingTop: Platform.OS == "ios" ? 2 : 0
                                                        }}
                                                    >
                                                        {i18n(lang, "cameraUploadEverythingUploaded")}
                                                    </Text>
                                                </>
                                            ) : (
                                                <>
                                                    <ActivityIndicator
                                                        color={getColor(darkMode, "textPrimary")}
                                                        size="small"
                                                    />
                                                    <Text
                                                        style={{
                                                            marginLeft: 10,
                                                            color: "gray",
                                                            fontSize: 14,
                                                            paddingTop: Platform.OS == "ios" ? 2 : 0
                                                        }}
                                                    >
                                                        {i18n(lang, "cameraUploadFetchingAssetsFromLocal")}
                                                    </Text>
                                                </>
                                            ) : (
                                                <>
                                                    <Ionicon
                                                        name="wifi-outline"
                                                        size={20}
                                                        color={"gray"}
                                                    />
                                                    <Text
                                                        style={{
                                                            marginLeft: 10,
                                                            color: "gray",
                                                            fontSize: 14,
                                                            paddingTop: Platform.OS == "ios" ? 2 : 0
                                                        }}
                                                    >
                                                        {i18n(lang, "deviceOffline")}
                                                    </Text>
                                                </>
                                            )
                                        }
                                    </View>
                                ) : (
                                    <View
                                        style={{
                                            flexDirection: "row",
                                            justifyContent: "space-between",
                                            paddingLeft: 5,
                                            paddingRight: 15
                                        }}
                                    >
                                        <Text
                                            style={{
                                                marginLeft: 10,
                                                color: "gray"
                                            }}
                                        >
                                            {i18n(lang, "cameraUploadNotEnabled")}
                                        </Text>
                                        {
                                            networkInfo.online && (
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        navigationAnimation({ enable: true }).then(() => {
                                                            navigation.dispatch(StackActions.push("CameraUploadScreen"))
                                                        })
                                                    }}
                                                >
                                                    <Text
                                                        style={{
                                                            color: "#0A84FF",
                                                            fontWeight: "bold"
                                                        }}
                                                    >
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
                                <View
                                    style={{
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
                                    }} 
                                    pointerEvents="box-none"
                                >
                                    <Text
                                        style={{
                                            color: "white",
                                            fontSize: 15
                                        }}
                                    >
                                        {scrollDate}
                                    </Text>
                                </View>
                            )
                        }
                        {
                            items.length > 0 && (
                                <>
                                    {
                                        normalizePhotosRange(photosRange) == "all" && (
                                            <View
                                                style={{
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
                                                }}
                                            >
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        let gridSize = calcPhotosGridSize(photosGridSize)
                        
                                                        if(photosGridSize >= 10){
                                                            gridSize = 10
                                                        }
                                                        else{
                                                            gridSize = gridSize + 1
                                                        }
                        
                                                        setPhotosGridSize(gridSize)
                                                    }}
                                                >
                                                    <Ionicon
                                                        name="remove-outline"
                                                        size={24}
                                                        color={photosGridSize >= 10 ? "gray" : "white"}
                                                    />
                                                </TouchableOpacity>
                                                <Text
                                                    style={{
                                                        color: "gray",
                                                        fontSize: 17,
                                                        marginLeft: 5
                                                    }}
                                                >
                                                    |
                                                </Text>
                                                <TouchableOpacity
                                                    style={{
                                                        marginLeft: 6
                                                    }}
                                                    onPress={() => {
                                                        let gridSize = calcPhotosGridSize(photosGridSize)
                        
                                                        if(photosGridSize <= 1){
                                                            gridSize = 1
                                                        }
                                                        else{
                                                            gridSize = gridSize - 1
                                                        }
                        
                                                        setPhotosGridSize(gridSize)
                                                    }}
                                                >
                                                    <Ionicon
                                                        name="add-outline"
                                                        size={24}
                                                        color={photosGridSize <= 1 ? "gray" : "white"}
                                                    />
                                                </TouchableOpacity>
                                            </View>
                                        )
                                    }
                                    <View
                                        style={{
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
                                        }}
                                    >
                                        {
                                            ["years", "months", "days", "all"].map((key, index) => {
                                                return (
                                                    <TouchableOpacity
                                                        key={index.toString()}
                                                        style={{
                                                            backgroundColor: normalizePhotosRange(photosRange) == key ? darkMode ? "gray" : "darkgray" : "transparent",
                                                            width: "auto",
                                                            height: "auto",
                                                            paddingTop: 5,
                                                            paddingBottom: 5,
                                                            paddingLeft: 10,
                                                            paddingRight: 10,
                                                            borderRadius: 15,
                                                            marginLeft: index == 0 ? 0 : 10
                                                        }}
                                                        onPress={() => {
                                                            DeviceEventEmitter.emit("event", {
                                                                type: "unselect-all-items"
                                                            })

                                                            setScrollIndex(0)
                                                            setPhotosRange(key)
                                                        }}
                                                    >
                                                        <Text
                                                            style={{
                                                                color: "white"
                                                            }}
                                                        >
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
                data={generatedItemList}
                key={listKey}
                renderItem={renderItemFn}
                keyExtractor={keyExtractor}
                windowSize={4}
                ref={itemListRef}
                initialScrollIndex={typeof initScrollIndex == "number" ? (isBetween(initScrollIndex, 0, generatedItemList.length) ? initScrollIndex : 0) : 0}
                numColumns={numColumns}
                getItemLayout={getItemLayout}
                onScroll={onListScroll}
                ListEmptyComponent={() => {
                    return (
                        <View
                            style={{
                                width: "100%",
                                height: Math.floor(dimensions.height - 250),
                                justifyContent: "center",
                                alignItems: "center",
                                alignContent: "center"
                            }}
                        >
                            {
                                !loadDone ? (
                                    <View>
                                        <ActivityIndicator
                                            color={getColor(darkMode, "textPrimary")}
                                            size="small"
                                        />
                                    </View>
                                ) : (
                                    <ListEmpty
                                        route={route}
                                        searchTerm={searchTerm}
                                    />
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
                                return
                            }

                            setRefreshing(true)
        
                            await new Promise((resolve) => setTimeout(resolve, 500))

                            populateList(true).catch(console.error)

                            setRefreshing(false)
                        }}
                        tintColor={getColor(darkMode, "textPrimary")}
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