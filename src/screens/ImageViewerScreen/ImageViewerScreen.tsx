import React, { memo, useEffect, useState, useRef, useCallback } from "react"
import { ActivityIndicator, Text, View, TouchableOpacity, FlatList, Pressable, Platform, ImageBackground } from "react-native"
import Ionicon from "@expo/vector-icons/Ionicons"
import { downloadFile } from "../../lib/services/download/download"
import { navigationAnimation } from "../../lib/state"
import { generateItemThumbnail } from "../../lib/services/thumbnails"
import { getImageForItem } from "../../assets/thumbnails"
import { NavigationContainerRef } from "@react-navigation/native"
import { showToast } from "../../components/Toasts"
import { getFileExt, toExpoFsPath, isBetween, getFilePreviewType, canCompressThumbnail } from "../../lib/helpers"
import { THUMBNAIL_BASE_PATH } from "../../lib/constants"
import { getItemOfflinePath } from "../../lib/services/offline"
import * as fs from "../../lib/fs"
import { Item } from "../../types"
import { useStore } from "../../lib/state"
import useDimensions from "../../lib/hooks/useDimensions"
import { FlashList } from "@shopify/flash-list"
import Zoom from "react-native-zoom-reanimated"
import Image from "react-native-fast-image"

const Zoomer = Zoom as any

export type PreviewItem = {
	uri: string | undefined
	name: string
	index: number
	uuid: string
	thumbnail: string | undefined
	file: Item
}

const ImageViewerScreen = memo(
	({ navigation, route }: { navigation: NavigationContainerRef<ReactNavigation.RootParamList>; route: any }) => {
		const uuid = useRef<string>(route.params.uuid)
		const [images, setImages] = useState<Record<string, string>>({})
		const thumbnailListRef = useRef<FlashList<PreviewItem>>()
		const listRef = useRef<FlatList<PreviewItem>>()
		const [showControls, setShowControls] = useState<boolean>(false)
		const currentImagePreviewDownloads = useRef<Record<string, boolean>>({}).current
		const setListScrollAgain = useRef<boolean>(false)
		const dimensions = useDimensions()
		const didLoadFirstImage = useRef<boolean>(false)

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

					if (getFilePreviewType(ext) === "image" && canCompressThumbnail(ext)) {
						if (item.uuid === uuid.current) {
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

				if (items.length === 1) {
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

		const loadImage = async (image: PreviewItem, index: number) => {
			if (typeof images[image.uuid] === "string" || typeof currentImagePreviewDownloads[image.uuid] !== "undefined") {
				return
			}

			currentImagePreviewDownloads[image.uuid] = true

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
				const offlinePath = getItemOfflinePath(await fs.getDownloadPath({ type: "offline" }), image.file)

				if ((await fs.stat(offlinePath)).exists) {
					setImages(prev => ({
						...prev,
						[image.uuid]: toExpoFsPath(offlinePath)
					}))

					return
				}
			} catch (e) {
				console.error(e)
			}

			downloadFile(image.file, false, image.file.chunks)
				.then(path => {
					delete currentImagePreviewDownloads[image.uuid]

					generateItemThumbnail({
						item: image.file,
						skipInViewCheck: true,
						callback: (err: Error, thumbPath: string) => {
							if (!err && typeof thumbPath === "string") {
								updateItemThumbnail(image, toExpoFsPath(thumbPath))
							}

							setImages(prev => ({
								...prev,
								[image.uuid]: toExpoFsPath(path)
							}))
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
			if (viewableItems.length <= 0 || !viewableItems[0].item) {
				return
			}

			loadImage(viewableItems[0].item, viewableItems[0].index).catch(console.error)
		})

		const updateItemThumbnail = useCallback((item: PreviewItem, path: string) => {
			if (path.length < 4) {
				return
			}

			setImagePreviewModalItems(prev => [
				...prev.map(mapItem =>
					mapItem.file.uuid === item.uuid && typeof mapItem.thumbnail === "undefined"
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
			({ item, index }: { item: PreviewItem; index: number }) => {
				const image = item

				if (typeof image.thumbnail !== "string") {
					return (
						<View
							key={image.uuid}
							style={{
								width: dimensions.realWidth,
								height: dimensions.realHeight
							}}
						>
							<ActivityIndicator
								size="small"
								color="white"
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
					<Pressable
						style={{
							width: dimensions.realWidth,
							height: dimensions.realHeight
						}}
						onResponderMove={() => console.log("moving")}
						onPress={() => setShowControls(prev => !prev)}
						onLongPress={() => setShowControls(false)}
					>
						<Zoomer>
							<ImageBackground
								source={{
									uri: decodeURIComponent("file://" + THUMBNAIL_BASE_PATH + image.thumbnail)
								}}
								resizeMode="contain"
								style={{
									width: dimensions.realWidth,
									height: dimensions.realHeight
								}}
							>
								{typeof images[image.uuid] === "string" && (
									<Image
										source={{
											uri: decodeURIComponent(
												images[image.uuid].startsWith("file://")
													? images[image.uuid]
													: "file://" + images[image.uuid]
											),
											priority: "high"
										}}
										resizeMode="contain"
										style={{
											width: dimensions.realWidth,
											height: dimensions.realHeight
										}}
									/>
								)}
							</ImageBackground>
							{typeof images[image.uuid] !== "string" && (
								<ActivityIndicator
									size="small"
									color="white"
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
						</Zoomer>
					</Pressable>
				)
			},
			[dimensions, images, imagePreviewModalItems]
		)

		const renderThumb = useCallback(
			({ item, index }: { item: PreviewItem; index: number }) => {
				const image = item

				return (
					<TouchableOpacity
						style={{
							width: 30,
							height: 45,
							flexDirection: "column",
							justifyContent: "space-between",
							alignItems: "center"
						}}
						onPress={async () => {
							if (isBetween(index, 0, imagePreviewModalItems.length)) {
								setListScrollAgain.current = true

								thumbnailListRef?.current?.scrollToIndex({
									animated: false,
									index,
									viewPosition: 0.5
								})

								listRef?.current?.scrollToOffset({
									animated: false,
									offset: dimensions.realWidth * index + 1
								})

								loadImage(imagePreviewModalItems[index], index).catch(console.error)
							}
						}}
					>
						<View
							style={{
								flexDirection: "row",
								alignItems: "center",
								justifyContent: "center",
								width: "100%",
								height: 35
							}}
						>
							{typeof image.thumbnail !== "string" ? (
								<Image
									source={getImageForItem(image.file)}
									resizeMode="cover"
									style={{
										width: 18,
										height: 25
									}}
								/>
							) : (
								<Image
									source={{
										uri: decodeURIComponent("file://" + THUMBNAIL_BASE_PATH + image.thumbnail),
										priority: "high"
									}}
									resizeMode="cover"
									style={{
										width: "100%",
										height: 35
									}}
								/>
							)}
						</View>
						<View
							style={{
								backgroundColor: imagePreviewModalIndex === index ? "gray" : "transparent",
								width: 15,
								height: 5,
								borderRadius: 20
							}}
						/>
					</TouchableOpacity>
				)
			},
			[imagePreviewModalItems, imagePreviewModalIndex, dimensions]
		)

		const keyExtractor = useCallback((item: PreviewItem) => item.uuid, [])

		useEffect(() => {
			if (startIndex === -1) {
				;async () => {
					await new Promise(resolve => setTimeout(resolve, 500))

					if (navigation.canGoBack()) {
						navigation.goBack()
					}
				}
			} else {
				if (!didLoadFirstImage.current && imagePreviewModalItems[startIndex]) {
					didLoadFirstImage.current = true

					loadImage(imagePreviewModalItems[startIndex], startIndex).catch(console.error)
				}
			}
		}, [])

		if (startIndex === -1) {
			return null
		}

		return (
			<View
				style={{
					backgroundColor: "black",
					width: dimensions.realWidth,
					height: dimensions.realHeight
				}}
			>
				<View
					style={{
						opacity: showControls ? 0 : 1,
						flexDirection: "row",
						height: "auto",
						width: dimensions.realWidth,
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
				<View
					style={{
						width: dimensions.realWidth,
						height: dimensions.realHeight
					}}
				>
					<FlatList
						extraData={{
							dimensions,
							images,
							imagePreviewModalItems
						}}
						ref={listRef}
						data={imagePreviewModalItems}
						initialScrollIndex={imagePreviewModalIndex}
						renderItem={renderImage}
						key={dimensions.isPortrait ? "portrait" : "landscape"}
						keyExtractor={keyExtractor}
						getItemLayout={(_, index) => ({
							length: dimensions.realWidth,
							offset: dimensions.realWidth * index,
							index
						})}
						initialNumToRender={3}
						windowSize={3}
						horizontal={true}
						bounces={false}
						scrollEnabled={true}
						pagingEnabled={true}
						onViewableItemsChanged={onViewableItemsChangedRef?.current}
						viewabilityConfig={viewabilityConfigRef?.current}
						showsVerticalScrollIndicator={false}
						showsHorizontalScrollIndicator={false}
					/>
				</View>
				<View
					style={{
						position: "absolute",
						bottom: 0,
						width: dimensions.realWidth,
						zIndex: showControls ? 1 : 10000,
						height:
							Platform.OS === "ios"
								? dimensions.insets.bottom + 50
								: dimensions.insets.bottom + dimensions.navigationBarHeight + 50,
						backgroundColor: "black",
						opacity: showControls ? 0 : 1
					}}
				>
					<FlashList
						key={dimensions.isPortrait ? "thumbs-portrait" : "thumbs-landscape"}
						extraData={{
							imagePreviewModalItems,
							imagePreviewModalIndex,
							dimensions
						}}
						ref={thumbnailListRef}
						data={imagePreviewModalItems}
						initialScrollIndex={imagePreviewModalIndex}
						renderItem={renderThumb}
						estimatedItemSize={30}
						keyExtractor={keyExtractor}
						horizontal={true}
						scrollEnabled={true}
						bounces={false}
						estimatedListSize={{
							width: dimensions.realWidth,
							height: 45
						}}
						showsVerticalScrollIndicator={false}
						showsHorizontalScrollIndicator={false}
					/>
				</View>
			</View>
		)
	}
)

export default ImageViewerScreen
