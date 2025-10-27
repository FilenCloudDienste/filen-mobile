import { useEffect, memo, useCallback, useMemo } from "react"
import { BackHandler, View, Pressable, type StyleProp, type ViewStyle, FlatList, Platform, Modal } from "react-native"
import { useGalleryStore, type GalleryItem } from "@/stores/gallery.store"
import { useShallow } from "zustand/shallow"
import { KeyboardController } from "react-native-keyboard-controller"
import { GestureViewer, useGestureViewerEvent, type GestureViewerProps } from "react-native-gesture-image-viewer"
import Image from "./previews/image"
import Video from "./previews/video"
import Audio from "./previews/audio"
import useDimensions from "@/hooks/useDimensions"
import Header from "./header"
import { translateMemoized } from "@/lib/i18n"
import { Text } from "../nativewindui/Text"
import Animated, { FadeIn, FadeOut, type AnimatedStyle } from "react-native-reanimated"
import { ActivityIndicator } from "../nativewindui/ActivityIndicator"
import { useColorScheme } from "@/lib/useColorScheme"
import { cn } from "@/lib/cn"
import { Portal } from "@rn-primitives/portal"

export const Item = memo(({ item, index, layout }: { item: GalleryItem; index: number; layout: { width: number; height: number } }) => {
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

export const ParentComponent = memo(({ children }: { children: React.ReactNode }) => {
	if (Platform.OS === "android") {
		return <Portal name="biometric-modal">{children}</Portal>
	}

	return (
		<Modal
			testID="fullScreenLoadingModal"
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
		>
			{children}
		</Modal>
	)
})

ParentComponent.displayName = "ParentComponent"

export const GalleryModal = memo(() => {
	const visible = useGalleryStore(useShallow(state => state.visible))
	const items = useGalleryStore(useShallow(state => state.items))
	const { window } = useDimensions()
	const initialIndex = useGalleryStore(useShallow(state => state.initialIndex))

	const layout = useMemo(() => {
		return {
			width: window.width,
			height: window.height
		}
	}, [window.width, window.height])

	const renderItem = useCallback(
		(item: GalleryItem, index: number) => {
			return (
				<Item
					item={item}
					index={index}
					layout={layout}
				/>
			)
		},
		[layout]
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

	const onDismissStart = useCallback(() => {
		useGalleryStore.getState().setShowHeader(false)
	}, [])

	const animatedStyle = useMemo(() => {
		return {
			flex: 1,
			backgroundColor: "transparent",
			position: "absolute",
			width: layout.width,
			height: layout.height,
			top: 0,
			left: 0,
			right: 0,
			bottom: 0
		} satisfies StyleProp<AnimatedStyle<StyleProp<ViewStyle>>>
	}, [layout.width, layout.height])

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
		<ParentComponent>
			<Header />
			<Animated.View
				className="flex-1"
				entering={FadeIn}
				exiting={FadeOut}
				style={animatedStyle}
			>
				<GestureViewer
					data={items}
					width={window.width}
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
		</ParentComponent>
	)
})

GalleryModal.displayName = "GalleryModal"

export default GalleryModal
