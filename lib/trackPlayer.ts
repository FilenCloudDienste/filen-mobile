import { AudioProEventType, type AudioProTrack, AudioProContentType, AudioProState } from "react-native-audio-pro"
import Semaphore from "./semaphore"
import mmkvInstance from "./mmkv"
import * as FileSystem from "expo-file-system/next"
import paths from "./paths"
import { randomUUID } from "expo-crypto"
import { type FileEncryptionVersion } from "@filen/sdk"
import { normalizeFilePathForExpo, shuffleArray } from "./utils"
import mimeTypes from "mime-types"
import { AudioPro } from "./audioPro"
import { useTrackPlayerStore } from "@/stores/trackPlayer.store"
import assets from "./assets"
import download from "@/lib/download"
import { getAudioMetadata } from "@missingcore/audio-metadata"

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
	year?: number
}

export type RepeatMode = "off" | "track" | "queue"

export const TRACK_PLAYER_MMKV_PREFIX = "trackPlayerState:v2:"
export const TRACK_PLAYER_QUEUE_KEY = `${TRACK_PLAYER_MMKV_PREFIX}Queue`
export const TRACK_PLAYER_PLAYING_TRACK_KEY = `${TRACK_PLAYER_MMKV_PREFIX}PlayingTrack`
export const TRACK_PLAYER_TIMINGS_KEY = `${TRACK_PLAYER_MMKV_PREFIX}Timings`
export const TRACK_PLAYER_REPEAT_MODE_KEY = `${TRACK_PLAYER_MMKV_PREFIX}RepeatMode`
export const TRACK_PLAYER_PLAYBACK_SPEED_KEY = `${TRACK_PLAYER_MMKV_PREFIX}PlaybackSpeed`
export const TRACK_PLAYER_VOLUME_KEY = `${TRACK_PLAYER_MMKV_PREFIX}>Volume`

export class TrackPlayer {
	private readonly loadFileForTrackMutex: Semaphore = new Semaphore(1)
	private readonly controlsMutex: Semaphore = new Semaphore(1)

	public constructor() {
		AudioPro.configure({
			contentType: AudioProContentType.MUSIC,
			debug: false,
			debugIncludesProgress: false,
			progressIntervalMs: 1000,
			showNextPrevControls: true
		})

		AudioPro.addEventListener(async event => {
			switch (event.type) {
				case AudioProEventType.REMOTE_NEXT: {
					try {
						await this.skipToNext()
					} catch (e) {
						console.error(e)
					}

					break
				}

				case AudioProEventType.REMOTE_PREV: {
					try {
						await this.skipToPrevious()
					} catch (e) {
						console.error(e)
					}

					break
				}

				case AudioProEventType.TRACK_ENDED: {
					try {
						const repeatMode = this.getRepeatMode()

						if (repeatMode === "track") {
							await this.repeatCurrentTrack()

							return
						}

						if (repeatMode === "queue") {
							await this.controlsMutex.acquire()

							try {
								const queue = this.getQueue()

								if (queue.length > 0) {
									const nextTrack = this.getNextTrackInQueue()

									if (!nextTrack) {
										const firstTrack = queue.at(0)

										if (firstTrack) {
											await this.playTrack({
												track: firstTrack,
												autoPlay: true
											})

											return
										}
									}
								}
							} finally {
								this.controlsMutex.release()
							}
						}

						await this.skipToNext()
					} catch (e) {
						console.error(e)
					}

					break
				}
			}
		})
	}

	public clearState(): void {
		mmkvInstance.set(TRACK_PLAYER_QUEUE_KEY, JSON.stringify([]))
		mmkvInstance.delete(TRACK_PLAYER_PLAYING_TRACK_KEY)
		mmkvInstance.delete(TRACK_PLAYER_TIMINGS_KEY)
		mmkvInstance.delete(TRACK_PLAYER_REPEAT_MODE_KEY)
		mmkvInstance.delete(TRACK_PLAYER_PLAYBACK_SPEED_KEY)
		mmkvInstance.delete(TRACK_PLAYER_VOLUME_KEY)

		const metadataKey = this.getTrackMetadataKeyFromUUID("")
		const metadataKeys = mmkvInstance.getAllKeys().filter(key => key.startsWith(metadataKey))

		for (const key of metadataKeys) {
			mmkvInstance.delete(key)
		}

		AudioPro.clear()
	}

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

	public getCurrentTrackInQueue(): AudioProTrackExtended | null {
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
		const previousTrack = queue.at(playingTrackIndex - 1)

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

	public getTrackMetadataKeyFromUUID(uuid: string): string {
		return `${TRACK_PLAYER_MMKV_PREFIX}trackPlayerFileMetadata:${uuid}`
	}

	public async togglePlay(): Promise<void> {
		await this.controlsMutex.acquire()

		try {
			const state = AudioPro.getState()

			if (state === AudioProState.PLAYING) {
				AudioPro.pause()
			} else {
				const currentTrack = this.getCurrentTrackInQueue()

				if (!currentTrack) {
					const queue = this.getQueue()

					if (queue.length === 0) {
						return
					}

					const trackToPlay = queue.at(0)

					if (!trackToPlay) {
						return
					}

					await this.playTrack({
						track: trackToPlay,
						autoPlay: true
					})

					return
				}

				AudioPro.resume()
			}
		} finally {
			this.controlsMutex.release()
		}
	}

	public async setRepeatMode(mode: RepeatMode): Promise<void> {
		await this.controlsMutex.acquire()

		try {
			mmkvInstance.set(TRACK_PLAYER_REPEAT_MODE_KEY, mode)
		} finally {
			this.controlsMutex.release()
		}
	}

	public getRepeatMode(): RepeatMode {
		const repeatMode = mmkvInstance.getString(TRACK_PLAYER_REPEAT_MODE_KEY)

		if (!repeatMode || !["off", "track", "queue"].includes(repeatMode)) {
			return "off" as RepeatMode
		}

		return repeatMode as RepeatMode
	}

	public async skipToNext(): Promise<void> {
		await this.controlsMutex.acquire()

		try {
			const nextTrack = this.getNextTrackInQueue()

			if (!nextTrack) {
				return
			}

			await this.playTrack({
				track: nextTrack,
				autoPlay: true
			})
		} finally {
			this.controlsMutex.release()
		}
	}

	public async skipToPrevious(): Promise<void> {
		await this.controlsMutex.acquire()

		try {
			const previousTrack = this.getPreviousTrackInQueue()

			if (!previousTrack) {
				return
			}

			await this.playTrack({
				track: previousTrack,
				autoPlay: true
			})
		} finally {
			this.controlsMutex.release()
		}
	}

	public async repeatCurrentTrack(): Promise<void> {
		await this.controlsMutex.acquire()

		try {
			const currentTrack = this.getCurrentTrackInQueue()

			if (!currentTrack) {
				return
			}

			await this.playTrack({
				track: currentTrack,
				autoPlay: true
			})
		} finally {
			this.controlsMutex.release()
		}
	}

	public async seek(seconds: number): Promise<void> {
		await this.controlsMutex.acquire()

		try {
			const state = AudioPro.getState()

			if (state !== AudioProState.PLAYING) {
				return
			}

			AudioPro.seekTo(Math.round(seconds * 1000))
		} finally {
			this.controlsMutex.release()
		}
	}

	public async play(): Promise<void> {
		await this.controlsMutex.acquire()

		try {
			const currentTrack = this.getCurrentTrackInQueue()

			if (!currentTrack) {
				const queue = this.getQueue()

				if (queue.length === 0) {
					return
				}

				const trackToPlay = queue.at(0)

				if (!trackToPlay) {
					return
				}

				await this.playTrack({
					track: trackToPlay,
					autoPlay: true
				})

				return
			}

			const state = AudioPro.getState()

			if (state === AudioProState.PLAYING) {
				return
			}

			AudioPro.resume()
		} finally {
			this.controlsMutex.release()
		}
	}

	public async pause(): Promise<void> {
		await this.controlsMutex.acquire()

		try {
			const state = AudioPro.getState()

			if (
				state === AudioProState.PAUSED ||
				state === AudioProState.STOPPED ||
				state === AudioProState.IDLE ||
				state === AudioProState.ERROR
			) {
				return
			}

			AudioPro.pause()
		} finally {
			this.controlsMutex.release()
		}
	}

	public async clear(): Promise<void> {
		await this.controlsMutex.acquire()

		try {
			mmkvInstance.set(TRACK_PLAYER_QUEUE_KEY, JSON.stringify([]))
			mmkvInstance.delete(TRACK_PLAYER_PLAYING_TRACK_KEY)

			AudioPro.clear()
		} finally {
			this.controlsMutex.release()
		}
	}

	public async stop(): Promise<void> {
		await this.controlsMutex.acquire()

		try {
			const state = AudioPro.getState()

			if (
				state === AudioProState.PAUSED ||
				state === AudioProState.STOPPED ||
				state === AudioProState.IDLE ||
				state === AudioProState.ERROR
			) {
				return
			}

			AudioPro.stop()
		} finally {
			this.controlsMutex.release()
		}
	}

	public async setPlaybackSpeed(speed: number): Promise<void> {
		await this.controlsMutex.acquire()

		try {
			AudioPro.setPlaybackSpeed(speed)
		} finally {
			this.controlsMutex.release()
		}
	}

	public async setVolume(volume: number): Promise<void> {
		await this.controlsMutex.acquire()

		try {
			AudioPro.setVolume(volume)
		} finally {
			this.controlsMutex.release()
		}
	}

	public async shuffle(): Promise<void> {
		await this.controlsMutex.acquire()

		try {
			mmkvInstance.set(TRACK_PLAYER_QUEUE_KEY, JSON.stringify(shuffleArray(this.getQueue())))
		} finally {
			this.controlsMutex.release()
		}
	}

	public async setQueue({
		queue,
		startingTrackIndex,
		autoPlay,
		startingTrackStartTimeMs
	}: {
		queue: AudioProTrackExtended[]
		startingTrackIndex?: number
		autoPlay?: boolean
		startingTrackStartTimeMs?: number
	}): Promise<void> {
		await this.controlsMutex.acquire()

		try {
			const silentSoundURI = assets.uri.audio.silent()
			const audioImageFallbackURI = assets.uri.images.audio_fallback()

			if (!silentSoundURI || !audioImageFallbackURI) {
				return
			}

			mmkvInstance.set(
				TRACK_PLAYER_QUEUE_KEY,
				JSON.stringify(
					queue.map(track => ({
						...track,
						artwork: audioImageFallbackURI,
						url: silentSoundURI
					}))
				)
			)

			if (autoPlay) {
				const autoPlayTrack = startingTrackIndex ? queue.at(startingTrackIndex) : null

				if (autoPlayTrack) {
					await this.playTrack({
						track: autoPlayTrack,
						autoPlay: true,
						startTimeMs: startingTrackStartTimeMs
					})
				}
			}
		} finally {
			this.controlsMutex.release()
		}
	}

	public async parseAudioMetadata({ uri, uuid }: { uri: string; uuid: string }): Promise<TrackMetadata | null> {
		try {
			const existingMetadata = mmkvInstance.getString(this.getTrackMetadataKeyFromUUID(uuid))

			if (existingMetadata) {
				return JSON.parse(existingMetadata) as TrackMetadata
			}

			const file = new FileSystem.File(normalizeFilePathForExpo(uri))

			if (!file.exists || !file.size) {
				return null
			}

			const data = await getAudioMetadata(uri, ["album", "albumArtist", "artist", "name", "track", "year", "artwork"])
			let coverURI: string | undefined = undefined

			if (data?.metadata?.artwork) {
				const [header, base64String] = data.metadata.artwork.split(",")

				if (header && base64String) {
					const mimeTypeMatch = header.match(/data:([^;]+)/)
					const mimeType = mimeTypeMatch && mimeTypeMatch[1] ? mimeTypeMatch[1] : ""

					if (mimeType.length > 0) {
						const fileExtension = mimeTypes.extension(mimeType)

						if (fileExtension) {
							const destination = new FileSystem.File(
								FileSystem.Paths.join(paths.trackPlayerPictures(), `${uuid}.${fileExtension}`)
							)

							if (destination.exists) {
								destination.delete()
							}

							destination.write(new Uint8Array(Buffer.from(base64String, "base64")))

							coverURI = normalizeFilePathForExpo(destination.uri)
						}
					}
				}
			}

			const metadata: TrackMetadata = {
				artist: data?.metadata?.artist,
				album: data?.metadata?.album,
				title: data?.metadata?.name,
				year: data?.metadata?.year,
				picture: coverURI
			} satisfies TrackMetadata

			mmkvInstance.set(this.getTrackMetadataKeyFromUUID(uuid), JSON.stringify(metadata))

			const queue = this.getQueue()

			mmkvInstance.set(
				TRACK_PLAYER_QUEUE_KEY,
				JSON.stringify(
					queue.map(track => {
						if (track.file.uuid === uuid) {
							return {
								...track,
								artist: metadata.artist ?? track.artist,
								album: metadata.album ?? track.album,
								title: metadata.title ?? track.title,
								artwork: metadata.picture ?? track.artwork
							} satisfies AudioProTrackExtended
						}

						return track satisfies AudioProTrackExtended
					})
				)
			)

			const playingTrack = AudioPro.getPlayingTrack() as AudioProTrackExtended

			if (playingTrack && playingTrack.file.uuid === uuid) {
				mmkvInstance.set(
					TRACK_PLAYER_PLAYING_TRACK_KEY,
					JSON.stringify({
						...playingTrack,
						artist: metadata.artist ?? playingTrack.artist,
						album: metadata.album ?? playingTrack.album,
						title: metadata.title ?? playingTrack.title,
						artwork: metadata.picture ?? playingTrack.artwork
					} satisfies AudioProTrackExtended)
				)
			}

			return metadata
		} catch (e) {
			console.error(e)

			return null
		}
	}

	public async playTrack({
		track,
		autoPlay,
		startTimeMs
	}: {
		track: AudioProTrackExtended
		autoPlay?: boolean
		startTimeMs?: number
	}): Promise<void> {
		const loadedTrack = await this.loadFileForTrack(track)
		const queueWithLoadedTrack = this.getQueue().map(t => (t.file.uuid === loadedTrack.file.uuid ? loadedTrack : t))

		mmkvInstance.set(TRACK_PLAYER_QUEUE_KEY, JSON.stringify(queueWithLoadedTrack))
		mmkvInstance.set(TRACK_PLAYER_PLAYING_TRACK_KEY, JSON.stringify(loadedTrack))

		AudioPro.play(loadedTrack, {
			autoPlay,
			startTimeMs
		})
	}

	public async loadFileForTrack(track: AudioProTrackExtended): Promise<AudioProTrackExtended> {
		await this.loadFileForTrackMutex.acquire()

		useTrackPlayerStore.getState().setLoadingTrack(true)

		try {
			const destination = new FileSystem.File(
				FileSystem.Paths.join(paths.trackPlayer(), `${track.file.uuid}${FileSystem.Paths.extname(track.file.name)}`)
			)

			if (!destination.exists) {
				await download.file.background({
					id: randomUUID(),
					uuid: track.file.uuid,
					bucket: track.file.bucket,
					region: track.file.region,
					chunks: track.file.chunks,
					version: track.file.version as FileEncryptionVersion,
					key: track.file.key,
					destination: destination.uri,
					size: track.file.size,
					name: track.file.name
				})
			}

			const metadata = await this.parseAudioMetadata({
				uri: destination.uri,
				uuid: track.file.uuid
			})

			await this.clearActiveStorage()

			const fallbackPicture = assets.uri.images.audio_fallback()

			if (!fallbackPicture) {
				throw new Error("Fallback picture URI is not available")
			}

			return {
				...track,
				url: normalizeFilePathForExpo(destination.uri),
				title: metadata?.title ?? track.title,
				artist: metadata?.artist ?? track.artist,
				album: metadata?.album ?? track.album,
				artwork:
					metadata?.picture && new FileSystem.File(normalizeFilePathForExpo(metadata.picture)).exists
						? normalizeFilePathForExpo(metadata.picture)
						: normalizeFilePathForExpo(fallbackPicture)
			} satisfies AudioProTrackExtended
		} finally {
			this.loadFileForTrackMutex.release()

			useTrackPlayerStore.getState().setLoadingTrack(false)
		}
	}
}

export const trackPlayer = new TrackPlayer()

export default trackPlayer
