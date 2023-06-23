import React, { memo, useEffect, useState, useRef, useCallback, useMemo } from "react"
import {
	ActivityIndicator,
	Text,
	View,
	TouchableOpacity,
	Platform,
	FlatList,
	ImageBackground,
	Pressable,
	useWindowDimensions,
	Image
} from "react-native"
import Ionicon from "@expo/vector-icons/Ionicons"
import ReactNativeZoomableView from "@dudigital/react-native-zoomable-view/src/ReactNativeZoomableView"
import { downloadFile, getDownloadPath } from "../../lib/services/download/download"
import { navigationAnimation } from "../../lib/state"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useMountedState } from "react-use"
import { generateItemThumbnail } from "../../lib/services/thumbnails"
import { convertHeic } from "../../lib/services/items"
import { getImageForItem } from "../../assets/thumbnails"
import { NavigationContainerRef } from "@react-navigation/native"
import { showToast } from "../../components/Toasts"
import { getFileExt, toExpoFsPath, isBetween, getFilePreviewType, canCompressThumbnail } from "../../lib/helpers"
import { THUMBNAIL_BASE_PATH } from "../../lib/constants"
import useIsOnline from "../../lib/hooks/useIsOnline"
import { getItemOfflinePath } from "../../lib/services/offline"
import * as fs from "../../lib/fs"
import { Item } from "../../types"
import { useStore } from "../../lib/state"

export interface PreviewItem {
	uri: string | undefined
	name: string
	index: number
	uuid: string
	thumbnail: string | undefined
	file: Item
}

const minZoom: number = 0.99999999999

export interface ImageViewerScreenProps {
	navigation: NavigationContainerRef<ReactNavigation.RootParamList>
	route: any
}

const ImageViewerScreen = memo(({ navigation, route }: ImageViewerScreenProps) => {
	const uuid = useRef<string>(route.params.uuid)
	const [images, setImages] = useState<Record<string, string>>({})
	const [isZooming, setIsZooming] = useState<boolean>(false)
	const isSwiping = useRef<boolean>(false)
	const zoomLevel = useRef<number>(minZoom)
	const thumbnailListRef = useRef<any>()
	const listRef = useRef<any>()
	const [showControls, setShowControls] = useState<boolean>(false)
	const insets = useSafeAreaInsets()
	const viewRefs = useRef<any>({}).current
	const isMounted = useMountedState()
	const tapCount = useRef<number>(0)
	const tapTimer = useRef<any>(undefined)
	const didNavBack = useRef<boolean>(false)
	const currentImagePreviewDownloads = useRef<Record<string, boolean>>({}).current
	const setListScrollAgain = useRef<boolean>(false)
	const dimensions = useWindowDimensions()
	const [portrait, setPortrait] = useState<boolean>(dimensions.height >= dimensions.width)
	const isOnline = useIsOnline()

	const [items, startIndex] = useRef<[PreviewItem[], number]>(
		(() => {
			const currentItems = useStore.getState().currentItems

			if (!Array.isArray(currentItems)) {
				return [[], -1]
			}

			let items: PreviewItem[] = []
			let index = 0
			let imgFound = false
			let currentIndex = 0

			for (const item of currentItems) {
				const ext = getFileExt(item.name)

				if (getFilePreviewType(ext) == "image" && canCompressThumbnail(ext)) {
					if (item.uuid == uuid.current) {
						currentIndex = index
						imgFound = true
					}

					items.push({
						uri: undefined,
						name: item.name,
						index,
						uuid: item.uuid,
						thumbnail: item.thumbnail,
						file: item
					})

					index += 1
				}
			}

			if (items.length == 1) {
				return [items, 0]
			}

			if (!imgFound) {
				return [[], -1]
			}

			return [items, currentIndex]
		})()
	).current

	const [imagePreviewModalIndex, setImagePreviewModalIndex] = useState<number>(startIndex)
	const [imagePreviewModalItems, setImagePreviewModalItems] = useState<PreviewItem[]>(items)
	const [currentName, setCurrentName] = useState<string>("")

	const bottomMargin = useMemo(() => {
		if (insets.bottom <= 0 || !portrait || Platform.OS == "android") {
			return 40
		}

		return insets.bottom + 60
	}, [portrait, insets.bottom, Platform.OS])

	const loadImage = async (image: PreviewItem, index: number) => {
		if (!isMounted()) {
			return
		}

		if (typeof images[image.uuid] == "string") {
			return
		}

		if (typeof currentImagePreviewDownloads[image.uuid] !== "undefined") {
			return
		}

		currentImagePreviewDownloads[image.uuid] = true
		zoomLevel.current = minZoom

		setCurrentName(image.file.name)
		setImagePreviewModalIndex(index)

		if (isBetween(index, 0, imagePreviewModalItems.length)) {
			thumbnailListRef?.current?.scrollToIndex({
				animated: true,
				index,
				viewPosition: 0.5
			})

			if (setListScrollAgain.current) {
				setListScrollAgain.current = false

				listRef?.current?.scrollToIndex({
					animated: false,
					index
				})
			}
		}

		try {
			const offlinePath = getItemOfflinePath(await getDownloadPath({ type: "offline" }), image.file)

			if ((await fs.stat(offlinePath)).exists) {
				if (!isMounted()) {
					return
				}

				setImages(prev => ({
					...prev,
					[image.uuid]: toExpoFsPath(offlinePath)
				}))

				return
			}
		} catch (e) {
			//console.log(e)
		}

		downloadFile(image.file, false, image.file.chunks)
			.then(path => {
				delete currentImagePreviewDownloads[image.uuid]

				if (!isMounted()) {
					return
				}

				generateItemThumbnail({
					item: image.file,
					skipInViewCheck: true,
					callback: (err: Error, thumbPath: string) => {
						if (!isMounted()) {
							return
						}

						if (!err && typeof thumbPath == "string") {
							updateItemThumbnail(image, toExpoFsPath(thumbPath))
						}

						if (isMounted()) {
							setImages(prev => ({
								...prev,
								[image.uuid]: toExpoFsPath(path)
							}))
						}
					}
				})
			})
			.catch(err => {
				delete currentImagePreviewDownloads[image.uuid]

				console.error(err)

				showToast({ message: err.toString() })
			})
	}

	const onViewableItemsChangedRef = useRef(({ viewableItems }: { viewableItems: any[] }) => {
		if (viewableItems.length <= 0) {
			return
		}

		if (!viewableItems[0].item) {
			return
		}

		loadImage(viewableItems[0].item, viewableItems[0].index)
	})

	const updateItemThumbnail = useCallback((item: PreviewItem, path: string) => {
		if (path.length < 4) {
			return
		}

		if (!isMounted()) {
			return
		}

		setImagePreviewModalItems(prev => [
			...prev.map(mapItem =>
				mapItem.file.uuid == item.uuid && typeof mapItem.thumbnail == "undefined"
					? { ...mapItem, thumbnail: item.uuid + ".jpg" }
					: mapItem
			)
		])
	}, [])

	const viewabilityConfigRef = useRef({
		minimumViewTime: 0,
		viewAreaCoveragePercentThreshold: 95,
		waitForInteraction: false
	})

	const renderImage = useCallback(
		(item: PreviewItem, index: number) => {
			const image = item

			if (typeof image.thumbnail !== "string") {
				return (
					<View
						key={image.uuid}
						style={{
							width: dimensions.width,
							height: dimensions.height
						}}
					>
						<ActivityIndicator
							size={"small"}
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
					</View>
				)
			}

			return (
				<ReactNativeZoomableView
					key={image.uuid}
					ref={(ref: any) => (viewRefs[image.uuid] = ref)}
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

						if (view.zoomLevel <= 1.05 && isBetween(index, 0, imagePreviewModalItems.length)) {
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

						if (
							(view.distanceTop >= 50 || view.distanceBottom >= 50) &&
							!didNavBack.current &&
							zoomLevel.current <= 1 &&
							!isSwiping.current &&
							!isZooming
						) {
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
							if (isSwiping.current) {
								return false
							}

							tapCount.current += 1

							if (tapCount.current >= 2) {
								if (zoomLevel.current >= 1.01) {
									viewRefs[image.uuid]?.zoomTo(1)

									zoomLevel.current = 1

									setIsZooming(false)
								} else {
									viewRefs[image.uuid]?.zoomTo(2)

									zoomLevel.current = 2

									setIsZooming(true)
								}

								tapCount.current = 0

								return clearTimeout(tapTimer.current)
							}

							clearTimeout(tapTimer.current)

							tapTimer.current = setTimeout(() => {
								if (tapCount.current >= 2) {
									if (zoomLevel.current >= 2) {
										viewRefs[image.uuid]?.zoomTo(1)

										zoomLevel.current = 1

										setIsZooming(false)
									} else {
										viewRefs[image.uuid]?.zoomTo(2)

										zoomLevel.current = 2

										setIsZooming(true)
									}
								} else {
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
								{typeof images[image.uuid] == "string" && (
									<Image
										source={{
											uri: decodeURIComponent(
												images[image.uuid].startsWith("file://")
													? images[image.uuid]
													: "file://" + images[image.uuid]
											)
										}}
										resizeMode="contain"
										style={{
											width: dimensions.width,
											height: dimensions.height
										}}
									/>
								)}
							</ImageBackground>
							{typeof images[image.uuid] !== "string" && (
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
							)}
						</>
					</Pressable>
				</ReactNativeZoomableView>
			)
		},
		[dimensions, images, imagePreviewModalItems]
	)

	const renderThumb = useCallback(
		(item: PreviewItem, index: number) => {
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
							try {
								await viewRefs[imagePreviewModalItems[imagePreviewModalIndex].uuid]?.zoomTo(1)
							} catch (e) {
								console.log(e)
							}

							if (isBetween(index, 0, imagePreviewModalItems.length)) {
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
							}
						}}
					>
						{typeof image.thumbnail !== "string" ? (
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
						)}
						<View
							style={{
								backgroundColor: imagePreviewModalIndex == index ? "gray" : "transparent",
								width: 15,
								height: 5,
								borderRadius: 20
							}}
						/>
					</TouchableOpacity>
				</View>
			)
		},
		[imagePreviewModalItems, viewRefs, imagePreviewModalIndex]
	)

	const keyExtractor = useCallback(item => item.uuid, [])

	useEffect(() => {
		if (isMounted()) {
			setPortrait(dimensions.height >= dimensions.width)
		}
	}, [dimensions])

	useEffect(() => {
		if (isMounted()) {
			setShowControls(isZooming)
		}
	}, [isZooming])

	useEffect(() => {
		if (startIndex == -1) {
			;async () => {
				await new Promise(resolve => setTimeout(resolve, 250))

				navigation.goBack()
			}
		}
	}, [])

	if (startIndex == -1) {
		return null
	}

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
					paddingBottom: 10,
					paddingTop: 5
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
								width: "90%",
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
					marginTop: Platform.OS == "ios" ? -insets.top : 0,
					marginLeft: portrait ? 0 : -insets.left
				}}
				ref={listRef}
				data={imagePreviewModalItems}
				initialScrollIndex={imagePreviewModalIndex}
				renderItem={({ item, index }) => renderImage(item, index)}
				key={portrait ? "portrait" : "landscape"}
				extraData={portrait ? "portrait" : "landscape"}
				keyExtractor={keyExtractor}
				windowSize={2}
				initialNumToRender={1}
				horizontal={true}
				bounces={true}
				getItemLayout={(_, index) => ({ length: dimensions.width, offset: dimensions.width * index, index })}
				scrollEnabled={!isZooming && isOnline}
				pagingEnabled={true}
				onViewableItemsChanged={onViewableItemsChangedRef?.current}
				viewabilityConfig={viewabilityConfigRef?.current}
				showsVerticalScrollIndicator={false}
				showsHorizontalScrollIndicator={false}
				onScrollBeginDrag={() => (isSwiping.current = true)}
				onScrollEndDrag={() => (isSwiping.current = false)}
			/>
			<View
				style={{
					position: "absolute",
					bottom: 0,
					width: dimensions.width,
					height: bottomMargin + 63,
					zIndex: showControls ? 0 : 10000,
					backgroundColor: "rgba(0, 0, 0, 1)",
					opacity: showControls || !portrait ? 0 : 1
				}}
			/>
			<FlatList
				style={{
					position: "absolute",
					width: dimensions.width,
					bottom: bottomMargin,
					height: 60,
					opacity: showControls || !portrait ? 0 : 1,
					zIndex: showControls ? 0 : 10000,
					backgroundColor: "rgba(0, 0, 0, 1)"
				}}
				key={portrait ? "thumbs-portrait" : "thumbs-landscape"}
				extraData={portrait ? "thumbs-portrait" : "thumbs-landscape"}
				ref={thumbnailListRef}
				data={imagePreviewModalItems}
				initialScrollIndex={imagePreviewModalIndex}
				renderItem={({ item, index }) => renderThumb(item, index)}
				getItemLayout={(_, index) => ({ length: 30, offset: 30 * index, index })}
				keyExtractor={keyExtractor}
				horizontal={true}
				scrollEnabled={true}
				bounces={false}
				initialNumToRender={Math.round(dimensions.width / 30) * 2}
				windowSize={8}
				showsVerticalScrollIndicator={false}
				showsHorizontalScrollIndicator={false}
			/>
		</View>
	)
})

export default ImageViewerScreen
