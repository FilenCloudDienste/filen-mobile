import { memo, useCallback, useState, useMemo, useRef } from "react"
import { type GestureResponderEvent, View } from "react-native"
import * as Linking from "expo-linking"
import alerts from "@/lib/alerts"
import { useGalleryStore } from "@/stores/gallery.store"
import { Image as ExpoImage, type ImageLoadEventData, type ImageErrorEventData } from "expo-image"
import { Button } from "@/components/nativewindui/Button"
import useDimensions from "@/hooks/useDimensions"
import useViewLayout from "@/hooks/useViewLayout"
import Fallback from "./fallback"
import { useMMKVObject } from "react-native-mmkv"
import mmkvInstance from "@/lib/mmkv"

export type ImageDimensions = {
	width: number
	height: number
}

export const Image = memo(({ source, link }: { source: string; link: string }) => {
	const [loadSuccess, setLoadSuccess] = useState<boolean>(false)
	const { screen } = useDimensions()
	const [dimensions, setDimensions] = useMMKVObject<ImageDimensions>(`chatEmbedImageDimensions:${source}`, mmkvInstance)
	const viewRef = useRef<View>(null)
	const { onLayout, layout } = useViewLayout(viewRef)
	const [error, setError] = useState<string | null>(null)

	const onPress = useCallback(
		async (e: GestureResponderEvent) => {
			e.preventDefault()
			e.stopPropagation()

			if (loadSuccess) {
				useGalleryStore.getState().setItems([
					{
						itemType: "remoteItem" as const,
						previewType: "image",
						data: {
							uri: source
						}
					}
				])

				useGalleryStore.getState().setInitialUUID(source)
				useGalleryStore.getState().setVisible(true)

				return
			}

			try {
				if (!(await Linking.canOpenURL(link))) {
					throw new Error("Cannot open URL.")
				}

				await Linking.openURL(link)
			} catch (e) {
				console.error(e)

				if (e instanceof Error) {
					alerts.error(e.message)
				}
			}
		},
		[link, loadSuccess, source]
	)

	const onLoad = useCallback(
		(e: ImageLoadEventData) => {
			setLoadSuccess(true)

			setDimensions({
				width: e.source.width,
				height: e.source.height
			})
		},
		[setDimensions]
	)

	const onError = useCallback((e: ImageErrorEventData) => {
		setLoadSuccess(false)
		setError(e.error)
	}, [])

	const { height, width } = useMemo(() => {
		if (!dimensions) {
			return {
				height: 1,
				width: 1
			}
		}

		const defaultMaxHeight = screen.height / 4
		const defaultMaxWidth = layout.width
		const aspectRatio = dimensions.width / dimensions.height
		const maxHeight = Math.min(dimensions.height, defaultMaxHeight)
		const maxWidth = Math.min(dimensions.width, defaultMaxWidth)
		const calculatedHeight = Math.min(maxHeight, maxWidth / aspectRatio)
		const calculatedWidth = Math.min(maxWidth, maxHeight * aspectRatio)

		return {
			height: calculatedHeight,
			width: calculatedWidth
		}
	}, [dimensions, screen.height, layout.width])

	if (error) {
		return <Fallback link={link} />
	}

	return (
		<Button
			variant="plain"
			size="none"
			unstable_pressDelay={100}
			onPress={onPress}
			className="flex-1 active:opacity-70 basis-full"
		>
			<View
				ref={viewRef}
				onLayout={onLayout}
				style={{
					width,
					height,
					flex: 1,
					opacity: loadSuccess && dimensions ? 1 : 0
				}}
			>
				<ExpoImage
					source={{
						uri: source
					}}
					priority="low"
					cachePolicy="disk"
					contentPosition="left"
					contentFit="contain"
					onLoad={onLoad}
					onError={onError}
					style={{
						width,
						height,
						borderRadius: 6,
						opacity: loadSuccess && dimensions ? 1 : 0
					}}
				/>
			</View>
		</Button>
	)
})

Image.displayName = "Image"

export default Image
