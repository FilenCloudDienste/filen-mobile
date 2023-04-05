import * as VideoThumbnails from "expo-video-thumbnails"
import { MAX_THUMBNAIL_ERROR_COUNT } from "../../constants"
import ImageResizer from "react-native-image-resizer"
import { downloadFile, getDownloadPath } from "../download"
import { DeviceEventEmitter } from "react-native"
import storage from "../../storage"
import { Item } from "../../../types"
import { isOnline, isWifi } from "../isOnline"
import memoryCache from "../../memoryCache"
import * as fs from "../../fs"
import { getFileExt, getFilePreviewType, toExpoFsPath } from "../../helpers"

const isGeneratingThumbnailForItemUUID: Record<string, boolean> = {}
const isCheckingThumbnailForItemUUID: Record<string, boolean> = {}
const thumbnailGenerationErrorCount: Record<string, number> = JSON.parse(
	storage.getString("thumbnailGenerationErrorCount") || "{}"
)
const thumbnailGenerationErrorCountSession: Record<string, number> = {}

export const getThumbnailCacheKey = ({
	uuid
}: {
	uuid: string
}): { width: number; height: number; quality: number; thumbnailVersion: string; cacheKey: string } => {
	const width = 512,
		height = 512,
		quality = 80,
		thumbnailVersion = "2.0.7"
	const cacheKey = "thumbnailCache:" + uuid + ":" + width + ":" + height + ":" + quality + ":" + thumbnailVersion

	return {
		width,
		height,
		quality,
		thumbnailVersion,
		cacheKey
	}
}

/*
Check if a thumbnail exists locally after trying to load it threw an error. If it dos not exists, re-cache it
*/
export const checkItemThumbnail = ({ item }: { item: Item }): void => {
	if (typeof item.thumbnail !== "string") {
		return
	}

	//if(typeof global.visibleItems[item.uuid] == "undefined"){
	//    return
	//}

	if (typeof isCheckingThumbnailForItemUUID[item.uuid] !== "undefined") {
		return
	}

	isCheckingThumbnailForItemUUID[item.uuid] = true

	const { cacheKey } = getThumbnailCacheKey({ uuid: item.uuid })
	const cache = storage.getString(cacheKey)

	if (typeof cache !== "string") {
		return
	}

	getDownloadPath({ type: "thumbnail" })
		.then(path => {
			const remove = () => {
				delete isCheckingThumbnailForItemUUID[item.uuid]

				if (!isOnline()) {
					return
				}

				storage.delete(cacheKey)
				memoryCache.delete("cachedThumbnailPaths:" + item.uuid)

				let thumbItem = item

				thumbItem.thumbnail = undefined

				global.visibleItems[thumbItem.uuid] = true

				delete isGeneratingThumbnailForItemUUID[thumbItem.uuid]

				void generateItemThumbnail({ item: thumbItem, skipInViewCheck: true })
			}

			fs.stat(path + cache)
				.then(stat => {
					if (!stat.exists) {
						remove()
					}
				})
				.catch(() => remove())
		})
		.catch(err => {
			console.log(err)

			delete isCheckingThumbnailForItemUUID[item.uuid]
		})
}

export const generateItemThumbnail = ({
	item,
	skipInViewCheck = false,
	path = undefined,
	callback = undefined
}: {
	item: Item
	skipInViewCheck?: boolean
	callback?: Function
	path?: string
}) => {
	if (typeof thumbnailGenerationErrorCountSession[item.uuid] == "number") {
		if (thumbnailGenerationErrorCountSession[item.uuid] > 1) {
			if (typeof callback == "function") {
				callback(true)
			}

			return false
		}
	}

	if (typeof thumbnailGenerationErrorCount[item.uuid] == "number") {
		if (thumbnailGenerationErrorCount[item.uuid] > MAX_THUMBNAIL_ERROR_COUNT) {
			if (typeof callback == "function") {
				callback(true)
			}

			return false
		}
	}

	if (typeof item.thumbnail == "string") {
		if (typeof callback == "function") {
			callback(true)
		}

		return false
	}

	if (typeof global.visibleItems[item.uuid] == "undefined" && !skipInViewCheck) {
		if (typeof callback == "function") {
			callback(true)
		}

		return false
	}

	if (memoryCache.has("cachedThumbnailPaths:" + item.uuid)) {
		DeviceEventEmitter.emit("event", {
			type: "thumbnail-generated",
			data: {
				uuid: item.uuid,
				path: memoryCache.get("cachedThumbnailPaths:" + item.uuid)
			}
		})

		if (typeof callback == "function") {
			callback(null, memoryCache.get("cachedThumbnailPaths:" + item.uuid))
		}

		return
	}

	const { width, height, quality, cacheKey } = getThumbnailCacheKey({ uuid: item.uuid })
	const cache = storage.getString(cacheKey)

	if (typeof cache == "string") {
		if (cache.length > 0) {
			memoryCache.set("cachedThumbnailPaths:" + item.uuid, cache)

			DeviceEventEmitter.emit("event", {
				type: "thumbnail-generated",
				data: {
					uuid: item.uuid,
					path: cache
				}
			})

			if (typeof callback == "function") {
				callback(null, cache)
			}

			return
		}
	}

	if (!isOnline()) {
		if (typeof callback == "function") {
			callback(true)
		}

		return false
	}

	if (storage.getBoolean("onlyWifiDownloads:" + storage.getNumber("userId")) && !isWifi()) {
		if (typeof callback == "function") {
			callback(true)
		}

		return false
	}

	if (typeof isGeneratingThumbnailForItemUUID[item.uuid] !== "undefined") {
		if (typeof callback == "function") {
			callback(true)
		}

		return false
	}

	isGeneratingThumbnailForItemUUID[item.uuid] = true

	const onError = (err: Error): void => {
		console.log(err)

		delete isGeneratingThumbnailForItemUUID[item.uuid]

		if (typeof callback == "function") {
			callback(err)
		}

		global.generateThumbnailSemaphore.release()

		if (typeof thumbnailGenerationErrorCountSession[item.uuid] == "number") {
			thumbnailGenerationErrorCountSession[item.uuid] += 1
		} else {
			thumbnailGenerationErrorCountSession[item.uuid] = 1
		}

		if (typeof thumbnailGenerationErrorCount[item.uuid] == "number") {
			thumbnailGenerationErrorCount[item.uuid] += 1
		} else {
			thumbnailGenerationErrorCount[item.uuid] = 1
		}

		storage.set("thumbnailGenerationErrorCount", JSON.stringify(thumbnailGenerationErrorCount))
	}

	const compress = (path: string, dest: string) => {
		if (width <= 1 || height <= 1) {
			return onError(new Error("Invalid width/height: " + width + " " + height))
		}

		fs.stat(path)
			.then(stat => {
				if (!stat.exists) {
					return onError(new Error(path + " not found"))
				}

				if (!stat.size) {
					return onError(new Error("Invalid image size: " + stat.size))
				}

				if (stat.size <= 1) {
					return onError(new Error("Invalid image size: " + stat.size))
				}

				ImageResizer.createResizedImage(path, width, height, "JPEG", quality)
					.then(compressed => {
						fs.move(compressed.uri, dest)
							.then(() => {
								fs.unlink(path)
									.then(() => {
										storage.set(cacheKey, item.uuid + ".jpg")
										memoryCache.set("cachedThumbnailPaths:" + item.uuid, item.uuid + ".jpg")

										DeviceEventEmitter.emit("event", {
											type: "thumbnail-generated",
											data: {
												uuid: item.uuid,
												path: item.uuid + ".jpg"
											}
										})

										delete isGeneratingThumbnailForItemUUID[item.uuid]

										if (typeof callback == "function") {
											callback(null, item.uuid + ".jpg")
										}

										global.generateThumbnailSemaphore.release()
									})
									.catch(onError)
							})
							.catch(onError)
					})
					.catch(onError)
			})
			.catch(onError)
	}

	const fileExt = getFileExt(item.name)
	const filePreviewType = getFilePreviewType(fileExt)

	const generateThumbnail = (path: string, dest: string) => {
		if (filePreviewType == "video") {
			VideoThumbnails.getThumbnailAsync(toExpoFsPath(path), {
				quality: 1
			})
				.then(({ uri }) => {
					fs.unlink(path)
						.then(() => {
							compress(uri, dest)
						})
						.catch(onError)
				})
				.catch(onError)
		} else {
			compress(path, dest)
		}
	}

	global.generateThumbnailSemaphore.acquire().then(() => {
		if (typeof global.visibleItems[item.uuid] == "undefined" && !skipInViewCheck) {
			delete isGeneratingThumbnailForItemUUID[item.uuid]

			global.generateThumbnailSemaphore.release()

			if (typeof callback == "function") {
				callback(true)
			}

			return false
		} else {
			getDownloadPath({ type: "thumbnail" })
				.then(async dest => {
					dest = dest + item.uuid + ".jpg"

					try {
						if ((await fs.stat(dest)).exists) {
							await fs.unlink(dest)
						}
					} catch (e) {
						//console.log(e)
					}

					if (typeof path == "string") {
						return generateThumbnail(path, dest)
					}

					downloadFile(
						item,
						false,
						filePreviewType == "video" ? (item.chunks < 16 ? item.chunks : 16) : item.chunks
					)
						.then(downloadedPath => {
							generateThumbnail(downloadedPath, dest)
						})
						.catch(onError)
				})
				.catch(onError)
		}
	})
}
