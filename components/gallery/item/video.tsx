import { memo, useMemo, useState, Fragment, useEffect } from "react"
import { type GalleryItem } from "@/stores/gallery.store"
import { View, ActivityIndicator } from "react-native"
import { type WH } from "."
import { useEventListener } from "expo"
import { useVideoPlayer, VideoView } from "expo-video"
import { useColorScheme } from "@/lib/useColorScheme"
import Animated, { FadeOut } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTrackPlayerControls } from "@/hooks/useTrackPlayerControls"
import useHTTPServer from "@/hooks/useHTTPServer"

export const Video = memo(({ item, layout, headerHeight }: { item: GalleryItem; layout: WH; headerHeight: number }) => {
	const [loading, setLoading] = useState<boolean>(true)
	const [error, setError] = useState<boolean>(false)
	const { colors } = useColorScheme()
	const insets = useSafeAreaInsets()
	const trackPlayerControls = useTrackPlayerControls()
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
			return `http://127.0.0.1:${httpServer.port}/stream?auth=${httpServer.authToken}&file=${encodeURIComponent(
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

		return null
	}, [item, httpServer.port, httpServer.authToken])

	const player = useVideoPlayer(source, player => {
		player.loop = true

		player.play()
	})

	useEventListener(player, "statusChange", e => {
		setError(e.error ? true : false)
		setLoading(e.status === "loading")
	})

	useEventListener(player, "playingChange", _ => {
		//setPlaying(e.isPlaying)
	})

	useEffect(() => {
		trackPlayerControls.stop().catch(console.error)
	}, [trackPlayerControls])

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
									paddingTop: headerHeight,
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
