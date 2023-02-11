import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from "react"
import { View, DeviceEventEmitter, Platform } from "react-native"
import storage from "../../lib/storage"
import { useMMKVNumber, useMMKVString } from "react-native-mmkv"
import { TopBar } from "../../components/TopBar"
import { ItemList } from "../../components/ItemList"
import { loadItems, sortItems } from "../../lib/services/items"
import { getMasterKeys, getParent, getRouteURL, calcPhotosGridSize } from "../../lib/helpers"
import { useStore } from "../../lib/state"
import { useMountedState } from "react-use"
import { SheetManager } from "react-native-actions-sheet"
import { previewItem } from "../../lib/services/items"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { StackActions, useIsFocused } from "@react-navigation/native"
import { navigationAnimation } from "../../lib/state"
import type { Item } from "../../types"
import { getColor } from "../../style"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { NavigationContainerRef } from "@react-navigation/native"

export interface MainScreenProps {
    navigation: NavigationContainerRef<ReactNavigation.RootParamList>,
    route: any
}

export const MainScreen = memo(({ navigation, route }: MainScreenProps) => {
    const darkMode = useDarkMode()
    const [userId, setUserId] = useMMKVNumber("userId", storage)
    const [routeURL, setRouteURL] = useState<string>(getRouteURL(route))
    const cachedItemsRef = useRef<string | undefined>(storage.getString("loadItemsCache:" + routeURL)).current
    const cachedItemsParsed = useRef<any>(typeof cachedItemsRef == "string" ? JSON.parse(cachedItemsRef) : []).current
    const [items, setItems] = useState<Item[]>(Array.isArray(cachedItemsParsed) ? cachedItemsParsed.filter(item => item !== null && typeof item.uuid == "string") : [])
    const [searchTerm, setSearchTerm] = useState<string>("")
    const [loadDone, setLoadDone] = useState<boolean>(typeof cachedItemsRef !== "undefined" ? true : false)
    const setNavigation = useStore(state => state.setNavigation)
    const setRoute = useStore(state => state.setRoute)
    const [masterKeys, setMasterKeys] = useState<string[]>(getMasterKeys())
    const isMounted: () => boolean = useMountedState()
    const setCurrentActionSheetItem = useStore(state => state.setCurrentActionSheetItem)
    const setCurrentItems = useStore(state => state.setCurrentItems)
    const itemsRef = useRef<any>([])
    const setItemsSelectedCount = useStore(state => state.setItemsSelectedCount)
    const setInsets = useStore(state => state.setInsets)
    const insets = useSafeAreaInsets()
    const [progress, setProgress] = useState<{ itemsDone: number, totalItems: number }>({ itemsDone: 0, totalItems: 1 })
    const selectedCountRef = useRef<number>(0)
    const setIsDeviceReady = useStore(state => state.setIsDeviceReady)
    const [itemsBeforeSearch, setItemsBeforeSearch] = useState<Item[]>([])
    const [photosGridSize, setPhotosGridSize] = useMMKVNumber("photosGridSize", storage)
    const bottomBarHeight = useStore(state => state.bottomBarHeight)
    const topBarHeight = useStore(state => state.topBarHeight)
    const contentHeight = useStore(state => state.contentHeight)
    const [photosRange, setPhotosRange] = useMMKVString("photosRange:" + userId, storage)
    const [initialized, setInitialized] = useState<boolean>(false)
    const isFocused: boolean = useIsFocused()
    const [sortByDb, setSortByDb] = useMMKVString("sortBy", storage)

    const sortBy: string | undefined = useMemo(() => {
        const parsed = JSON.parse(sortByDb || "{}")

        return parsed[routeURL]
    }, [sortByDb, routeURL])

    const updateItemThumbnail = useCallback((item: Item, path: string) => {
        if(typeof path !== "string"){
            return
        }

        if(path.length < 4){
            return
        }
    
        if(isMounted()){
            setItems(items => items.map(mapItem => mapItem.uuid == item.uuid && typeof mapItem.thumbnail == "undefined" ? {...mapItem, thumbnail: item.uuid + ".jpg" } : mapItem))
        }
    }, [])
    
    const selectItem = useCallback((item: Item) => {
        if(getRouteURL(route).indexOf("photos") !== -1){
            if(calcPhotosGridSize(photosGridSize) >= 6){
                return
            }
        }

        if(isMounted() && isFocused){
            setItems(items => items.map(mapItem => mapItem.uuid == item.uuid ? {...mapItem, selected: true} : mapItem))
        }
    }, [photosGridSize, route, isFocused])
    
    const unselectItem = useCallback((item: Item) => {
        if(isMounted() && isFocused){
            setItems(items => items.map(mapItem => mapItem.uuid == item.uuid ? {...mapItem, selected: false} : mapItem))
        }
    }, [isFocused])

    const unselectAllItems = useCallback(() => {
        if(isMounted() && isFocused){
            setItems(items => items.map(mapItem => mapItem.selected ? {...mapItem, selected: false} : mapItem))
        }
    }, [isFocused])

    const selectAllItems = useCallback(() => {
        if(getRouteURL(route).indexOf("photos") !== -1){
            if(calcPhotosGridSize(photosGridSize) >= 6){
                return
            }
        }

        if(isMounted() && isFocused){
            setItems(items => items.map(mapItem => !mapItem.selected ? {...mapItem, selected: true} : mapItem))
        }
    }, [photosGridSize, route, isFocused])

    const removeItem = useCallback((uuid: string) => {
        if(isMounted() && isFocused){
            setItems(items => items.filter(mapItem => mapItem.uuid !== uuid && mapItem))
        }
    }, [isFocused])

    const markOffline = useCallback((uuid: string, value: boolean) => {
        if(isMounted()){
            setItems(items => items.map(mapItem => mapItem.uuid == uuid ? {...mapItem, offline: value} : mapItem))
        }
    }, [])

    const markFavorite = useCallback((uuid: string, value: boolean) => {
        if(isMounted()){
            setItems(items => items.map(mapItem => mapItem.uuid == uuid ? {...mapItem, favorited: value} : mapItem))
        }
    }, [])

    const changeFolderColor = useCallback((uuid: string, color: string | null) => {
        if(isMounted()){
            setItems(items => items.map(mapItem => mapItem.uuid == uuid && mapItem.type == "folder" ? {...mapItem, color} : mapItem))
        }
    }, [])

    const changeItemName = useCallback((uuid: string, name: string) => {
        if(isMounted()){
            setItems(items => items.map(mapItem => mapItem.uuid == uuid ? {...mapItem, name} : mapItem))
        }
    }, [])

    const addItem = useCallback((item: Item, parent: string) => {
        const currentParent: string = getParent(route)

        if(isMounted() && (currentParent == parent || (item.offline && parent == "offline"))){
            setItems(items => sortItems({ items: [...items.filter(filterItem => filterItem.name.toLowerCase() !== item.name.toLowerCase()), item], passedRoute: route }))
        }
    }, [route])

    const changeWholeItem = useCallback((item: Item, uuid: string) => {
        if(isMounted()){
            setItems(items => items.map(mapItem => mapItem.uuid == uuid ? item : mapItem))
        }
    }, [])

    const reloadList = useCallback((parent: string) => {
        const currentParent: string = getParent(route)

        if(isMounted() && currentParent == parent){
            fetchItemList({ bypassCache: true, callStack: 1 })
        }
    }, [route])

    const updateFolderSize = useCallback((uuid: string, size: number) => {
        if(isMounted()){
            setItems(items => items.map(mapItem => mapItem.uuid == uuid && mapItem.type == "folder" ? { ...mapItem, size } : mapItem))
        }
    }, [])

    useEffect(() => {
        if(isMounted() && initialized){
            if(searchTerm.length == 0){
                if(itemsBeforeSearch.length > 0){
                    setItems(itemsBeforeSearch)
                    setItemsBeforeSearch([])
                }
            }
            else{
                let filtered: Item[] = []

                if(itemsBeforeSearch.length == 0){
                    setItemsBeforeSearch(items)
    
                    filtered = items.filter(item => item.name.toLowerCase().trim().indexOf(searchTerm.toLowerCase().trim()) !== -1 && item)
                }
                else{
                    filtered = itemsBeforeSearch.filter(item => item.name.toLowerCase().trim().indexOf(searchTerm.toLowerCase().trim()) !== -1 && item)
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
    }, [sortBy])

    useEffect(() => {
        if(isFocused && isMounted()){
            if(Array.isArray(items) && items.length > 0){
                setCurrentItems(items)

                itemsRef.current = items
                global.items = items

                const selected = items.filter(item => item.selected).length

                selectedCountRef.current = selected

                setItemsSelectedCount(selectedCountRef.current)
            }
            else{
                setCurrentItems([])
    
                itemsRef.current = []
                global.items = []
    
                setItemsSelectedCount(0)
            }

            global.setItems = setItems
        }
    }, [items, isFocused])

    const fetchItemList = useCallback(({ bypassCache = false, callStack = 0, loadFolderSizes = false }: { bypassCache?: boolean, callStack?: number, loadFolderSizes?: boolean }) => {
        // @ts-ignore
        return loadItems({
            parent: getParent(route),
            setItems,
            masterKeys,
            setLoadDone,
            navigation,
            isMounted,
            bypassCache,
            route,
            setProgress,
            callStack,
            loadFolderSizes
        })
    }, [route, masterKeys, navigation, isMounted, route, setProgress, setItems])

    useEffect(() => {
        setNavigation(navigation)
        setRoute(route)
        setInsets(insets)
        
        fetchItemList({ bypassCache: false, callStack: 0, loadFolderSizes: false }).catch(console.error)

        global.fetchItemList = fetchItemList

        const deviceListener = DeviceEventEmitter.addListener("event", (data) => {
            const navState = navigation.getState()

            if(!navState){
                return
            }

            if(typeof navState.routes == "undefined"){
                return
            }

            if(!Array.isArray(navState.routes)){
                return
            }

            const navigationRoutes = navState.routes
            const isListenerActive = typeof navigationRoutes == "object" ? (navigationRoutes[navigationRoutes.length - 1].key == route.key) : false

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

                        try{
                            const currentRouteURL = getRouteURL(route)

                            if(typeof currentRouteURL == "string"){
                                if(data.data.type == "folder" && currentRouteURL.indexOf("trash") == -1){
                                    navigationAnimation({ enable: true }).then(() => {
                                        navigation.dispatch(StackActions.push("MainScreen", {
                                            parent: currentRouteURL + "/" + data.data.uuid
                                        }))
                                    })
                                }
                                else{
                                    previewItem({ item: data.data, navigation })
                                }
                            }
                            else{
                                console.log("route url !== string: ", currentRouteURL)
                            }
                        }
                        catch(e){
                            console.error(e)
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
            else if(data.type == "clear-list"){
                if(isMounted()){
                    setItems([])
                }
            }
        })

        setIsDeviceReady(true)
        setInitialized(true)

        return () => {
            deviceListener.remove()
            
            setPhotosRange("all")
        }
    }, [])

    return (
        <View
            style={{
                height: "100%",
                width: "100%",
                backgroundColor: getColor(darkMode, "backgroundPrimary")
            }}
        >
            <TopBar
                navigation={navigation}
                route={route}
                setLoadDone={setLoadDone}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
            />
            <View
                style={{
                    height: routeURL.indexOf("photos") !== -1
                            ? (contentHeight - 40 - bottomBarHeight + (Platform.OS == "android" ? 35 : 26))
                            : (contentHeight - topBarHeight - bottomBarHeight + 30)
                }}
            >
                <ItemList
                    navigation={navigation}
                    route={route}
                    items={items}
                    setItems={setItems}
                    showLoader={!loadDone}
                    loadDone={loadDone}
                    searchTerm={searchTerm}
                    isMounted={isMounted}
                    fetchItemList={fetchItemList}
                    progress={progress}
                    setProgress={setProgress}
                />
            </View>
        </View>
    )
})