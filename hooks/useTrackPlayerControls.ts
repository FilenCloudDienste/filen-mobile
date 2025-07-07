import { useCallback } from "react"
import { type AudioProTrackExtended, trackPlayer } from "@/lib/trackPlayer"
import alerts from "@/lib/alerts"

export function useTrackPlayerControls() {
	const seek = useCallback(async (seconds: number) => {
		try {
			await trackPlayer.seek(seconds)
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		}
	}, [])

	const skipToPrevious = useCallback(async () => {
		try {
			await trackPlayer.skipToPrevious()
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		}
	}, [])

	const skipToNext = useCallback(async () => {
		try {
			await trackPlayer.skipToNext()
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		}
	}, [])

	const togglePlay = useCallback(async () => {
		try {
			await trackPlayer.togglePlay()
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		}
	}, [])

	const play = useCallback(async () => {
		try {
			await trackPlayer.play()
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		}
	}, [])

	const pause = useCallback(async () => {
		try {
			await trackPlayer.pause()
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		}
	}, [])

	const stop = useCallback(async () => {
		try {
			await trackPlayer.stop()
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		}
	}, [])

	const clear = useCallback(async () => {
		try {
			await trackPlayer.clear()
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		}
	}, [])

	const setPlaybackSpeed = useCallback(async (speed: number) => {
		try {
			await trackPlayer.setPlaybackSpeed(speed)
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		}
	}, [])

	const setVolume = useCallback(async (volume: number) => {
		try {
			await trackPlayer.setVolume(volume)
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		}
	}, [])

	const shuffle = useCallback(async () => {
		try {
			await trackPlayer.shuffle()
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		}
	}, [])

	const setQueue = useCallback(
		async ({
			queue,
			startingTrackIndex,
			autoPlay,
			startingTrackStartTimeMs
		}: {
			queue: AudioProTrackExtended[]
			startingTrackIndex?: number
			autoPlay?: boolean
			startingTrackStartTimeMs?: number
		}) => {
			try {
				await trackPlayer.setQueue({
					queue,
					startingTrackIndex,
					autoPlay,
					startingTrackStartTimeMs
				})
			} catch (e) {
				console.error(e)

				if (e instanceof Error) {
					alerts.error(e.message)
				}
			}
		},
		[]
	)

	const getQueue = useCallback(async () => {
		try {
			return trackPlayer.getQueue()
		} catch {
			return []
		}
	}, [])

	return {
		seek,
		skipToPrevious,
		skipToNext,
		play,
		pause,
		stop,
		setVolume,
		togglePlay,
		shuffle,
		setPlaybackSpeed,
		clear,
		setQueue,
		getQueue
	}
}
