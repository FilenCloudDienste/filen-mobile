import { memo, useEffect, useRef, useMemo, useCallback } from "react"
import { View, ActivityIndicator, Platform } from "react-native"
import { Text } from "@/components/nativewindui/Text"
import { Icon } from "@roninoss/icons"
import { Button } from "@/components/nativewindui/Button"
import { useColorScheme } from "@/lib/useColorScheme"
import { Slider } from "@/components/nativewindui/Slider"
import TurboImage from "react-native-turbo-image"
import { BlurView } from "expo-blur"
import useDimensions from "@/hooks/useDimensions"
import useViewLayout from "@/hooks/useViewLayout"
import { useMMKVNumber } from "react-native-mmkv"
import mmkvInstance from "@/lib/mmkv"
import { formatSecondsToMMSS, formatBytes } from "@/lib/utils"
import { cn } from "@/lib/cn"
import { useTrackPlayerState } from "@/hooks/useTrackPlayerState"
import { useTrackPlayerControls } from "@/hooks/useTrackPlayerControls"
import Container from "../Container"
import { useTranslation } from "react-i18next"

export const Toolbar = memo(() => {
	const { colors } = useColorScheme()
	const trackPlayerState = useTrackPlayerState()
	const { insets } = useDimensions()
	const viewRef = useRef<View>(null)
	const { onLayout, layout } = useViewLayout(viewRef)
	const [, setTrackPlayerToolbarHeight] = useMMKVNumber("trackPlayerToolbarHeight", mmkvInstance)
	const trackPlayerControls = useTrackPlayerControls()
	const { t } = useTranslation()

	const active = useMemo(() => {
		if (trackPlayerState.playingTrack && trackPlayerState.queue.length > 0) {
			return true
		}

		return false
	}, [trackPlayerState.playingTrack, trackPlayerState.queue.length])

	const buttonsDisabled = useMemo(() => {
		return trackPlayerState.isLoading || !active || trackPlayerState.queue.length === 0
	}, [trackPlayerState.isLoading, active, trackPlayerState.queue.length])

	const blurViewStyle = useMemo(() => {
		return {
			paddingBottom: insets.bottom + 16
		}
	}, [insets.bottom])

	const imageStyle = useMemo(() => {
		return {
			width: 42,
			height: 42,
			borderRadius: 6,
			backgroundColor: colors.card
		}
	}, [colors.card])

	const clear = useCallback(() => {
		if (buttonsDisabled) {
			return
		}

		trackPlayerControls.clear().catch(console.error)
	}, [buttonsDisabled, trackPlayerControls])

	const onSlidingComplete = useCallback(
		(value: number) => {
			if (buttonsDisabled) {
				return
			}

			trackPlayerControls.seek(Math.round((value / 100) * trackPlayerState.durationSeconds)).catch(console.error)
		},
		[buttonsDisabled, trackPlayerControls, trackPlayerState.durationSeconds]
	)

	const shuffle = useCallback(() => {
		if (buttonsDisabled) {
			return
		}

		trackPlayerControls.shuffle().catch(console.error)
	}, [buttonsDisabled, trackPlayerControls])

	const repeat = useCallback(() => {
		if (buttonsDisabled) {
			return
		}

		trackPlayerControls
			.setRepeatMode(trackPlayerState.repeatMode === "off" ? "track" : trackPlayerState.repeatMode === "track" ? "queue" : "off")
			.catch(console.error)
	}, [buttonsDisabled, trackPlayerControls, trackPlayerState.repeatMode])

	const skipToPrevious = useCallback(() => {
		if (buttonsDisabled) {
			return
		}

		trackPlayerControls.skipToPrevious().catch(console.error)
	}, [buttonsDisabled, trackPlayerControls])

	const skipToNext = useCallback(() => {
		if (buttonsDisabled) {
			return
		}

		trackPlayerControls.skipToNext().catch(console.error)
	}, [buttonsDisabled, trackPlayerControls])

	const togglePlay = useCallback(() => {
		if (buttonsDisabled) {
			return
		}

		trackPlayerControls.togglePlay().catch(console.error)
	}, [buttonsDisabled, trackPlayerControls])

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
				style={blurViewStyle}
			>
				<Container>
					<View className="flex-row gap-3">
						{active && trackPlayerState.isPlayingTrackArtworkValid && trackPlayerState.playingTrackArtworkSource ? (
							<TurboImage
								source={trackPlayerState.playingTrackArtworkSource}
								resizeMode="cover"
								cachePolicy="dataCache"
								style={imageStyle}
							/>
						) : (
							<View
								className={cn(
									"rounded-md items-center justify-center",
									Platform.OS === "android" ? "bg-muted/30" : "bg-muted/50"
								)}
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
									? t("trackPlayer.bottom.noTrackQueued")
									: trackPlayerState.playingTrack?.title
									? `${trackPlayerState.playingTrack.title}${
											trackPlayerState.playingTrack.album ? ` - ${trackPlayerState.playingTrack.album}` : ""
									  }`
									: t("trackPlayer.bottom.unknownTitle")}
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
							onPress={clear}
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
							onSlidingComplete={onSlidingComplete}
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
							onPress={shuffle}
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
							onPress={skipToPrevious}
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
							onPress={togglePlay}
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
							onPress={skipToNext}
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
							onPress={repeat}
						>
							<Icon
								name={
									trackPlayerState.repeatMode === "off"
										? "repeat"
										: trackPlayerState.repeatMode === "track"
										? "repeat-once"
										: "repeat"
								}
								size={32}
								color={trackPlayerState.repeatMode === "off" ? colors.foreground : colors.primary}
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
