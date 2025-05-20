import TrackPlayer, {
	Event,
	useActiveTrack,
	usePlayWhenReady,
	usePlaybackState,
	useProgress,
	State,
	AppKilledPlaybackBehavior,
	Capability,
	type Track
} from "react-native-track-player"
import { useEffect, useState, useCallback, useRef } from "react"
import Semaphore from "./semaphore"

let trackPlayerInitialized: boolean = false
const mutex = new Semaphore(1)

export async function setupPlayer(): Promise<void> {
	await mutex.acquire()

	try {
		if (trackPlayerInitialized) {
			return
		}

		await TrackPlayer.setupPlayer()

		await TrackPlayer.updateOptions({
			android: {
				appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
				stopForegroundGracePeriod: 15,
				alwaysPauseOnInterruption: true
			},
			capabilities: [
				Capability.Play,
				Capability.Pause,
				Capability.Stop,
				Capability.SeekTo,
				Capability.SkipToNext,
				Capability.SkipToPrevious,
				Capability.JumpBackward,
				Capability.JumpForward
			],
			compactCapabilities: [
				Capability.Play,
				Capability.Pause,
				Capability.Stop,
				Capability.SeekTo,
				Capability.SkipToNext,
				Capability.SkipToPrevious,
				Capability.JumpBackward,
				Capability.JumpForward
			]
		})

		trackPlayerInitialized = true
	} finally {
		mutex.release()
	}
}

export function useTrackPlayer() {
	const [ready, setReady] = useState<boolean>(trackPlayerInitialized)

	useEffect(() => {
		;(async () => {
			await setupPlayer()

			setReady(true)
		})()
	}, [])

	return ready ? TrackPlayer : null
}

export function useTrackPlayerState() {
	const playbackState = usePlaybackState()
	const playWhenReady = usePlayWhenReady()
	const progress = useProgress()
	const activeTrack = useActiveTrack()
	const [queue, setQueue] = useState<Track[]>([])
	const didFetchQueueOnMountRef = useRef<boolean>(false)

	const getQueue = useCallback(async () => {
		try {
			const queue = await TrackPlayer.getQueue()

			setQueue(queue)

			return queue
		} catch (e) {
			console.error(e)

			return []
		}
	}, [])

	useEffect(() => {
		const playbackActiveTrackChangedListener = TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async () => {
			try {
				await getQueue()
			} catch (e) {
				console.error(e)
			}
		})

		const playbackErrorListener = TrackPlayer.addEventListener(Event.PlaybackError, async () => {
			try {
				await getQueue()
			} catch (e) {
				console.error(e)
			}
		})

		const playbackStateListener = TrackPlayer.addEventListener(Event.PlaybackState, async () => {
			try {
				await getQueue()
			} catch (e) {
				console.error(e)
			}
		})

		const playbackQueueEndedListener = TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async () => {
			try {
				await getQueue()
			} catch (e) {
				console.error(e)
			}
		})

		const metadataCommonReceivedListener = TrackPlayer.addEventListener(Event.MetadataCommonReceived, async () => {
			try {
				await getQueue()
			} catch (e) {
				console.error(e)
			}
		})

		return () => {
			playbackActiveTrackChangedListener.remove()
			playbackErrorListener.remove()
			playbackStateListener.remove()
			playbackQueueEndedListener.remove()
			metadataCommonReceivedListener.remove()
		}
	}, [getQueue])

	useEffect(() => {
		if (didFetchQueueOnMountRef.current) {
			return
		}

		didFetchQueueOnMountRef.current = true

		getQueue().catch(console.error)
	}, [getQueue])

	return {
		playbackState,
		playWhenReady,
		progress,
		activeTrack,
		isPlaying: playbackState.state === State.Playing,
		queue,
		getQueue
	}
}

export class TrackPlayerService {
	public async init(): Promise<void> {
		await setupPlayer()
	}

	public async handle(): Promise<void> {
		TrackPlayer.addEventListener(Event.RemotePlay, () => {
			if (!trackPlayerInitialized) {
				return
			}

			TrackPlayer.play()
		})

		TrackPlayer.addEventListener(Event.RemotePause, () => {
			if (!trackPlayerInitialized) {
				return
			}

			TrackPlayer.pause()
		})

		TrackPlayer.addEventListener(Event.RemoteNext, () => {
			if (!trackPlayerInitialized) {
				return
			}

			TrackPlayer.skipToNext()
		})

		TrackPlayer.addEventListener(Event.RemotePrevious, () => {
			if (!trackPlayerInitialized) {
				return
			}

			TrackPlayer.skipToPrevious()
		})

		TrackPlayer.addEventListener(Event.RemoteSeek, e => {
			if (!trackPlayerInitialized) {
				return
			}

			TrackPlayer.seekTo(e.position)
		})

		TrackPlayer.addEventListener(Event.MetadataCommonReceived, async e => {
			console.log("MetadataCommonReceived", e.metadata)

			const activeTrackIndex = await TrackPlayer.getActiveTrackIndex()

			if (!activeTrackIndex) {
				return
			}

			await TrackPlayer.updateMetadataForTrack(activeTrackIndex, {
				...e.metadata
			})
		})
	}
}

const trackPlayerService = new TrackPlayerService()

trackPlayerService
	.init()
	.then(() => {
		TrackPlayer.registerPlaybackService(() => trackPlayerService.handle)

		console.log("TrackPlayer ready")
	})
	.catch(console.error)

export default TrackPlayerService
