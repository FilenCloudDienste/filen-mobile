import { memo, useMemo, useEffect, useState, Fragment, useCallback } from "react"
import nodeWorker from "@/lib/nodeWorker"
import { type GalleryItem } from "@/stores/gallery.store"
import { View, ActivityIndicator, Pressable, Platform } from "react-native"
import { type WH } from "."
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio"
import { useColorScheme } from "@/lib/useColorScheme"
import { Icon } from "@roninoss/icons"
import { BlurView } from "expo-blur"
import Animated, { FadeOut } from "react-native-reanimated"
import useSetExpoAudioMode from "@/hooks/useSetExpoAudioMode"
import { useTrackPlayerControls } from "@/hooks/useTrackPlayerControls"
import useDimensions from "@/hooks/useDimensions"
import { Text } from "@/components/nativewindui/Text"
import { formatSecondsToMMSS, sanitizeFileName } from "@/lib/utils"
import { Slider } from "@/components/nativewindui/Slider"
import Container from "@/components/Container"
import { cn } from "@/lib/cn"
import { Button } from "@/components/nativewindui/Button"
import * as Sharing from "expo-sharing"
import * as FileSystem from "expo-file-system/next"
import * as FileSystemLegacy from "expo-file-system"
import { randomUUID } from "expo-crypto"
import paths from "@/lib/paths"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"

export const Audio = memo(({ item, layout }: { item: GalleryItem; layout: WH }) => {
	useSetExpoAudioMode()

	const { colors } = useColorScheme()
	const [loading, setLoading] = useState<boolean>(true)
	const [playing, setPlaying] = useState<boolean>(false)
	const trackPlayerControls = useTrackPlayerControls()
	const { insets } = useDimensions()

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
			return `http://localhost:${nodeWorker.httpServerPort}/stream?auth=${nodeWorker.httpAuthToken}&file=${encodeURIComponent(
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
	}, [item])

	const player = useAudioPlayer(source, 100)
	const playerStatus = useAudioPlayerStatus(player)

	const togglePlay = useCallback(() => {
		if (loading) {
			return
		}

		if (playerStatus.currentTime >= playerStatus.duration) {
			player.seekTo(0)
			player.play()

			return
		}

		if (playerStatus.playing) {
			player.pause()

			return
		}

		player.play()
	}, [player, loading, playerStatus.playing, playerStatus.currentTime, playerStatus.duration])

	const seek = useCallback(
		(value: number) => {
			player.seekTo((value / 100) * playerStatus.duration)
		},
		[player, playerStatus.duration]
	)

	const exportFile = useCallback(async () => {
		if (item.itemType !== "cloudItem" || item.data.item.type !== "file" || !(await Sharing.isAvailableAsync())) {
			return
		}

		const freeDiskSpace = await FileSystemLegacy.getFreeDiskStorageAsync()

		if (freeDiskSpace <= item.data.item.size + 1024 * 1024) {
			throw new Error("Not enough local disk space available.")
		}

		fullScreenLoadingModal.show()

		const tempLocation = new FileSystem.File(FileSystem.Paths.join(paths.exports(), sanitizeFileName(item.data.item.name)))

		try {
			if (tempLocation.exists) {
				tempLocation.delete()
			}

			await nodeWorker.proxy("downloadFile", {
				id: randomUUID(),
				uuid: item.data.item.uuid,
				bucket: item.data.item.bucket,
				region: item.data.item.region,
				chunks: item.data.item.chunks,
				version: item.data.item.version,
				key: item.data.item.key,
				destination: tempLocation.uri,
				size: item.data.item.size,
				name: item.data.item.name,
				dontEmitProgress: true
			})
		} finally {
			fullScreenLoadingModal.hide()
		}

		await new Promise<void>(resolve => setTimeout(resolve, 250))

		await Sharing.shareAsync(tempLocation.uri, {
			mimeType: item.data.item.mime,
			dialogTitle: item.data.item.name
		})
	}, [item])

	useEffect(() => {
		setLoading(!playerStatus.isLoaded)
		setPlaying(playerStatus.playing)
	}, [playerStatus])

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
					<Pressable
						className="flex-1 flex-col items-center justify-center"
						style={style}
						onPress={togglePlay}
					>
						<Icon
							name="music-note"
							size={layout.width / 2}
							color={colors.grey2}
						/>
						<View className="flex-1 absolute top-0 left-0 right-0 bottom-0 z-50 items-center justify-center">
							<Icon
								name={playing ? "pause-circle" : "play-circle"}
								size={layout.width / 6}
								color={colors.foreground}
							/>
						</View>
					</Pressable>
					<BlurView
						intensity={Platform.OS === "ios" ? 100 : 0}
						tint={Platform.OS === "ios" ? "systemChromeMaterial" : undefined}
						className={cn(
							"flex-1 absolute left-0 right-0 bottom-0 z-10 items-center justify-center w-full",
							Platform.OS === "android" && "bg-card"
						)}
						style={{
							paddingBottom: insets.bottom
						}}
					>
						<Container className="flex-1 flex-col">
							<View className="flex-1 flex-row items-center justify-between gap-1.5 w-full px-4 py-1 h-full">
								<Text
									className="text-xs font-normal text-muted-foreground"
									style={{
										fontVariant: ["tabular-nums"]
									}}
								>
									{formatSecondsToMMSS(playerStatus.currentTime)}
								</Text>
								<Slider
									value={(playerStatus.currentTime / playerStatus.duration) * 100}
									minimumValue={0}
									maximumValue={100}
									tapToSeek={true}
									step={0.1}
									style={{
										flex: 1
									}}
									onSlidingComplete={seek}
									minimumTrackTintColor="white"
									disabled={loading}
									thumbTintColor={colors.foreground}
								/>
								<Text
									className="text-xs font-normal text-muted-foreground"
									style={{
										fontVariant: ["tabular-nums"]
									}}
								>
									{formatSecondsToMMSS(playerStatus.duration)}
								</Text>
							</View>
							<View className="flex-1 flex-row items-center justify-between gap-4 w-full px-4 py-2 border-border border-t">
								<Button
									variant="plain"
									size="icon"
									onPress={exportFile}
									disabled={loading || item.itemType !== "cloudItem"}
								>
									<Icon
										name="send"
										size={24}
										color={colors.primary}
									/>
								</Button>
								<Button
									variant="plain"
									size="icon"
									onPress={togglePlay}
									disabled={loading}
								>
									<Icon
										name={playing ? "pause" : "play"}
										size={24}
										color={colors.primary}
									/>
								</Button>
							</View>
						</Container>
					</BlurView>
				</Fragment>
			)}
		</View>
	)
})

Audio.displayName = "Audio"

export default Audio
