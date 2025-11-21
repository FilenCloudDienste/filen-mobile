import { memo, useMemo, useState, Fragment, useEffect, useCallback, useRef } from "react"
import { type GalleryItem, useGalleryStore } from "@/stores/gallery.store"
import { View, ActivityIndicator, Platform } from "react-native"
import { useVideoPlayer, VideoView } from "expo-video"
import { useColorScheme } from "@/lib/useColorScheme"
import Animated, { FadeOut } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTrackPlayerControls } from "@/hooks/useTrackPlayerControls"
import useHTTPServer from "@/hooks/useHTTPServer"
import { Icon } from "@roninoss/icons"
import { Text } from "@/components/nativewindui/Text"
import { cn } from "@/lib/cn"
import { useShallow } from "zustand/shallow"
import { useEventListener } from "expo"
import BlurView from "@/components/blurView"
import Container from "@/components/Container"
import { formatSecondsToMMSS } from "@/lib/utils"
import { Slider } from "@/components/nativewindui/Slider"
import { Button } from "@/components/nativewindui/Button"
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons"
import { useMMKVObject } from "react-native-mmkv"
import mmkvInstance from "@/lib/mmkv"
import { type BiometricAuth, BIOMETRIC_AUTH_KEY } from "@/app/settings/security"

export const Video = memo(
	({
		item,
		layout
	}: {
		item: GalleryItem
		layout: {
			width: number
			height: number
		}
	}) => {
		const [loading, setLoading] = useState<boolean>(true)
		const [error, setError] = useState<string | null>(null)
		const { colors, isDarkColorScheme } = useColorScheme()
		const insets = useSafeAreaInsets()
		const trackPlayerControls = useTrackPlayerControls()
		const httpServer = useHTTPServer()
		const headerHeight = useGalleryStore(useShallow(state => state.headerHeight))
		const [currentTime, setCurrentTime] = useState<number>(0)
		const videoViewRef = useRef<VideoView>(null)
		const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
		const [playing, setPlaying] = useState<boolean>(false)
		const [duration, setDuration] = useState<number>(0)
		const [, setBiometricAuth] = useMMKVObject<BiometricAuth>(BIOMETRIC_AUTH_KEY, mmkvInstance)

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
			player.showNowPlayingNotification = false
			player.keepScreenOnWhilePlaying = true
			player.timeUpdateEventInterval = 1

			player.play()
		})

		const seek = useCallback(
			(value: number) => {
				if (loading) {
					return
				}

				const seekTo = Math.floor((value / 100) * duration)
				const seekBy = Math.floor(seekTo - currentTime)

				if (seekTo >= duration || seekTo <= 0 || seekBy <= 0 || seekBy + currentTime >= duration) {
					return
				}

				player.seekBy(seekBy)
			},
			[player, loading, duration, currentTime]
		)

		const doNotPromptBiometricAuth = useCallback(() => {
			setBiometricAuth(prev => {
				if (!prev || !prev.enabled) {
					return prev
				}

				return {
					...prev,
					lastLock: Date.now() + 5000,
					tries: 0,
					triesLockedUntil: 0,
					triesLockedUntilMultiplier: 1
				}
			})
		}, [setBiometricAuth])

		const toggleFullscreen = useCallback(async () => {
			if (loading) {
				return
			}

			doNotPromptBiometricAuth()

			if (isFullscreen) {
				await videoViewRef?.current
					?.exitFullscreen()
					.then(() => {
						setIsFullscreen(false)
					})
					.catch(console.error)
			} else {
				await videoViewRef?.current
					?.enterFullscreen()
					.then(() => {
						setIsFullscreen(true)
					})
					.catch(console.error)
			}
		}, [loading, isFullscreen, doNotPromptBiometricAuth])

		const togglePlay = useCallback(() => {
			if (loading) {
				return
			}

			if (currentTime >= duration) {
				player.seekBy(-(duration + 1))
				player.play()

				return
			}

			if (playing) {
				player.pause()
			} else {
				player.play()
			}
		}, [loading, playing, currentTime, duration, player])

		useEventListener(player, "statusChange", ({ error }) => {
			setError(error ? error.message : null)
		})

		useEventListener(player, "sourceLoad", e => {
			setDuration(e.duration)
			setLoading(false)
		})

		useEventListener(player, "timeUpdate", e => {
			setCurrentTime(e.currentTime)
		})

		useEventListener(player, "playingChange", e => {
			setPlaying(e.isPlaying)
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
						className={cn(
							"flex-1 absolute top-0 left-0 right-0 bottom-0 z-50 items-center justify-center",
							isDarkColorScheme ? "bg-black" : "bg-white"
						)}
						style={style}
					>
						<ActivityIndicator
							color={colors.foreground}
							size="small"
						/>
					</Animated.View>
				) : (
					<Fragment>
						{loading && !error && (
							<Animated.View
								exiting={FadeOut}
								className={cn(
									"flex-1 absolute top-0 left-0 right-0 bottom-0 z-50 items-center justify-center",
									isDarkColorScheme ? "bg-black" : "bg-white"
								)}
								style={style}
							>
								<ActivityIndicator
									color={colors.foreground}
									size="small"
								/>
							</Animated.View>
						)}
						{error && (
							<Animated.View
								exiting={FadeOut}
								className={cn(
									"flex-1 absolute top-0 left-0 right-0 bottom-0 z-50 items-center justify-center",
									isDarkColorScheme ? "bg-black" : "bg-white"
								)}
								style={style}
							>
								<Icon
									name="video-outline"
									size={64}
									color={colors.destructive}
								/>
								<Text className="text-muted-foreground text-sm text-center px-8 pt-2">{error}</Text>
							</Animated.View>
						)}
						{!error && (
							<View
								className="flex-1"
								style={[
									style,
									{
										paddingTop: headerHeight
									}
								]}
							>
								<View className="flex-1">
									<VideoView
										ref={videoViewRef}
										player={player}
										style={style}
										nativeControls={isFullscreen}
										fullscreenOptions={{
											enable: true
										}}
										onFullscreenEnter={() => {
											doNotPromptBiometricAuth()
											setIsFullscreen(true)
										}}
										onFullscreenExit={() => {
											doNotPromptBiometricAuth()
											setIsFullscreen(false)
										}}
										allowsPictureInPicture={false}
										allowsVideoFrameAnalysis={false}
										contentFit="contain"
										crossOrigin="anonymous"
										startsPictureInPictureAutomatically={false}
										useExoShutter={false}
									/>
								</View>
								<BlurView
									intensity={Platform.OS === "ios" ? 100 : 0}
									tint={Platform.OS === "ios" ? "systemChromeMaterial" : undefined}
									className={cn(
										"shrink-0 items-center justify-center w-full min-h-32",
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
												{formatSecondsToMMSS(currentTime)}
											</Text>
											<Slider
												value={(currentTime / duration) * 100}
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
												{formatSecondsToMMSS(duration)}
											</Text>
										</View>
										<View className="flex-1 flex-row items-center justify-between gap-4 w-full px-4 py-2 border-border border-t">
											<Button
												variant="plain"
												size="icon"
												onPress={toggleFullscreen}
												disabled={loading}
											>
												<MaterialCommunityIcons
													name="fullscreen"
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
							</View>
						)}
					</Fragment>
				)}
			</View>
		)
	}
)

Video.displayName = "Video"

export default Video
