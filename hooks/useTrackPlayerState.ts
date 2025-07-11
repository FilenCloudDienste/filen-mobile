import { useMemo } from "react"
import { type AudioProTrackExtended, TRACK_PLAYER_QUEUE_KEY, TRACK_PLAYER_PLAYING_TRACK_KEY } from "@/lib/trackPlayer"
import mmkvInstance from "@/lib/mmkv"
import { useMMKVObject } from "react-native-mmkv"
import { useAudioPro } from "@/lib/audioPro"
import { AudioProState } from "react-native-audio-pro"
import { useShallow } from "zustand/shallow"
import { useTrackPlayerStore } from "@/stores/trackPlayer.store"

export function useTrackPlayerState() {
	const trackPlayerState = useAudioPro()
	const [trackPlayerQueueMMKV] = useMMKVObject<AudioProTrackExtended[]>(TRACK_PLAYER_QUEUE_KEY, mmkvInstance)
	const [playingTrackMMKV] = useMMKVObject<AudioProTrackExtended>(TRACK_PLAYER_PLAYING_TRACK_KEY, mmkvInstance)
	const loadingTrack = useTrackPlayerStore(useShallow(state => state.loadingTrack))

	const isPlaying = useMemo(() => {
		return trackPlayerState.state === AudioProState.PLAYING
	}, [trackPlayerState.state])

	const isLoading = useMemo(() => {
		return trackPlayerState.state === AudioProState.LOADING || loadingTrack
	}, [trackPlayerState.state, loadingTrack])

	const isError = useMemo(() => {
		if (trackPlayerState.error) {
			return true
		}

		return trackPlayerState.state === AudioProState.ERROR
	}, [trackPlayerState.state, trackPlayerState.error])

	const isIdle = useMemo(() => {
		return trackPlayerState.state === AudioProState.IDLE
	}, [trackPlayerState.state])

	const isPaused = useMemo(() => {
		return trackPlayerState.state === AudioProState.PAUSED
	}, [trackPlayerState.state])

	const isStopped = useMemo(() => {
		return trackPlayerState.state === AudioProState.STOPPED
	}, [trackPlayerState.state])

	const queue = useMemo(() => {
		if (!trackPlayerQueueMMKV) {
			return []
		}

		return trackPlayerQueueMMKV
	}, [trackPlayerQueueMMKV])

	const playingTrack = useMemo(() => {
		if (!playingTrackMMKV) {
			return null
		}

		return playingTrackMMKV
	}, [playingTrackMMKV])

	const playingTrackIndex = useMemo(() => {
		if (!playingTrack) {
			return -1
		}

		return queue.findIndex(track => track.file.uuid === playingTrack.file.uuid)
	}, [queue, playingTrack])

	const { durationSeconds, positionSeconds } = useMemo(() => {
		const durationSeconds = trackPlayerState.duration / 1000
		const positionSeconds = trackPlayerState.position / 1000

		return {
			durationSeconds,
			positionSeconds
		}
	}, [trackPlayerState.duration, trackPlayerState.position])

	const progressNormalized = useMemo(() => {
		if (durationSeconds <= 0 || positionSeconds <= 0 || isLoading) {
			return 0
		}

		if (positionSeconds >= durationSeconds) {
			return 100
		}

		const normalized = Math.round((positionSeconds / durationSeconds) * 100)

		if (normalized >= 100) {
			return 100
		}

		if (normalized <= 0) {
			return 0
		}

		return normalized
	}, [durationSeconds, positionSeconds, isLoading])

	return {
		isError,
		isIdle,
		isPaused,
		isStopped,
		isPlaying,
		queue,
		progressNormalized,
		isLoading,
		playingTrack,
		playingTrackIndex,
		volume: trackPlayerState.volume,
		playbackSpeed: trackPlayerState.playbackSpeed,
		duration: trackPlayerState.duration,
		position: trackPlayerState.position,
		durationSeconds,
		positionSeconds
	}
}
