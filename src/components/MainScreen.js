import React, { useState, useEffect, useCallback, useRef, memo } from "react"
import { View, DeviceEventEmitter, InteractionManager, Platform } from "react-native"
import { storage } from "../lib/storage"
import { useMMKVBoolean, useMMKVNumber, useMMKVString } from "react-native-mmkv"
import { TopBar } from "./TopBar"
import { ItemList } from "./ItemList"
import { loadItems, sortItems } from "../lib/services/items"
import { getMasterKeys, getParent, getRouteURL, calcPhotosGridSize } from "../lib/helpers"
import { useStore } from "../lib/state"
import { useMountedState } from "react-use"
import { SheetManager } from "react-native-actions-sheet"
import { previewItem } from "../lib/services/items"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { StackActions } from "@react-navigation/native"

export const MainScreen = memo(({ navigation, route }) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const [userId, setUserId] = useMMKVNumber("userId", storage)
    const [routeURL, setRouteURL] = useState(useCallback(getRouteURL(route)))
    const [cachedItemsRef, setCachedItemsRef] = useState(useCallback(storage.getString("loadItemsCache:" + routeURL)))
    const [items, setItems] = useState(typeof cachedItemsRef !== "undefined" ? JSON.parse(cachedItemsRef) : [])
    const [searchTerm, setSearchTerm] = useState("")
    const [loadDone, setLoadDone] = useState(typeof cachedItemsRef !== "undefined" ? true : false)
    const setNavigation = useStore(useCallback(state => state.setNavigation))
    const setRoute = useStore(useCallback(state => state.setRoute))
    const [masterKeys, setMasterKeys] = useState(useCallback(getMasterKeys()))
    const isMounted = useMountedState()
    const setCurrentActionSheetItem = useStore(useCallback(state => state.setCurrentActionSheetItem))
    const setCurrentItems = useStore(useCallback(state => state.setCurrentItems))
    const itemsRef = useRef([])
    const setItemsSelectedCount = useStore(useCallback(state => state.setItemsSelectedCount))
    const setInsets = useStore(useCallback(state => state.setInsets))
    const insets = useSafeAreaInsets()
    const [progress, setProgress] = useState({ itemsDone: 0, totalItems: 1 })
    const selectedCountRef = useRef(0)
    const setIsDeviceReady = useStore(useCallback(state => state.setIsDeviceReady))
    const [itemsBeforeSearch, setItemsBeforeSearch] = useState([])
    const [photosGridSize, setPhotosGridSize] = useMMKVNumber("photosGridSize", storage)
    const bottomBarHeight = useStore(useCallback(state => state.bottomBarHeight))
    const topBarHeight = useStore(useCallback(state => state.topBarHeight))
    const contentHeight = useStore(useCallback(state => state.contentHeight))
    const setItemListLastScrollIndex = useStore(useCallback(state => state.setItemListLastScrollIndex))
    const [photosRange, setPhotosRange] = useMMKVString("photosRange:" + userId, storage)
    const netInfo = useStore(useCallback(state => state.netInfo))
    const itemsSortBy = useStore(useCallback(state => state.itemsSortBy))
    const [initialized, setInitialized] = useState(false)

    const updateItemThumbnail = useCallback((item, path) => {
        if(typeof path !== "string"){
            return false
        }

        if(path.length < 4){
            return false
        }
    
        if(isMounted()){
            setItems(items => items.map(mapItem => mapItem.uuid == item.uuid && typeof mapItem.thumbnail == "undefined" ? {...mapItem, thumbnail: item.uuid + ".jpg" } : mapItem))
        }
    })
    
    const selectItem = useCallback((item) => {
        if(getRouteURL(route).indexOf("photos") !== -1){
            if(calcPhotosGridSize(photosGridSize) >= 6){
                return false
            }
        }

        if(isMounted()){
            setItems(items => items.map(mapItem => mapItem.uuid == item.uuid ? {...mapItem, selected: true} : mapItem))
        }
    })
    
    const unselectItem = useCallback((item) => {
        if(isMounted()){
            setItems(items => items.map(mapItem => mapItem.uuid == item.uuid ? {...mapItem, selected: false} : mapItem))
        }
    })

    const unselectAllItems = useCallback(() => {
        if(isMounted()){
            setItems(items => items.map(mapItem => mapItem.selected ? {...mapItem, selected: false} : mapItem))
        }
    })

    const selectAllItems = useCallback(() => {
        if(getRouteURL(route).indexOf("photos") !== -1){
            if(calcPhotosGridSize(photosGridSize) >= 6){
                return false
            }
        }

        if(isMounted()){
            setItems(items => items.map(mapItem => !mapItem.selected ? {...mapItem, selected: true} : mapItem))
        }
    })

    const removeItem = useCallback((uuid) => {
        if(isMounted()){
            setItems(items => items.filter(mapItem => mapItem.uuid !== uuid && mapItem))
        }
    })

    const markOffline = useCallback((uuid, value) => {
        if(isMounted()){
            setItems(items => items.map(mapItem => mapItem.uuid == uuid ? {...mapItem, offline: value} : mapItem))
        }
    })

    const markFavorite = useCallback((uuid, value) => {
        if(isMounted()){
            setItems(items => items.map(mapItem => mapItem.uuid == uuid ? {...mapItem, favorited: value} : mapItem))
        }
    })

    const changeFolderColor = useCallback((uuid, color) => {
        if(isMounted()){
            setItems(items => items.map(mapItem => mapItem.uuid == uuid && mapItem.type == "folder" ? {...mapItem, color} : mapItem))
        }
    })

    const changeItemName = useCallback((uuid, name) => {
        if(isMounted()){
            setItems(items => items.map(mapItem => mapItem.uuid == uuid ? {...mapItem, name} : mapItem))
        }
    })

    const addItem = useCallback((item, parent) => {
        const currentParent = getParent(route)

        if(isMounted() && (currentParent == parent || (item.offline && parent == "offline"))){
            setItems(items => sortItems({ items: [...items, item], passedRoute: route }))
        }
    })

    const changeWholeItem = useCallback((item, uuid) => {
        if(isMounted()){
            setItems(items => items.map(mapItem => mapItem.uuid == uuid ? item : mapItem))
        }
    })

    const reloadList = useCallback((parent) => {
        const currentParent = getParent(route)

        if(isMounted() && currentParent == parent){
            fetchItemList({ bypassCache: true, callStack: 1 })
        }
    })

    const updateFolderSize = useCallback((uuid, size) => {
        if(isMounted()){
            setItems(items => items.map(mapItem => mapItem.uuid == uuid && mapItem.type == "folder" ? {...mapItem, size} : mapItem))
        }
    })

    useEffect(() => {
        if(isMounted() && initialized){
            if(searchTerm.length == 0){
                if(itemsBeforeSearch.length > 0){
                    setItems(itemsBeforeSearch)
                    setItemsBeforeSearch([])
                }
            }
            else{
                if(itemsBeforeSearch.length == 0){
                    setItemsBeforeSearch(items)
    
                    var filtered = items.filter(item => item.name.toLowerCase().trim().indexOf(searchTerm.toLowerCase().trim()) !== -1 && item)
                }
                else{
                    var filtered = itemsBeforeSearch.filter(item => item.name.toLowerCase().trim().indexOf(searchTerm.toLowerCase().trim()) !== -1 && item)
                }
    
                setItems(filtered)
            }
        }
    }, [searchTerm])

    useEffect(() => {
        if(isMounted() && initialized){
            const sorted = sortItems({ items, passedRoute: route })

            setItems(sorted)
        }
    }, [itemsSortBy])

    useEffect(() => {
        setCurrentItems(items)

        itemsRef.current = items
        global.items = items
        global.setItems = setItems

        const selected = items.filter(item => item.selected).length

        selectedCountRef.current = selected

        setItemsSelectedCount(selectedCountRef.current)
    }, [items])

    const fetchItemList = useCallback(({ bypassCache = false, callStack = 0 }) => {
        return new Promise((resolve, reject) => {
            loadItems({
                parent: getParent(route),
                setItems,
                masterKeys,
                setLoadDone,
                navigation,
                isMounted,
                bypassCache,
                route,
                setProgress,
                callStack
            }).then(resolve).catch(reject)
        })
    })

    useEffect(() => {
        setNavigation(navigation)
        setRoute(route)
        setInsets(insets)
        
        if(netInfo.isConnected && netInfo.isInternetReachable){
            InteractionManager.runAfterInteractions(() => {
                fetchItemList({ bypassCache: false }).catch((err) => console.log(err))
            })
        }

        global.fetchItemList = fetchItemList

        const deviceListener = DeviceEventEmitter.addListener("event", (data) => {
            const navigationRoutes = navigation.getState().routes
            const isListenerActive = (navigationRoutes[navigationRoutes.length - 1].key == route.key)

            if(data.type == "thumbnail-generated"){
                updateItemThumbnail(data.data, data.data.path)
            }
            else if(data.type == "item-onpress" && isListenerActive){
                if(data.data.selected){
                    unselectItem(data.data)
                }
                else{
                    if(selectedCountRef.current > 0){
                        selectItem(data.data)
                    }
                    else{
                        global.currentReceiverId = data.data.receiverId

                        const routeURL = getRouteURL(route)

                        if(data.data.type == "folder" && routeURL.indexOf("trash") == -1){
                            useStore.setState({ showNavigationAnimation: true })

                            navigation.dispatch(StackActions.push("MainScreen", {
                                parent: routeURL + "/" + data.data.uuid
                            }))
                        }
                        else{
                            previewItem({ item: data.data, navigation })
                        }
                    }
                }
            }
            else if(data.type == "item-onlongpress" && isListenerActive){
                selectItem(data.data)
            }
            else if(data.type == "open-item-actionsheet" && isListenerActive){
                setCurrentActionSheetItem(data.data)
    
                SheetManager.show("ItemActionSheet")
            }
            else if(data.type == "unselect-all-items" && isListenerActive){
                unselectAllItems()
            }
            else if(data.type == "select-all-items" && isListenerActive){
                selectAllItems()
            }
            else if(data.type == "select-item" && isListenerActive){
                selectItem(data.data)
            }
            else if(data.type == "unselect-item" && isListenerActive){
                unselectItem(data.data)
            }
            else if(data.type == "remove-item"){
                removeItem(data.data.uuid)
            }
            else if(data.type == "add-item"){
                addItem(data.data.item, data.data.parent)
            }
            else if(data.type == "mark-item-offline"){
                if(!data.data.value && getRouteURL(route).indexOf("offline") !== -1){
                    removeItem(data.data.uuid)
                }
                else{
                    markOffline(data.data.uuid, data.data.value)
                }
            }
            else if(data.type == "mark-item-favorite"){
                if(!data.data.value && getRouteURL(route).indexOf("favorites") !== -1){
                    removeItem(data.data.uuid)
                }
                else{
                    markFavorite(data.data.uuid, data.data.value)
                }
            }
            else if(data.type == "change-folder-color"){
                changeFolderColor(data.data.uuid, data.data.color)
            }
            else if(data.type == "change-item-name"){
                changeItemName(data.data.uuid, data.data.name)
            }
            else if(data.type == "change-whole-item"){
                changeWholeItem(data.data.item, data.data.uuid)
            }
            else if(data.type == "reload-list"){
                reloadList(data.data.parent)
            }
            else if(data.type == "remove-public-link"){
                if(getRouteURL(route).indexOf("links") !== -1){
                    removeItem(data.data.uuid)
                }
            }
            else if(data.type == "folder-size"){
                updateFolderSize(data.data.uuid, data.data.size)
            }
        })

        setIsDeviceReady(true)
        setInitialized(true)

        return () => {
            deviceListener.remove()
            
            setPhotosRange("all")
            setItemListLastScrollIndex(0)
        }
    }, [])

    return (
        <View style={{
            height: "100%",
            width: "100%",
            backgroundColor: darkMode ? "black" : "white"
        }}>
            <TopBar navigation={navigation} route={route} setLoadDone={setLoadDone} searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
            <View style={{
                height: routeURL.indexOf("photos") !== -1 ? (contentHeight - 40 - bottomBarHeight + (Platform.OS == "android" ? 35 : 26)) : (contentHeight - topBarHeight - bottomBarHeight + 30)
            }}>
                <ItemList navigation={navigation} route={route} items={items} setItems={setItems} showLoader={!loadDone} loadDone={loadDone} searchTerm={searchTerm} isMounted={isMounted} fetchItemList={fetchItemList} progress={progress} setProgress={setProgress} />
            </View>
        </View>
    )
})