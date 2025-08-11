import { useEffect, memo, useCallback, useMemo } from "react"
import { BackHandler, View, Pressable, type StyleProp, type ViewStyle, FlatList } from "react-native"
import { useGalleryStore, type GalleryItem } from "@/stores/gallery.store"
import { useShallow } from "zustand/shallow"
import { KeyboardController } from "react-native-keyboard-controller"
import { GestureViewer, useGestureViewerEvent, type GestureViewerProps } from "react-native-gesture-image-viewer"
import Image from "./previews/image"
import Video from "./previews/video"
import Audio from "./previews/audio"
import useDimensions from "@/hooks/useDimensions"
import Header from "./header"
import { useTranslation } from "react-i18next"
import { Text } from "../nativewindui/Text"
import { Portal } from "@rn-primitives/portal"
import Animated, { FadeIn, FadeOut, type AnimatedStyle } from "react-native-reanimated"
import { ActivityIndicator } from "../nativewindui/ActivityIndicator"
import { useColorScheme } from "@/lib/useColorScheme"
import { cn } from "@/lib/cn"

export const animatedStyle = {
	flex: 1,
	backgroundColor: "transparent",
	position: "absolute",
	top: 0,
	left: 0,
	right: 0,
	bottom: 0
} satisfies StyleProp<AnimatedStyle<StyleProp<ViewStyle>>>

export const Item = memo(({ item, index }: { item: GalleryItem; index: number }) => {
	const { t } = useTranslation()
	const { colors, isDarkColorScheme } = useColorScheme()
	const currentVisibleIndex = useGalleryStore(useShallow(state => state.currentVisibleIndex))
	const { screen } = useDimensions()

	const visible = useMemo(() => {
		return (currentVisibleIndex ?? -1) === index
	}, [currentVisibleIndex, index])

	const layout = useMemo(() => {
		return {
			width: screen.width,
			height: screen.height
		}
	}, [screen.width, screen.height])

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
		>
			<Pressable
				className="flex-1"
				onPress={onPress}
				onLongPress={onLongPress}
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
						<Text className="text-white">{t("gallery.noPreviewAvailable")}</Text>
					</View>
				) : (
					<View
						className="flex-1 flex-row items-center justify-center"
						style={layout}
					>
						<Text className="text-white">{t("gallery.noPreviewAvailable")}</Text>
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
	const { screen } = useDimensions()
	const initialIndex = useGalleryStore(useShallow(state => state.initialIndex))

	const layout = useMemo(() => {
		return {
			width: screen.width,
			height: screen.height
		}
	}, [screen.width, screen.height])

	const renderItem = useCallback((item: GalleryItem, index: number) => {
		return (
			<Item
				item={item}
				index={index}
			/>
		)
	}, [])

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
			length: layout.width,
			offset: layout.width * index,
			index
		}),
		[layout.width]
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

			useGalleryStore.getState().reset()

			return true
		})

		return () => {
			backHandler.remove()
		}
	}, [visible])

	if (!visible) {
		return null
	}

	return (
		<Portal name="gallery-modal">
			<Header />
			<Animated.View
				className="flex-1"
				entering={FadeIn}
				exiting={FadeOut}
				style={animatedStyle}
			>
				<GestureViewer
					data={items}
					width={screen.width}
					enableLoop={false}
					dismissThreshold={150}
					enableDismissGesture={true}
					enableDoubleTapGesture={true}
					enableSwipeGesture={true}
					enableZoomGesture={true}
					enableZoomPanGesture={true}
					onIndexChange={onIndexChange}
					maxZoomScale={10}
					renderItem={renderItem}
					ListComponent={FlatList}
					initialIndex={validatedInitialScrollIndex}
					listProps={listProps}
					onDismiss={onDismiss}
				/>
			</Animated.View>
		</Portal>
	)
})

GalleryModal.displayName = "GalleryModal"

export default GalleryModal
