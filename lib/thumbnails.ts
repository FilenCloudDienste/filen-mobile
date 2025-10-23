import { ImageManipulator, SaveFormat } from "expo-image-manipulator"
import { Semaphore } from "./semaphore"
import nodeWorker from "./nodeWorker"
import { randomUUID } from "expo-crypto"
import paths from "./paths"
import * as FileSystem from "expo-file-system"
import cache from "./cache"
import { normalizeFilePathForExpo } from "./utils"
import sqlite from "./sqlite"
import * as VideoThumbnails from "expo-video-thumbnails"
import { EXPO_IMAGE_MANIPULATOR_SUPPORTED_EXTENSIONS, EXPO_VIDEO_THUMBNAILS_SUPPORTED_EXTENSIONS } from "./constants"
import download from "./download"
import pathModule from "path"
import { driveItemsQueryUpdate } from "@/queries/useDriveItems.query"

export const THUMBNAILS_MAX_ERRORS: number = 3
export const THUMBNAILS_SIZE: number = 128
export const THUMBNAILS_COMPRESSION: number = 0.8

export const THUMBNAILS_SUPPORTED_FORMATS = [...EXPO_VIDEO_THUMBNAILS_SUPPORTED_EXTENSIONS, ...EXPO_IMAGE_MANIPULATOR_SUPPORTED_EXTENSIONS]

export class Thumbnails {
	private readonly semaphore: Semaphore = new Semaphore(3)
	private readonly uuidMutex: Record<string, Semaphore> = {}
	private readonly errorCount: Record<string, number> = {}

	public canGenerate(name: string): boolean {
		return THUMBNAILS_SUPPORTED_FORMATS.includes(pathModule.posix.extname(name.trim().toLowerCase()))
	}

	public async getThumbnailsUsage(): Promise<number> {
		const availableThumbnails = await this.getAvailableThumbnails()

		return availableThumbnails.reduce((prev, curr) => prev + curr.size, 0)
	}

	public async getAvailableThumbnails(): Promise<
		{
			uuid: string
			path: string
			size: number
		}[]
	> {
		const { rows } = await sqlite.db.executeAsync<{ uuid: string; path: string; size: number }>(
			"SELECT uuid, path, size FROM thumbnails"
		)

		if (!rows || rows.length === 0) {
			return []
		}

		return rows._array
	}

	public async warmupCache(): Promise<void> {
		const availableThumbnails = await this.getAvailableThumbnails()

		for (const { uuid, path } of availableThumbnails) {
			cache.availableThumbnails.set(uuid, path)
		}
	}

	public async delete(item: DriveCloudItem): Promise<void> {
		if (cache.availableThumbnails.has(item.uuid)) {
			cache.availableThumbnails.delete(item.uuid)
		}

		const thumbnailPath = paths.thumbnails()
		const thumbnailFile = new FileSystem.File(normalizeFilePathForExpo(pathModule.posix.join(thumbnailPath, `${item.uuid}.png`)))

		if (thumbnailFile.exists) {
			thumbnailFile.delete()

			this.errorCount[item.uuid] = 0
		}

		await sqlite.db.executeAsync("DELETE FROM thumbnails WHERE uuid = ?", [item.uuid])
	}

	public async generate({
		item,
		queryParams,
		originalFilePath,
		abortSignal
	}: {
		item: DriveCloudItem
		queryParams?: FetchCloudItemsParams
		originalFilePath?: string
		abortSignal?: AbortSignal
	}): Promise<string> {
		if (item.type !== "file") {
			throw new Error("Item is not of type file.")
		}

		const extname = pathModule.posix.extname(item.name.trim().toLowerCase())

		if (!this.canGenerate(item.name)) {
			throw new Error(`Cannot generate a thumbnail for item format ${extname}.`)
		}

		if (!this.errorCount[item.uuid]) {
			this.errorCount[item.uuid] = 0
		}

		if (this.errorCount[item.uuid]! > THUMBNAILS_MAX_ERRORS) {
			throw new Error(`Max error count for ${item.name} reached.`)
		}

		if (!this.uuidMutex[item.uuid]) {
			this.uuidMutex[item.uuid] = new Semaphore(1)
		}

		const uuidMutex = this.uuidMutex[item.uuid]

		if (!uuidMutex) {
			throw new Error("Uuid Mutex not found.")
		}

		await Promise.all([!originalFilePath ? this.semaphore.acquire() : Promise.resolve(), uuidMutex.acquire()])

		try {
			const temporaryDownloadsPath = paths.temporaryDownloads()
			const thumbnailsPath = paths.thumbnails()
			const thumbnailDestination = normalizeFilePathForExpo(pathModule.posix.join(thumbnailsPath, `${item.uuid}.png`))
			const destinationFile = new FileSystem.File(thumbnailDestination)

			if (destinationFile.exists) {
				await sqlite.db.executeAsync("INSERT OR REPLACE INTO thumbnails (uuid, path, size) VALUES (?, ?, ?)", [
					item.uuid,
					destinationFile.uri,
					destinationFile.size ?? 0
				])

				cache.availableThumbnails.set(item.uuid, thumbnailDestination)

				delete this.errorCount[item.uuid]

				if (queryParams) {
					driveItemsQueryUpdate({
						params: queryParams,
						updater: prev =>
							prev.map(prevItem =>
								prevItem.uuid === item.uuid
									? {
											...prevItem,
											thumbnail: thumbnailDestination
									  }
									: prevItem
							)
					})
				}

				return thumbnailDestination
			}

			if (abortSignal?.aborted) {
				throw new Error("Aborted")
			}

			const id = randomUUID()
			const tempDestinationFile = new FileSystem.File(
				normalizeFilePathForExpo(pathModule.posix.join(temporaryDownloadsPath, `${id}${extname}`))
			)

			if (tempDestinationFile.exists) {
				tempDestinationFile.delete()
			}

			try {
				if (EXPO_IMAGE_MANIPULATOR_SUPPORTED_EXTENSIONS.includes(extname)) {
					if (originalFilePath) {
						const originalFile = new FileSystem.File(normalizeFilePathForExpo(originalFilePath))

						if (!originalFile.exists || !originalFile.size) {
							throw new Error(`Original file at ${originalFilePath} does not exist.`)
						}

						originalFile.copy(tempDestinationFile)
					} else {
						await download.file.foreground({
							id,
							uuid: item.uuid,
							bucket: item.bucket,
							region: item.region,
							chunks: item.chunks,
							version: item.version,
							key: item.key,
							destination: tempDestinationFile.uri,
							size: item.size,
							name: item.name,
							dontEmitProgress: true
						})
					}

					const manipulated = await ImageManipulator.manipulate(normalizeFilePathForExpo(tempDestinationFile.uri))
						.resize({
							width: THUMBNAILS_SIZE
						})
						.renderAsync()

					const result = await manipulated.saveAsync({
						compress: THUMBNAILS_COMPRESSION,
						format: SaveFormat.PNG,
						base64: false
					})

					const manipulatedFile = new FileSystem.File(result.uri)

					if (!manipulatedFile.exists) {
						throw new Error(`Generated thumbnail at ${result.uri} does not exist.`)
					}

					manipulatedFile.move(destinationFile)
				} else if (EXPO_VIDEO_THUMBNAILS_SUPPORTED_EXTENSIONS.includes(extname)) {
					if (!originalFilePath) {
						const [nodeWorkerPingResponse, nodeHTTPServerAlive] = await Promise.all([
							nodeWorker.proxy("ping", undefined),
							nodeWorker.httpServerAlive()
						])

						if (nodeWorkerPingResponse !== "pong") {
							throw new Error("Node worker is not responding.")
						}

						if (!nodeHTTPServerAlive) {
							throw new Error("HTTP server is not alive.")
						}
					}

					const videoThumbnail = await VideoThumbnails.getThumbnailAsync(
						originalFilePath
							? normalizeFilePathForExpo(originalFilePath)
							: `http://127.0.0.1:${nodeWorker.httpServerPort}/stream?file=${encodeURIComponent(
									btoa(
										JSON.stringify({
											mime: item.mime,
											size: item.size,
											uuid: item.uuid,
											bucket: item.bucket,
											key: item.key,
											version: item.version,
											chunks: item.chunks,
											region: item.region
										})
									)
							  )}`,
						{
							...(originalFilePath
								? {}
								: {
										headers: {
											Authorization: `Bearer ${nodeWorker.httpAuthToken}`
										}
								  }),
							quality: THUMBNAILS_COMPRESSION,
							time: 500
						}
					)

					const videoThumbnailFile = new FileSystem.File(videoThumbnail.uri)

					if (!videoThumbnailFile.exists) {
						throw new Error(`Generated thumbnail at ${videoThumbnail.uri} does not exist.`)
					}

					const manipulated = await ImageManipulator.manipulate(normalizeFilePathForExpo(videoThumbnail.uri))
						.resize({
							width: THUMBNAILS_SIZE
						})
						.renderAsync()

					const result = await manipulated.saveAsync({
						compress: 1,
						format: SaveFormat.PNG,
						base64: false
					})

					if (videoThumbnailFile.exists) {
						videoThumbnailFile.delete()
					}

					const manipulatedFile = new FileSystem.File(result.uri)

					if (!manipulatedFile.exists) {
						throw new Error(`Generated thumbnail at ${result.uri} does not exist.`)
					}

					manipulatedFile.move(destinationFile)
				} else {
					throw new Error(`Cannot generate a thumbnail for item format ${extname}.`)
				}

				await sqlite.db.executeAsync("INSERT OR REPLACE INTO thumbnails (uuid, path, size) VALUES (?, ?, ?)", [
					item.uuid,
					destinationFile.uri,
					destinationFile.size ?? 0
				])

				cache.availableThumbnails.set(item.uuid, thumbnailDestination)

				delete this.errorCount[item.uuid]

				if (queryParams) {
					driveItemsQueryUpdate({
						params: queryParams,
						updater: prev =>
							prev.map(prevItem =>
								prevItem.uuid === item.uuid
									? {
											...prevItem,
											thumbnail: thumbnailDestination
									  }
									: prevItem
							)
					})
				}

				return thumbnailDestination
			} catch (e) {
				if (destinationFile.exists) {
					destinationFile.delete()
				}

				throw e
			} finally {
				if (tempDestinationFile.exists) {
					tempDestinationFile.delete()
				}
			}
		} catch (e) {
			this.errorCount[item.uuid]! += 1

			throw e
		} finally {
			if (!originalFilePath) {
				this.semaphore.release()
			}

			uuidMutex.release()
		}
	}
}

export const thumbnails = new Thumbnails()

export default thumbnails
