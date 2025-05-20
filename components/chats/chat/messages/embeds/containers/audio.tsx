import { memo, useState, useEffect, useCallback } from "react"
import { View } from "react-native"
import { useAudioPlayer } from "expo-audio"
import { Icon } from "@roninoss/icons"
import { useColorScheme } from "@/lib/useColorScheme"
import { Button } from "@/components/nativewindui/Button"
import { Slider } from "@/components/nativewindui/Slider"
import { Text } from "@/components/nativewindui/Text"
import { formatSecondsToMMSS } from "@/lib/utils"
import Fallback from "./fallback"
import useSetExpoAudioMode from "@/hooks/useSetExpoAudioMode"
import { useTrackPlayer } from "@/lib/trackPlayer"

export const Audio = memo(({ source, name, link }: { source: string; name: string; link: string }) => {
	useSetExpoAudioMode()

	const [loadSuccess, setLoadSuccess] = useState<boolean>(false)
	const { colors } = useColorScheme()
	const player = useAudioPlayer(source, 100)
	const trackPlayer = useTrackPlayer()

	const togglePlay = useCallback(() => {
		if (player.currentTime >= player.duration - 1) {
			player.seekTo(0)
		}

		if (player.playing) {
			player.pause()

			return
		}

		player.play()
	}, [player])

	const seek = useCallback(
		(value: number) => {
			player.seekTo((value / 100) * player.duration)
		},
		[player]
	)

	useEffect(() => {
		player.loop = true

		setLoadSuccess(player.isLoaded)
	}, [player])

	useEffect(() => {
		trackPlayer?.stop().catch(console.error)

		return () => {
			trackPlayer?.play().catch(console.error)
		}
	}, [trackPlayer])

	if (!loadSuccess) {
		return <Fallback link={link} />
	}

	return (
		<View className="flex-1 bg-background border border-border rounded-md flex-col">
			<View className="flex-row items-center px-2 pt-2">
				<Text
					numberOfLines={1}
					ellipsizeMode="middle"
					className="shrink text-sm font-normal text-foreground"
				>
					{name}
				</Text>
			</View>
			<View className="flex-row items-center gap-2 px-2">
				<Button
					variant="plain"
					size="none"
					className="shrink-0 active:opacity-70"
					hitSlop={15}
					onPress={togglePlay}
					unstable_pressDelay={100}
				>
					<Icon
						name={player.playing ? "pause-circle-outline" : "play-circle-outline"}
						size={32}
						color={colors.foreground}
					/>
				</Button>
				<View className="flex-row items-center justify-between flex-1 gap-1.5">
					<Text
						className="text-xs font-normal text-muted-foreground"
						style={{
							fontVariant: ["tabular-nums"]
						}}
					>
						{formatSecondsToMMSS(player.currentTime)}
					</Text>
					<Slider
						value={(player.currentTime / player.duration) * 100}
						minimumValue={0}
						maximumValue={100}
						tapToSeek={true}
						step={0.1}
						style={{
							flex: 1
						}}
						onValueChange={seek}
					/>
					<Text
						className="text-xs font-normal text-muted-foreground"
						style={{
							fontVariant: ["tabular-nums"]
						}}
					>
						{formatSecondsToMMSS(player.duration)}
					</Text>
				</View>
			</View>
		</View>
	)
})

Audio.displayName = "Audio"

export default Audio
