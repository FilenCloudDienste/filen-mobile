import TrackPlayer, {
	Event,
	useActiveTrack,
	usePlayWhenReady,
	usePlaybackState,
	useProgress,
	State,
	AppKilledPlaybackBehavior,
	Capability,
	type Track,
	RepeatMode
} from "react-native-track-player"
import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import Semaphore from "./semaphore"
import { useMMKVObject } from "react-native-mmkv"
import mmkvInstance from "./mmkv"
import nodeWorker from "./nodeWorker"
import * as FileSystem from "expo-file-system/next"
import { type PlaylistFile } from "@/queries/usePlaylistsQuery"
import paths from "./paths"
import { randomUUID } from "expo-crypto"
import { type FileEncryptionVersion } from "@filen/sdk"
import { Platform } from "react-native"
import { normalizeFilePathForNode, normalizeFilePathForExpo, shuffleArray } from "./utils"
import { SILENT_1H_AUDIO_FILE } from "@/lib/constants"
import mimeTypes from "mime-types"

export type TrackMetadata = {
	artist?: string
	album?: string
	title?: string
	picture?: string
}

export class TrackPlayerService {
	private readonly initMutex: Semaphore = new Semaphore(1)
	public initialized: boolean = false
	private readonly stateMutex: Semaphore = new Semaphore(1)
	private readonly loadFileForTrackMutex: Semaphore = new Semaphore(1)

	public async init(): Promise<void> {
		await this.initMutex.acquire()

		try {
			if (this.initialized) {
				return
			}

			await TrackPlayer.setupPlayer()

			await TrackPlayer.updateOptions({
				progressUpdateEventInterval: 1,
				android: {
					appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification
				},
				capabilities: [
					Capability.Play,
					Capability.Pause,
					Capability.Stop,
					Capability.SeekTo,
					Capability.SkipToNext,
					Capability.SkipToPrevious,
					Capability.PlayFromId,
					Capability.PlayFromSearch
				],
				compactCapabilities: [
					Capability.Play,
					Capability.Pause,
					Capability.Stop,
					Capability.SeekTo,
					Capability.SkipToNext,
					Capability.SkipToPrevious,
					Capability.PlayFromId,
					Capability.PlayFromSearch
				],
				notificationCapabilities: [
					Capability.Play,
					Capability.Pause,
					Capability.Stop,
					Capability.SeekTo,
					Capability.SkipToNext,
					Capability.SkipToPrevious,
					Capability.PlayFromId,
					Capability.PlayFromSearch
				]
			})

			await this.restoreState()

			this.initialized = true
		} finally {
			this.initMutex.release()
		}
	}

	public async waitForReady(): Promise<void> {
		if (this.initialized) {
			return
		}

		await new Promise<void>(resolve => {
			const interval = setInterval(() => {
				if (this.initialized) {
					clearInterval(interval)

					resolve()
				}
			}, 100)
		})
	}

	public async restoreState(): Promise<void> {
		await this.stateMutex.acquire()

		try {
			const mmkvQueue = mmkvInstance.getString("trackPlayerQueue")
			const mmkvActiveTrack = mmkvInstance.getString("trackPlayerActiveTrack")

			if (mmkvQueue && mmkvActiveTrack) {
				const activeTrack = JSON.parse(mmkvActiveTrack) as Track
				const activeTrackFile = JSON.parse(activeTrack.description ?? "{}") as PlaylistFile
				const queue = JSON.parse(mmkvQueue) as Track[]

				const activeTrackIndex = queue.findIndex(entry => {
					const entryFile = JSON.parse(entry.description ?? "{}") as PlaylistFile

					return entryFile.uuid === activeTrackFile.uuid
				})

				if (queue.length > 0 && activeTrack && activeTrackIndex !== -1) {
					await TrackPlayer.setQueue(queue)
					await TrackPlayer.skip(activeTrackIndex)
				}
			}

			/*const mmkvProgress = mmkvInstance.getString("trackPlayerProgress")

			if (mmkvProgress) {
				const progress = JSON.parse(mmkvProgress)

				await TrackPlayer.seekTo(progress.position)
			}*/

			const mmkvRepeatMode = mmkvInstance.getNumber("trackPlayerRepeatMode")

			if (mmkvRepeatMode) {
				await TrackPlayer.setRepeatMode(mmkvRepeatMode)
			}
		} finally {
			this.stateMutex.release()
		}
	}

	public async saveState(): Promise<void> {
		await this.stateMutex.acquire()

		try {
			await this.waitForReady()

			const [queue, progress, repeatMode, activeTrack] = await Promise.all([
				TrackPlayer.getQueue(),
				TrackPlayer.getProgress(),
				TrackPlayer.getRepeatMode(),
				TrackPlayer.getActiveTrack()
			])

			if (queue) {
				mmkvInstance.set("trackPlayerQueue", JSON.stringify(queue))
			}

			if (progress) {
				mmkvInstance.set("trackPlayerProgress", JSON.stringify(progress))
			}

			if (repeatMode) {
				mmkvInstance.set("trackPlayerRepeatMode", repeatMode)
			}

			if (activeTrack) {
				mmkvInstance.set("trackPlayerActiveTrack", JSON.stringify(activeTrack))
			}
		} catch (e) {
			console.error(e)
		} finally {
			this.stateMutex.release()
		}
	}

	public async clearActiveStorage(): Promise<void> {
		await this.waitForReady()

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

				return acc + (entry.exists ? entry.size ?? 0 : 0)
			}

			return acc
		}, 0)

		if (size === 0) {
			return
		}

		const activeTrack = await TrackPlayer.getActiveTrack()

		if (!activeTrack) {
			return
		}

		const activeTrackFile = JSON.parse(activeTrack.description ?? "{}") as PlaylistFile
		const queue = await TrackPlayer.getQueue()
		const activeTrackIndex = queue.findIndex(entry => {
			const entryFile = JSON.parse(entry.description ?? "{}") as PlaylistFile

			return entryFile.uuid === activeTrackFile.uuid
		})

		if (activeTrackIndex === -1) {
			return
		}

		const tracksToKeep = queue.filter((_, index) => index >= activeTrackIndex - 10 && index <= activeTrackIndex + 10)
		const tracksToKeepNames = tracksToKeep.map(track => {
			const entryFile = JSON.parse(track.description ?? "{}") as PlaylistFile

			return entryFile.uuid
		})

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

	public async loadFileForActiveTrack(activeTrack: Track, autoPlay: boolean = true): Promise<void> {
		await this.loadFileForTrackMutex.acquire()

		try {
			await this.waitForReady()

			const activeTrackFile = JSON.parse(activeTrack.description ?? "{}") as PlaylistFile
			const queue = await TrackPlayer.getQueue()

			if (queue.length === 0) {
				return
			}

			const activeTrackIndex = queue.findIndex(entry => {
				const entryFile = JSON.parse(entry.description ?? "{}") as PlaylistFile

				return entryFile.uuid === activeTrackFile.uuid
			})

			if (activeTrackIndex === -1) {
				return
			}

			const destination = new FileSystem.File(FileSystem.Paths.join(paths.trackPlayer(), `${activeTrackFile.uuid}.mp3`))

			if (!destination.exists) {
				await nodeWorker.proxy("downloadFile", {
					id: randomUUID(),
					uuid: activeTrackFile.uuid,
					bucket: activeTrackFile.bucket,
					region: activeTrackFile.region,
					chunks: activeTrackFile.chunks,
					version: activeTrackFile.version as FileEncryptionVersion,
					key: activeTrackFile.key,
					destination: destination.uri,
					size: activeTrackFile.size,
					name: activeTrackFile.name,
					dontEmitProgress: true
				})
			}

			const meta = mmkvInstance.getString(`trackPlayerFileMetadata:${activeTrackFile.uuid}`)

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
												FileSystem.Paths.join(
													paths.trackPlayerPictures(),
													`${activeTrackFile.uuid}.${pictureFormat}`
												)
											)

											if (!destination.exists) {
												destination.write(new Uint8Array(result.tags.picture.data))
											}

											meta.picture = destination.uri
										}
									}

									mmkvInstance.set(`trackPlayerFileMetadata:${activeTrackFile.uuid}`, JSON.stringify(meta))

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
			const newQueue = queue.map(entry => {
				if (!entry.url.endsWith(SILENT_1H_AUDIO_FILE)) {
					return entry
				}

				const entryFile = JSON.parse(entry.description ?? "{}") as PlaylistFile

				if (entryFile.uuid === activeTrackFile.uuid) {
					didChange = true

					return {
						...entry,
						url: normalizeFilePathForExpo(destination.uri),
						title: metadata.title ?? entry.title,
						artist: metadata.artist ?? entry.artist,
						album: metadata.album ?? entry.album,
						artwork: metadata.picture ? normalizeFilePathForExpo(metadata.picture) : entry.artwork,
						contentType: activeTrackFile.mime ?? entry.contentType
					}
				}

				return entry
			})

			if (didChange) {
				await TrackPlayer.setQueue(newQueue)
				await TrackPlayer.skip(activeTrackIndex)

				if (autoPlay) {
					for (let i = 0; i < 5; i++) {
						await TrackPlayer.play()

						await new Promise<void>(resolve => setTimeout(resolve, 100))
					}
				}
			}

			await this.clearActiveStorage()
			await this.saveState()
		} finally {
			this.loadFileForTrackMutex.release()
		}
	}

	public async handle(): Promise<void> {
		TrackPlayer.addEventListener(Event.RemotePlay, async () => {
			try {
				await this.waitForReady()
				await TrackPlayer.play()
			} catch (e) {
				console.error(e)
			}
		})

		TrackPlayer.addEventListener(Event.RemotePause, async () => {
			try {
				await this.waitForReady()
				await TrackPlayer.pause()
			} catch (e) {
				console.error(e)
			}
		})

		TrackPlayer.addEventListener(Event.RemoteNext, async () => {
			try {
				await this.waitForReady()
				await TrackPlayer.skipToNext()
				await TrackPlayer.play()
			} catch (e) {
				console.error(e)
			}
		})

		TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
			try {
				await this.waitForReady()
				await TrackPlayer.skipToPrevious()
				await TrackPlayer.play()
			} catch (e) {
				console.error(e)
			}
		})

		TrackPlayer.addEventListener(Event.RemoteSeek, async e => {
			try {
				await this.waitForReady()
				await TrackPlayer.seekTo(e.position)
				await TrackPlayer.play()
			} catch (e) {
				console.error(e)
			}
		})

		TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async e => {
			if (!e.track) {
				return
			}

			try {
				await this.waitForReady()
				await this.loadFileForActiveTrack(e.track)
				await this.saveState()
			} catch (e) {
				console.error(e)
			}
		})

		TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async () => {
			try {
				await this.waitForReady()
			} catch (e) {
				console.error(e)
			}
		})

		if (Platform.OS === "android") {
			TrackPlayer.addEventListener(Event.RemotePlayId, async () => {
				try {
					await this.waitForReady()
					await TrackPlayer.play()
				} catch (e) {
					console.error(e)
				}
			})

			TrackPlayer.addEventListener(Event.RemotePlaySearch, async () => {
				try {
					await this.waitForReady()
					await TrackPlayer.play()
				} catch (e) {
					console.error(e)
				}
			})
		}
	}
}

export const trackPlayerService = new TrackPlayerService()

export function useTrackPlayer() {
	const [ready, setReady] = useState<boolean>(trackPlayerService.initialized)

	useEffect(() => {
		;(async () => {
			await trackPlayerService.waitForReady()

			setReady(true)
		})()
	}, [])

	return ready ? TrackPlayer : null
}

export function useTrackPlayerState() {
	const playbackState = usePlaybackState()
	const playWhenReady = usePlayWhenReady()
	const progress = useProgress()
	const activeTrackHook = useActiveTrack()
	const [trackPlayerQueue] = useMMKVObject<Track[]>("trackPlayerQueue", mmkvInstance)

	const isPlaying = useMemo(() => {
		if (playbackState.state === State.Buffering) {
			return false
		}

		return playbackState.state === State.Playing
	}, [playbackState])

	const activeTrack = useMemo(() => {
		if (activeTrackHook) {
			return activeTrackHook
		}

		return null
	}, [activeTrackHook])

	const activeTrackFile = useMemo(() => {
		if (!activeTrack) {
			return null
		}

		try {
			return JSON.parse(activeTrack.description ?? "{}") as PlaylistFile
		} catch {
			return null
		}
	}, [activeTrack])

	const activeTrackIndex = useMemo(() => {
		if (!activeTrackFile) {
			return -1
		}

		if (trackPlayerQueue && trackPlayerQueue.length > 0) {
			return trackPlayerQueue.findIndex(entry => {
				const entryFile = JSON.parse(entry.description ?? "{}") as PlaylistFile

				return entryFile.uuid === activeTrackFile?.uuid
			})
		}

		return -1
	}, [trackPlayerQueue, activeTrackFile])

	const isLoading = useMemo(() => {
		return playbackState.state === State.Loading || (activeTrack && activeTrack.url.endsWith(SILENT_1H_AUDIO_FILE))
	}, [playbackState, activeTrack])

	const progressNormalized = useMemo(() => {
		if (progress.duration === 0 || progress.position === 0 || isLoading) {
			return 0
		}

		if (progress.position >= progress.duration) {
			return 100
		}

		const normalized = Math.round((progress.position / progress.duration) * 100)

		if (normalized >= 100) {
			return 100
		}

		if (normalized <= 0) {
			return 0
		}

		return normalized
	}, [progress, isLoading])

	return {
		playbackState,
		playWhenReady,
		progress,
		activeTrack,
		isPlaying,
		queue: trackPlayerQueue ?? [],
		progressNormalized,
		isBuffering: playbackState.state === State.Buffering,
		isLoading,
		isStopped: playbackState.state === State.Stopped,
		isPaused: playbackState.state === State.Paused,
		isEnded: playbackState.state === State.Ended,
		isError: playbackState.state === State.Error,
		isNone: playbackState.state === State.None,
		isReady: playbackState.state === State.Ready,
		activeTrackFile,
		activeTrackIndex
	}
}

export function useTrackPlayerControls() {
	const trackPlayerState = useTrackPlayerState()
	const mutex = useRef<Semaphore>(new Semaphore(1))
	const trackPlayer = useTrackPlayer()

	const seek = useCallback(
		async (positionSeconds: number) => {
			if (!trackPlayer) {
				return
			}

			await mutex.current.acquire()

			try {
				await trackPlayer.seekTo(positionSeconds)
				await trackPlayer.play()
			} catch (e) {
				console.error(e)
			} finally {
				mutex.current.release()
			}
		},
		[trackPlayer]
	)

	const skipToPrevious = useCallback(async () => {
		if (!trackPlayer) {
			return
		}

		await mutex.current.acquire()

		try {
			await trackPlayer.skipToPrevious()
			await trackPlayer.play()
		} catch (e) {
			console.error(e)
		} finally {
			mutex.current.release()
		}
	}, [trackPlayer])

	const skipToNext = useCallback(async () => {
		if (!trackPlayer) {
			return
		}

		await mutex.current.acquire()

		try {
			await trackPlayer.skipToNext()
			await trackPlayer.play()
		} catch (e) {
			console.error(e)
		} finally {
			mutex.current.release()
		}
	}, [trackPlayer])

	const togglePlay = useCallback(async () => {
		if (!trackPlayer) {
			return
		}

		await mutex.current.acquire()

		try {
			if (trackPlayerState.isPlaying) {
				await trackPlayer.pause()
			} else {
				if (trackPlayerState.progress.position >= trackPlayerState.progress.duration - 1) {
					await trackPlayer.seekTo(0)
				}

				await trackPlayer.play()
			}
		} catch (e) {
			console.error(e)
		} finally {
			mutex.current.release()
		}
	}, [trackPlayer, trackPlayerState])

	const play = useCallback(async () => {
		if (!trackPlayer) {
			return
		}

		await mutex.current.acquire()

		try {
			await trackPlayer.play()
		} catch (e) {
			console.error(e)
		} finally {
			mutex.current.release()
		}
	}, [trackPlayer])

	const pause = useCallback(async () => {
		if (!trackPlayer) {
			return
		}

		await mutex.current.acquire()

		try {
			await trackPlayer.pause()
		} catch (e) {
			console.error(e)
		} finally {
			mutex.current.release()
		}
	}, [trackPlayer])

	const stop = useCallback(async () => {
		if (!trackPlayer) {
			return
		}

		await mutex.current.acquire()

		try {
			await trackPlayer.stop()
		} catch (e) {
			console.error(e)
		} finally {
			mutex.current.release()
		}
	}, [trackPlayer])

	const setRepeatMode = useCallback(
		async (repeatMode: RepeatMode) => {
			if (!trackPlayer) {
				return
			}

			await mutex.current.acquire()

			try {
				await trackPlayer.setRepeatMode(repeatMode)
				await trackPlayerService.saveState()
			} catch (e) {
				console.error(e)
			} finally {
				mutex.current.release()
			}
		},
		[trackPlayer]
	)

	const setRate = useCallback(
		async (playbackRate: number) => {
			if (!trackPlayer) {
				return
			}

			await mutex.current.acquire()

			try {
				await trackPlayer.setRate(playbackRate)
			} catch (e) {
				console.error(e)
			} finally {
				mutex.current.release()
			}
		},
		[trackPlayer]
	)

	const setVolume = useCallback(
		async (volume: number) => {
			if (!trackPlayer) {
				return
			}

			await mutex.current.acquire()

			try {
				await trackPlayer.setVolume(volume)
			} catch (e) {
				console.error(e)
			} finally {
				mutex.current.release()
			}
		},
		[trackPlayer]
	)

	const reset = useCallback(async () => {
		if (!trackPlayer) {
			return
		}

		await mutex.current.acquire()

		try {
			await trackPlayer.reset()
		} catch (e) {
			console.error(e)
		} finally {
			mutex.current.release()
		}
	}, [trackPlayer])

	const shuffle = useCallback(async () => {
		if (!trackPlayer) {
			return
		}

		await mutex.current.acquire()

		try {
			const queue = await trackPlayer.getQueue()

			await trackPlayer.setQueue(shuffleArray(queue))
		} catch (e) {
			console.error(e)
		} finally {
			mutex.current.release()
		}
	}, [trackPlayer])

	return {
		seek,
		skipToPrevious,
		skipToNext,
		play,
		pause,
		stop,
		setRepeatMode,
		setRate,
		setVolume,
		togglePlay,
		reset,
		shuffle
	}
}

export default trackPlayerService
