import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, { useAnimatedStyle, useSharedValue, withSpring, runOnJS, useAnimatedReaction, interpolate } from "react-native-reanimated"
import { memo, useState, useMemo, useCallback } from "react"
import { View, ActivityIndicator } from "react-native"
import { type GalleryItem, useGalleryStore } from "@/stores/gallery.store"
import { Text } from "@/components/nativewindui/Text"
import { useColorScheme } from "@/lib/useColorScheme"
import Image from "./image"
import Video from "./video"
import Audio from "./audio"
import { useShallow } from "zustand/shallow"
import Header from "../header"

export type XY = {
	x: number
	y: number
}

export type WH = {
	width: number
	height: number
}

export const DEFAULT_PAN_ACTIVATE_OFFSET: XY = {
	x: Number.MAX_VALUE,
	y: 30
}

export const SPRING_CONFIG = {
	damping: 10,
	stiffness: 300,
	mass: 1,
	overshootClamping: true,
	restDisplacementThreshold: 0.01,
	restSpeedThreshold: 0.01
}

export const MIN_SCALE = 1
export const MAX_SCALE = 10

export const Item = memo(
	({
		setScrollEnabled,
		panEnabled,
		pinchEnabled,
		doubleTapEnabled,
		swipeToCloseEnabled,
		item,
		index,
		layout,
		scrolling
	}: {
		setScrollEnabled: React.Dispatch<React.SetStateAction<boolean>>
		panEnabled: boolean
		pinchEnabled: boolean
		doubleTapEnabled: boolean
		swipeToCloseEnabled: boolean
		item: GalleryItem
		index: number
		layout: WH
		scrolling: boolean
	}) => {
		const translateY = useSharedValue<number>(0)
		const translateX = useSharedValue<number>(0)
		const offsetX = useSharedValue<number>(0)
		const offsetY = useSharedValue<number>(0)
		const scale = useSharedValue<number>(1)
		const scaleOffset = useSharedValue<number>(0)
		const [panActivateOffset, setPanActivateOffset] = useState<XY>(DEFAULT_PAN_ACTIVATE_OFFSET)
		const currentVisibleIndex = useGalleryStore(useShallow(state => state.currentVisibleIndex))
		const { colorScheme, colors } = useColorScheme()
		const setZoomedIn = useGalleryStore(useShallow(state => state.setZoomedIn))
		const lastFocalX = useSharedValue<number>(0)
		const lastFocalY = useSharedValue<number>(0)
		const galleryVisible = useGalleryStore(useShallow(state => state.visible))
		const setGalleryVisible = useGalleryStore(useShallow(state => state.setVisible))
		const [showHeader, setShowHeader] = useState<boolean>(false)
		const [headerHeight, setHeaderHeight] = useState<number>(0)

		const visible = useMemo(() => {
			return (
				(currentVisibleIndex ?? -1) === index ||
				((currentVisibleIndex ?? -1) + 1 === index && item.previewType === "image") ||
				((currentVisibleIndex ?? -1) - 1 === index && item.previewType === "image")
			)
		}, [currentVisibleIndex, index, item.previewType])

		const goBack = useCallback(() => {
			if (!galleryVisible) {
				return
			}

			setGalleryVisible(false)
		}, [setGalleryVisible, galleryVisible])

		const toggleHeader = useCallback(() => {
			setShowHeader(prev => !prev)
		}, [setShowHeader])

		const clamp = useCallback((value: number, min: number, max: number) => {
			"worklet"

			return Math.min(Math.max(value, min), max)
		}, [])

		const reset = useCallback(() => {
			"worklet"

			scale.value = withSpring(1, SPRING_CONFIG)
			scaleOffset.value = 0
			translateX.value = withSpring(0, SPRING_CONFIG)
			translateY.value = withSpring(0, SPRING_CONFIG)
			offsetX.value = withSpring(0, SPRING_CONFIG)
			offsetY.value = withSpring(0, SPRING_CONFIG)
		}, [scale, scaleOffset, translateX, translateY, offsetX, offsetY])

		const doubleTapGesture = useMemo(() => {
			return Gesture.Tap()
				.enabled(!scrolling && doubleTapEnabled && item.previewType === "image")
				.numberOfTaps(2)
				.onStart(() => {
					"worklet"

					if (scale.value !== 1) {
						reset()
					} else {
						scale.value = withSpring(2.5, SPRING_CONFIG)
						scaleOffset.value = scale.value
					}
				})
		}, [scale, scaleOffset, reset, doubleTapEnabled, item.previewType, scrolling])

		const singleTapGesture = useMemo(() => {
			return Gesture.Tap()
				.enabled(!scrolling && item.previewType === "image")
				.numberOfTaps(1)
				.onStart(() => {
					"worklet"

					runOnJS(toggleHeader)()
				})
		}, [toggleHeader, item.previewType, scrolling])

		const pinchGesture = useMemo(() => {
			return Gesture.Pinch()
				.enabled(!scrolling && pinchEnabled && item.previewType === "image")
				.onStart(e => {
					"worklet"

					scaleOffset.value = scale.value
					offsetX.value = translateX.value
					offsetY.value = translateY.value
					lastFocalX.value = e.focalX
					lastFocalY.value = e.focalY
				})
				.onUpdate(e => {
					"worklet"

					const newScale = clamp(scaleOffset.value * e.scale, MIN_SCALE, MAX_SCALE)
					const focalX = e.focalX
					const focalY = e.focalY
					const viewCenterX = layout.width / 2
					const viewCenterY = layout.height / 2
					const focusX = focalX - viewCenterX
					const focusY = focalY - viewCenterY

					if (scale.value !== newScale) {
						const oldFocalX = (focusX - translateX.value) / scale.value
						const oldFocalY = (focusY - translateY.value) / scale.value
						const newFocalX = oldFocalX * newScale
						const newFocalY = oldFocalY * newScale
						const newTranslateX = focusX - newFocalX
						const newTranslateY = focusY - newFocalY
						const maxTranslateX = (layout.width * (newScale - 1)) / 2
						const maxTranslateY = (layout.height * (newScale - 1)) / 2

						translateX.value = clamp(newTranslateX, -maxTranslateX, maxTranslateX)
						translateY.value = clamp(newTranslateY, -maxTranslateY, maxTranslateY)
						scale.value = newScale
					}
				})
				.onEnd(() => {
					"worklet"

					offsetX.value = translateX.value
					offsetY.value = translateY.value

					if (scale.value <= MIN_SCALE) {
						reset()

						lastFocalX.value = 0
						lastFocalY.value = 0
					}
				})
		}, [
			scale,
			scaleOffset,
			reset,
			pinchEnabled,
			layout.width,
			layout.height,
			translateX,
			translateY,
			offsetX,
			offsetY,
			clamp,
			lastFocalX,
			lastFocalY,
			scrolling,
			item.previewType
		])

		const panGesture = useMemo(() => {
			return Gesture.Pan()
				.enabled(!scrolling && (swipeToCloseEnabled ? true : panEnabled))
				.enableTrackpadTwoFingerGesture(true)
				.activeOffsetX(panActivateOffset.x)
				.activeOffsetY(panActivateOffset.y)
				.maxPointers(1)
				.onStart(() => {
					"worklet"

					offsetX.value = translateX.value
					offsetY.value = translateY.value
				})
				.onUpdate(e => {
					runOnJS(setShowHeader)(false)

					if (scale.value !== 1 && panEnabled) {
						translateX.value = offsetX.value + e.translationX
						translateY.value = offsetY.value + e.translationY
					}

					if (scale.value === 1 && swipeToCloseEnabled) {
						translateX.value = e.translationX
						translateY.value = Math.max(0, e.translationY)
					}
				})
				.onEnd(e => {
					"worklet"

					offsetX.value = translateX.value
					offsetY.value = translateY.value

					if (scale.value === 1 && e.translationY > 150) {
						runOnJS(goBack)()

						return
					}

					if (scale.value === 1) {
						reset()
					}
				})
		}, [
			goBack,
			translateX,
			translateY,
			panActivateOffset.y,
			panActivateOffset.x,
			setShowHeader,
			offsetX,
			offsetY,
			scale,
			reset,
			panEnabled,
			swipeToCloseEnabled,
			scrolling
		])

		const animatedStyle = useAnimatedStyle(() => ({
			transform: [
				{
					translateY: translateY.value
				},
				{
					translateX: translateX.value
				},
				{
					scale: scale.value === 1 ? interpolate(translateY.value, [0, Math.floor(layout.height / 2)], [1, 0]) : scale.value
				}
			]
		}))

		const backgroundColorStyle = useAnimatedStyle(() => ({
			backgroundColor:
				colorScheme === "dark"
					? `rgba(0, 0, 0, ${scale.value !== 1 ? 1 : interpolate(translateY.value, [0, Math.floor(layout.height / 2)], [1, 0])})`
					: `rgba(255, 255, 255, ${
							scale.value !== 1 ? 1 : interpolate(translateY.value, [0, Math.floor(layout.height / 2)], [1, 0])
					  })`
		}))

		const gestures = useMemo(() => {
			return Gesture.Exclusive(Gesture.Race(panGesture, pinchGesture), Gesture.Exclusive(doubleTapGesture, singleTapGesture))
		}, [panGesture, pinchGesture, doubleTapGesture, singleTapGesture])

		const fullScreenStyle = useMemo(() => {
			return {
				width: layout.width,
				height: layout.height
			}
		}, [layout.width, layout.height])

		useAnimatedReaction(
			() => {
				return {
					scale: scale.value
				}
			},
			state => {
				"worklet"

				if (state.scale !== 1) {
					runOnJS(setScrollEnabled)(false)
					runOnJS(setPanActivateOffset)({
						x: 0,
						y: 0
					})
					runOnJS(setShowHeader)(false)
					runOnJS(setZoomedIn)(true)
				} else {
					runOnJS(setScrollEnabled)(true)
					runOnJS(setPanActivateOffset)(DEFAULT_PAN_ACTIVATE_OFFSET)
					runOnJS(setZoomedIn)(false)
				}
			},
			[scale]
		)

		return (
			<Animated.View
				className="flex-1 flex-row items-center justify-center overflow-hidden"
				style={[backgroundColorStyle, fullScreenStyle]}
			>
				<Animated.View
					className="flex-1"
					style={[animatedStyle, fullScreenStyle]}
				>
					<Header
						item={item}
						show={showHeader}
						setHeaderHeight={setHeaderHeight}
					/>
					<GestureDetector gesture={gestures}>
						{visible ? (
							<View
								className="flex-1"
								style={fullScreenStyle}
								collapsable={false}
							>
								{item.previewType === "image" ? (
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
										style={fullScreenStyle}
									>
										<Text className="text-white">No preview available</Text>
									</View>
								) : (
									<View
										className="flex-1 flex-row items-center justify-center"
										style={fullScreenStyle}
									>
										<Text className="text-white">No preview available</Text>
									</View>
								)}
							</View>
						) : (
							<View
								className="flex-1 bg-background flex-row items-center justify-center"
								style={fullScreenStyle}
							>
								<ActivityIndicator color={colors.foreground} />
							</View>
						)}
					</GestureDetector>
				</Animated.View>
			</Animated.View>
		)
	}
)

Item.displayName = "Item"

export default Item
