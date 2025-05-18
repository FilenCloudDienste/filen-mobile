import { memo, useState, useCallback } from "react"
import { View, type GestureResponderEvent, ActivityIndicator } from "react-native"
import { Icon } from "@roninoss/icons"
import { VideoView, useVideoPlayer, type PlayerError } from "expo-video"
import { useColorScheme } from "@/lib/useColorScheme"
import Outer from "./outer"
import { useGalleryStore } from "@/stores/gallery.store"
import { useEventListener } from "expo"
import * as Linking from "expo-linking"
import alerts from "@/lib/alerts"
import Fallback from "./fallback"

export const Video = memo(({ source, link, name }: { source: string; link: string; name: string }) => {
	const { colors } = useColorScheme()
	const [loadSuccess, setLoadSuccess] = useState<boolean>(false)
	const [error, setError] = useState<PlayerError | undefined>(undefined)

	const onPress = useCallback(
		async (e: GestureResponderEvent) => {
			e.preventDefault()
			e.stopPropagation()

			if (!loadSuccess || error) {
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
			}

			useGalleryStore.getState().setItems([
				{
					itemType: "remoteItem" as const,
					previewType: "video",
					data: {
						uri: source
					}
				}
			])

			useGalleryStore.getState().setInitialUUID(source)
			useGalleryStore.getState().setVisible(true)
		},
		[link, loadSuccess, error, source]
	)

	const player = useVideoPlayer(source, player => {
		player.loop = true

		player.pause()
	})

	useEventListener(player, "statusChange", e => {
		setError(e.error)
		setLoadSuccess(e.status === "readyToPlay")
	})

	if (error) {
		return <Fallback link={link} />
	}

	return (
		<Outer
			onPress={onPress}
			title={name}
			titleClassName="text-foreground"
		>
			{!error && loadSuccess && (
				<View className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
					<Icon
						name="play-circle-outline"
						size={32}
						color="white"
					/>
				</View>
			)}
			{!error && !loadSuccess && (
				<View className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
					<ActivityIndicator
						size="small"
						color={colors.foreground}
					/>
				</View>
			)}
			{!error && loadSuccess && (
				<VideoView
					player={player}
					allowsFullscreen={false}
					allowsPictureInPicture={false}
					nativeControls={false}
					startsPictureInPictureAutomatically={false}
					showsTimecodes={false}
					allowsVideoFrameAnalysis={false}
					useExoShutter={false}
					contentFit="contain"
					style={{
						width: "100%",
						height: "100%"
					}}
				/>
			)}
		</Outer>
	)
})

Video.displayName = "Video"

export default Video
