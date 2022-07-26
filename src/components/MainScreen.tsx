import React, { useState, useEffect, useRef, memo } from "react"
import { View, DeviceEventEmitter, Platform } from "react-native"
import storage from "../lib/storage"
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
import { StackActions, useIsFocused } from "@react-navigation/native"
import { navigationAnimation } from "../lib/state"
import type { EdgeInsets } from "react-native-safe-area-context"

export interface MainScreenProps {
    navigation: any,
    route: any
}

export const MainScreen = memo(({ navigation, route }: MainScreenProps) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const [userId, setUserId] = useMMKVNumber("userId", storage)
    const [routeURL, setRouteURL] = useState<string>(getRouteURL(route))
    const cachedItemsRef = useRef<string | undefined>(storage.getString("loadItemsCache:" + routeURL)).current
    const cachedItemsParsed = useRef<any>(typeof cachedItemsRef == "string" ? JSON.parse(cachedItemsRef) : []).current
    const [items, setItems] = useState<any>(Array.isArray(cachedItemsParsed) ? cachedItemsParsed.filter(item => item !== null && typeof item.uuid == "string") : [])
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
    const insets: EdgeInsets = useSafeAreaInsets()
    const [progress, setProgress] = useState<{ itemsDone: number, totalItems: number }>({ itemsDone: 0, totalItems: 1 })
    const selectedCountRef = useRef<number>(0)
    const setIsDeviceReady = useStore(state => state.setIsDeviceReady)
    const [itemsBeforeSearch, setItemsBeforeSearch] = useState<any>([])
    const [photosGridSize, setPhotosGridSize] = useMMKVNumber("photosGridSize", storage)
    const bottomBarHeight = useStore(state => state.bottomBarHeight)
    const topBarHeight = useStore(state => state.topBarHeight)
    const contentHeight = useStore(state => state.contentHeight)
    const [photosRange, setPhotosRange] = useMMKVString("photosRange:" + userId, storage)
    const netInfo = useStore(state => state.netInfo)
    const itemsSortBy = useStore(state => state.itemsSortBy)
    const [initialized, setInitialized] = useState<boolean>(false)
    const isFocused: boolean = useIsFocused()

    const updateItemThumbnail = (item: any, path: string): void => {
        if(typeof path !== "string"){
            return
        }

        if(path.length < 4){
            return
        }
    
        if(isMounted()){
            setItems((items: any) => items.map((mapItem: any) => mapItem.uuid == item.uuid && typeof mapItem.thumbnail == "undefined" ? {...mapItem, thumbnail: item.uuid + ".jpg" } : mapItem))
        }
    }
    
    const selectItem = (item: any): void => {
        if(getRouteURL(route).indexOf("photos") !== -1){
            if(calcPhotosGridSize(photosGridSize) >= 6){
                return
            }
        }

        if(isMounted()){
            setItems((items: any) => items.map((mapItem: any) => mapItem.uuid == item.uuid ? {...mapItem, selected: true} : mapItem))
        }
    }
    
    const unselectItem = (item: any): void => {
        if(isMounted()){
            setItems((items: any) => items.map((mapItem: any) => mapItem.uuid == item.uuid ? {...mapItem, selected: false} : mapItem))
        }
    }

    const unselectAllItems = (): void => {
        if(isMounted()){
            setItems((items: any) => items.map((mapItem: any) => mapItem.selected ? {...mapItem, selected: false} : mapItem))
        }
    }

    const selectAllItems = (): void => {
        if(getRouteURL(route).indexOf("photos") !== -1){
            if(calcPhotosGridSize(photosGridSize) >= 6){
                return
            }
        }

        if(isMounted()){
            setItems((items: any) => items.map((mapItem: any) => !mapItem.selected ? {...mapItem, selected: true} : mapItem))
        }
    }

    const removeItem = (uuid: string): void => {
        if(isMounted()){
            setItems((items: any) => items.filter((mapItem: any) => mapItem.uuid !== uuid && mapItem))
        }
    }

    const markOffline = (uuid: string, value: boolean): void => {
        if(isMounted()){
            setItems((items: any) => items.map((mapItem: any) => mapItem.uuid == uuid ? {...mapItem, offline: value} : mapItem))
        }
    }

    const markFavorite = (uuid: string, value: boolean): void => {
        if(isMounted()){
            setItems((items: any) => items.map((mapItem: any) => mapItem.uuid == uuid ? {...mapItem, favorited: value} : mapItem))
        }
    }

    const changeFolderColor = (uuid: string, color: string | null | undefined): void => {
        if(isMounted()){
            setItems((items: any) => items.map((mapItem: any) => mapItem.uuid == uuid && mapItem.type == "folder" ? {...mapItem, color} : mapItem))
        }
    }

    const changeItemName = (uuid: string, name: string): void => {
        if(isMounted()){
            setItems((items: any) => items.map((mapItem: any) => mapItem.uuid == uuid ? {...mapItem, name} : mapItem))
        }
    }

    const addItem = (item: any, parent: string): void => {
        const currentParent: string = getParent(route)

        if(isMounted() && (currentParent == parent || (item.offline && parent == "offline"))){
            setItems((items: any) => sortItems({ items: [...items, item], passedRoute: route }))
        }
    }

    const changeWholeItem = (item: any, uuid: string): void => {
        if(isMounted()){
            setItems((items: any) => items.map((mapItem: any) => mapItem.uuid == uuid ? item : mapItem))
        }
    }

    const reloadList = (parent: string): void => {
        const currentParent: string = getParent(route)

        if(isMounted() && currentParent == parent){
            fetchItemList({ bypassCache: true, callStack: 1 })
        }
    }

    const updateFolderSize = (uuid: string, size: number): void => {
        if(isMounted()){
            setItems((items: any) => items.map((mapItem: any) => mapItem.uuid == uuid && mapItem.type == "folder" ? {...mapItem, size} : mapItem))
        }
    }

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
    
                    var filtered = items.filter((item: any) => item.name.toLowerCase().trim().indexOf(searchTerm.toLowerCase().trim()) !== -1 && item)
                }
                else{
                    var filtered = itemsBeforeSearch.filter((item: any) => item.name.toLowerCase().trim().indexOf(searchTerm.toLowerCase().trim()) !== -1 && item)
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
        if(isFocused){
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

    const fetchItemList = ({ bypassCache = false, callStack = 0, loadFolderSizes = false }: { bypassCache?: boolean, callStack?: number, loadFolderSizes?: boolean }) => {
        return new Promise((resolve, reject) => {
            // @ts-ignore
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
                callStack,
                loadFolderSizes
            }).then(resolve).catch(reject)
        })
    }

    useEffect(() => {
        setNavigation(navigation)
        setRoute(route)
        setInsets(insets)
        
        fetchItemList({ bypassCache: false, callStack: 0, loadFolderSizes: false }).catch((err) => console.log(err))

        global.fetchItemList = fetchItemList

        const deviceListener = DeviceEventEmitter.addListener("event", (data) => {
            const navigationRoutes = navigation.getState().routes
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
                            console.log(e)
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
        }
    }, [])

    return (
        <View
            style={{
                height: "100%",
                width: "100%",
                backgroundColor: darkMode ? "black" : "white"
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
                    height: routeURL.indexOf("photos") !== -1 ? (contentHeight - 40 - bottomBarHeight + (Platform.OS == "android" ? 35 : 26)) : (contentHeight - topBarHeight - bottomBarHeight + 30)
                }}
            >
                <ItemList
                    // @ts-ignore
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