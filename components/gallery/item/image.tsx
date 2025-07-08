import { Image as ExpoImage } from "expo-image"
import { memo, useMemo, useState, useCallback, Fragment } from "react"
import { type GalleryItem } from "@/stores/gallery.store"
import { View, ActivityIndicator } from "react-native"
import { type WH } from "."
import { useColorScheme } from "@/lib/useColorScheme"
import Animated, { FadeOut } from "react-native-reanimated"
import useHTTPServer from "@/hooks/useHTTPServer"

export const Image = memo(({ item, layout }: { item: GalleryItem; layout: WH }) => {
	const [loading, setLoading] = useState<boolean>(true)
	const [error, setError] = useState<boolean>(false)
	const { colors } = useColorScheme()
	const httpServer = useHTTPServer()

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

		if (item.itemType === "cloudItem" && item.data.item.type === "file") {
			return {
				uri: `http://127.0.0.1:${httpServer.port}/stream?auth=${httpServer.authToken}&file=${encodeURIComponent(
					btoa(
						JSON.stringify({
							name: item.data.item.name,
							mime: item.data.item.mime,
							size: item.data.item.size,
							uuid: item.data.item.uuid,
							bucket: item.data.item.bucket,
							key: item.data.item.key,
							version: item.data.item.version,
							chunks: item.data.item.chunks,
							region: item.data.item.region
						})
					)
				)}`
			}
		}

		return null
	}, [item, httpServer.port, httpServer.authToken])

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
					<ActivityIndicator
						color={colors.foreground}
						size="small"
					/>
				</Animated.View>
			) : (
				<Fragment>
					{loading && !error && (
						<Animated.View
							exiting={FadeOut}
							className="flex-1 absolute top-0 left-0 right-0 bottom-0 z-50 bg-background items-center justify-center"
							style={style}
						>
							<ActivityIndicator
								color={colors.foreground}
								size="small"
							/>
						</Animated.View>
					)}
					{error && (
						<Animated.View
							exiting={FadeOut}
							className="flex-1 absolute top-0 left-0 right-0 bottom-0 z-50 bg-background items-center justify-center"
							style={style}
						>
							<ActivityIndicator
								color={colors.foreground}
								size="small"
							/>
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
