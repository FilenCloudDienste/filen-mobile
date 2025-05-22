import { memo, useMemo, useEffect, useState, Fragment } from "react"
import { btoa } from "react-native-quick-base64"
import nodeWorker from "@/lib/nodeWorker"
import { type GalleryItem } from "@/stores/gallery.store"
import { View, ActivityIndicator } from "react-native"
import { type WH } from "."
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio"
import { useColorScheme } from "@/lib/useColorScheme"
import { Icon } from "@roninoss/icons"
import { Button } from "@/components/nativewindui/Button"
import Animated, { FadeOut } from "react-native-reanimated"
import useSetExpoAudioMode from "@/hooks/useSetExpoAudioMode"
import { useTrackPlayerControls } from "@/lib/trackPlayer"

export const Audio = memo(({ item, layout }: { item: GalleryItem; layout: WH }) => {
	useSetExpoAudioMode()

	const { colors } = useColorScheme()
	const [loading, setLoading] = useState<boolean>(true)
	const [playing, setPlaying] = useState<boolean>(false)
	const trackPlayerControls = useTrackPlayerControls()

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

		return null
	}, [item])

	const player = useAudioPlayer(source, 100)
	const status = useAudioPlayerStatus(player)

	useEffect(() => {
		setLoading(!status.isLoaded)
		setPlaying(status.playing)
	}, [status])

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
					{loading && (
						<Animated.View
							exiting={FadeOut}
							className="flex-1 absolute top-0 left-0 right-0 bottom-0 z-50 bg-background items-center justify-center"
							style={style}
						>
							<ActivityIndicator color={colors.foreground} />
						</Animated.View>
					)}
					<View className="flex-1 flex-row items-center justify-center">
						<Button
							variant="plain"
							size="icon"
							onPress={() => (playing ? player.pause() : player.play())}
						>
							<Icon
								name={playing ? "pause-circle-outline" : "play-circle-outline"}
								size={24}
								color={colors.foreground}
							/>
						</Button>
					</View>
				</Fragment>
			)}
		</View>
	)
})

Audio.displayName = "Audio"

export default Audio
