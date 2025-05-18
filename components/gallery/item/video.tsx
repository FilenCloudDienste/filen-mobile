import { memo, useMemo, useState, Fragment } from "react"
import { btoa } from "react-native-quick-base64"
import nodeWorker from "@/lib/nodeWorker"
import { type GalleryItem } from "@/stores/gallery.store"
import { View, ActivityIndicator } from "react-native"
import { type WH } from "."
import { useEventListener } from "expo"
import { useVideoPlayer, VideoView } from "expo-video"
import { useColorScheme } from "@/lib/useColorScheme"
import Animated, { FadeOut } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

export const Video = memo(({ item, layout }: { item: GalleryItem; layout: WH }) => {
	const [loading, setLoading] = useState<boolean>(true)
	const [error, setError] = useState<boolean>(false)
	const { colors } = useColorScheme()
	const insets = useSafeAreaInsets()

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
			return `http://localhost:${nodeWorker.httpServerPort}/stream?auth=${nodeWorker.httpAuthToken}&file=${encodeURIComponent(
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

		if (item.itemType === "chatItem" && item.data.parsedLink.type === "file" && item.data.info && item.data.info.type === "file") {
			return `http://localhost:${nodeWorker.httpServerPort}/stream?auth=${nodeWorker.httpAuthToken}&file=${encodeURIComponent(
				btoa(
					JSON.stringify({
						name: item.data.info.data.info.name,
						mime: item.data.info.data.info.mime,
						size: item.data.info.data.info.size,
						uuid: item.data.info.data.info.uuid,
						bucket: item.data.info.data.info.bucket,
						key: item.data.parsedLink.key,
						version: item.data.info.data.info.version,
						chunks: item.data.info.data.info.chunks,
						region: item.data.info.data.info.region
					})
				)
			)}`
		}

		return null
	}, [item])

	const player = useVideoPlayer(source, player => {
		player.loop = true

		player.play()
	})

	useEventListener(player, "statusChange", e => {
		setError(e.error ? true : false)
		setLoading(e.status === "loading")
	})

	useEventListener(player, "playingChange", e => {
		//setPlaying(e.isPlaying)
	})

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
						<View
							className="flex-1"
							style={[
								style,
								{
									paddingTop: insets.top,
									paddingBottom: insets.bottom
								}
							]}
						>
							<VideoView
								player={player}
								allowsFullscreen={true}
								allowsPictureInPicture={true}
								nativeControls={true}
								startsPictureInPictureAutomatically={true}
								contentFit="contain"
								allowsVideoFrameAnalysis={false}
								useExoShutter={false}
								style={{
									flex: 1
								}}
							/>
						</View>
					)}
				</Fragment>
			)}
		</View>
	)
})

Video.displayName = "Video"

export default Video
