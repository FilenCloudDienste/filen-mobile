import { memo, useCallback, useState, useMemo, useRef } from "react"
import { type GestureResponderEvent, View, type NativeSyntheticEvent } from "react-native"
import * as Linking from "expo-linking"
import alerts from "@/lib/alerts"
import { useGalleryStore } from "@/stores/gallery.store"
import { Button } from "@/components/nativewindui/Button"
import useDimensions from "@/hooks/useDimensions"
import useViewLayout from "@/hooks/useViewLayout"
import Fallback from "./fallback"
import { useMMKVObject } from "react-native-mmkv"
import mmkvInstance from "@/lib/mmkv"
import { xxHash32 } from "js-xxhash"
import useChatEmbedContainerStyle from "@/hooks/useChatEmbedContainerStyle"
import TurboImage, { type Success, type Failure } from "react-native-turbo-image"
import assets from "@/lib/assets"

export type ImageDimensions = {
	width: number
	height: number
}

export const Image = memo(({ source, link }: { source: string; link: string }) => {
	const [loadSuccess, setLoadSuccess] = useState<boolean>(false)
	const { screen } = useDimensions()
	const [dimensions, setDimensions] = useMMKVObject<ImageDimensions>(
		`chatEmbedImageDimensions:${xxHash32(`${source}:${link}`).toString(16)}`,
		mmkvInstance
	)
	const viewRef = useRef<View>(null)
	const { onLayout, layout } = useViewLayout(viewRef)
	const [error, setError] = useState<string | null>(null)
	const chatEmbedContainerStyle = useChatEmbedContainerStyle()

	const onPress = useCallback(
		async (e: GestureResponderEvent) => {
			e.preventDefault()
			e.stopPropagation()

			if (loadSuccess) {
				useGalleryStore.getState().open({
					items: [
						{
							itemType: "remoteItem" as const,
							previewType: "image",
							data: {
								uri: source
							}
						}
					],
					initialUUIDOrURI: source
				})

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

	const onSuccess = useCallback(
		(e: NativeSyntheticEvent<Success>) => {
			setLoadSuccess(true)

			setDimensions({
				width: e.nativeEvent.width,
				height: e.nativeEvent.height
			})
		},
		[setDimensions]
	)

	const onFailure = useCallback((e: NativeSyntheticEvent<Failure>) => {
		setLoadSuccess(false)
		setError(e.nativeEvent.error)
	}, [])

	const { height, width } = useMemo(() => {
		if (!dimensions) {
			const defaultMaxHeight = 100
			const defaultMaxWidth = layout.width
			const aspectRatio = defaultMaxWidth / defaultMaxHeight
			const maxHeight = Math.min(defaultMaxHeight, defaultMaxHeight)
			const maxWidth = Math.min(defaultMaxWidth, defaultMaxWidth)
			const calculatedHeight = Math.min(maxHeight, maxWidth / aspectRatio)
			const calculatedWidth = Math.min(maxWidth, maxHeight * aspectRatio)

			return {
				height: calculatedHeight,
				width: calculatedWidth
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

	const imageSource = useMemo(() => {
		return {
			uri: source
		}
	}, [source])

	const imageStyle = useMemo(() => {
		return {
			width,
			height,
			borderRadius: 6
		}
	}, [width, height])

	const viewStyle = useMemo(() => {
		return {
			width,
			height,
			flex: 1
		}
	}, [width, height])

	if (error) {
		return <Fallback link={link} />
	}

	return (
		<Button
			variant="plain"
			size="none"
			unstable_pressDelay={100}
			onPress={onPress}
			className="flex-1 active:opacity-70 basis-full w-full"
			style={chatEmbedContainerStyle}
		>
			<View
				ref={viewRef}
				onLayout={onLayout}
				className="items-start justify-start"
				style={viewStyle}
			>
				<TurboImage
					source={imageSource}
					cachePolicy="dataCache"
					resizeMode="contain"
					onSuccess={onSuccess}
					onFailure={onFailure}
					style={imageStyle}
					placeholder={{
						blurhash: assets.blurhash.images.fallback
					}}
				/>
			</View>
		</Button>
	)
})

Image.displayName = "Image"

export default Image
