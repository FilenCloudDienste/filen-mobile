import {
	getAPIKey,
	getMasterKeys,
	Semaphore,
	getFileExt,
	canCompressThumbnailLocally,
	toExpoFsPath,
	getFilePreviewType
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
import { encryptMetadata } from "../../crypto"
import * as AndroidSAF from "react-native-saf-x"
import pathModule from "path"
import mimeTypes from "mime-types"
import {
	showFullScreenLoadingModal,
	hideFullScreenLoadingModal
} from "../../../components/Modals/FullscreenLoadingModal/FullscreenLoadingModal"

const maxThreads = 10
const uploadSemaphore = new Semaphore(3)
const uploadThreadsSemaphore = new Semaphore(maxThreads)
const uploadVersion = 2
const createFolderSemaphore = new Semaphore(10)
const uploadFolderMutex = new Semaphore(1)

export interface UploadFile {
	path: string
	name: string
	size: number
	mime: string
	lastModified: number
}

export const queueFileUpload = ({
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
	return new Promise(async (resolve, reject) => {
		const masterKeys = getMasterKeys()
		const apiKey = getAPIKey()

		if (!Array.isArray(masterKeys) || masterKeys.length <= 0) {
			return reject("master keys !== array")
		}

		if (!(await isOnline())) {
			return reject(i18n(storage.getString("lang"), "deviceOffline"))
		}

		if (storage.getBoolean("onlyWifiUploads") && !(await isWifi())) {
			return reject("wifiOnly")
		}

		try {
			var stat = await fs.stat(file.path)
		} catch (e) {
			return reject(e)
		}

		if (!stat.exists) {
			return reject(new Error("File not found"))
		}

		file.size = stat.size

		const fileName = file.name.split("/").join("_").split("\\").join("_")
		const item = {
			uuid: "",
			name: fileName,
			size: file.size,
			chunks_size: file.size,
			mime: file.mime || "",
			key: "",
			rm: "",
			metadata: "",
			chunks: 0,
			parent,
			timestamp: Math.floor(Date.now() / 1000),
			version: uploadVersion,
			versionedUUID: undefined,
			region: "",
			bucket: "",
			type: "file"
		}
		const name = fileName
		const size = file.size
		const mime = file.mime || ""
		const chunkSizeToUse = 1024 * 1024 * 1
		let dummyOffset = 0
		let fileChunks = 0
		const lastModified = file.lastModified
		let paused = false
		let stopped = false
		let didStop = false

		while (dummyOffset < size) {
			fileChunks += 1
			dummyOffset += chunkSizeToUse
		}

		item.chunks = fileChunks
		item.name = name

		const stopInterval = setInterval(() => {
			if (stopped && !didStop) {
				didStop = true

				clearInterval(stopInterval)

				return true
			}
		}, 250)

		try {
			var key = await global.nodeThread.generateRandomString({ charLength: 32 })
			var metadata =
				typeof includeFileHash == "boolean" || typeof includeFileHash == "string"
					? {
							name,
							size,
							mime,
							key,
							lastModified,
							hash:
								typeof includeFileHash == "boolean"
									? await global.nodeThread.getFileHash({
											path: file.path,
											hashName: "sha512"
									  })
									: typeof includeFileHash == "string"
									? includeFileHash
									: ""
					  }
					: {
							name,
							size,
							mime,
							key,
							lastModified
					  }

			var [uuid, rm, uploadKey, nameEnc, nameH, mimeEnc, sizeEnc, metaData] = await Promise.all([
				global.nodeThread.uuidv4(),
				global.nodeThread.generateRandomString({ charLength: 32 }),
				global.nodeThread.generateRandomString({ charLength: 32 }),
				encryptMetadata(name, key),
				global.nodeThread.hashFn({ string: name.toLowerCase() }),
				encryptMetadata(mime, key),
				encryptMetadata(size.toString(), key),
				encryptMetadata(JSON.stringify(metadata), masterKeys[masterKeys.length - 1])
			])

			item.key = key
			item.rm = rm
			item.metadata = metaData
		} catch (e) {
			console.error(e)

			clearInterval(stopInterval)

			return reject(e)
		}

		item.uuid = uuid

		DeviceEventEmitter.emit("upload", {
			type: "start",
			data: item
		})

		await uploadSemaphore.acquire()

		const pauseListener = DeviceEventEmitter.addListener("pauseTransfer", uuid => {
			if (uuid == uuid) {
				paused = true
			}
		})

		const resumeListener = DeviceEventEmitter.addListener("resumeTransfer", uuid => {
			if (uuid == uuid) {
				paused = false
			}
		})

		const stopListener = DeviceEventEmitter.addListener("stopTransfer", uuid => {
			if (uuid == uuid) {
				stopped = true
			}
		})

		const cleanup = () => {
			uploadSemaphore.release()
			pauseListener.remove()
			resumeListener.remove()
			stopListener.remove()

			clearInterval(stopInterval)
		}

		let err = undefined

		const upload = async (index: number): Promise<any> => {
			if (paused) {
				await new Promise<void>(resolve => {
					const wait = setInterval(() => {
						if (!paused || stopped) {
							clearInterval(wait)

							return resolve()
						}
					}, 250)
				})
			}

			if (didStop) {
				throw new Error("stopped")
			}

			return await global.nodeThread.encryptAndUploadFileChunk({
				path: file.path,
				key,
				queryParams: new URLSearchParams({
					uuid,
					index: index.toString(),
					uploadKey,
					parent
				}).toString(),
				chunkIndex: index,
				chunkSize: chunkSizeToUse,
				apiKey
			})
		}

		DeviceEventEmitter.emit("upload", {
			type: "started",
			data: item
		})

		if (typeof err == "undefined") {
			try {
				await new Promise((resolve, reject) => {
					let done = 0

					for (let i = 0; i < fileChunks; i++) {
						uploadThreadsSemaphore.acquire().then(() => {
							upload(i)
								.then(res => {
									done += 1
									item.region = res.data.region
									item.bucket = res.data.bucket

									uploadThreadsSemaphore.release()

									if (done >= fileChunks) {
										return resolve(true)
									}
								})
								.catch(err => {
									uploadThreadsSemaphore.release()

									return reject(err)
								})
						})
					}
				})

				if (canCompressThumbnailLocally(getFileExt(name))) {
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
										return resolve()
									}

									fs.stat(file.path)
										.then(stat => {
											if (!stat.exists) {
												return resolve()
											}

											if (!stat.size) {
												return resolve()
											}

											if (stat.size <= 1) {
												return resolve()
											}

											if (getFilePreviewType(getFileExt(name)) == "video") {
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
																				storage.set(cacheKey, item.uuid + ".jpg")
																				memoryCache.set(
																					"cachedThumbnailPaths:" + uuid,
																					item.uuid + ".jpg"
																				)

																				return resolve()
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
																storage.set(cacheKey, item.uuid + ".jpg")
																memoryCache.set("cachedThumbnailPaths:" + uuid, item.uuid + ".jpg")

																return resolve()
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
			} catch (e: any) {
				if (e.toString().toLowerCase().indexOf("already exists") !== -1) {
					cleanup()

					DeviceEventEmitter.emit("upload", {
						type: "err",
						err: e.toString(),
						data: item
					})

					return
				}

				err = e
			}
		}

		if (typeof err !== "undefined") {
			DeviceEventEmitter.emit("upload", {
				type: "err",
				err: err.toString(),
				data: item
			})

			cleanup()

			if (err.toString() == "stopped") {
				return reject("stopped")
			} else if (err.toString().toLowerCase().indexOf("blacklist") !== -1) {
				showToast({ message: i18n(storage.getString("lang"), "notEnoughRemoteStorage") })

				return reject("notEnoughRemoteStorage")
			} else {
				//showToast({ message: err.toString() })

				console.error(err)

				return reject(err)
			}
		}

		try {
			const done = await markUploadAsDone({
				uuid,
				name: nameEnc,
				nameHashed: nameH,
				size: sizeEnc,
				chunks: fileChunks,
				mime: mimeEnc,
				rm,
				metadata: metaData,
				version: uploadVersion,
				uploadKey
			})

			fileChunks = done.chunks

			item.timestamp = Math.floor(Date.now() / 1000)

			await checkIfItemParentIsShared({
				type: "file",
				parent,
				metaData: {
					uuid,
					name,
					size,
					mime,
					key,
					lastModified
				}
			})
		} catch (e: any) {
			DeviceEventEmitter.emit("upload", {
				type: "err",
				err: e.toString(),
				data: item
			})

			cleanup()

			console.error(e)

			return reject(e)
		}

		cleanup()

		const builtFile = await buildFile({
			file: {
				bucket: item.bucket,
				chunks: item.chunks,
				favorited: 0,
				metadata: item.metadata,
				parent,
				region: item.region,
				rm: item.rm,
				size: item.size,
				timestamp: item.timestamp,
				uuid: item.uuid,
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

		DeviceEventEmitter.emit("upload", {
			type: "done",
			data: item
		})

		resolve(item)

		//showToast({ message: i18n(storage.getString("lang"), "fileUploaded", true, ["__NAME__"], [name]) })
	})
}

export type UploadFolderItem = AndroidSAF.DocumentFileDetail & {
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
			const stat = await AndroidSAF.stat(uri)
			const uuid = await global.nodeThread.uuidv4()

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
			const name = pathModule.basename(uri)

			if (!name || name.length <= 0) {
				return
			}

			const stat = await fs.stat(uri)

			if (!stat.exists) {
				return
			}

			const uuid = await global.nodeThread.uuidv4()

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
				const files = await AndroidSAF.listFiles(path)

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
		const folderPromises: Promise<void>[] = []

		for (const folder of foldersToCreate) {
			folderPromises.push(
				new Promise(async (resolve, reject) => {
					await createFolderSemaphore.acquire()

					try {
						const baseDir = pathModule.dirname(folder.path)
						const folderParent = baseDir === "." || baseDir.length <= 0 ? parent : pathsToUUIDs[baseDir] || ""

						if (folderParent.length <= 16) {
							resolve()

							return
						}

						const exists = await folderExists({ name: folder.name, parent: folderParent })

						if (exists.exists) {
							pathsToUUIDs[folder.path] = exists.existsUUID

							resolve()

							return
						}

						await createFolder(folder.name, folderParent, pathsToUUIDs[folder.path])
					} catch (e) {
						reject(e)
					} finally {
						createFolderSemaphore.release()
					}
				})
			)
		}

		await Promise.all(folderPromises)

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

			if (fileParent.length <= 16 || tempPath.length <= 0) {
				continue
			}

			if ((await fs.stat(tempPath)).exists) {
				await fs.unlink(tempPath)
			}

			if (isAndroidSAF) {
				await AndroidSAF.copyFile(file.uri, tempPath, {
					replaceIfDestinationExists: true
				})
			} else {
				await fs.copy(file.uri, tempDir)
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
