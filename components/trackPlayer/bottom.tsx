import { memo, useMemo } from "react"
import { useTrackPlayerState, useTrackPlayerControls } from "@/lib/trackPlayer"
import { BlurView } from "expo-blur"
import { Text } from "../nativewindui/Text"
import Animated, { FadeIn, FadeOut } from "react-native-reanimated"
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs"
import { View, ActivityIndicator } from "react-native"
import { ProgressIndicator } from "../nativewindui/ProgressIndicator"
import { Image } from "expo-image"
import { Icon } from "@roninoss/icons"
import { useRouter } from "expo-router"
import { useColorScheme } from "@/lib/useColorScheme"
import { Button } from "../nativewindui/Button"
import { formatBytes } from "@/lib/utils"

export const Bottom = memo(() => {
	const trackPlayerState = useTrackPlayerState()
	const bottomTabBarHeight = useBottomTabBarHeight()
	const router = useRouter()
	const { colors } = useColorScheme()
	const trackPlayerControls = useTrackPlayerControls()

	const show = useMemo(() => {
		if (trackPlayerState.activeTrack && trackPlayerState.queue.length > 0) {
			return true
		}

		return false
	}, [trackPlayerState.activeTrack, trackPlayerState.queue.length])

	if (!show) {
		return null
	}

	return (
		<Animated.View
			entering={FadeIn}
			exiting={FadeOut}
			style={{
				bottom: bottomTabBarHeight,
				flex: 1,
				position: "absolute",
				left: 0,
				right: 0,
				padding: 8,
				zIndex: 50
			}}
		>
			<Button
				variant="plain"
				size="none"
				className="flex-1 rounded-md overflow-hidden active:opacity-100 ios:active:opacity-100 android:active:opacity-100"
				unstable_pressDelay={100}
				android_ripple={null}
				onPress={() => {
					router.push({
						pathname: "/trackPlayer"
					})
				}}
			>
				<BlurView
					intensity={100}
					tint="systemChromeMaterial"
					className="flex-1 flex-col"
				>
					<View className="flex-row gap-4 p-2 justify-between items-center">
						<View className="flex-1 flex-row gap-3 items-center">
							{trackPlayerState.activeTrack?.artwork ? (
								<Image
									source={{
										uri: trackPlayerState.activeTrack.artwork
									}}
									contentFit="cover"
									style={{
										width: 36,
										height: 36,
										borderRadius: 6,
										backgroundColor: colors.card
									}}
								/>
							) : (
								<View
									className="bg-muted rounded-md items-center justify-center"
									style={{
										width: 36,
										height: 36
									}}
								>
									<Icon
										name="music-note"
										size={16}
										color={colors.foreground}
									/>
								</View>
							)}
							<View className="flex-col flex-1">
								<Text
									className="font-bold text-sm"
									numberOfLines={1}
									ellipsizeMode="middle"
								>
									{trackPlayerState.activeTrack?.title
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
									{trackPlayerState.activeTrack?.artist ?? formatBytes(trackPlayerState.activeTrackFile?.size ?? 0)}
								</Text>
							</View>
						</View>
						<Button
							variant="plain"
							size="icon"
							onPress={() => {
								if (trackPlayerState.isLoading || trackPlayerState.isBuffering) {
									return
								}

								trackPlayerControls.togglePlay()
							}}
							className="shrink-0"
						>
							{trackPlayerState.isLoading || trackPlayerState.isBuffering ? (
								<ActivityIndicator
									size="small"
									color={colors.foreground}
								/>
							) : (
								<Icon
									name={trackPlayerState.isPlaying ? "pause" : "play"}
									size={20}
									color={colors.foreground}
								/>
							)}
						</Button>
					</View>
					<ProgressIndicator
						value={trackPlayerState.progressNormalized}
						max={100}
						className="flex-1 w-full h-[2px]"
						progressClassName="bg-foreground"
						trackClassName="bg-muted opacity-50"
					/>
				</BlurView>
			</Button>
		</Animated.View>
	)
})

Bottom.displayName = "Bottom"

export default Bottom
