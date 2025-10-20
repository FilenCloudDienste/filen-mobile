import { memo, useMemo, useCallback } from "react"
import { useTrackPlayerControls } from "@/hooks/useTrackPlayerControls"
import BlurView from "@/components/blurView"
import { Text } from "../nativewindui/Text"
import Animated, { FadeIn, FadeOut, type AnimatedStyle } from "react-native-reanimated"
import useBottomTabsHeight from "@/hooks/useBottomTabsHeight"
import { View, ActivityIndicator, Platform, type ViewStyle, type StyleProp } from "react-native"
import { ProgressIndicator } from "../nativewindui/ProgressIndicator"
import TurboImage from "react-native-turbo-image"
import { Icon } from "@roninoss/icons"
import { useRouter, usePathname } from "expo-router"
import { useColorScheme } from "@/lib/useColorScheme"
import { Button } from "../nativewindui/Button"
import { formatBytes } from "@/lib/utils"
import { useTrackPlayerState } from "@/hooks/useTrackPlayerState"
import { cn } from "@/lib/cn"
import Container from "../Container"
import { translateMemoized } from "@/lib/i18n"

export const Bottom = memo(() => {
	const trackPlayerState = useTrackPlayerState()
	const bottomTabBarHeight = useBottomTabsHeight()
	const router = useRouter()
	const { colors } = useColorScheme()
	const trackPlayerControls = useTrackPlayerControls()
	const pathname = usePathname()

	const show = useMemo(() => {
		if (
			trackPlayerState.playingTrack &&
			trackPlayerState.queue.length > 0 &&
			!(pathname.startsWith("/notes/") || pathname.startsWith("/home/settings") || pathname.startsWith("/photos/settings"))
		) {
			return true
		}

		return false
	}, [trackPlayerState.playingTrack, trackPlayerState.queue.length, pathname])

	const buttonsDisabled = useMemo(() => {
		return trackPlayerState.isLoading || !show
	}, [trackPlayerState.isLoading, show])

	const viewStyle = useMemo(() => {
		return {
			bottom: Platform.select({
				ios: bottomTabBarHeight,
				default: 0
			}),
			flex: 1,
			position: "absolute",
			left: 0,
			right: 0,
			padding: 8,
			zIndex: 50
		} satisfies StyleProp<AnimatedStyle<StyleProp<ViewStyle>>>
	}, [bottomTabBarHeight])

	const onPress = useCallback(() => {
		router.push({
			pathname: "/trackPlayer"
		})
	}, [router])

	const imageStyle = useMemo(() => {
		return {
			width: 36,
			height: 36,
			borderRadius: 6,
			backgroundColor: colors.card
		}
	}, [colors.card])

	const togglePlay = useCallback(() => {
		if (buttonsDisabled) {
			return
		}

		trackPlayerControls.togglePlay()
	}, [trackPlayerControls, buttonsDisabled])

	if (!show) {
		return null
	}

	return (
		<Animated.View
			entering={FadeIn}
			exiting={FadeOut}
			style={viewStyle}
		>
			<Container>
				<Button
					variant="plain"
					size="none"
					className="flex-1 rounded-md overflow-hidden active:opacity-100 ios:active:opacity-100 android:active:opacity-100"
					unstable_pressDelay={100}
					android_ripple={null}
					onPress={onPress}
				>
					<BlurView
						intensity={Platform.OS === "android" ? 0 : 100}
						tint={Platform.OS === "android" ? undefined : "systemChromeMaterial"}
						className={cn("flex-1 flex-col", Platform.OS === "android" && "bg-card")}
					>
						<View className="flex-row gap-4 p-2 justify-between items-center">
							<View className="flex-1 flex-row gap-3 items-center">
								{trackPlayerState.isPlayingTrackArtworkValid && trackPlayerState.playingTrackArtworkSource ? (
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
											Platform.OS === "android" ? "bg-muted/30" : "bg-card"
										)}
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
										{trackPlayerState.playingTrack?.title
											? `${trackPlayerState.playingTrack.title}${
													trackPlayerState.playingTrack.album ? ` - ${trackPlayerState.playingTrack.album}` : ""
											  }`
											: translateMemoized("trackPlayer.bottom.unknownTitle")}
									</Text>
									<Text
										className="text-xs text-muted-foreground"
										numberOfLines={1}
										ellipsizeMode="middle"
									>
										{trackPlayerState.playingTrack?.artist ??
											formatBytes(trackPlayerState.playingTrack?.file.size ?? 0)}
									</Text>
								</View>
							</View>
							<Button
								variant="plain"
								size="icon"
								onPress={togglePlay}
								className="shrink-0"
							>
								{trackPlayerState.isLoading ? (
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
			</Container>
		</Animated.View>
	)
})

Bottom.displayName = "Bottom"

export default Bottom
