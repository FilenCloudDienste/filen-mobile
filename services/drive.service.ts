import nodeWorker from "@/lib/nodeWorker"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import * as Clipboard from "expo-clipboard"
import alerts from "@/lib/alerts"
import { t } from "@/lib/i18n"
import * as FileSystem from "expo-file-system/next"
import { inputPrompt } from "@/components/prompts/inputPrompt"
import { type FileMetadata, type FolderMetadata } from "@filen/sdk"
import queryUtils from "@/queries/utils"
import { FETCH_CLOUD_ITEMS_POSSIBLE_OF } from "@/queries/useCloudItemsQuery"
import { useGalleryStore } from "@/stores/gallery.store"
import { colorPicker } from "@/components/sheets/colorPickerSheet"
import { DEFAULT_DIRECTORY_COLOR } from "@/assets/fileIcons"
import { itemInfo } from "@/components/sheets/itemInfoSheet"
import { selectContacts } from "@/app/selectContacts"
import { promiseAllChunked, sanitizeFileName, normalizeFilePathForExpo } from "@/lib/utils"
import * as FileSystemLegacy from "expo-file-system"
import * as Sharing from "expo-sharing"
import paths from "@/lib/paths"
import { randomUUID } from "expo-crypto"
import sqlite from "@/lib/sqlite"
import { alertPrompt } from "@/components/prompts/alertPrompt"
import { selectDriveItems } from "@/app/selectDriveItems/[parent]"
import { Platform } from "react-native"
import ReactNativeBlobUtil from "react-native-blob-util"
import * as MediaLibrary from "expo-media-library"
import { fetchItemPublicLinkStatus } from "@/queries/useItemPublicLinkStatusQuery"
import { type Contact } from "@filen/sdk/dist/types/api/v3/contacts"
import { useDriveStore } from "@/stores/drive.store"
import download from "@/lib/download"

export class DriveService {
	public async copyItemPath({
		item,
		disableAlert,
		disableLoader
	}: {
		item: DriveCloudItem
		disableAlert?: boolean
		disableLoader?: boolean
	}): Promise<void> {
		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			const path =
				item.type === "directory"
					? await nodeWorker.proxy("directoryUUIDToPath", {
							uuid: item.uuid
					  })
					: await nodeWorker.proxy("fileUUIDToPath", {
							uuid: item.uuid
					  })

			await Clipboard.setStringAsync(path)

			if (!disableAlert) {
				alerts.normal(t("copiedToClipboard"))
			}
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async copyItemUUID({
		item,
		disableAlert,
		disableLoader
	}: {
		item: DriveCloudItem
		disableAlert?: boolean
		disableLoader?: boolean
	}): Promise<void> {
		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await Clipboard.setStringAsync(item.uuid)

			if (!disableAlert) {
				alerts.normal(t("copiedToClipboard"))
			}
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async renameItem({
		item,
		queryParams,
		disableLoader
	}: {
		item: DriveCloudItem
		queryParams?: FetchCloudItemsParams
		disableLoader?: boolean
	}): Promise<void> {
		const itemNameParsed = FileSystem.Paths.parse(item.name)
		const itemName = item.type === "file" && item.name.includes(".") ? itemNameParsed?.name ?? item.name : item.name
		const itemExt = item.type === "file" && item.name.includes(".") ? itemNameParsed?.ext ?? "" : ""

		const inputPromptResponse = await inputPrompt({
			title: t("drive.prompts.renameItem.title"),
			materialIcon: {
				name: "pencil"
			},
			prompt: {
				type: "plain-text",
				keyboardType: "default",
				defaultValue: itemName,
				placeholder: t("drive.prompts.renameItem.placeholder")
			}
		})

		if (inputPromptResponse.cancelled || inputPromptResponse.type !== "text") {
			return
		}

		const newName = `${inputPromptResponse.text.trim()}${itemExt}`

		if (!newName || newName.length === 0 || newName === item.name) {
			return
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			if (item.type === "directory") {
				await nodeWorker.proxy("renameDirectory", {
					uuid: item.uuid,
					name: newName
				})
			} else {
				await nodeWorker.proxy("renameFile", {
					uuid: item.uuid,
					name: newName,
					metadata: {
						name: newName,
						size: item.size,
						mime: item.mime,
						lastModified: item.lastModified,
						hash: item.hash,
						creation: item.creation,
						key: item.key
					} satisfies FileMetadata
				})
			}

			if (queryParams) {
				queryUtils.useCloudItemsQuerySet({
					...queryParams,
					updater: prev =>
						prev.map(prevItem =>
							prevItem.uuid === item.uuid
								? {
										...prevItem,
										name: newName
								  }
								: prevItem
						)
				})
			}

			// Update home screen queries aswell
			for (const ofValue of FETCH_CLOUD_ITEMS_POSSIBLE_OF) {
				queryUtils.useCloudItemsQuerySet({
					of: ofValue as FetchCloudItemsParams["of"],
					parent: ofValue === "sharedIn" ? "shared-in" : ofValue === "sharedOut" ? "shared-out" : ofValue,
					receiverId: 0,
					updater: prev =>
						prev.map(prevItem =>
							prevItem.uuid === item.uuid
								? {
										...prevItem,
										name: newName
								  }
								: prevItem
						)
				})
			}

			// Update gallery store aswell
			useGalleryStore.getState().setItems(prev =>
				prev.map(prevItem =>
					prevItem.itemType === "cloudItem" && prevItem.data.item.uuid === item.uuid
						? {
								...prevItem,
								data: {
									...prevItem.data,
									item: {
										...prevItem.data.item,
										name: newName
									}
								}
						  }
						: prevItem
				)
			)

			// Update selectedItems aswell
			useDriveStore.getState().setSelectedItems(prev =>
				prev.map(prevItem =>
					prevItem.uuid === item.uuid
						? {
								...prevItem,
								name: newName
						  }
						: prevItem
				)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async changeDirectoryColor({
		item,
		queryParams,
		color,
		disableLoader
	}: {
		item: DriveCloudItem
		queryParams?: FetchCloudItemsParams
		color?: string
		disableLoader?: boolean
	}): Promise<void> {
		if (item.type !== "directory") {
			return
		}

		if (!color) {
			const colorPickerResponse = await colorPicker({
				currentColor: item.color ?? DEFAULT_DIRECTORY_COLOR
			})

			if (colorPickerResponse.cancelled) {
				return
			}

			const pickedColor = colorPickerResponse.color.trim().toLowerCase()

			if (!pickedColor || pickedColor.length === 0) {
				return
			}

			color = pickedColor
		}

		if (color === item.color?.toLowerCase()) {
			return
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await nodeWorker.proxy("changeDirectoryColor", {
				uuid: item.uuid,
				color
			})

			if (queryParams) {
				queryUtils.useCloudItemsQuerySet({
					...queryParams,
					updater: prev =>
						prev.map(prevItem =>
							prevItem.uuid === item.uuid
								? {
										...prevItem,
										color
								  }
								: prevItem
						)
				})
			}

			// Update home screen queries aswell
			for (const ofValue of FETCH_CLOUD_ITEMS_POSSIBLE_OF) {
				queryUtils.useCloudItemsQuerySet({
					of: ofValue as FetchCloudItemsParams["of"],
					parent: ofValue === "sharedIn" ? "shared-in" : ofValue === "sharedOut" ? "shared-out" : ofValue,
					receiverId: 0,
					updater: prev =>
						prev.map(prevItem =>
							prevItem.uuid === item.uuid
								? {
										...prevItem,
										color
								  }
								: prevItem
						)
				})
			}

			// Update selectedItems aswell
			useDriveStore.getState().setSelectedItems(prev =>
				prev.map(prevItem =>
					prevItem.uuid === item.uuid
						? {
								...prevItem,
								color
						  }
						: prevItem
				)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async showItemInfo(item: DriveCloudItem): Promise<void> {
		itemInfo(item)
	}

	public async toggleItemFavorite({
		item,
		queryParams,
		favorite,
		disableLoader
	}: {
		item: DriveCloudItem
		queryParams?: FetchCloudItemsParams
		favorite?: boolean
		disableLoader?: boolean
	}): Promise<void> {
		const newFavoriteStatus = typeof favorite === "boolean" ? favorite : !item.favorited

		if (newFavoriteStatus === item.favorited) {
			return
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			if (item.type === "directory") {
				await nodeWorker.proxy("favoriteDirectory", {
					uuid: item.uuid,
					favorite: newFavoriteStatus
				})
			} else {
				await nodeWorker.proxy("favoriteFile", {
					uuid: item.uuid,
					favorite: newFavoriteStatus
				})
			}

			if (queryParams) {
				if (queryParams.of === "favorites" && !newFavoriteStatus) {
					queryUtils.useCloudItemsQuerySet({
						...queryParams,
						updater: prev => prev.filter(prevItem => prevItem.uuid !== item.uuid)
					})
				}

				queryUtils.useCloudItemsQuerySet({
					...queryParams,
					updater: prev =>
						prev.map(prevItem =>
							prevItem.uuid === item.uuid
								? {
										...prevItem,
										favorited: newFavoriteStatus
								  }
								: prevItem
						)
				})
			}

			// Update favorites home screen, add if not already there, otherwise remove it
			if (newFavoriteStatus) {
				queryUtils.useCloudItemsQuerySet({
					of: "favorites",
					parent: "favorites",
					receiverId: 0,
					updater: prev => [...prev.filter(prevItem => prevItem.uuid !== item.uuid), item]
				})
			} else {
				queryUtils.useCloudItemsQuerySet({
					of: "favorites",
					parent: "favorites",
					receiverId: 0,
					updater: prev => prev.filter(prevItem => prevItem.uuid !== item.uuid)
				})
			}

			// Update home screen queries aswell
			for (const ofValue of FETCH_CLOUD_ITEMS_POSSIBLE_OF) {
				queryUtils.useCloudItemsQuerySet({
					of: ofValue as FetchCloudItemsParams["of"],
					parent: ofValue === "sharedIn" ? "shared-in" : ofValue === "sharedOut" ? "shared-out" : ofValue,
					receiverId: 0,
					updater: prev =>
						prev.map(prevItem =>
							prevItem.uuid === item.uuid
								? {
										...prevItem,
										favorited: newFavoriteStatus
								  }
								: prevItem
						)
				})
			}

			// Update gallery store aswell
			useGalleryStore.getState().setItems(prev =>
				prev.map(prevItem =>
					prevItem.itemType === "cloudItem" && prevItem.data.item.uuid === item.uuid
						? {
								...prevItem,
								data: {
									...prevItem.data,
									item: {
										...prevItem.data.item,
										favorited: newFavoriteStatus
									}
								}
						  }
						: prevItem
				)
			)

			// Update selectedItems aswell
			useDriveStore.getState().setSelectedItems(prev =>
				prev.map(prevItem =>
					prevItem.uuid === item.uuid
						? {
								...prevItem,
								favorited: newFavoriteStatus
						  }
						: prevItem
				)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async shareItem({
		item,
		disableAlert,
		contacts,
		disableLoader
	}: {
		item: DriveCloudItem
		disableAlert?: boolean
		contacts?: Contact[]
		disableLoader?: boolean
	}): Promise<void> {
		if (!contacts) {
			const selectContactsResponse = await selectContacts({
				type: "all",
				max: 9999
			})

			if (selectContactsResponse.cancelled || selectContactsResponse.contacts.length === 0) {
				return
			}

			contacts = selectContactsResponse.contacts
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				contacts.map(contact =>
					nodeWorker.proxy("shareItems", {
						files:
							item.type === "file"
								? [
										{
											uuid: item.uuid,
											parent: item.parent,
											metadata: {
												name: item.name,
												size: item.size,
												mime: item.mime,
												lastModified: item.lastModified,
												hash: item.hash,
												creation: item.creation,
												key: item.key
											}
										}
								  ]
								: [],
						directories:
							item.type === "directory"
								? [
										{
											uuid: item.uuid,
											parent: item.parent,
											metadata: {
												name: item.name
											}
										}
								  ]
								: [],
						email: contact.email
					})
				)
			)

			if (!disableAlert) {
				alerts.normal(
					t("drive.itemShared", {
						name: item.name
					})
				)
			}
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async itemExistsOffline(item: DriveCloudItem): Promise<
		| {
				exists: false
		  }
		| {
				exists: true
				path: string
		  }
	> {
		if (item.type !== "file" || item.size <= 0) {
			return {
				exists: false
			}
		}

		const offlineStatus = await sqlite.offlineFiles.contains(item.uuid)

		if (!offlineStatus) {
			return {
				exists: false
			}
		}

		const offlinePath = FileSystem.Paths.join(paths.offlineFiles(), item.uuid)
		const offlineFile = new FileSystem.File(offlinePath)

		if (!offlineFile.exists) {
			return {
				exists: false
			}
		}

		return {
			exists: true,
			path: offlinePath
		}
	}

	public async exportItem({ item, disableLoader }: { item: DriveCloudItem; disableLoader?: boolean }): Promise<void> {
		if (
			item.type !== "file" ||
			item.size <= 0 ||
			!(await Sharing.isAvailableAsync()) ||
			(await FileSystemLegacy.getFreeDiskStorageAsync()) <= item.size + 1024 * 1024
		) {
			return
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		const tempLocation = new FileSystem.File(FileSystem.Paths.join(paths.exports(), sanitizeFileName(item.name)))

		try {
			if (tempLocation.exists) {
				tempLocation.delete()
			}

			const offlineStatus = await this.itemExistsOffline(item)

			if (offlineStatus.exists) {
				const offlineFile = new FileSystem.File(offlineStatus.path)

				if (!offlineFile.exists) {
					throw new Error("Offline file does not exist.")
				}

				offlineFile.copy(tempLocation)
			} else {
				await download.file.foreground({
					id: randomUUID(),
					uuid: item.uuid,
					bucket: item.bucket,
					region: item.region,
					chunks: item.chunks,
					version: item.version,
					key: item.key,
					destination: tempLocation.uri,
					size: item.size,
					name: item.name,
					dontEmitProgress: true
				})
			}

			await new Promise<void>(resolve => setTimeout(resolve, 250))

			await Sharing.shareAsync(tempLocation.uri, {
				mimeType: item.mime,
				dialogTitle: item.name
			})
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}

			if (tempLocation.exists) {
				tempLocation.delete()
			}
		}
	}

	public async trashItem({
		item,
		queryParams,
		fromPreview,
		disableLoader
	}: {
		item: DriveCloudItem
		queryParams?: FetchCloudItemsParams
		fromPreview?: boolean
		disableLoader?: boolean
	}): Promise<void> {
		const alertPromptResponse = await alertPrompt({
			title: t("drive.prompts.trashItem.title"),
			message: t("drive.prompts.trashItem.message")
		})

		if (alertPromptResponse.cancelled) {
			return
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			if (item.type === "directory") {
				await nodeWorker.proxy("trashDirectory", {
					uuid: item.uuid
				})
			} else {
				await nodeWorker.proxy("trashFile", {
					uuid: item.uuid
				})
			}

			if (queryParams) {
				queryUtils.useCloudItemsQuerySet({
					...queryParams,
					updater: prev => prev.filter(prevItem => prevItem.uuid !== item.uuid)
				})
			}

			// Update home screen queries aswell
			for (const ofValue of FETCH_CLOUD_ITEMS_POSSIBLE_OF) {
				queryUtils.useCloudItemsQuerySet({
					of: ofValue as FetchCloudItemsParams["of"],
					parent: ofValue === "sharedIn" ? "shared-in" : ofValue === "sharedOut" ? "shared-out" : ofValue,
					receiverId: 0,
					updater: prev => prev.filter(prevItem => prevItem.uuid !== item.uuid)
				})
			}

			// Update selectedItems aswell
			useDriveStore.getState().setSelectedItems(prev => prev.filter(prevItem => prevItem.uuid !== item.uuid))

			// Close gallery modal if item is currently being previewed
			if (fromPreview) {
				useGalleryStore.getState().reset()
			}
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async moveItem({
		item,
		queryParams,
		dismissHref,
		parent,
		disableLoader
	}: {
		item: DriveCloudItem
		queryParams?: FetchCloudItemsParams
		dismissHref?: string
		parent?: string
		disableLoader?: boolean
	}): Promise<void> {
		if (!parent) {
			const selectDriveItemsResponse = await selectDriveItems({
				type: "directory",
				max: 1,
				dismissHref: dismissHref ?? "/drive",
				toMove: [item.uuid]
			})

			if (selectDriveItemsResponse.cancelled || selectDriveItemsResponse.items.length !== 1) {
				return
			}

			const selectedParent = selectDriveItemsResponse.items.at(0)?.uuid

			if (!selectedParent) {
				return
			}

			parent = selectedParent
		}

		if (parent === item.parent) {
			return
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			if (item.type === "directory") {
				await nodeWorker.proxy("moveDirectory", {
					uuid: item.uuid,
					to: parent,
					metadata: {
						name: item.name
					} satisfies FolderMetadata
				})
			} else {
				await nodeWorker.proxy("moveFile", {
					uuid: item.uuid,
					to: parent,
					metadata: {
						name: item.name,
						size: item.size,
						mime: item.mime,
						lastModified: item.lastModified,
						hash: item.hash,
						creation: item.creation,
						key: item.key
					} satisfies FileMetadata
				})
			}

			if (queryParams && item.parent === queryParams.parent) {
				queryUtils.useCloudItemsQuerySet({
					...queryParams,
					updater: prev => prev.filter(prevItem => prevItem.uuid !== item.uuid)
				})
			}

			// Update home screen queries aswell
			for (const ofValue of FETCH_CLOUD_ITEMS_POSSIBLE_OF) {
				queryUtils.useCloudItemsQuerySet({
					of: ofValue as FetchCloudItemsParams["of"],
					parent: ofValue === "sharedIn" ? "shared-in" : ofValue === "sharedOut" ? "shared-out" : ofValue,
					receiverId: 0,
					updater: prev =>
						prev.map(prevItem =>
							prevItem.uuid === item.uuid
								? {
										...prevItem,
										parent
								  }
								: prevItem
						)
				})
			}

			// Update gallery store aswell
			useGalleryStore.getState().setItems(prev =>
				prev.map(prevItem =>
					prevItem.itemType === "cloudItem" && prevItem.data.item.uuid === item.uuid
						? {
								...prevItem,
								data: {
									...prevItem.data,
									item: {
										...prevItem.data.item,
										parent
									}
								}
						  }
						: prevItem
				)
			)

			// Update selectedItems aswell
			useDriveStore.getState().setSelectedItems(prev => prev.filter(prevItem => prevItem.uuid !== item.uuid))
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async downloadItem({ item, disableLoader }: { item: DriveCloudItem; disableLoader?: boolean }): Promise<void> {
		if (Platform.OS !== "android" || item.size <= 0) {
			return
		}

		if (item.type === "directory") {
			const tmpDir = new FileSystem.Directory(FileSystem.Paths.join(paths.temporaryDownloads(), randomUUID()))

			if (!disableLoader) {
				fullScreenLoadingModal.show()
			}

			try {
				if (!tmpDir.exists) {
					tmpDir.create()
				}

				const size = Object.entries(
					await nodeWorker.proxy("getDirectoryTree", {
						uuid: item.uuid,
						type: "normal"
					})
				).reduce((acc, [_, value]) => acc + value.size, 0)

				const freeDiskSpace = await FileSystemLegacy.getFreeDiskStorageAsync()

				if (freeDiskSpace <= size + 1024 * 1024) {
					return
				}

				if (!disableLoader) {
					fullScreenLoadingModal.hide()
				}

				await download.directory.foreground({
					uuid: item.uuid,
					destination: tmpDir.uri,
					size,
					name: item.name,
					id: randomUUID()
				})

				const files: {
					name: string
					path: string
					mime: string
				}[] = []

				const readDir = async (uri: string) => {
					const dir = new FileSystem.Directory(uri)

					if (!dir.exists) {
						return
					}

					const entries = dir.listAsRecords()

					await promiseAllChunked(
						entries.map(async entry => {
							if (entry.isDirectory) {
								await readDir(entry.uri)

								return
							}

							const file = new FileSystem.File(entry.uri)

							if (!file.exists) {
								return
							}

							files.push({
								name: file.name,
								path: entry.uri,
								mime: file.type ?? "application/octet-stream"
							})
						})
					)
				}

				await readDir(tmpDir.uri)

				if (files.length === 0) {
					return
				}

				await promiseAllChunked(
					files
						.sort((a, b) => a.path.split("/").length - b.path.split("/").length)
						.map(async file => {
							await ReactNativeBlobUtil.MediaCollection.copyToMediaStore(
								{
									name: file.name,
									parentFolder: FileSystem.Paths.join(
										"Filen",
										item.name,
										FileSystem.Paths.dirname(file.path.replace(tmpDir.uri.replace("file://", ""), ""))
									),
									mimeType: file.mime
								},
								"Download",
								file.path
							)
						})
				)
			} finally {
				if (tmpDir.exists) {
					tmpDir.delete()
				}

				if (!disableLoader) {
					fullScreenLoadingModal.hide()
				}
			}
		} else {
			const tmpFile = new FileSystem.File(FileSystem.Paths.join(paths.temporaryDownloads(), randomUUID()))

			if (!disableLoader) {
				fullScreenLoadingModal.show()
			}

			try {
				const freeDiskSpace = await FileSystemLegacy.getFreeDiskStorageAsync()

				if (freeDiskSpace <= item.size + 1024 * 1024) {
					return
				}

				await download.file.foreground({
					id: randomUUID(),
					uuid: item.uuid,
					bucket: item.bucket,
					region: item.region,
					chunks: item.chunks,
					version: item.version,
					key: item.key,
					destination: tmpFile.uri,
					size: item.size,
					name: item.name
				})

				await ReactNativeBlobUtil.MediaCollection.copyToMediaStore(
					{
						name: item.name,
						parentFolder: "Filen",
						mimeType: item.mime
					},
					"Download",
					tmpFile.uri
				)
			} finally {
				if (tmpFile.exists) {
					tmpFile.delete()
				}

				if (!disableLoader) {
					fullScreenLoadingModal.hide()
				}
			}
		}
	}

	public async toggleItemOffline({
		item,
		offline,
		disableLoader
	}: {
		item: DriveCloudItem
		offline?: boolean
		disableLoader?: boolean
	}): Promise<void> {
		if (item.type !== "file" || item.size <= 0) {
			return
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			const offlineStatus = await this.itemExistsOffline(item)
			const toggle = typeof offline === "boolean" ? offline : !offlineStatus.exists
			const offlineFileDestination = new FileSystem.File(FileSystem.Paths.join(paths.offlineFiles(), item.uuid))

			if (!toggle) {
				if (offlineFileDestination.exists) {
					offlineFileDestination.delete()
				}

				await sqlite.offlineFiles.remove(item)

				queryUtils.useFileOfflineStatusQuerySet({
					uuid: item.uuid,
					updater: () => ({
						exists: false
					})
				})

				// Update home screen queries aswell
				queryUtils.useCloudItemsQuerySet({
					of: "offline",
					parent: "offline",
					receiverId: 0,
					updater: prev => prev.filter(prevItem => prevItem.uuid !== item.uuid)
				})
			} else {
				if (offlineStatus.exists) {
					return
				}

				const freeDiskSpace = await FileSystemLegacy.getFreeDiskStorageAsync()

				if (freeDiskSpace <= item.size + 1024 * 1024) {
					throw new Error(t("errors.notEnoughDiskSpace"))
				}

				await download.file.foreground({
					id: randomUUID(),
					uuid: item.uuid,
					bucket: item.bucket,
					region: item.region,
					chunks: item.chunks,
					version: item.version,
					key: item.key,
					destination: offlineFileDestination.uri,
					size: item.size,
					name: item.name,
					dontEmitProgress: false
				})

				await sqlite.offlineFiles.add(item)

				queryUtils.useFileOfflineStatusQuerySet({
					uuid: item.uuid,
					updater: () => ({
						exists: true,
						path: offlineFileDestination.uri
					})
				})

				// Update home screen queries aswell
				queryUtils.useCloudItemsQuerySet({
					of: "offline",
					parent: "offline",
					receiverId: 0,
					updater: prev => [...prev.filter(prevItem => prevItem.uuid !== item.uuid), item]
				})
			}
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async saveItemToGallery({ item, disableLoader }: { item: DriveCloudItem; disableLoader?: boolean }): Promise<void> {
		if (item.type !== "file" || item.size <= 0) {
			return
		}

		const tmpFile = new FileSystem.File(FileSystem.Paths.join(paths.temporaryDownloads(), randomUUID(), item.name))

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			const freeDiskSpace = await FileSystemLegacy.getFreeDiskStorageAsync()

			if (freeDiskSpace <= item.size + 1024 * 1024) {
				throw new Error(t("errors.notEnoughDiskSpace"))
			}

			const permissions = await MediaLibrary.requestPermissionsAsync(false)

			if (!permissions.granted) {
				return
			}

			if (!tmpFile.parentDirectory.exists) {
				tmpFile.parentDirectory.create()
			}

			const offlineStatus = await this.itemExistsOffline(item)

			if (offlineStatus.exists) {
				const offlineFile = new FileSystem.File(offlineStatus.path)

				if (!offlineFile.exists) {
					throw new Error("Offline file does not exist.")
				}

				offlineFile.copy(tmpFile)
			} else {
				await download.file.foreground({
					id: randomUUID(),
					uuid: item.uuid,
					bucket: item.bucket,
					region: item.region,
					chunks: item.chunks,
					version: item.version,
					key: item.key,
					destination: tmpFile.uri,
					size: item.size,
					name: item.name
				})
			}

			await MediaLibrary.saveToLibraryAsync(normalizeFilePathForExpo(tmpFile.uri))
		} finally {
			if (tmpFile.parentDirectory.exists) {
				tmpFile.parentDirectory.delete()
			}

			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async removeItemSharedIn({
		item,
		queryParams,
		disableLoader
	}: {
		item: DriveCloudItem
		queryParams?: FetchCloudItemsParams
		disableLoader?: boolean
	}): Promise<void> {
		if (!item.isShared) {
			return
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await nodeWorker.proxy("removeSharedItem", {
				uuid: item.uuid
			})

			if (queryParams) {
				queryUtils.useCloudItemsQuerySet({
					...queryParams,
					updater: prev => prev.filter(prevItem => prevItem.uuid !== item.uuid)
				})
			}

			// Update home screen queries aswell
			queryUtils.useCloudItemsQuerySet({
				of: "sharedIn",
				parent: "sharedIn",
				receiverId: 0,
				updater: prev => prev.filter(prevItem => prevItem.uuid !== item.uuid)
			})
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async removeItemSharedOut({
		item,
		queryParams,
		disableLoader
	}: {
		item: DriveCloudItem
		queryParams?: FetchCloudItemsParams
		disableLoader?: boolean
	}): Promise<void> {
		if (!item.isShared) {
			return
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await nodeWorker.proxy("stopSharingItem", {
				uuid: item.uuid,
				receiverId: item.receiverId
			})

			if (queryParams) {
				queryUtils.useCloudItemsQuerySet({
					...queryParams,
					updater: prev => prev.filter(prevItem => prevItem.uuid !== item.uuid)
				})
			}

			// Update home screen queries aswell
			queryUtils.useCloudItemsQuerySet({
				of: "sharedOut",
				parent: "sharedOut",
				receiverId: 0,
				updater: prev => prev.filter(prevItem => prevItem.uuid !== item.uuid)
			})
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async deleteItemPermanently({
		item,
		queryParams,
		disableLoader
	}: {
		item: DriveCloudItem
		queryParams?: FetchCloudItemsParams
		disableLoader?: boolean
	}): Promise<void> {
		const alertPromptResponse = await alertPrompt({
			title: t("drive.prompts.deletePermanently.title"),
			message: t("drive.prompts.deletePermanently.message")
		})

		if (alertPromptResponse.cancelled) {
			return
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			if (item.type === "directory") {
				await nodeWorker.proxy("deleteDirectory", {
					uuid: item.uuid
				})
			} else {
				await nodeWorker.proxy("deleteFile", {
					uuid: item.uuid
				})
			}

			if (queryParams) {
				queryUtils.useCloudItemsQuerySet({
					...queryParams,
					updater: prev => prev.filter(prevItem => prevItem.uuid !== item.uuid)
				})
			}

			// Update home screen queries aswell
			for (const ofValue of FETCH_CLOUD_ITEMS_POSSIBLE_OF) {
				queryUtils.useCloudItemsQuerySet({
					of: ofValue as FetchCloudItemsParams["of"],
					parent: ofValue === "sharedIn" ? "shared-in" : ofValue === "sharedOut" ? "shared-out" : ofValue,
					receiverId: 0,
					updater: prev => prev.filter(prevItem => prevItem.uuid !== item.uuid)
				})
			}

			// Update selectedItems aswell
			useDriveStore.getState().setSelectedItems(prev => prev.filter(prevItem => prevItem.uuid !== item.uuid))
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async restoreItem({
		item,
		queryParams,
		disableLoader
	}: {
		item: DriveCloudItem
		queryParams?: FetchCloudItemsParams
		disableLoader?: boolean
	}): Promise<void> {
		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			if (item.type === "directory") {
				await nodeWorker.proxy("restoreDirectory", {
					uuid: item.uuid
				})
			} else {
				await nodeWorker.proxy("restoreFile", {
					uuid: item.uuid
				})
			}

			if (queryParams) {
				queryUtils.useCloudItemsQuerySet({
					...queryParams,
					updater: prev => prev.filter(prevItem => prevItem.uuid !== item.uuid)
				})
			}

			// Update home screen queries aswell
			queryUtils.useCloudItemsQuerySet({
				of: "trash",
				parent: "trash",
				receiverId: 0,
				updater: prev => prev.filter(prevItem => prevItem.uuid !== item.uuid)
			})

			// Update selectedItems aswell
			useDriveStore.getState().setSelectedItems(prev => prev.filter(prevItem => prevItem.uuid !== item.uuid))
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async disableItemPublicLink({
		item,
		queryParams,
		disableLoader
	}: {
		item: DriveCloudItem
		queryParams?: FetchCloudItemsParams
		disableLoader?: boolean
	}): Promise<void> {
		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			const status = await fetchItemPublicLinkStatus(item)

			if (!status.enabled) {
				return
			}

			await nodeWorker.proxy("toggleItemPublicLink", {
				item,
				enable: false,
				linkUUID: status.uuid
			})

			if (queryParams) {
				queryUtils.useCloudItemsQuerySet({
					...queryParams,
					updater: prev => prev.filter(prevItem => prevItem.uuid !== item.uuid)
				})
			}

			// Update home screen queries aswell
			queryUtils.useCloudItemsQuerySet({
				of: "links",
				parent: "links",
				receiverId: 0,
				updater: prev => prev.filter(prevItem => prevItem.uuid !== item.uuid)
			})

			// Update selectedItems aswell
			useDriveStore.getState().setSelectedItems(prev => prev.filter(prevItem => prevItem.uuid !== item.uuid))
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}
}

export const driveService = new DriveService()

export class DriveBulkService {
	public async shareItems({ items, disableLoader }: { items: DriveCloudItem[]; disableLoader?: boolean }): Promise<void> {
		if (items.length === 0) {
			return
		}

		const selectContactsResponse = await selectContacts({
			type: "all",
			max: 9999
		})

		if (selectContactsResponse.cancelled || selectContactsResponse.contacts.length === 0) {
			return
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				items.map(item =>
					driveService.shareItem({
						item,
						disableAlert: true,
						contacts: selectContactsResponse.contacts,
						disableLoader: true
					})
				)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async toggleItemsFavorite({
		items,
		favorite,
		queryParams,
		disableLoader
	}: {
		items: DriveCloudItem[]
		favorite: boolean
		queryParams?: FetchCloudItemsParams
		disableLoader?: boolean
	}): Promise<void> {
		if (items.length === 0) {
			return
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				items.map(item =>
					driveService.toggleItemFavorite({
						item,
						favorite,
						queryParams,
						disableLoader: true
					})
				)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async changeDirectoryColors({
		items,
		queryParams,
		disableLoader
	}: {
		items: DriveCloudItem[]
		queryParams?: FetchCloudItemsParams
		disableLoader?: boolean
	}): Promise<void> {
		if (items.length === 0) {
			return
		}

		const colorPickerResponse = await colorPicker({
			currentColor: DEFAULT_DIRECTORY_COLOR
		})

		if (colorPickerResponse.cancelled) {
			return
		}

		const pickedColor = colorPickerResponse.color.trim().toLowerCase()

		if (!pickedColor || pickedColor.length === 0) {
			return
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				items.map(item =>
					driveService.changeDirectoryColor({
						item,
						color: pickedColor,
						queryParams,
						disableLoader: true
					})
				)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async moveItems({
		items,
		queryParams,
		dismissHref,
		disableLoader
	}: {
		items: DriveCloudItem[]
		queryParams?: FetchCloudItemsParams
		dismissHref?: string
		disableLoader?: boolean
	}): Promise<void> {
		if (items.length === 0) {
			return
		}

		const selectDriveItemsResponse = await selectDriveItems({
			type: "directory",
			max: 1,
			dismissHref: dismissHref ?? "/drive",
			toMove: items.map(item => item.uuid)
		})

		if (selectDriveItemsResponse.cancelled || selectDriveItemsResponse.items.length !== 1) {
			return
		}

		const selectedParent = selectDriveItemsResponse.items.at(0)?.uuid

		if (!selectedParent) {
			return
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				items.map(item =>
					driveService.moveItem({
						item,
						parent: selectedParent,
						dismissHref,
						queryParams,
						disableLoader: true
					})
				)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async removeSharedOutItems({
		items,
		queryParams,
		disableLoader
	}: {
		items: DriveCloudItem[]
		queryParams?: FetchCloudItemsParams
		disableLoader?: boolean
	}): Promise<void> {
		if (items.length === 0) {
			return
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				items.map(item =>
					driveService.removeItemSharedOut({
						item,
						queryParams,
						disableLoader: true
					})
				)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async removeSharedInItems({
		items,
		queryParams,
		disableLoader
	}: {
		items: DriveCloudItem[]
		queryParams?: FetchCloudItemsParams
		disableLoader?: boolean
	}): Promise<void> {
		if (items.length === 0) {
			return
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				items.map(item =>
					driveService.removeItemSharedIn({
						item,
						queryParams,
						disableLoader: true
					})
				)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async disablePublicLinks({
		items,
		queryParams,
		disableLoader
	}: {
		items: DriveCloudItem[]
		queryParams?: FetchCloudItemsParams
		disableLoader?: boolean
	}): Promise<void> {
		if (items.length === 0) {
			return
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				items.map(item =>
					driveService.disableItemPublicLink({
						item,
						queryParams,
						disableLoader: true
					})
				)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async trashItems({
		items,
		queryParams,
		disableLoader
	}: {
		items: DriveCloudItem[]
		queryParams?: FetchCloudItemsParams
		disableLoader?: boolean
	}): Promise<void> {
		if (items.length === 0) {
			return
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				items.map(item =>
					driveService.trashItem({
						item,
						queryParams,
						disableLoader: true
					})
				)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async restoreItems({
		items,
		queryParams,
		disableLoader
	}: {
		items: DriveCloudItem[]
		queryParams?: FetchCloudItemsParams
		disableLoader?: boolean
	}): Promise<void> {
		if (items.length === 0) {
			return
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				items.map(item =>
					driveService.restoreItem({
						item,
						queryParams,
						disableLoader: true
					})
				)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async deleteItemsPermanently({
		items,
		queryParams,
		disableLoader
	}: {
		items: DriveCloudItem[]
		queryParams?: FetchCloudItemsParams
		disableLoader?: boolean
	}): Promise<void> {
		if (items.length === 0) {
			return
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				items.map(item =>
					driveService.deleteItemPermanently({
						item,
						queryParams,
						disableLoader: true
					})
				)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async toggleItemsOffline({
		items,
		offline,
		disableLoader
	}: {
		items: DriveCloudItem[]
		offline?: boolean
		disableLoader?: boolean
	}): Promise<void> {
		if (items.length === 0) {
			return
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				items
					.filter(item => item.size > 0)
					.map(item =>
						driveService.toggleItemOffline({
							item,
							offline,
							disableLoader: true
						})
					)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async saveItemsToGallery({ items, disableLoader }: { items: DriveCloudItem[]; disableLoader?: boolean }): Promise<void> {
		if (items.length === 0) {
			return
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				items
					.filter(item => item.size > 0)
					.map(item =>
						driveService.saveItemToGallery({
							item,
							disableLoader: true
						})
					)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async downloadItems({ items, disableLoader }: { items: DriveCloudItem[]; disableLoader?: boolean }): Promise<void> {
		if (items.length === 0) {
			return
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				items
					.filter(item => item.size > 0)
					.map(item =>
						driveService.downloadItem({
							item,
							disableLoader: true
						})
					)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async exportItems({ items, disableLoader }: { items: DriveCloudItem[]; disableLoader?: boolean }): Promise<void> {
		if (items.length === 0) {
			return
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				items
					.filter(item => item.size > 0)
					.map(item =>
						driveService.exportItem({
							item,
							disableLoader: true
						})
					)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}
}

export const driveBulkService = new DriveBulkService()

export default driveService
