import { AudioPro, AudioProEventType, type AudioProTrack, useAudioPro, AudioProState } from "react-native-audio-pro"
import { useCallback, useRef, useMemo } from "react"
import Semaphore from "./semaphore"
import { useMMKVObject } from "react-native-mmkv"
import mmkvInstance from "./mmkv"
import nodeWorker from "./nodeWorker"
import * as FileSystem from "expo-file-system/next"
import paths from "./paths"
import { randomUUID } from "expo-crypto"
import { type FileEncryptionVersion } from "@filen/sdk"
import { normalizeFilePathForNode, normalizeFilePathForExpo, shuffleArray } from "./utils"
import { SILENT_1H_AUDIO_FILE } from "@/lib/constants"
import mimeTypes from "mime-types"

export type AudioProTrackExtended = AudioProTrack & {
	file: {
		bucket: string
		uuid: string
		region: string
		chunks: number
		version: number
		key: string
		size: number
		name: string
		mime: string
	}
	playlist: string
}

export type TrackMetadata = {
	artist?: string
	album?: string
	title?: string
	picture?: string
}

export const TRACK_PLAYER_QUEUE_KEY = "trackPlayerState_Queue"
export const TRACK_PLAYER_PLAYING_TRACK_KEY = "trackPlayerState_PlayingTrack"
export const TRACK_PLAYER_TIMINGS_KEY = "trackPlayerState_Timings"
export const TRACK_PLAYER_REPEAT_MODE_KEY = "trackPlayerState_RepeatMode"
export const TRACK_PLAYER_PLAYBACK_SPEED_KEY = "trackPlayerState_PlaybackSpeed"
export const TRACK_PLAYER_VOLUME_KEY = "trackPlayerState_Volume"

export class TrackPlayerService {
	private readonly loadFileForTrackMutex: Semaphore = new Semaphore(1)

	public saveState(): void {
		const playingTrack = AudioPro.getPlayingTrack() as AudioProTrackExtended
		const playbackSpeed = AudioPro.getPlaybackSpeed()
		const volume = AudioPro.getVolume()
		const timings = AudioPro.getTimings()

		if (playingTrack) {
			mmkvInstance.set(TRACK_PLAYER_PLAYING_TRACK_KEY, JSON.stringify(playingTrack))
		}

		mmkvInstance.set(TRACK_PLAYER_PLAYBACK_SPEED_KEY, playbackSpeed)
		mmkvInstance.set(TRACK_PLAYER_VOLUME_KEY, volume)
		mmkvInstance.set(TRACK_PLAYER_TIMINGS_KEY, JSON.stringify(timings))
	}

	public getQueue(): AudioProTrackExtended[] {
		const mmkvQueue = mmkvInstance.getString(TRACK_PLAYER_QUEUE_KEY)

		if (!mmkvQueue) {
			return []
		}

		try {
			return JSON.parse(mmkvQueue ?? "[]") as AudioProTrackExtended[]
		} catch {
			return []
		}
	}

	public getCurrentTrack(): AudioProTrackExtended | null {
		const queue = this.getQueue()
		const playingTrack = AudioPro.getPlayingTrack() as AudioProTrackExtended | null

		if (!playingTrack) {
			return null
		}

		const playingTrackIndex = queue.findIndex(track => track.file.uuid === playingTrack.file.uuid)
		const currentTrack = queue.at(playingTrackIndex)

		if (!currentTrack) {
			return null
		}

		return currentTrack
	}

	public getNextTrackInQueue(): AudioProTrackExtended | null {
		const queue = this.getQueue()
		const playingTrack = AudioPro.getPlayingTrack() as AudioProTrackExtended | null

		if (!playingTrack) {
			return null
		}

		const playingTrackIndex = queue.findIndex(track => track.file.uuid === playingTrack.file.uuid)
		const nextTrack = queue.at(playingTrackIndex + 1)

		return nextTrack ?? null
	}

	public getPreviousTrackInQueue(): AudioProTrackExtended | null {
		const queue = this.getQueue()
		const playingTrack = AudioPro.getPlayingTrack() as AudioProTrackExtended | null

		if (!playingTrack) {
			return null
		}

		const playingTrackIndex = queue.findIndex(track => track.file.uuid === playingTrack.file.uuid)
		const previousTrack = queue.at(playingTrackIndex + 1)

		return previousTrack ?? null
	}

	public async clearActiveStorage(): Promise<void> {
		const dir = new FileSystem.Directory(paths.trackPlayer())

		if (!dir.exists) {
			return
		}

		const files = dir.listAsRecords()

		if (files.length === 0) {
			return
		}

		const size = files.reduce((acc, file) => {
			if (!file.isDirectory) {
				const entry = new FileSystem.File(file.uri)

				return acc + (entry.exists ? (entry.size ?? 0) : 0)
			}

			return acc
		}, 0)

		if (size === 0) {
			return
		}

		const playingTrack = AudioPro.getPlayingTrack() as AudioProTrackExtended

		if (!playingTrack) {
			return
		}

		const queue = this.getQueue()
		const playingTrackIndex = queue.findIndex(track => track.file.uuid === playingTrack.file.uuid)

		if (playingTrackIndex === -1) {
			return
		}

		const tracksToKeep = queue.filter((_, index) => index >= playingTrackIndex - 10 && index <= playingTrackIndex + 10)
		const tracksToKeepNames = tracksToKeep.map(track => track.file.uuid)

		for (const file of files) {
			if (file.isDirectory) {
				return
			}

			const name = FileSystem.Paths.parse(file.uri).name

			if (tracksToKeepNames.includes(name)) {
				continue
			}

			const entry = new FileSystem.File(file.uri)

			if (entry.exists) {
				entry.delete()
			}
		}
	}

	public getTrackMetadataKey(track: AudioProTrackExtended): string {
		return `trackPlayerFileMetadata:${track.file.uuid}`
	}

	public getTrackMetadataKeyFromUUID(uuid: string): string {
		return `trackPlayerFileMetadata:${uuid}`
	}

	public async loadFileForTrack(track: AudioProTrackExtended, autoPlay: boolean = true): Promise<void> {
		await this.loadFileForTrackMutex.acquire()

		try {
			const queue = this.getQueue()

			if (queue.length === 0) {
				return
			}

			const trackIndex = queue.findIndex(track => track.file.uuid === track.file.uuid)

			if (trackIndex === -1) {
				return
			}

			const destination = new FileSystem.File(
				FileSystem.Paths.join(paths.trackPlayer(), `${track.file.uuid}${FileSystem.Paths.extname(track.file.name)}`)
			)

			if (!destination.exists) {
				await nodeWorker.proxy("downloadFile", {
					id: randomUUID(),
					uuid: track.file.uuid,
					bucket: track.file.bucket,
					region: track.file.region,
					chunks: track.file.chunks,
					version: track.file.version as FileEncryptionVersion,
					key: track.file.key,
					destination: destination.uri,
					size: track.file.size,
					name: track.file.name,
					dontEmitProgress: true
				})
			}

			const meta = mmkvInstance.getString(this.getTrackMetadataKey(track))

			const metadata = meta
				? (JSON.parse(meta) as TrackMetadata)
				: await new Promise<TrackMetadata>(resolve => {
						nodeWorker
							.proxy("parseAudioMetadata", {
								path: normalizeFilePathForNode(destination.uri)
							})
							.then(result => {
								if (result && (result.tags.title || result.tags.artist || result.tags.album || result.tags.picture)) {
									const meta: TrackMetadata = {
										artist: result.tags.artist,
										album: result.tags.album,
										title: result.tags.title,
										picture: undefined
									}

									if (
										result.tags.picture &&
										result.tags.picture.data &&
										result.tags.picture.data.length > 0 &&
										result.tags.picture.format
									) {
										const pictureFormat = mimeTypes.extension(result.tags.picture.format)

										if (pictureFormat) {
											const destination = new FileSystem.File(
												FileSystem.Paths.join(paths.trackPlayerPictures(), `${track.file.uuid}.${pictureFormat}`)
											)

											if (!destination.exists) {
												destination.write(new Uint8Array(result.tags.picture.data))
											}

											meta.picture = destination.uri
										}
									}

									mmkvInstance.set(this.getTrackMetadataKey(track), JSON.stringify(meta))

									resolve(meta)

									return
								}

								resolve({
									artist: undefined,
									album: undefined,
									title: undefined
								})
							})
							.catch(err => {
								console.error(err)

								resolve({
									artist: undefined,
									album: undefined,
									title: undefined
								})
							})
					})

			let didChange = false
			const newQueue = queue.map(queueTrack => {
				if (typeof queueTrack.url !== "string") {
					return queueTrack
				}

				if (!queueTrack.url.endsWith(SILENT_1H_AUDIO_FILE)) {
					return queueTrack
				}

				if (queueTrack.file.uuid === track.file.uuid) {
					didChange = true

					return {
						...queueTrack,
						url: normalizeFilePathForExpo(destination.uri),
						title: metadata.title ?? queueTrack.title,
						artist: metadata.artist ?? queueTrack.artist,
						album: metadata.album ?? queueTrack.album,
						artwork: metadata.picture ? normalizeFilePathForExpo(metadata.picture) : queueTrack.artwork
					}
				}

				return queueTrack
			})

			if (didChange) {
				mmkvInstance.set(TRACK_PLAYER_QUEUE_KEY, JSON.stringify(newQueue))

				const trackToPlay = newQueue.at(trackIndex)

				if (trackToPlay && autoPlay) {
					AudioPro.play(trackToPlay, {
						autoPlay: true
					})
				}
			}

			await this.clearActiveStorage()

			this.saveState()
		} finally {
			this.loadFileForTrackMutex.release()
		}
	}

	public init(): void {
		/*AudioPro.configure({
			contentType: AudioProContentType.MUSIC,
			debug: __DEV__,
			debugIncludesProgress: false,
			progressIntervalMs: 100,
			showNextPrevControls: true
		})*/

		AudioPro.addEventListener(async event => {
			switch (event.type) {
				case AudioProEventType.STATE_CHANGED: {
					if (!event.track) {
						return
					}

					try {
						await this.loadFileForTrack(event.track as AudioProTrackExtended, true)

						this.saveState()
					} catch (e) {
						console.error(e)
					}

					break
				}

				case AudioProEventType.REMOTE_NEXT: {
					try {
						console.log("Remote next track", event)
					} catch (e) {
						console.error(e)
					}

					break
				}

				case AudioProEventType.REMOTE_PREV: {
					try {
						console.log("Remote prev track", event)
					} catch (e) {
						console.error(e)
					}

					break
				}

				case AudioProEventType.PROGRESS: {
					try {
						console.log("Progress event", event)
					} catch (e) {
						console.error(e)
					}

					break
				}

				case AudioProEventType.SEEK_COMPLETE: {
					try {
						console.log("SEEK_COMPLETE event", event)
					} catch (e) {
						console.error(e)
					}

					break
				}

				case AudioProEventType.PLAYBACK_ERROR: {
					try {
						console.log("PLAYBACK_ERROR event", event)
					} catch (e) {
						console.error(e)
					}

					break
				}

				case AudioProEventType.PLAYBACK_SPEED_CHANGED: {
					try {
						console.log("PLAYBACK_SPEED_CHANGED event", event)
					} catch (e) {
						console.error(e)
					}

					break
				}

				case AudioProEventType.TRACK_ENDED: {
					try {
						console.log("TRACK_ENDED event", event)
					} catch (e) {
						console.error(e)
					}

					break
				}
			}
		})
	}
}

export const trackPlayerService = new TrackPlayerService()

export function useTrackPlayerState() {
	const trackPlayerState = useAudioPro()
	const [trackPlayerQueueMMKV] = useMMKVObject<AudioProTrackExtended[]>(TRACK_PLAYER_QUEUE_KEY, mmkvInstance)
	const [playingTrackMMKV] = useMMKVObject<AudioProTrackExtended>(TRACK_PLAYER_PLAYING_TRACK_KEY, mmkvInstance)

	const isPlaying = useMemo(() => {
		return trackPlayerState.state === AudioProState.PLAYING
	}, [trackPlayerState.state])

	const isLoading = useMemo(() => {
		return trackPlayerState.state === AudioProState.LOADING
	}, [trackPlayerState.state])

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

	const progressNormalized = useMemo(() => {
		if (trackPlayerState.duration === 0 || trackPlayerState.position === 0 || isLoading) {
			return 0
		}

		if (trackPlayerState.position >= trackPlayerState.duration) {
			return 100
		}

		const normalized = Math.round((trackPlayerState.position / trackPlayerState.duration) * 100)

		if (normalized >= 100) {
			return 100
		}

		if (normalized <= 0) {
			return 0
		}

		return normalized
	}, [trackPlayerState.position, trackPlayerState.duration, isLoading])

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
		position: trackPlayerState.position
	}
}

export function useTrackPlayerControls() {
	const trackPlayerState = useTrackPlayerState()
	const mutex = useRef<Semaphore>(new Semaphore(1))

	const seek = useCallback(async (ms: number) => {
		await mutex.current.acquire()

		try {
			AudioPro.seekTo(ms)
			AudioPro.resume()
		} catch (e) {
			console.error(e)
		} finally {
			mutex.current.release()
		}
	}, [])

	const skipToPrevious = useCallback(async () => {
		await mutex.current.acquire()

		try {
			const nextTrack = trackPlayerService.getNextTrackInQueue()

			if (!nextTrack) {
				return
			}

			AudioPro.play(nextTrack, {
				autoPlay: true
			})

			AudioPro.resume()
		} catch (e) {
			console.error(e)
		} finally {
			mutex.current.release()
		}
	}, [])

	const skipToNext = useCallback(async () => {
		await mutex.current.acquire()

		try {
			const previousTrack = trackPlayerService.getNextTrackInQueue()

			if (!previousTrack) {
				return
			}

			AudioPro.play(previousTrack, {
				autoPlay: true
			})

			AudioPro.resume()
		} catch (e) {
			console.error(e)
		} finally {
			mutex.current.release()
		}
	}, [])

	const togglePlay = useCallback(async () => {
		await mutex.current.acquire()

		try {
			const currentTrack = trackPlayerService.getCurrentTrack()

			if (trackPlayerState.isPlaying) {
				AudioPro.pause()
			} else {
				if (!currentTrack) {
					const queue = trackPlayerService.getQueue()

					if (queue.length === 0) {
						return
					}

					const trackToPlay = queue.at(0)

					if (!trackToPlay) {
						return
					}

					AudioPro.play(trackToPlay, {
						autoPlay: true
					})
				} else {
					if (trackPlayerState.position >= trackPlayerState.duration - 1000) {
						AudioPro.seekTo(0)
					}
				}

				AudioPro.resume()
			}
		} catch (e) {
			console.error(e)
		} finally {
			mutex.current.release()
		}
	}, [trackPlayerState.isPlaying, trackPlayerState.position, trackPlayerState.duration])

	const play = useCallback(async () => {
		await mutex.current.acquire()

		try {
			const currentTrack = trackPlayerService.getCurrentTrack()

			if (!currentTrack) {
				const queue = trackPlayerService.getQueue()

				if (queue.length === 0) {
					return
				}

				const trackToPlay = queue.at(0)

				if (!trackToPlay) {
					return
				}

				AudioPro.play(trackToPlay, {
					autoPlay: true
				})
			}

			AudioPro.resume()
		} catch (e) {
			console.error(e)
		} finally {
			mutex.current.release()
		}
	}, [])

	const pause = useCallback(async () => {
		await mutex.current.acquire()

		try {
			AudioPro.pause()
		} catch (e) {
			console.error(e)
		} finally {
			mutex.current.release()
		}
	}, [])

	const stop = useCallback(async () => {
		await mutex.current.acquire()

		try {
			AudioPro.stop()
		} catch (e) {
			console.error(e)
		} finally {
			mutex.current.release()
		}
	}, [])

	const clear = useCallback(async () => {
		await mutex.current.acquire()

		try {
			AudioPro.clear()

			mmkvInstance.delete(TRACK_PLAYER_QUEUE_KEY)
			mmkvInstance.delete(TRACK_PLAYER_PLAYING_TRACK_KEY)
		} catch (e) {
			console.error(e)
		} finally {
			mutex.current.release()
		}
	}, [])

	const setPlaybackSpeed = useCallback(async (speed: number) => {
		await mutex.current.acquire()

		try {
			AudioPro.setPlaybackSpeed(speed)
		} catch (e) {
			console.error(e)
		} finally {
			mutex.current.release()
		}
	}, [])

	const setVolume = useCallback(async (volume: number) => {
		await mutex.current.acquire()

		try {
			AudioPro.setVolume(volume)
		} catch (e) {
			console.error(e)
		} finally {
			mutex.current.release()
		}
	}, [])

	const shuffle = useCallback(async () => {
		await mutex.current.acquire()

		try {
			mmkvInstance.set(TRACK_PLAYER_QUEUE_KEY, JSON.stringify(shuffleArray(trackPlayerState.queue)))
		} catch (e) {
			console.error(e)
		} finally {
			mutex.current.release()
		}
	}, [trackPlayerState.queue])

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
			if (queue.length === 0) {
				return
			}

			await mutex.current.acquire()

			try {
				mmkvInstance.set(TRACK_PLAYER_QUEUE_KEY, JSON.stringify(queue))

				if (autoPlay) {
					const autoPlayTrack = startingTrackIndex ? queue.at(startingTrackIndex) : 0

					if (autoPlayTrack) {
						AudioPro.play(autoPlayTrack, {
							autoPlay: true,
							startTimeMs: startingTrackStartTimeMs
						})
					}
				}
			} catch (e) {
				console.error(e)
			} finally {
				mutex.current.release()
			}
		},
		[]
	)

	const getQueue = useCallback(async () => {
		await mutex.current.acquire()

		try {
			return trackPlayerService.getQueue()
		} catch {
			return []
		} finally {
			mutex.current.release()
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

export default trackPlayerService
