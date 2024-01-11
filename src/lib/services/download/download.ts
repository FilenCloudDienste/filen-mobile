import ReactNativeBlobUtil from "react-native-blob-util"
import { Semaphore, getFileExt, randomIdUnsafe, toBlobUtilPathDecode } from "../../helpers"
import { Platform, DeviceEventEmitter } from "react-native"
import { useStore } from "../../state"
import { i18n } from "../../../i18n"
import storage from "../../storage"
import { showToast } from "../../../components/Toasts"
import { addItemToOfflineList, getItemOfflinePath } from "../offline"
import { Item } from "../../../types"
import * as fs from "../../../lib/fs"
import { isOnline, isWifi } from "../isOnline"
import { getDirectoryTree } from "../../../lib/api"
import {
	showFullScreenLoadingModal,
	hideFullScreenLoadingModal
} from "../../../components/Modals/FullscreenLoadingModal/FullscreenLoadingModal"
import pathModule from "path"

const currentDownloads: Record<string, boolean> = {}
const addDownloadMutex = new Semaphore(1)

export interface QueueFileDownload {
	file: Item
	storeOffline?: boolean
	optionalCallback?: Function
	saveToGalleryCallback?: Function
	isOfflineUpdate?: boolean
	isPreview?: boolean
	showNotification?: boolean
}

export const queueFileDownload = async ({
	file,
	storeOffline = false,
	optionalCallback = undefined,
	saveToGalleryCallback = undefined,
	isOfflineUpdate = false,
	isPreview = false,
	showNotification = false
}: QueueFileDownload) => {
	const callOptionalCallback = (...args: any) => {
		if (typeof optionalCallback == "function") {
			optionalCallback(...args)
		}
	}

	if (!(await isOnline())) {
		callOptionalCallback(new Error("device is offline"))

		showToast({ message: i18n(storage.getString("lang"), "deviceOffline") })

		return
	}

	if (typeof saveToGalleryCallback == "function") {
		try {
			const offlinePath = await fs.getDownloadPath({ type: "offline" })

			if ((await fs.stat(getItemOfflinePath(offlinePath, file))).exists) {
				callOptionalCallback(null, getItemOfflinePath(offlinePath, file))

				saveToGalleryCallback(getItemOfflinePath(offlinePath, file))

				return
			}
		} catch (e) {
			console.error(e)
		}
	}

	await addDownloadMutex.acquire()

	if (typeof currentDownloads[file.uuid] !== "undefined") {
		callOptionalCallback(new Error("Already downloading this file"))

		showToast({
			message: i18n(storage.getString("lang"), "alreadyDownloadingFile", true, ["__NAME__"], [file.name])
		})

		addDownloadMutex.release()

		return
	}

	currentDownloads[file.uuid] = true

	addDownloadMutex.release()

	try {
		var downloadPath = await fs.getDownloadPath({ type: storeOffline ? "offline" : "download" })
	} catch (e) {
		console.error(e)

		callOptionalCallback(new Error("could not get download path"))

		delete currentDownloads[file.uuid]

		showToast({ message: i18n(storage.getString("lang"), "couldNotGetDownloadPath") })

		return
	}

	if (storage.getBoolean("onlyWifiDownloads") && !(await isWifi())) {
		delete currentDownloads[file.uuid]

		showToast({ message: i18n(storage.getString("lang"), "onlyWifiDownloads") })

		return
	}

	const filePath = downloadPath + file.name

	downloadFile(file, true, file.chunks)
		.then(async path => {
			delete currentDownloads[file.uuid]

			if (isPreview) {
				callOptionalCallback(null, path)

				return
			}

			if (typeof saveToGalleryCallback == "function") {
				callOptionalCallback(null, path)

				saveToGalleryCallback(path)

				return
			}

			if (storeOffline) {
				const offlinePath = getItemOfflinePath(downloadPath, file)

				try {
					if ((await fs.stat(offlinePath)).exists) {
						await fs.unlink(offlinePath)
					}
				} catch {
					// Noop
				}

				fs.move(path, offlinePath)
					.then(() => {
						addItemToOfflineList({
							item: file
						})
							.then(() => {
								DeviceEventEmitter.emit("event", {
									type: "mark-item-offline",
									data: {
										uuid: file.uuid,
										value: true
									}
								})

								callOptionalCallback(null, offlinePath)
							})
							.catch(err => {
								showToast({ message: err.toString() })

								callOptionalCallback(err)

								console.error(err)
							})
					})
					.catch(err => {
						showToast({ message: err.toString() })

						callOptionalCallback(err)

						console.error(err)
					})
			} else {
				if (Platform.OS === "android") {
					ReactNativeBlobUtil.MediaCollection.copyToMediaStore(
						{
							name: file.name,
							parentFolder: "",
							mimeType: file.mime
						},
						"Download",
						toBlobUtilPathDecode(path)
					)
						.then(() => {
							fs.unlink(path)
								.then(() => {
									if (showNotification || useStore.getState().imagePreviewModalVisible) {
										showToast({
											message: i18n(storage.getString("lang"), "fileDownloaded", true, ["__NAME__"], [file.name])
										})
									}

									callOptionalCallback(null, "")
								})
								.catch(err => {
									showToast({ message: err.toString() })

									callOptionalCallback(err)

									console.error(err)
								})
						})
						.catch(err => {
							showToast({ message: err.toString() })

							callOptionalCallback(err)

							console.error(err)
						})
				} else {
					try {
						if ((await fs.stat(filePath)).exists) {
							await fs.unlink(filePath)
						}
					} catch {
						// Noop
					}

					fs.move(path, filePath)
						.then(() => {
							if (showNotification || useStore.getState().imagePreviewModalVisible) {
								showToast({
									message: i18n(storage.getString("lang"), "fileDownloaded", true, ["__NAME__"], [file.name])
								})
							}

							callOptionalCallback(null, filePath)
						})
						.catch(err => {
							showToast({ message: err.toString() })

							callOptionalCallback(err)

							console.error(err)
						})
				}
			}
		})
		.catch(err => {
			delete currentDownloads[file.uuid]

			if (err.toString() !== "stopped") {
				showToast({ message: err.toString() })

				console.error(err)
			}

			callOptionalCallback(err)
		})
}

export const downloadFile = async (file: Item, showProgress: boolean = true, maxChunks: number): Promise<string> => {
	const tempDir = fs.cacheDirectory()
	const destination = tempDir.split("file://").join("") + randomIdUnsafe() + file.uuid + "." + getFileExt(file.name)

	return await global.nodeThread.downloadFile({
		destination,
		file,
		showProgress,
		maxChunks,
		tempDir
	})
}

export const downloadFolder = async ({
	folder,
	shared = false,
	linked = false,
	linkUUID,
	linkHasPassword = false,
	linkPassword,
	linkSalt,
	linkKey,
	showFullScreenLoading = true,
	showNotification = true
}: {
	folder: Item
	shared?: boolean
	linked?: boolean
	linkUUID?: string
	linkHasPassword?: boolean
	linkPassword?: string
	linkSalt?: string
	linkKey?: string
	showFullScreenLoading?: boolean
	showNotification?: boolean
}) => {
	if (showFullScreenLoading) {
		showFullScreenLoadingModal()
	}

	try {
		const folderType: "normal" | "linked" | "shared" = shared ? "shared" : linked ? "linked" : "normal"

		const [tree, baseDownloadPath] = await Promise.all([
			getDirectoryTree(folder.uuid, folderType, linkUUID, linkHasPassword, linkPassword, linkSalt, linkKey),
			fs.getDownloadPath({ type: "download" })
		])

		hideFullScreenLoadingModal()

		const promises: Promise<void>[] = []

		for (const file of tree) {
			if (Platform.OS === "ios" && file.item.uuid === folder.uuid) {
				const baseFolderPath = pathModule.join(baseDownloadPath, pathModule.dirname(file.path), file.item.name)

				if ((await fs.stat(baseFolderPath)).exists) {
					await fs.unlink(baseFolderPath)
				}
			}

			if (file.item.type !== "file") {
				continue
			}

			promises.push(
				new Promise(async (resolve, reject) => {
					try {
						const tmpDownloadPath = await downloadFile(file.item, true, file.item.chunks)

						if (Platform.OS === "android") {
							await ReactNativeBlobUtil.MediaCollection.copyToMediaStore(
								{
									name: file.item.name,
									parentFolder: pathModule.dirname(file.path),
									mimeType: file.item.mime
								},
								"Download",
								toBlobUtilPathDecode(tmpDownloadPath)
							)
						} else {
							const fileDirPath = pathModule.join(baseDownloadPath, pathModule.dirname(file.path))

							await fs.mkdir(fileDirPath, true)

							const filePath = pathModule.join(fileDirPath, file.item.name)

							if ((await fs.stat(filePath)).exists) {
								await fs.unlink(filePath)
							}

							await fs.copy(tmpDownloadPath, filePath)
						}

						await fs.unlink(tmpDownloadPath)

						resolve()
					} catch (e) {
						reject(e)
					}
				})
			)
		}

		await Promise.all(promises)

		showToast({
			message: i18n(storage.getString("lang"), "fileDownloaded", true, ["__NAME__"], [folder.name])
		})
	} catch (e) {
		throw e
	} finally {
		if (showFullScreenLoading) {
			hideFullScreenLoadingModal()
		}
	}
}
