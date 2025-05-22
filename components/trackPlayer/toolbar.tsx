import { memo, useEffect, useRef, useMemo } from "react"
import { View, ActivityIndicator } from "react-native"
import { Text } from "@/components/nativewindui/Text"
import { Icon } from "@roninoss/icons"
import { Button } from "@/components/nativewindui/Button"
import { useColorScheme } from "@/lib/useColorScheme"
import { useTrackPlayerState, useTrackPlayerControls } from "@/lib/trackPlayer"
import { Slider } from "@/components/nativewindui/Slider"
import { Image } from "expo-image"
import { BlurView } from "expo-blur"
import useDimensions from "@/hooks/useDimensions"
import useViewLayout from "@/hooks/useViewLayout"
import { useMMKVNumber } from "react-native-mmkv"
import mmkvInstance from "@/lib/mmkv"
import { formatSecondsToMMSS, formatBytes } from "@/lib/utils"
import { RepeatMode } from "react-native-track-player"

export const Toolbar = memo(() => {
	const { colors } = useColorScheme()
	const trackPlayerState = useTrackPlayerState()
	const { insets } = useDimensions()
	const viewRef = useRef<View>(null)
	const { onLayout, layout } = useViewLayout(viewRef)
	const [, setTrackPlayerToolbarHeight] = useMMKVNumber("trackPlayerToolbarHeight", mmkvInstance)
	const trackPlayerControls = useTrackPlayerControls()

	const active = useMemo(() => {
		if (trackPlayerState.activeTrack && trackPlayerState.queue.length > 0) {
			return true
		}

		return false
	}, [trackPlayerState.activeTrack, trackPlayerState.queue.length])

	useEffect(() => {
		setTrackPlayerToolbarHeight(layout.height - insets.bottom)
	}, [layout.height, setTrackPlayerToolbarHeight, insets.bottom])

	return (
		<View
			ref={viewRef}
			onLayout={onLayout}
			className="rounded-t-lg overflow-hidden absolute bottom-0 left-0 right-0 flex-1"
		>
			<BlurView
				className="flex-col px-4 pt-4"
				intensity={100}
				tint="systemChromeMaterial"
				style={{
					paddingBottom: insets.bottom + 16
				}}
			>
				<View className="flex-row gap-3">
					{active && trackPlayerState.activeTrack?.artwork ? (
						<Image
							source={{
								uri: trackPlayerState.activeTrack.artwork
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
							className="bg-muted rounded-md items-center justify-center"
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
								: trackPlayerState.activeTrack?.title
								? `${trackPlayerState.activeTrack.title}${
										trackPlayerState.activeTrack.album ? ` - ${trackPlayerState.activeTrack.album}` : ""
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
								: trackPlayerState.activeTrack?.artist ?? formatBytes(trackPlayerState.activeTrackFile?.size ?? 0)}
						</Text>
					</View>
					<Button
						variant="plain"
						size="icon"
						disabled={!active}
						onPress={() => {
							trackPlayerControls.reset()
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
						disabled={!active || trackPlayerState.isLoading || trackPlayerState.isBuffering}
						style={{
							flex: 1,
							width: "100%"
						}}
						onValueChange={value => {
							if (!active || trackPlayerState.isLoading || trackPlayerState.isBuffering) {
								return
							}

							trackPlayerControls.seek(Math.round((value / 100) * trackPlayerState.progress.duration))
						}}
					/>
					<View className="flex-row items-center justify-between w-full">
						<Text className="text-xs text-muted-foreground font-normal">
							{!active || trackPlayerState.isLoading
								? formatSecondsToMMSS(0)
								: formatSecondsToMMSS(trackPlayerState.progress.position)}
						</Text>
						<Text className="text-xs text-muted-foreground font-normal">
							{!active || trackPlayerState.isLoading
								? formatSecondsToMMSS(0)
								: formatSecondsToMMSS(trackPlayerState.progress.duration)}
						</Text>
					</View>
				</View>
				<View className="flex-row items-center justify-between gap-4">
					<Button
						variant="plain"
						size="none"
						unstable_pressDelay={100}
						disabled={!active}
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
						disabled={!active}
						onPress={() => {
							trackPlayerControls.skipToPrevious()
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
						className="bg-foreground rounded-full p-4"
						disabled={!active}
						onPress={() => {
							if (trackPlayerState.isLoading || trackPlayerState.isBuffering) {
								return
							}

							trackPlayerControls.togglePlay()
						}}
					>
						{trackPlayerState.isLoading || trackPlayerState.isBuffering ? (
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
						disabled={!active}
						onPress={() => {
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
						disabled={!active}
						onPress={() => {
							trackPlayerControls.setRepeatMode(RepeatMode.Track)
						}}
					>
						<Icon
							name="repeat"
							size={32}
							color={colors.foreground}
						/>
					</Button>
				</View>
			</BlurView>
		</View>
	)
})

Toolbar.displayName = "Toolbar"

export default Toolbar
