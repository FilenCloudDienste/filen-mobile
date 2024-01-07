import React, { useState, useRef, useCallback, useEffect, memo, useMemo } from "react"
import {
	View,
	RefreshControl,
	ActivityIndicator,
	DeviceEventEmitter,
	useWindowDimensions,
	NativeSyntheticEvent,
	NativeScrollEvent,
	FlatList
} from "react-native"
import storage from "../../lib/storage"
import { useMMKVBoolean, useMMKVString, useMMKVNumber } from "react-native-mmkv"
import {
	canCompressThumbnail,
	getFileExt,
	getRouteURL,
	calcPhotosGridSize,
	calcCameraUploadCurrentDate,
	normalizePhotosRange,
	isBetween,
	getFilePreviewType,
	convertTimestampToMs
} from "../../lib/helpers"
import { ListItem, GridItem, PhotosItem, PhotosRangeItem } from "../Item"
import { i18n } from "../../i18n"
import { NavigationContainerRef } from "@react-navigation/native"
import { ListEmpty } from "../ListEmpty"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import useNetworkInfo from "../../lib/services/isOnline/useNetworkInfo"
import { Item } from "../../types"
import { useStore } from "../../lib/state"
import { getColor } from "../../style"
import useDarkMode from "../../lib/hooks/useDarkMode"
import useLang from "../../lib/hooks/useLang"
import { FlashList } from "@shopify/flash-list"
import { generateItemThumbnail } from "../../lib/services/thumbnails"
import ItemListPhotos from "./ItemListPhotos"

export const ItemList = memo(
	({
		navigation,
		route,
		items,
		searchTerm,
		populateList,
		loadDone,
		listDimensions
	}: {
		navigation: NavigationContainerRef<ReactNavigation.RootParamList>
		route: any
		items: Item[]
		searchTerm: string
		populateList: Function
		loadDone: boolean
		listDimensions: {
			width: number
			height: number
		}
	}) => {
		const darkMode = useDarkMode()
		const [refreshing, setRefreshing] = useState<boolean>(false)
		const [viewMode] = useMMKVString("viewMode", storage)
		const dimensions = useWindowDimensions()
		const lang = useLang()
		const [userId] = useMMKVNumber("userId", storage)
		const [scrollDate, setScrollDate] = useState<string>(
			Array.isArray(items) && items.length > 0
				? calcCameraUploadCurrentDate(items[0].lastModified, items[items.length - 1].lastModified, lang)
				: ""
		)
		const [photosGridSize] = useMMKVNumber("photosGridSize", storage)
		const [hideThumbnails] = useMMKVBoolean("hideThumbnails:" + userId, storage)
		const [hideFileNames] = useMMKVBoolean("hideFileNames:" + userId, storage)
		const [hideSizes] = useMMKVBoolean("hideSizes:" + userId, storage)
		const [photosRange, setPhotosRange] = useMMKVString("photosRange:" + userId, storage)
		const routeURL = useRef<string>(getRouteURL(route)).current
		const [scrollIndex, setScrollIndex] = useState<number>(0)
		const insets = useSafeAreaInsets()
		const networkInfo = useNetworkInfo()
		const [portrait, setPortrait] = useState<boolean>(dimensions.height >= dimensions.width)
		const setScrolledToBottom = useStore(state => state.setScrolledToBottom)

		const viewModeParsed = useMemo(() => {
			if (!viewMode) {
				return {}
			}

			return JSON.parse(viewMode)
		}, [viewMode])

		const itemsPerRow: number = useMemo(() => {
			return Math.round((dimensions.width - insets.left - insets.right) / 150)
		}, [dimensions, insets])

		const normalizedPhotoRange = useMemo(() => {
			return normalizePhotosRange(photosRange)
		}, [photosRange])

		const calcedPhotosGridSize = useMemo(() => {
			return calcPhotosGridSize(photosGridSize)
		}, [photosGridSize])

		const generateItemsForItemList = useCallback(
			(items: Item[], range: string, lang: string = "en") => {
				if (range == "all") {
					if (routeURL.indexOf("photos") !== -1) {
						const filtered = items.filter(item => {
							if (getFilePreviewType(getFileExt(item.name)) == "video") {
								if (typeof item.thumbnail == "string" && item.thumbnail.length > 3) {
									return true
								}

								return false
							}

							return true
						})

						return filtered
					}

					return items
				}

				let sortedItems = []

				if (range == "years") {
					const occupied: any = {}

					for (let i = 0; i < items.length; i++) {
						if (getFilePreviewType(getFileExt(items[i].name)) == "video") {
							if (typeof items[i].thumbnail !== "string") {
								continue
							}

							if (items[i].thumbnail.length <= 0) {
								continue
							}
						}

						const itemDate = new Date(convertTimestampToMs(items[i].lastModified))
						const itemYear = itemDate.getFullYear()
						const occKey = itemYear

						if (typeof occupied[occKey] == "undefined") {
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

					for (let prop in occupied) {
						sortedItems.push(occupied[prop])
					}

					sortedItems = sortedItems.reverse()
				} else if (range == "months") {
					const occupied: any = {}

					for (let i = 0; i < items.length; i++) {
						if (getFilePreviewType(getFileExt(items[i].name)) == "video") {
							if (typeof items[i].thumbnail !== "string") {
								continue
							}

							if (items[i].thumbnail.length <= 0) {
								continue
							}
						}

						const itemDate = new Date(convertTimestampToMs(items[i].lastModified))
						const itemYear = itemDate.getFullYear()
						const itemMonth = itemDate.getMonth()
						const occKey = itemYear + ":" + itemMonth

						if (typeof occupied[occKey] == "undefined") {
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

					for (let prop in occupied) {
						sortedItems.push(occupied[prop])
					}
				} else if (range == "days") {
					const occupied: any = {}

					for (let i = 0; i < items.length; i++) {
						if (getFilePreviewType(getFileExt(items[i].name)) == "video") {
							if (typeof items[i].thumbnail !== "string") {
								continue
							}

							if (items[i].thumbnail.length <= 0) {
								continue
							}
						}

						const itemDate = new Date(convertTimestampToMs(items[i].lastModified))
						const itemYear = itemDate.getFullYear()
						const itemMonth = itemDate.getMonth()
						const itemDay = itemDate.getDate()
						const occKey = itemYear + ":" + itemMonth + ":" + itemDay

						if (typeof occupied[occKey] == "undefined") {
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

					for (let prop in occupied) {
						sortedItems.push(occupied[prop])
					}
				}

				return sortedItems
			},
			[items, photosRange, lang, itemsPerRow, viewModeParsed, routeURL]
		)

		const getThumbnail = useCallback((item: Item) => {
			if (item.type === "file" && canCompressThumbnail(getFileExt(item.name)) && typeof item.thumbnail !== "string") {
				generateItemThumbnail({ item })
			}
		}, [])

		const onViewableItemsChangedRef = useRef(({ viewableItems }: { viewableItems: any }) => {
			if (Array.isArray(viewableItems) && typeof viewableItems[0] == "object") {
				if (typeof viewableItems[0].index == "number") {
					setScrollIndex(viewableItems[0].index >= 0 ? viewableItems[0].index : 0)
				}
			}

			const visible: Record<string, boolean> = {}

			for (let i = 0; i < viewableItems.length; i++) {
				let item = viewableItems[i].item

				visible[item.uuid] = true
				global.visibleItems[item.uuid] = true

				getThumbnail(item)
			}

			if (
				Array.isArray(viewableItems) &&
				typeof viewableItems[0] == "object" &&
				typeof viewableItems[viewableItems.length - 1] == "object" &&
				routeURL.indexOf("photos") !== -1
			) {
				setScrollDate(
					calcCameraUploadCurrentDate(
						viewableItems[0].item.lastModified,
						viewableItems[viewableItems.length - 1].item.lastModified,
						lang
					)
				)
			}

			for (let prop in global.visibleItems) {
				if (typeof visible[prop] !== "undefined") {
					global.visibleItems[prop] = true
				} else {
					delete global.visibleItems[prop]
				}
			}
		})

		const viewabilityConfigRef = useRef({
			minimumViewTime: 0,
			viewAreaCoveragePercentThreshold: 0
		})

		const photosRangeItemClick = useCallback(
			(item: any) => {
				let nextRangeSelection = "all"

				if (normalizedPhotoRange == "years") {
					nextRangeSelection = "months"
				} else if (normalizedPhotoRange == "months") {
					nextRangeSelection = "days"
				} else if (normalizedPhotoRange == "days") {
					nextRangeSelection = "all"
				} else {
					nextRangeSelection = "all"
				}

				const itemsForIndexLoop = generateItemsForItemList(items, nextRangeSelection, lang)
				let scrollToIndex = 0

				for (let i = 0; i < itemsForIndexLoop.length; i++) {
					if (nextRangeSelection == "all") {
						if (itemsForIndexLoop[i].uuid == item.uuid) {
							scrollToIndex = i
						}
					} else {
						if (itemsForIndexLoop[i].including.includes(item.uuid)) {
							scrollToIndex = i
						}
					}
				}

				const index = scrollToIndex >= 0 && scrollToIndex <= itemsForIndexLoop.length ? scrollToIndex : 0

				setPhotosRange(nextRangeSelection)
				setScrollIndex(index)
			},
			[photosRange, items, lang, normalizedPhotoRange]
		)

		const generatedItemList = useMemo<Item[]>(() => {
			const list = generateItemsForItemList(items, normalizedPhotoRange, lang)

			return list
		}, [items, lang, normalizedPhotoRange])

		const getInitialScrollIndex = useCallback(() => {
			const itemsLength = generatedItemList.length

			return isBetween(scrollIndex, 0, itemsLength) ? scrollIndex : 0
		}, [generatedItemList.length, scrollIndex])

		const estimatedItemSize = useMemo(() => {
			const listItemHeight = 50
			const gridLengthDefault = Math.floor((dimensions.width - (insets.left + insets.right)) / itemsPerRow) + 55
			const photosAllLength = Math.floor((dimensions.width - (insets.left + insets.right)) / calcedPhotosGridSize)
			const photosLength = Math.floor(dimensions.width - (insets.left + insets.right) - 1.5)

			if (routeURL.indexOf("photos") !== -1) {
				if (photosRange == "all") {
					return photosAllLength
				} else {
					return photosLength
				}
			}

			if (viewModeParsed[routeURL] == "grid") {
				return gridLengthDefault
			}

			return listItemHeight
		}, [photosRange, dimensions, calcedPhotosGridSize, insets, viewModeParsed, routeURL])

		const numColumns = useMemo(() => {
			return routeURL.indexOf("photos") !== -1
				? normalizedPhotoRange == "all"
					? calcedPhotosGridSize
					: 1
				: viewModeParsed[routeURL] == "grid"
				? itemsPerRow
				: 1
		}, [routeURL, photosRange, calcedPhotosGridSize, viewModeParsed, itemsPerRow, normalizedPhotoRange])

		const listKey = useMemo(() => {
			const base =
				routeURL.indexOf("photos") !== -1
					? "photos:" + (normalizedPhotoRange == "all" ? calcedPhotosGridSize : normalizedPhotoRange)
					: viewModeParsed[routeURL] == "grid"
					? "grid-" + itemsPerRow
					: "list"

			return base + ":" + (portrait ? "portrait" : "landscape")
		}, [routeURL, photosRange, calcedPhotosGridSize, viewModeParsed, itemsPerRow, portrait, normalizedPhotoRange])

		const onListScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
			if (e.nativeEvent.layoutMeasurement.height > e.nativeEvent.contentSize.height) {
				return
			}

			setScrolledToBottom(
				e.nativeEvent.layoutMeasurement.height + e.nativeEvent.contentOffset.y >= e.nativeEvent.contentSize.height - 40
			)
		}, [])

		const keyExtractor = useCallback((item: Item) => item.uuid, [])

		const renderItemFn = useCallback(
			({ item, index }: { item: Item; index: number }) => {
				return renderItem({
					item,
					index,
					viewMode: routeURL.indexOf("photos") !== -1 ? "photos" : viewModeParsed[routeURL] == "grid" ? "grid" : "list"
				})
			},
			[
				photosRange,
				darkMode,
				hideFileNames,
				hideThumbnails,
				lang,
				dimensions,
				hideSizes,
				insets,
				photosGridSize,
				photosRangeItemClick,
				itemsPerRow,
				portrait,
				listKey,
				viewModeParsed,
				route
			]
		)

		const renderItem = useCallback(
			({ item, index, viewMode }: { item: Item; index: number; viewMode: string }) => {
				if (viewMode == "photos") {
					if (normalizedPhotoRange !== "all") {
						return (
							<PhotosRangeItem
								item={item}
								index={index}
								darkMode={darkMode}
								selected={item.selected}
								thumbnail={item.thumbnail}
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
								photosRange={normalizedPhotoRange}
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
							thumbnail={item.thumbnail}
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

				if (viewMode == "grid") {
					return (
						<GridItem
							item={item}
							index={index}
							darkMode={darkMode}
							selected={item.selected}
							thumbnail={item.thumbnail}
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
						thumbnail={item.thumbnail}
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
			},
			[
				photosRange,
				darkMode,
				hideFileNames,
				hideThumbnails,
				lang,
				dimensions,
				hideSizes,
				insets,
				photosGridSize,
				photosRangeItemClick,
				itemsPerRow,
				route,
				normalizedPhotoRange
			]
		)

		const startupLoadThumbnails = useCallback(() => {
			if (items.length > 0) {
				const max =
					viewModeParsed[routeURL] == "grid"
						? itemsPerRow / (Math.floor(dimensions.height / itemsPerRow) + 55) + itemsPerRow
						: Math.round(dimensions.height / 60 + 1)
				const sliced = items.slice(0, max)

				for (const item of sliced) {
					global.visibleItems[item.uuid] = true

					getThumbnail(item)
				}
			}
		}, [items, viewModeParsed, dimensions, routeURL, itemsPerRow])

		useEffect(() => {
			setPortrait(dimensions.height >= dimensions.width)
		}, [dimensions])

		useEffect(() => {
			startupLoadThumbnails()
		}, [items, viewModeParsed, dimensions, routeURL, itemsPerRow])

		useEffect(() => {
			if (calcedPhotosGridSize >= 6) {
				DeviceEventEmitter.emit("event", {
					type: "unselect-all-items"
				})
			}
		}, [calcedPhotosGridSize])

		useEffect(() => {
			setScrolledToBottom(false)
		}, [])

		useEffect(() => {
			setPortrait(dimensions.height >= dimensions.width)
			setScrolledToBottom(false)
		}, [dimensions])

		return (
			<View
				style={{
					width: listDimensions.width,
					height: listDimensions.height,
					paddingLeft: viewModeParsed[routeURL] == "grid" && routeURL.indexOf("photos") == -1 ? 15 : 0,
					paddingRight: viewModeParsed[routeURL] == "grid" && routeURL.indexOf("photos") == -1 ? 15 : 0
				}}
			>
				{routeURL.indexOf("photos") !== -1 && (
					<ItemListPhotos
						navigation={navigation}
						scrollDate={scrollDate}
						setScrollIndex={setScrollIndex}
						items={generatedItemList}
						normalizedPhotoRange={normalizedPhotoRange}
						calcedPhotosGridSize={calcedPhotosGridSize}
					/>
				)}
				{items.length > 0 && loadDone ? (
					<>
						{viewModeParsed[routeURL] == "grid" && routeURL.indexOf("photos") == -1 ? ( // FlashList kinda bugs out when in grid mode so we have to use FlatList for now
							<FlatList
								data={generatedItemList}
								key={listKey}
								renderItem={renderItemFn}
								keyExtractor={keyExtractor}
								initialScrollIndex={0}
								windowSize={3}
								numColumns={numColumns}
								onScroll={onListScroll}
								extraData={{
									photosRange,
									darkMode,
									hideFileNames,
									hideThumbnails,
									lang,
									dimensions,
									hideSizes,
									insets,
									photosGridSize,
									photosRangeItemClick,
									itemsPerRow,
									route,
									normalizedPhotoRange
								}}
								ListEmptyComponent={() => {
									return (
										<View
											style={{
												width: listDimensions.width,
												height: listDimensions.height,
												justifyContent: "center",
												alignItems: "center",
												alignContent: "center"
											}}
										>
											{!loadDone ? (
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
											)}
										</View>
									)
								}}
								refreshControl={
									<RefreshControl
										refreshing={refreshing}
										onRefresh={async () => {
											if (!loadDone || !networkInfo.online) {
												return
											}

											setRefreshing(true)

											await new Promise(resolve => setTimeout(resolve, 500))
											await populateList(true).catch(console.error)

											setRefreshing(false)
										}}
										tintColor={getColor(darkMode, "textPrimary")}
									/>
								}
								onViewableItemsChanged={onViewableItemsChangedRef.current}
								viewabilityConfig={viewabilityConfigRef.current}
							/>
						) : (
							<FlashList
								data={generatedItemList}
								key={listKey}
								renderItem={renderItemFn}
								keyExtractor={keyExtractor}
								initialScrollIndex={routeURL.indexOf("photos") !== -1 ? getInitialScrollIndex() : 0}
								numColumns={numColumns}
								onScroll={onListScroll}
								estimatedItemSize={estimatedItemSize}
								estimatedListSize={listDimensions}
								extraData={{
									photosRange,
									darkMode,
									hideFileNames,
									hideThumbnails,
									lang,
									dimensions,
									hideSizes,
									insets,
									photosGridSize,
									photosRangeItemClick,
									itemsPerRow,
									route,
									normalizedPhotoRange
								}}
								ListEmptyComponent={() => {
									return (
										<View
											style={{
												width: listDimensions.width,
												height: listDimensions.height,
												justifyContent: "center",
												alignItems: "center",
												alignContent: "center"
											}}
										>
											{!loadDone ? (
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
											)}
										</View>
									)
								}}
								refreshControl={
									<RefreshControl
										refreshing={refreshing}
										onRefresh={async () => {
											if (!loadDone || !networkInfo.online) {
												return
											}

											setRefreshing(true)

											await new Promise(resolve => setTimeout(resolve, 500))

											populateList(true).catch(console.error)

											setRefreshing(false)
										}}
										tintColor={getColor(darkMode, "textPrimary")}
									/>
								}
								onViewableItemsChanged={onViewableItemsChangedRef.current}
								viewabilityConfig={viewabilityConfigRef.current}
							/>
						)}
					</>
				) : (
					<View
						style={{
							width: listDimensions.width,
							height: listDimensions.height,
							justifyContent: "center",
							alignItems: "center",
							alignContent: "center"
						}}
					>
						{!loadDone ? (
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
						)}
					</View>
				)}
			</View>
		)
	}
)
