import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from "react"
import { View, DeviceEventEmitter, Platform } from "react-native"
import storage from "../../lib/storage"
import { useMMKVNumber, useMMKVString } from "react-native-mmkv"
import { TopBar } from "../../components/TopBar"
import { ItemList } from "../../components/ItemList"
import { loadItems, sortItems } from "../../lib/services/items"
import { getParent, getRouteURL, calcPhotosGridSize } from "../../lib/helpers"
import { useStore } from "../../lib/state"
import { SheetManager } from "react-native-actions-sheet"
import { previewItem } from "../../lib/services/items"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { StackActions, useIsFocused } from "@react-navigation/native"
import { navigationAnimation } from "../../lib/state"
import { Item } from "../../types"
import { getColor } from "../../style"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { NavigationContainerRef } from "@react-navigation/native"
import * as db from "../../lib/db"
import memoryCache from "../../lib/memoryCache"
import useNetworkInfo from "../../lib/services/isOnline/useNetworkInfo"
import useDimensions from "../../lib/hooks/useDimensions"

export const MainScreen = memo(
	({ navigation, route }: { navigation: NavigationContainerRef<ReactNavigation.RootParamList>; route: any }) => {
		const darkMode = useDarkMode()
		const [userId] = useMMKVNumber("userId", storage)
		const routeURL = useRef<string>(getRouteURL(route)).current
		const [items, setItems] = useState<Item[]>(memoryCache.has("loadItems:" + routeURL) ? memoryCache.get("loadItems:" + routeURL) : [])
		const [searchTerm, setSearchTerm] = useState<string>("")
		const [loadDone, setLoadDone] = useState<boolean>(items.length > 0)
		const setNavigation = useStore(state => state.setNavigation)
		const setRoute = useStore(state => state.setRoute)
		const setCurrentActionSheetItem = useStore(state => state.setCurrentActionSheetItem)
		const setCurrentItems = useStore(state => state.setCurrentItems)
		const itemsRef = useRef<any>([])
		const setItemsSelectedCount = useStore(state => state.setItemsSelectedCount)
		const setInsets = useStore(state => state.setInsets)
		const insets = useSafeAreaInsets()
		const selectedCountRef = useRef<number>(0)
		const setIsDeviceReady = useStore(state => state.setIsDeviceReady)
		const [photosGridSize] = useMMKVNumber("photosGridSize", storage)
		const bottomBarHeight = useStore(state => state.bottomBarHeight)
		const topBarHeight = useStore(state => state.topBarHeight)
		const contentHeight = useStore(state => state.contentHeight)
		const [photosRange, setPhotosRange] = useMMKVString("photosRange:" + userId, storage)
		const [sortByDb] = useMMKVString("sortBy", storage)
		const dimensions = useDimensions()
		const networkInfo = useNetworkInfo()
		const isFocused = useIsFocused()
		const populateListTimeout = useRef<number>(0)
		const didInitialLoad = useRef<boolean>(false)

		const sortBy: string | undefined = useMemo(() => {
			const parsed = JSON.parse(sortByDb || "{}")

			return parsed[routeURL]
		}, [sortByDb, routeURL])

		const currentSortBy = useRef<string | undefined>(sortBy)

		const updateItemThumbnail = useCallback((item: Item, path: string) => {
			if (typeof path !== "string") {
				return
			}

			if (path.length < 4) {
				return
			}

			setItems(items =>
				items.map(mapItem =>
					mapItem.uuid == item.uuid && typeof mapItem.thumbnail == "undefined"
						? { ...mapItem, thumbnail: item.uuid + ".jpg" }
						: mapItem
				)
			)
		}, [])

		const selectItem = useCallback(
			(item: Item) => {
				if (getRouteURL(route).indexOf("photos") !== -1) {
					if (calcPhotosGridSize(photosGridSize) >= 6) {
						return
					}
				}

				setItems(items => items.map(mapItem => (mapItem.uuid == item.uuid ? { ...mapItem, selected: true } : mapItem)))
			},
			[photosGridSize, route]
		)

		const unselectItem = useCallback(
			(item: Item) => {
				if (isFocused) {
					setItems(items => items.map(mapItem => (mapItem.uuid == item.uuid ? { ...mapItem, selected: false } : mapItem)))
				}
			},
			[isFocused]
		)

		const unselectAllItems = useCallback(() => {
			if (isFocused) {
				setItems(items => items.map(mapItem => (mapItem.selected ? { ...mapItem, selected: false } : mapItem)))
			}
		}, [isFocused])

		const selectAllItems = useCallback(() => {
			if (getRouteURL(route).indexOf("photos") !== -1) {
				if (calcPhotosGridSize(photosGridSize) >= 6) {
					return
				}
			}

			if (isFocused) {
				setItems(items => items.map(mapItem => (!mapItem.selected ? { ...mapItem, selected: true } : mapItem)))
			}
		}, [photosGridSize, route, isFocused])

		const removeItem = useCallback(
			(uuid: string) => {
				if (isFocused) {
					setItems(items => items.filter(mapItem => mapItem.uuid !== uuid && mapItem))
				}
			},
			[isFocused]
		)

		const markOffline = useCallback((uuid: string, value: boolean) => {
			setItems(items => items.map(mapItem => (mapItem.uuid == uuid ? { ...mapItem, offline: value } : mapItem)))
		}, [])

		const markFavorite = useCallback((uuid: string, value: boolean) => {
			setItems(items => items.map(mapItem => (mapItem.uuid == uuid ? { ...mapItem, favorited: value } : mapItem)))
		}, [])

		const changeFolderColor = useCallback((uuid: string, color: string | null) => {
			setItems(items => items.map(mapItem => (mapItem.uuid == uuid && mapItem.type == "folder" ? { ...mapItem, color } : mapItem)))
		}, [])

		const changeItemName = useCallback((uuid: string, name: string) => {
			setItems(items => items.map(mapItem => (mapItem.uuid == uuid ? { ...mapItem, name } : mapItem)))
		}, [])

		const addItem = useCallback(
			(item: Item, parent: string) => {
				const currentParent: string = getParent(route)

				if (currentParent === parent || (item.offline && parent === "offline")) {
					setItems(items =>
						sortItems({
							items: [
								...items.filter(
									filterItem => filterItem.name.toLowerCase() !== item.name.toLowerCase() && filterItem.uuid !== item.uuid
								),
								item
							],
							passedRoute: route
						})
					)
				}
			},
			[route]
		)

		const changeWholeItem = useCallback((item: Item, uuid: string) => {
			setItems(items => items.map(mapItem => (mapItem.uuid == uuid ? item : mapItem)))
		}, [])

		const reloadList = useCallback(
			(parent: string) => {
				const currentParent: string = getParent(route)

				if (currentParent === parent) {
					populateList(true).catch(console.error)
				}
			},
			[route]
		)

		const updateFolderSize = useCallback((uuid: string, size: number) => {
			setItems(items => items.map(mapItem => (mapItem.uuid == uuid && mapItem.type == "folder" ? { ...mapItem, size } : mapItem)))
		}, [])

		const populateList = useCallback(
			async (skipCache: boolean = false, passedURL: string | null = null) => {
				if (skipCache && !networkInfo.online) {
					return
				}

				if (skipCache) {
					if (populateListTimeout.current > Date.now()) {
						return
					}

					populateListTimeout.current = Date.now() + 1000
				}

				try {
					const startingURL = passedURL ? passedURL : getRouteURL(route)
					const hasItemsInDb = await db.dbFs.has("loadItems:" + startingURL)

					if (!hasItemsInDb) {
						setLoadDone(false)
						setItems([])
					}

					const { cached, items } = await loadItems(route, skipCache)
					const currentRouteURL = getRouteURL()

					if (currentRouteURL !== startingURL) {
						return
					}

					setItems(items)

					if (cached) {
						populateList(true, startingURL).catch(console.error)
					}
				} catch (e) {
					console.error(e)

					setItems([])
				} finally {
					setLoadDone(true)
				}
			},
			[route, networkInfo]
		)

		const listDimensions = useMemo(() => {
			return {
				width: dimensions.realWidth,
				height:
					routeURL.indexOf("photos") !== -1
						? contentHeight - 40 - bottomBarHeight + (Platform.OS == "android" ? 35 : 26)
						: contentHeight - topBarHeight - bottomBarHeight + 30
			}
		}, [dimensions, contentHeight, bottomBarHeight, topBarHeight, routeURL, insets])

		const searchFilteredItems = useMemo(() => {
			if (searchTerm.length <= 0 || routeURL.indexOf("photos") !== -1) {
				return items
			}

			return items.filter(item => item.name.toLowerCase().trim().indexOf(searchTerm.toLowerCase().trim()) !== -1)
		}, [searchTerm, items, routeURL])

		useEffect(() => {
			if (sortBy !== currentSortBy.current) {
				currentSortBy.current = sortBy

				setItems(sortItems({ items, passedRoute: route }))
			}
		}, [sortBy])

		useEffect(() => {
			if (isFocused) {
				if (Array.isArray(items) && items.length > 0) {
					setCurrentItems(items)

					itemsRef.current = items

					const selected = items.filter(item => item.selected).length

					selectedCountRef.current = selected

					setItemsSelectedCount(selectedCountRef.current)
				} else {
					setCurrentItems([])

					itemsRef.current = []

					setItemsSelectedCount(0)
				}
			}
		}, [items, isFocused])

		useEffect(() => {
			if (!didInitialLoad.current) {
				didInitialLoad.current = true

				populateList().catch(console.error)
			}

			setNavigation(navigation)
			setRoute(route)
			setInsets(insets)

			const deviceListener = DeviceEventEmitter.addListener("event", data => {
				const navState = navigation.getState()

				if (!navState && !navState.routes && !!Array.isArray(navState.routes)) {
					return
				}

				const navigationRoutes = navState.routes
				const isListenerActive =
					typeof navigationRoutes == "object" ? navigationRoutes[navigationRoutes.length - 1].key == route.key : false

				if (data.type == "thumbnail-generated") {
					updateItemThumbnail(data.data, data.data.path)
				} else if (data.type == "item-onpress" && isListenerActive) {
					if (data.data.selected) {
						unselectItem(data.data)
					} else {
						if (selectedCountRef.current > 0) {
							selectItem(data.data)
						} else {
							global.currentReceiverId = data.data.receiverId

							try {
								const currentRouteURL = getRouteURL(route)

								if (typeof currentRouteURL == "string") {
									if (data.data.type == "folder" && currentRouteURL.indexOf("trash") == -1) {
										navigationAnimation({ enable: true }).then(() => {
											navigation.dispatch(
												StackActions.push("MainScreen", {
													parent: currentRouteURL + "/" + data.data.uuid
												})
											)
										})
									} else {
										previewItem({ item: data.data, navigation })
									}
								} else {
									console.log("route url !== string: ", currentRouteURL)
								}
							} catch (e) {
								console.error(e)
							}
						}
					}
				} else if (data.type == "item-onlongpress" && isListenerActive) {
					selectItem(data.data)
				} else if (data.type == "open-item-actionsheet" && isListenerActive) {
					setCurrentActionSheetItem(data.data)

					SheetManager.show("ItemActionSheet")
				} else if (data.type == "unselect-all-items" && isListenerActive) {
					unselectAllItems()
				} else if (data.type == "select-all-items" && isListenerActive) {
					selectAllItems()
				} else if (data.type == "select-item" && isListenerActive) {
					selectItem(data.data)
				} else if (data.type == "unselect-item" && isListenerActive) {
					unselectItem(data.data)
				} else if (data.type == "remove-item") {
					removeItem(data.data.uuid)
				} else if (data.type == "add-item") {
					addItem(data.data.item, data.data.parent)
				} else if (data.type == "mark-item-offline") {
					if (!data.data.value && getRouteURL(route).indexOf("offline") !== -1) {
						removeItem(data.data.uuid)
					} else {
						markOffline(data.data.uuid, data.data.value)
					}
				} else if (data.type == "mark-item-favorite") {
					if (!data.data.value && getRouteURL(route).indexOf("favorites") !== -1) {
						removeItem(data.data.uuid)
					} else {
						markFavorite(data.data.uuid, data.data.value)
					}
				} else if (data.type == "change-folder-color") {
					changeFolderColor(data.data.uuid, data.data.color)
				} else if (data.type == "change-item-name") {
					changeItemName(data.data.uuid, data.data.name)
				} else if (data.type == "change-whole-item") {
					changeWholeItem(data.data.item, data.data.uuid)
				} else if (data.type == "reload-list") {
					reloadList(data.data.parent)
				} else if (data.type == "remove-public-link") {
					if (getRouteURL(route).indexOf("links") !== -1) {
						removeItem(data.data.uuid)
					}
				} else if (data.type == "folder-size") {
					updateFolderSize(data.data.uuid, data.data.size)
				} else if (data.type == "clear-list") {
					setItems([])
				}
			})

			setIsDeviceReady(true)

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
				<ItemList
					navigation={navigation}
					route={route}
					items={searchFilteredItems}
					loadDone={loadDone}
					searchTerm={searchTerm}
					populateList={populateList}
					listDimensions={listDimensions}
				/>
			</View>
		)
	}
)
