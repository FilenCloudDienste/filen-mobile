import { Image as ExpoImage } from "expo-image"
import { memo, useMemo, useState, useCallback, Fragment } from "react"
import { btoa } from "react-native-quick-base64"
import nodeWorker from "@/lib/nodeWorker"
import { type GalleryItem } from "@/stores/gallery.store"
import { View, ActivityIndicator } from "react-native"
import { type WH } from "."
import { useColorScheme } from "@/lib/useColorScheme"
import Animated, { FadeOut } from "react-native-reanimated"

export const Image = memo(({ item, layout }: { item: GalleryItem; layout: WH }) => {
	const [loading, setLoading] = useState<boolean>(true)
	const [error, setError] = useState<boolean>(false)
	const { colors } = useColorScheme()

	const style = useMemo(() => {
		return {
			width: layout.width,
			height: layout.height,
			flex: 1
		}
	}, [layout.width, layout.height])

	const source = useMemo(() => {
		if (item.itemType === "remoteItem") {
			return item.data.uri
		}

		if (item.itemType === "cloudItem" && item.data.type === "file") {
			return {
				uri: `http://localhost:${nodeWorker.httpServerPort}/stream?auth=${nodeWorker.httpAuthToken}&file=${encodeURIComponent(
					btoa(
						JSON.stringify({
							name: item.data.name,
							mime: item.data.mime,
							size: item.data.size,
							uuid: item.data.uuid,
							bucket: item.data.bucket,
							key: item.data.key,
							version: item.data.version,
							chunks: item.data.chunks,
							region: item.data.region
						})
					)
				)}`
			}
		}

		return null
	}, [item])

	const onLoadStart = useCallback(() => {
		setLoading(true)
	}, [])

	const onLoadEnd = useCallback(() => {
		setLoading(false)
	}, [])

	const onError = useCallback(() => {
		setLoading(false)
		setError(true)
	}, [])

	return (
		<View
			className="flex-1"
			style={style}
		>
			{!source ? (
				<Animated.View
					exiting={FadeOut}
					className="flex-1 absolute top-0 left-0 right-0 bottom-0 z-50 bg-background items-center justify-center"
					style={style}
				>
					<ActivityIndicator color={colors.foreground} />
				</Animated.View>
			) : (
				<Fragment>
					{loading && !error && (
						<Animated.View
							exiting={FadeOut}
							className="flex-1 absolute top-0 left-0 right-0 bottom-0 z-50 bg-background items-center justify-center"
							style={style}
						>
							<ActivityIndicator color={colors.foreground} />
						</Animated.View>
					)}
					{error && (
						<Animated.View
							exiting={FadeOut}
							className="flex-1 absolute top-0 left-0 right-0 bottom-0 z-50 bg-background items-center justify-center"
							style={style}
						>
							<ActivityIndicator color={colors.foreground} />
						</Animated.View>
					)}
					{!error && (
						<ExpoImage
							source={source}
							contentFit="contain"
							cachePolicy="disk"
							priority="low"
							autoplay={true}
							focusable={false}
							accessible={false}
							enableLiveTextInteraction={false}
							style={style}
							onLoadStart={onLoadStart}
							onLoadEnd={onLoadEnd}
							onError={onError}
						/>
					)}
				</Fragment>
			)}
		</View>
	)
})

Image.displayName = "Image"

export default Image
