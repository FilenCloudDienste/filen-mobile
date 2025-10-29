import { useEffect, memo, useCallback, useMemo } from "react"
import { BackHandler, View, Pressable, FlatList, Platform, Modal, useWindowDimensions } from "react-native"
import { useGalleryStore, type GalleryItem } from "@/stores/gallery.store"
import { useShallow } from "zustand/shallow"
import { KeyboardController } from "react-native-keyboard-controller"
import { GestureViewer, useGestureViewerEvent, type GestureViewerProps } from "react-native-gesture-image-viewer"
import Image from "./previews/image"
import Video from "./previews/video"
import Audio from "./previews/audio"
import Header from "./header"
import { translateMemoized } from "@/lib/i18n"
import { Text } from "../nativewindui/Text"
import Animated, { FadeIn, FadeOut } from "react-native-reanimated"
import { ActivityIndicator } from "../nativewindui/ActivityIndicator"
import { useColorScheme } from "@/lib/useColorScheme"
import { cn } from "@/lib/cn"
import { PortalHost } from "@rn-primitives/portal"
import * as ScreenOrientation from "expo-screen-orientation"
import useLockOrientation from "@/hooks/useLockOrientation"

export const Item = memo(({ item, index, layout }: { item: GalleryItem; index: number; layout: { width: number; height: number } }) => {
	useLockOrientation(ScreenOrientation.OrientationLock.PORTRAIT_UP)

	const { colors, isDarkColorScheme } = useColorScheme()
	const currentVisibleIndex = useGalleryStore(useShallow(state => state.currentVisibleIndex))

	const visible = useMemo(() => {
		return (currentVisibleIndex ?? -1) === index
	}, [currentVisibleIndex, index])

	const onPress = useCallback(() => {
		if (item.previewType !== "image") {
			return
		}

		useGalleryStore.getState().setShowHeader(prev => !prev)
	}, [item.previewType])

	const onLongPress = useCallback(() => {
		if (item.previewType !== "image") {
			return
		}

		useGalleryStore.getState().setShowHeader(false)
	}, [item.previewType])

	return (
		<Animated.View
			className="flex-1 flex-row items-center justify-center overflow-hidden"
			entering={FadeIn}
			exiting={FadeOut}
			style={layout}
		>
			<Pressable
				className="flex-1"
				onPress={onPress}
				onLongPress={onLongPress}
				style={layout}
			>
				{!visible ? (
					<Animated.View
						exiting={FadeOut}
						className={cn(
							"flex-1 items-center justify-center",
							item.previewType === "image" || item.previewType === "video"
								? isDarkColorScheme
									? "bg-black"
									: "bg-white"
								: "bg-background"
						)}
						style={layout}
					>
						<ActivityIndicator
							color={colors.foreground}
							size="small"
						/>
					</Animated.View>
				) : item.previewType === "image" ? (
					<Image
						layout={layout}
						item={item}
					/>
				) : item.previewType === "video" ? (
					<Video
						layout={layout}
						item={item}
					/>
				) : item.previewType === "audio" ? (
					<Audio
						layout={layout}
						item={item}
					/>
				) : item.previewType === "unknown" ? (
					<View
						className="flex-1 flex-row items-center justify-center"
						style={layout}
					>
						<Text className="text-white">{translateMemoized("gallery.noPreviewAvailable")}</Text>
					</View>
				) : (
					<View
						className="flex-1 flex-row items-center justify-center"
						style={layout}
					>
						<Text className="text-white">{translateMemoized("gallery.noPreviewAvailable")}</Text>
					</View>
				)}
			</Pressable>
		</Animated.View>
	)
})

Item.displayName = "Item"

export const GalleryModal = memo(() => {
	const visible = useGalleryStore(useShallow(state => state.visible))
	const items = useGalleryStore(useShallow(state => state.items))
	const dimensions = useWindowDimensions()
	const initialIndex = useGalleryStore(useShallow(state => state.initialIndex))

	const renderItem = useCallback(
		(item: GalleryItem, index: number) => {
			return (
				<Item
					item={item}
					index={index}
					layout={{
						width: dimensions.width,
						height: dimensions.height
					}}
				/>
			)
		},
		[dimensions]
	)

	const keyExtractor = useCallback((item: GalleryItem) => {
		return item.itemType === "cloudItem" ? item.data.item.uuid : item.data.uri
	}, [])

	const validatedInitialScrollIndex = useMemo(() => {
		if (!initialIndex) {
			return undefined
		}

		return items.at(initialIndex) ? initialIndex : undefined
	}, [items, initialIndex])

	const getItemLayout = useCallback(
		(_: unknown, index: number) => ({
			length: dimensions.width,
			offset: dimensions.width * index,
			index
		}),
		[dimensions.width]
	)

	const onIndexChange = useCallback((index: number) => {
		useGalleryStore.getState().setCurrentVisibleIndex(index)
	}, [])

	const listProps = useMemo(() => {
		return {
			keyExtractor: keyExtractor as (item: unknown) => string,
			windowSize: 3,
			initialNumToRender: 3,
			updateCellsBatchingPeriod: 100,
			showsVerticalScrollIndicator: false,
			showsHorizontalScrollIndicator: false,
			maxToRenderPerBatch: 3,
			getItemLayout,
			removeClippedSubviews: false,
			initialScrollIndex: validatedInitialScrollIndex
		} satisfies GestureViewerProps<GalleryItem, typeof FlatList>["listProps"]
	}, [keyExtractor, getItemLayout, validatedInitialScrollIndex])

	const onDismiss = useCallback(() => {
		useGalleryStore.getState().reset()
	}, [])

	const onDismissStart = useCallback(() => {
		useGalleryStore.getState().setShowHeader(false)
	}, [])

	useGestureViewerEvent("zoomChange", ({ scale }) => {
		useGalleryStore.getState().setShowHeader(scale <= 1)
	})

	useEffect(() => {
		if (visible && items.length > 0 && KeyboardController.isVisible()) {
			KeyboardController.dismiss().catch(console.error)
		}
	}, [visible, items.length])

	useEffect(() => {
		const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
			if (!visible) {
				return false
			}

			onDismiss()

			return true
		})

		return () => {
			backHandler.remove()
		}
	}, [visible, onDismiss])

	if (!visible) {
		return null
	}

	return (
		<Modal
			visible={true}
			transparent={true}
			animationType="none"
			presentationStyle="overFullScreen"
			onRequestClose={e => {
				e.preventDefault()
				e.stopPropagation()
			}}
			statusBarTranslucent={true}
			navigationBarTranslucent={true}
			allowSwipeDismissal={false}
			supportedOrientations={["portrait", "landscape"]}
			className="flex-1"
		>
			<View className="flex-1">
				<Header />
				<Animated.View
					className="flex-1"
					entering={FadeIn}
					exiting={FadeOut}
				>
					<GestureViewer
						data={items}
						width={dimensions.width}
						enableLoop={false}
						dismissThreshold={150}
						enableDismissGesture={true}
						enableDoubleTapGesture={true}
						enableSwipeGesture={true}
						enableZoomGesture={true}
						enableZoomPanGesture={true}
						onIndexChange={onIndexChange}
						maxZoomScale={3}
						renderItem={renderItem}
						ListComponent={FlatList}
						initialIndex={validatedInitialScrollIndex}
						listProps={listProps}
						onDismiss={onDismiss}
						onDismissStart={onDismissStart}
					/>
				</Animated.View>
				{Platform.OS === "android" && <PortalHost />}
			</View>
		</Modal>
	)
})

GalleryModal.displayName = "GalleryModal"

export default GalleryModal
