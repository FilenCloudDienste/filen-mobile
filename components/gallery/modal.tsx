import { useEffect, memo, useCallback, useMemo, useState } from "react"
import { BackHandler, View, Pressable, type StyleProp, type ViewStyle, FlatList, Platform } from "react-native"
import { useGalleryStore, type GalleryItem } from "@/stores/gallery.store"
import { useShallow } from "zustand/shallow"
import { KeyboardController } from "react-native-keyboard-controller"
import { GestureViewer, useGestureViewerEvent } from "react-native-gesture-image-viewer"
import Image from "./previews/image"
import Video from "./previews/video"
import Audio from "./previews/audio"
import useDimensions from "@/hooks/useDimensions"
import Header from "./header"
import { useTranslation } from "react-i18next"
import { Text } from "../nativewindui/Text"
import { Portal } from "@rn-primitives/portal"
import Animated, { FadeIn, FadeOut, type AnimatedStyle } from "react-native-reanimated"
import { FullWindowOverlay } from "react-native-screens"
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

export const ParentComponent = memo(({ children }: { children: React.ReactNode }) => {
	if (Platform.OS === "android") {
		return <Portal name="gallery-modal">{children}</Portal>
	}

	return <FullWindowOverlay>{children}</FullWindowOverlay>
})

ParentComponent.displayName = "ParentComponent"

export const Item = memo(({ item, index }: { item: GalleryItem; index: number }) => {
	const { t } = useTranslation()
	const { colors, isDarkColorScheme } = useColorScheme()
	const currentVisibleIndex = useGalleryStore(useShallow(state => state.currentVisibleIndex))
	const [headerHeight, setHeaderHeight] = useState<number>(0)
	const [showHeader, setShowHeader] = useState<boolean>(false)
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

		setShowHeader(prev => !prev)
	}, [item.previewType])

	useGestureViewerEvent("zoomChange", ({ scale }) => {
		setShowHeader(scale <= 1)
	})

	return (
		<Animated.View
			className="flex-1 flex-row items-center justify-center overflow-hidden"
			entering={FadeIn}
			exiting={FadeOut}
		>
			<Pressable
				className="flex-1"
				onPress={onPress}
			>
				<Header
					item={item}
					show={!visible ? false : item.previewType === "image" ? showHeader : true}
					setHeaderHeight={setHeaderHeight}
				/>
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
						headerHeight={headerHeight}
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
		}
	}, [keyExtractor, getItemLayout, validatedInitialScrollIndex])

	const onDismiss = useCallback(() => {
		useGalleryStore.getState().reset()
	}, [])

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
		<ParentComponent>
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
		</ParentComponent>
	)
})

GalleryModal.displayName = "GalleryModal"

export default GalleryModal
