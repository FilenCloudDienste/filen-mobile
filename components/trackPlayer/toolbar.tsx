import { memo, useEffect, useRef, useMemo } from "react"
import { View, ActivityIndicator, Platform } from "react-native"
import { Text } from "@/components/nativewindui/Text"
import { Icon } from "@roninoss/icons"
import { Button } from "@/components/nativewindui/Button"
import { useColorScheme } from "@/lib/useColorScheme"
import { Slider } from "@/components/nativewindui/Slider"
import { Image } from "expo-image"
import { BlurView } from "expo-blur"
import useDimensions from "@/hooks/useDimensions"
import useViewLayout from "@/hooks/useViewLayout"
import { useMMKVNumber } from "react-native-mmkv"
import mmkvInstance from "@/lib/mmkv"
import { formatSecondsToMMSS, formatBytes, normalizeFilePathForExpo } from "@/lib/utils"
import { cn } from "@/lib/cn"
import { useTrackPlayerState } from "@/hooks/useTrackPlayerState"
import { useTrackPlayerControls } from "@/hooks/useTrackPlayerControls"
import Container from "../Container"
import paths from "@/lib/paths"
import { Paths } from "expo-file-system/next"

export const Toolbar = memo(() => {
	const { colors } = useColorScheme()
	const trackPlayerState = useTrackPlayerState()
	const { insets } = useDimensions()
	const viewRef = useRef<View>(null)
	const { onLayout, layout } = useViewLayout(viewRef)
	const [, setTrackPlayerToolbarHeight] = useMMKVNumber("trackPlayerToolbarHeight", mmkvInstance)
	const trackPlayerControls = useTrackPlayerControls()

	const active = useMemo(() => {
		if (trackPlayerState.playingTrack && trackPlayerState.queue.length > 0) {
			return true
		}

		return false
	}, [trackPlayerState.playingTrack, trackPlayerState.queue.length])

	const buttonsDisabled = useMemo(() => {
		return trackPlayerState.isLoading || !active || trackPlayerState.queue.length === 0
	}, [trackPlayerState.isLoading, active, trackPlayerState.queue.length])

	useEffect(() => {
		setTrackPlayerToolbarHeight(layout.height - insets.bottom)
	}, [layout.height, setTrackPlayerToolbarHeight, insets.bottom])

	return (
		<View
			ref={viewRef}
			onLayout={onLayout}
			className="rounded-t-lg overflow-hidden flex-1 absolute bottom-0 left-0 right-0"
		>
			<BlurView
				className={cn("flex-col px-4 pt-4", Platform.OS === "android" && "bg-card")}
				intensity={Platform.OS === "android" ? 0 : 100}
				tint={Platform.OS === "android" ? undefined : "systemChromeMaterial"}
				style={{
					paddingBottom: insets.bottom + 16
				}}
			>
				<Container>
					<View className="flex-row gap-3">
						{active &&
						typeof trackPlayerState.playingTrack?.artwork === "string" &&
						!trackPlayerState.playingTrack?.artwork.endsWith("audio_fallback.png") ? (
							<Image
								source={{
									uri: normalizeFilePathForExpo(
										Paths.join(paths.trackPlayerPictures(), Paths.basename(trackPlayerState.playingTrack.artwork))
									)
								}}
								contentFit="cover"
								style={{
									width: 42,
									height: 42,
									borderRadius: 6,
									backgroundColor: colors.card
								}}
							/>
						) : (
							<View
								className="bg-muted/30 rounded-md items-center justify-center"
								style={{
									width: 42,
									height: 42
								}}
							>
								<Icon
									name="music-note"
									size={20}
									color={colors.foreground}
								/>
							</View>
						)}
						<View className="flex-col flex-1 gap-0.5">
							<Text
								className="font-bold"
								numberOfLines={1}
								ellipsizeMode="middle"
							>
								{!active
									? "No track queued"
									: trackPlayerState.playingTrack?.title
									? `${trackPlayerState.playingTrack.title}${
											trackPlayerState.playingTrack.album ? ` - ${trackPlayerState.playingTrack.album}` : ""
									  }`
									: "Unknown title"}
							</Text>
							<Text
								className="text-xs text-muted-foreground"
								numberOfLines={1}
								ellipsizeMode="middle"
							>
								{!active
									? "N/A"
									: trackPlayerState.playingTrack?.artist ?? formatBytes(trackPlayerState.playingTrack?.file.size ?? 0)}
							</Text>
						</View>
						<Button
							variant="plain"
							size="icon"
							onPress={() => {
								if (buttonsDisabled) {
									return
								}

								trackPlayerControls.clear().catch(console.error)
							}}
						>
							<Icon
								name="close"
								size={24}
								color={colors.foreground}
							/>
						</Button>
					</View>
					<View className="flex-col items-center flex-1 py-4">
						<Slider
							value={trackPlayerState.progressNormalized}
							minimumValue={0}
							maximumValue={100}
							minimumTrackTintColor="white"
							style={{
								flex: 1,
								width: "100%"
							}}
							disabled={trackPlayerState.queue.length === 0}
							onSlidingComplete={value => {
								if (buttonsDisabled) {
									return
								}

								trackPlayerControls.seek(Math.round((value / 100) * trackPlayerState.durationSeconds)).catch(console.error)
							}}
						/>
						<View className="flex-row items-center justify-between w-full">
							<Text className="text-xs text-muted-foreground font-normal">
								{buttonsDisabled ? formatSecondsToMMSS(0) : formatSecondsToMMSS(trackPlayerState.positionSeconds)}
							</Text>
							<Text className="text-xs text-muted-foreground font-normal">
								{buttonsDisabled ? formatSecondsToMMSS(0) : formatSecondsToMMSS(trackPlayerState.durationSeconds)}
							</Text>
						</View>
					</View>
					<View className="flex-row items-center justify-between gap-4">
						<Button
							variant="plain"
							size="none"
							unstable_pressDelay={100}
							android_ripple={null}
							className="active:opacity-70"
							disabled={trackPlayerState.queue.length === 0}
							onPress={() => {
								if (buttonsDisabled) {
									return
								}

								//TODO
							}}
						>
							<Icon
								name="shuffle"
								size={32}
								color={colors.foreground}
							/>
						</Button>
						<Button
							variant="plain"
							size="none"
							unstable_pressDelay={100}
							android_ripple={null}
							className="active:opacity-70"
							disabled={trackPlayerState.queue.length === 0}
							onPress={() => {
								if (buttonsDisabled) {
									return
								}

								trackPlayerControls.skipToPrevious().catch(console.error)
							}}
						>
							<Icon
								name="skip-backward"
								size={32}
								color={colors.foreground}
							/>
						</Button>
						<Button
							variant="plain"
							size="none"
							unstable_pressDelay={100}
							className="bg-foreground rounded-full p-4 active:opacity-70"
							android_ripple={null}
							disabled={trackPlayerState.queue.length === 0}
							onPress={() => {
								if (buttonsDisabled) {
									return
								}

								trackPlayerControls.togglePlay().catch(console.error)
							}}
						>
							{trackPlayerState.isLoading ? (
								<ActivityIndicator
									size="small"
									color={colors.background}
								/>
							) : (
								<Icon
									name={trackPlayerState.isPlaying ? "pause" : "play"}
									size={20}
									color={colors.background}
								/>
							)}
						</Button>
						<Button
							variant="plain"
							size="none"
							unstable_pressDelay={100}
							android_ripple={null}
							className="active:opacity-70"
							disabled={trackPlayerState.queue.length === 0}
							onPress={() => {
								if (buttonsDisabled) {
									return
								}

								trackPlayerControls.skipToNext()
							}}
						>
							<Icon
								name="skip-forward"
								size={32}
								color={colors.foreground}
							/>
						</Button>
						<Button
							variant="plain"
							size="none"
							unstable_pressDelay={100}
							android_ripple={null}
							className="active:opacity-70"
							disabled={trackPlayerState.queue.length === 0}
							onPress={() => {
								if (buttonsDisabled) {
									return
								}

								// TODO
							}}
						>
							<Icon
								name="repeat"
								size={32}
								color={colors.foreground}
							/>
						</Button>
					</View>
				</Container>
			</BlurView>
		</View>
	)
})

Toolbar.displayName = "Toolbar"

export default Toolbar
