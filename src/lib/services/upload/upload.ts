import {
	getAPIKey,
	getMasterKeys,
	Semaphore,
	getFileExt,
	canCompressThumbnailLocally,
	toExpoFsPath,
	getFilePreviewType,
	toBlobUtilPath,
	convertTimestampToMs
} from "../../helpers"
import { markUploadAsDone, checkIfItemParentIsShared, createFolder, folderExists } from "../../api"
import { showToast } from "../../../components/Toasts"
import storage from "../../storage"
import { i18n } from "../../../i18n"
import { DeviceEventEmitter, Platform } from "react-native"
import { buildFile } from "../items"
import ImageResizer from "react-native-image-resizer"
import memoryCache from "../../memoryCache"
import * as fs from "../../fs"
import { isOnline, isWifi } from "../isOnline"
import * as VideoThumbnails from "expo-video-thumbnails"
import { getThumbnailCacheKey } from "../thumbnails"
import { Item } from "../../../types"
import pathModule from "path"
import mimeTypes from "mime-types"
import {
	showFullScreenLoadingModal,
	hideFullScreenLoadingModal
} from "../../../components/Modals/FullscreenLoadingModal/FullscreenLoadingModal"

const createFolderSemaphore = new Semaphore(128)
const uploadFolderMutex = new Semaphore(1)

export interface UploadFile {
	path: string
	name: string
	size: number
	mime: string
	lastModified: number
}

export const queueFileUpload = async ({
	file,
	parent,
	includeFileHash = false,
	isCameraUpload = false
}: {
	file: UploadFile
	parent: string
	includeFileHash?: boolean | string
	isCameraUpload?: boolean
}): Promise<any> => {
	if (file.size <= 0) {
		return
	}

	const masterKeys = getMasterKeys()

	if (!Array.isArray(masterKeys) || masterKeys.length <= 0) {
		throw new Error("master keys !== array")
	}

	if (!(await isOnline())) {
		throw new Error(i18n(storage.getString("lang"), "deviceOffline"))
	}

	if (storage.getBoolean("onlyWifiUploads") && !(await isWifi())) {
		throw new Error("wifiOnly")
	}

	file.lastModified = convertTimestampToMs(file.lastModified)

	const uuid = await global.nodeThread.uuidv4()
	let item: Item = null
	let metadataEncrypted = ""
	let nameEncrypted = ""
	let mimeEncrypted = ""
	let sizeEncrypted = ""
	let nameHashed = ""
	let uploadKey = ""
	const apiKey = getAPIKey()

	try {
		file.path = toBlobUtilPath(file.path)

		const result = await global.nodeThread.uploadFile({
			uuid,
			file,
			includeFileHash,
			showProgress: true,
			masterKeys,
			apiKey,
			version: 2,
			parent
		})

		item = result.item
		metadataEncrypted = result.metadataEncrypted
		nameEncrypted = result.nameEncrypted
		nameHashed = result.nameHashed
		mimeEncrypted = result.mimeEncrypted
		sizeEncrypted = result.sizeEncrypted
		uploadKey = result.uploadKey

		const done = await markUploadAsDone({
			uuid,
			name: nameEncrypted,
			nameHashed,
			size: sizeEncrypted,
			chunks: item.chunks,
			mime: mimeEncrypted,
			rm: item.rm,
			metadata: metadataEncrypted,
			version: 2,
			uploadKey
		})

		item.chunks = done.chunks
		item.timestamp = Math.floor(Date.now() / 1000)

		await checkIfItemParentIsShared({
			type: "file",
			parent,
			metaData: {
				uuid,
				name: item.name,
				size: item.size,
				mime: item.mime,
				key: item.key,
				lastModified: item.lastModified
			}
		})
	} catch (e) {
		if (e === "stopped" || e.toString() === "stopped") {
			await global.nodeThread.removeTransfer({ uuid }).catch(console.error)

			return
		}

		if (e.toString().toLowerCase().indexOf("blacklist") !== -1) {
			showToast({ message: i18n(storage.getString("lang"), "notEnoughRemoteStorage") })

			await global.nodeThread.uploadFailed({ uuid, reason: "notEnoughRemoteStorage" }).catch(console.error)

			throw new Error("notEnoughRemoteStorage")
		}

		await global.nodeThread.uploadFailed({ uuid, reason: e.toString() }).catch(console.error)

		throw e
	}

	try {
		if (canCompressThumbnailLocally(getFileExt(item.name))) {
			try {
				await new Promise<void>(resolve => {
					fs.getDownloadPath({ type: "thumbnail" })
						.then(async dest => {
							dest = dest + uuid + ".jpg"

							try {
								if ((await fs.stat(dest)).exists) {
									await fs.unlink(dest)
								}
							} catch (e) {
								//console.log(e)
							}

							const { width, height, quality, cacheKey } = getThumbnailCacheKey({ uuid })

							if (width <= 1 || height <= 1) {
								resolve()

								return
							}

							fs.stat(file.path)
								.then(stat => {
									if (!stat.exists || !stat.size || stat.size <= 1) {
										resolve()

										return
									}

									if (getFilePreviewType(getFileExt(item.name)) === "video") {
										VideoThumbnails.getThumbnailAsync(toExpoFsPath(file.path), {
											quality: 1
										})
											.then(({ uri }) => {
												ImageResizer.createResizedImage(toExpoFsPath(uri), width, height, "JPEG", quality)
													.then(compressed => {
														fs.unlink(uri)
															.then(() => {
																fs.move(compressed.uri, dest)
																	.then(() => {
																		storage.set(cacheKey, uuid + ".jpg")
																		memoryCache.set("cachedThumbnailPaths:" + uuid, uuid + ".jpg")

																		resolve()
																	})
																	.catch(resolve)
															})
															.catch(resolve)
													})
													.catch(resolve)
											})
											.catch(resolve)
									} else {
										ImageResizer.createResizedImage(toExpoFsPath(file.path), width, height, "JPEG", quality)
											.then(compressed => {
												fs.move(compressed.uri, dest)
													.then(() => {
														storage.set(cacheKey, uuid + ".jpg")
														memoryCache.set("cachedThumbnailPaths:" + uuid, uuid + ".jpg")

														resolve()
													})
													.catch(resolve)
											})
											.catch(resolve)
									}
								})
								.catch(resolve)
						})
						.catch(resolve)
				})
			} catch (e) {
				console.log(e)
			}
		}
	} catch (e) {
		console.error(e)
	}

	try {
		const builtFile = await buildFile({
			file: {
				bucket: item.bucket,
				chunks: item.chunks,
				favorited: 0,
				metadata: metadataEncrypted,
				parent,
				region: item.region,
				rm: item.rm,
				size: item.size,
				timestamp: item.timestamp,
				uuid,
				version: item.version
			},
			masterKeys,
			userId: storage.getNumber("userId")
		})

		DeviceEventEmitter.emit("event", {
			type: "add-item",
			data: {
				item: builtFile,
				parent: isCameraUpload ? "photos" : parent
			}
		})

		DeviceEventEmitter.emit("event", {
			type: "add-item",
			data: {
				item: builtFile,
				parent: "recents"
			}
		})

		await global.nodeThread.uploadDone({ uuid }).catch(console.error)

		return item
	} catch (e) {
		await global.nodeThread.uploadFailed({ uuid, reason: e.toString() }).catch(console.error)

		throw e
	}

	//showToast({ message: i18n(storage.getString("lang"), "fileUploaded", true, ["__NAME__"], [name]) })
}

export type UploadFolderItem = fs.SAFStat & {
	path: string
}

export const uploadFolder = async ({
	uri,
	parent,
	showFullScreenLoading = true
}: {
	uri: string
	parent: string
	showFullScreenLoading?: boolean
}) => {
	await uploadFolderMutex.acquire()

	if (showFullScreenLoading) {
		showFullScreenLoadingModal()
	}

	try {
		const isAndroidSAF = uri.startsWith("content://") && Platform.OS === "android"
		const items: UploadFolderItem[] = []
		const pathsToUUIDs: Record<string, string> = {}

		if (isAndroidSAF) {
			const [stat, uuid] = await Promise.all([fs.saf.stat(uri), global.nodeThread.uuidv4()])

			pathsToUUIDs[stat.name] = uuid

			items.push({
				name: stat.name,
				lastModified: stat.lastModified || Date.now(),
				type: "directory",
				uri,
				mime: "",
				size: 0,
				path: stat.name
			})
		} else {
			const name = pathModule.parse(uri).name

			if (!name || name.length <= 0) {
				return
			}

			const [stat, uuid] = await Promise.all([fs.stat(uri), global.nodeThread.uuidv4()])

			if (!stat.exists) {
				return
			}

			pathsToUUIDs[name] = uuid

			items.push({
				name: name,
				lastModified: stat.modificationTime || Date.now(),
				type: "directory",
				uri,
				mime: "",
				size: 0,
				path: name
			})
		}

		const readRecursive = async (path: string, currentPath: string) => {
			if (isAndroidSAF) {
				const files = await fs.saf.ls(path)

				if (files.length <= 0) {
					return
				}

				for (const file of files) {
					const uuid = await global.nodeThread.uuidv4()
					const fullPath = currentPath.length === 0 ? file.name : currentPath + "/" + file.name

					if (pathsToUUIDs[fullPath]) {
						continue
					}

					pathsToUUIDs[fullPath] = uuid

					items.push({
						name: file.name,
						lastModified: file.lastModified || Date.now(),
						type: file.type,
						uri: file.uri,
						mime: file.type === "directory" ? "" : mimeTypes.lookup(file.name) || "application/octet-stream",
						size: file.type === "directory" ? 0 : file.size || 0,
						path: fullPath
					})

					if (file.type === "directory") {
						await readRecursive(file.uri, fullPath)
					}
				}
			} else {
				const files = await fs.readDirectory(path)

				if (files.length <= 0) {
					return
				}

				for (const file of files) {
					const filePath = pathModule.join(path, file)
					const stat = await fs.stat(filePath)

					if (!stat.exists) {
						continue
					}

					const uuid = await global.nodeThread.uuidv4()
					const fullPath = currentPath.length === 0 ? file : currentPath + "/" + file

					if (pathsToUUIDs[fullPath]) {
						continue
					}

					pathsToUUIDs[fullPath] = uuid

					if (stat.isDirectory) {
						items.push({
							name: file,
							lastModified: stat.modificationTime || Date.now(),
							type: "directory",
							uri: filePath,
							mime: "",
							size: 0,
							path: fullPath
						})

						await readRecursive(filePath, fullPath)
					} else {
						items.push({
							name: file,
							lastModified: stat.modificationTime || Date.now(),
							type: "file",
							uri: filePath,
							mime: mimeTypes.lookup(file) || "application/octet-stream",
							size: stat.size || 0,
							path: fullPath
						})
					}
				}
			}
		}

		if (items.length <= 0) {
			return
		}

		await readRecursive(uri, items[0].name)

		const foldersToCreate = items
			.sort((a, b) => a.path.split("/").length - b.path.split("/").length)
			.filter(item => item.type === "directory")

		for (const folder of foldersToCreate) {
			const baseDir = pathModule.dirname(folder.path)
			const folderParent = baseDir === "." || baseDir.length <= 0 ? parent : pathsToUUIDs[baseDir] || ""

			if (folderParent.length <= 16) {
				continue
			}

			const exists = await folderExists({ name: folder.name, parent: folderParent })

			if (exists.exists) {
				pathsToUUIDs[folder.path] = exists.existsUUID

				continue
			}

			const uuid = await createFolder(folder.name, folderParent, pathsToUUIDs[folder.path])

			pathsToUUIDs[folder.path] = uuid
		}

		const filesToUpload = items.sort((a, b) => a.path.split("/").length - b.path.split("/").length).filter(item => item.type === "file")
		const tempDir = await fs.getDownloadPath({ type: "temp" })

		if (showFullScreenLoading) {
			hideFullScreenLoadingModal()
		}

		uploadFolderMutex.release()

		for (const file of filesToUpload) {
			const baseDir = pathModule.dirname(file.path)
			const fileParent = baseDir === "." || baseDir.length <= 0 ? parent : pathsToUUIDs[baseDir] || ""
			const tempPath = pathModule.join(tempDir, await global.nodeThread.uuidv4())

			if (fileParent.length <= 16 || tempPath.length <= 0 || file.size <= 0) {
				continue
			}

			if ((await fs.stat(tempPath)).exists) {
				await fs.unlink(tempPath)
			}

			if (isAndroidSAF) {
				await fs.saf.copy(file.uri, tempPath)
			} else {
				await fs.copy(file.uri, tempPath)
			}

			const uploadFile: UploadFile = {
				path: tempPath,
				name: file.name,
				size: file.size,
				mime: file.mime,
				lastModified: file.lastModified
			}

			queueFileUpload({ file: uploadFile, parent: fileParent })
				.catch(err => {
					if (err === "wifiOnly") {
						showToast({ message: i18n(storage.getString("lang") || "en", "onlyWifiUploads") })

						return
					}

					console.error(err)

					showToast({ message: err.toString() })
				})
				.finally(() => {
					fs.unlink(tempPath).catch(console.error)
				})
		}
	} catch (e) {
		throw e
	} finally {
		if (showFullScreenLoading) {
			hideFullScreenLoadingModal()
		}

		uploadFolderMutex.release()
	}
}
