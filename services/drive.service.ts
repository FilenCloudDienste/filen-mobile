import nodeWorker from "@/lib/nodeWorker"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import * as Clipboard from "expo-clipboard"
import alerts from "@/lib/alerts"
import { t } from "@/lib/i18n"
import * as FileSystem from "expo-file-system"
import { inputPrompt } from "@/components/prompts/inputPrompt"
import type { FileMetadata, FolderMetadata } from "@filen/sdk"
import { FETCH_DRIVE_ITEMS_POSSIBLE_OF } from "@/queries/useDriveItems.query"
import { useGalleryStore, type PreviewType } from "@/stores/gallery.store"
import { colorPicker } from "@/components/sheets/colorPickerSheet"
import { DEFAULT_DIRECTORY_COLOR } from "@/assets/fileIcons"
import { itemInfo } from "@/components/sheets/itemInfoSheet"
import contactsService from "./contacts.service"
import { promiseAllChunked, sanitizeFileName, normalizeFilePathForExpo, simpleDate } from "@/lib/utils"
import * as FileSystemLegacy from "expo-file-system/legacy"
import * as Sharing from "expo-sharing"
import paths from "@/lib/paths"
import { randomUUID } from "expo-crypto"
import sqlite from "@/lib/sqlite"
import { alertPrompt } from "@/components/prompts/alertPrompt"
import { Platform } from "react-native"
import ReactNativeBlobUtil from "react-native-blob-util"
import * as MediaLibrary from "expo-media-library"
import { fetchData as fetchItemPublicLinkStatus } from "@/queries/useItemPublicLinkStatus.query"
import type { Contact } from "@filen/sdk/dist/types/api/v3/contacts"
import { useDriveStore } from "@/stores/drive.store"
import download from "@/lib/download"
import events from "@/lib/events"
import * as DocumentPicker from "expo-document-picker"
import upload from "@/lib/upload"
import queryClient from "@/queries/client"
import * as ImagePicker from "expo-image-picker"
import { router } from "expo-router"
import type { TextEditorItem } from "@/components/textEditor/editor"
import cache from "@/lib/cache"
import pathModule from "path"
import { driveItemsQueryUpdate } from "@/queries/useDriveItems.query"
import { fileOfflineStatusQueryUpdate } from "@/queries/useFileOfflineStatus.query"
import { validate as validateUUID } from "uuid"

export type SelectDriveItemsResponse =
	| {
			cancelled: false
			items: DriveCloudItem[]
	  }
	| {
			cancelled: true
	  }

export type SelectDriveItemsParams = {
	type: "file" | "directory"
	max: number
	dismissHref?: string
	toMove?: string[]
	extensions?: string[]
	previewTypes?: PreviewType[]
	multiScreen?: boolean
}

export type SelectDriveItemsEvent =
	| {
			type: "request"
			data: {
				id: string
			} & SelectDriveItemsParams
	  }
	| {
			type: "response"
			data: {
				id: string
			} & SelectDriveItemsResponse
	  }

export class DriveService {
	public async selectDriveItems(params: SelectDriveItemsParams): Promise<SelectDriveItemsResponse> {
		return new Promise<SelectDriveItemsResponse>(resolve => {
			const id = randomUUID()

			const sub = events.subscribe("selectDriveItems", e => {
				if (e.type === "response" && e.data.id === id) {
					sub.remove()

					resolve(e.data)
				}
			})

			events.emit("selectDriveItems", {
				type: "request",
				data: {
					...params,
					id
				}
			})
		})
	}

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
		disableLoader,
		newName
	}: {
		item: DriveCloudItem
		queryParams?: FetchCloudItemsParams
		disableLoader?: boolean
		newName?: string
	}): Promise<void> {
		if (!newName) {
			const itemNameParsed = pathModule.posix.parse(item.name)
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

			const promptName = `${inputPromptResponse.text.trim()}${itemExt}`

			if (!promptName || promptName.length === 0) {
				return
			}

			newName = promptName
		}

		if (newName === item.name) {
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
				driveItemsQueryUpdate({
					params: queryParams,
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
			for (const ofValue of FETCH_DRIVE_ITEMS_POSSIBLE_OF) {
				driveItemsQueryUpdate({
					params: {
						parent: ofValue === "sharedIn" ? "shared-in" : ofValue === "sharedOut" ? "shared-out" : ofValue,
						of: ofValue as FetchCloudItemsParams["of"],
						receiverId: 0
					},
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

		if (color.toLowerCase() === item.color?.toLowerCase()) {
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
				driveItemsQueryUpdate({
					params: queryParams,
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
			for (const ofValue of FETCH_DRIVE_ITEMS_POSSIBLE_OF) {
				driveItemsQueryUpdate({
					params: {
						parent: ofValue === "sharedIn" ? "shared-in" : ofValue === "sharedOut" ? "shared-out" : ofValue,
						of: ofValue as FetchCloudItemsParams["of"],
						receiverId: 0
					},
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
				if (
					(queryParams.of === "favorites" && !newFavoriteStatus && !validateUUID(queryParams.parent)) ||
					(queryParams.of === "drive" && !newFavoriteStatus && queryParams.parent === "favorites")
				) {
					driveItemsQueryUpdate({
						params: queryParams,
						updater: prev => prev.filter(prevItem => prevItem.uuid !== item.uuid)
					})
				}

				driveItemsQueryUpdate({
					params: queryParams,
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
				driveItemsQueryUpdate({
					params: {
						parent: "favorites",
						of: "favorites",
						receiverId: 0
					},
					updater: prev => [...prev.filter(prevItem => prevItem.uuid !== item.uuid), item]
				})

				driveItemsQueryUpdate({
					params: {
						parent: "favorites",
						of: "drive",
						receiverId: 0
					},
					updater: prev => [...prev.filter(prevItem => prevItem.uuid !== item.uuid), item]
				})
			} else {
				driveItemsQueryUpdate({
					params: {
						parent: "favorites",
						of: "favorites",
						receiverId: 0
					},
					updater: prev => prev.filter(prevItem => prevItem.uuid !== item.uuid)
				})

				driveItemsQueryUpdate({
					params: {
						parent: "favorites",
						of: "drive",
						receiverId: 0
					},
					updater: prev => prev.filter(prevItem => prevItem.uuid !== item.uuid)
				})
			}

			// Update home screen queries aswell
			for (const ofValue of FETCH_DRIVE_ITEMS_POSSIBLE_OF) {
				driveItemsQueryUpdate({
					params: {
						parent: ofValue === "sharedIn" ? "shared-in" : ofValue === "sharedOut" ? "shared-out" : ofValue,
						of: ofValue as FetchCloudItemsParams["of"],
						receiverId: 0
					},
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
			const selectContactsResponse = await contactsService.selectContacts({
				type: "all",
				max: 9999
			})

			if (selectContactsResponse.cancelled || selectContactsResponse.contacts.length === 0) {
				return
			}

			contacts = selectContactsResponse.contacts
		}

		if (contacts.length === 0) {
			return
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

		const offlinePath = pathModule.posix.join(paths.offlineFiles(), `${item.uuid}${pathModule.posix.extname(item.name)}`)
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

		const tempLocation = new FileSystem.File(pathModule.posix.join(paths.exports(), sanitizeFileName(item.name)))

		try {
			if (tempLocation.exists) {
				tempLocation.delete()
			}

			const offlineStatus = await this.itemExistsOffline(item)

			if (offlineStatus.exists) {
				const offlineFile = new FileSystem.File(offlineStatus.path)

				if (!offlineFile.exists) {
					return
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
		disableLoader,
		disableAlertPrompt
	}: {
		item: DriveCloudItem
		queryParams?: FetchCloudItemsParams
		fromPreview?: boolean
		disableLoader?: boolean
		disableAlertPrompt?: boolean
	}): Promise<void> {
		if (!disableAlertPrompt) {
			const alertPromptResponse = await alertPrompt({
				title: t("drive.prompts.trashItem.title"),
				message: t("drive.prompts.trashItem.message")
			})

			if (alertPromptResponse.cancelled) {
				return
			}
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
				driveItemsQueryUpdate({
					params: queryParams,
					updater: prev => prev.filter(prevItem => prevItem.uuid !== item.uuid)
				})
			}

			// Update home screen queries aswell
			for (const ofValue of FETCH_DRIVE_ITEMS_POSSIBLE_OF) {
				driveItemsQueryUpdate({
					params: {
						parent: ofValue === "sharedIn" ? "shared-in" : ofValue === "sharedOut" ? "shared-out" : ofValue,
						of: ofValue as FetchCloudItemsParams["of"],
						receiverId: 0
					},
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
			const selectDriveItemsResponse = await this.selectDriveItems({
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
				driveItemsQueryUpdate({
					params: queryParams,
					updater: prev => prev.filter(prevItem => prevItem.uuid !== item.uuid)
				})
			}

			// Update home screen queries aswell
			for (const ofValue of FETCH_DRIVE_ITEMS_POSSIBLE_OF) {
				driveItemsQueryUpdate({
					params: {
						parent: ofValue === "sharedIn" ? "shared-in" : ofValue === "sharedOut" ? "shared-out" : ofValue,
						of: ofValue as FetchCloudItemsParams["of"],
						receiverId: 0
					},
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
			const tmpDir = new FileSystem.Directory(pathModule.posix.join(paths.temporaryDownloads(), randomUUID()))

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
									parentFolder: pathModule.posix.join(
										"Filen",
										item.name,
										pathModule.posix.dirname(file.path.replace(tmpDir.uri.replace("file://", ""), ""))
									),
									mimeType: file.mime
								},
								"Download",
								file.path
							)
						})
				)
			} catch (e) {
				if (e instanceof Error && e.message.toLowerCase().includes("aborted")) {
					return
				}

				throw e
			} finally {
				if (tmpDir.exists) {
					tmpDir.delete()
				}

				if (!disableLoader) {
					fullScreenLoadingModal.hide()
				}
			}
		} else {
			const tmpFile = new FileSystem.File(pathModule.posix.join(paths.temporaryDownloads(), randomUUID()))

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
			} catch (e) {
				if (e instanceof Error && e.message.toLowerCase().includes("aborted")) {
					return
				}

				throw e
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
			const offlineFileDestination = new FileSystem.File(
				pathModule.posix.join(paths.offlineFiles(), `${item.uuid}${pathModule.posix.extname(item.name)}`)
			)

			if (!toggle) {
				if (offlineFileDestination.exists) {
					offlineFileDestination.delete()
				}

				await sqlite.offlineFiles.remove(item)

				fileOfflineStatusQueryUpdate({
					params: {
						uuid: item.uuid
					},
					updater: () => ({
						exists: false
					})
				})

				// Update home screen queries aswell
				driveItemsQueryUpdate({
					params: {
						parent: "offline",
						of: "offline",
						receiverId: 0
					},
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

				fileOfflineStatusQueryUpdate({
					params: {
						uuid: item.uuid
					},
					updater: () => ({
						exists: true,
						path: offlineFileDestination.uri
					})
				})

				// Update home screen queries aswell
				driveItemsQueryUpdate({
					params: {
						parent: "offline",
						of: "offline",
						receiverId: 0
					},
					updater: prev => [...prev.filter(prevItem => prevItem.uuid !== item.uuid), item]
				})
			}
		} catch (e) {
			if (e instanceof Error && e.message.toLowerCase().includes("aborted")) {
				return
			}

			throw e
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

		const tmpFile = new FileSystem.File(pathModule.posix.join(paths.temporaryDownloads(), randomUUID(), item.name))

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			const freeDiskSpace = await FileSystemLegacy.getFreeDiskStorageAsync()

			if (freeDiskSpace <= item.size + 1024 * 1024) {
				throw new Error(t("errors.notEnoughDiskSpace"))
			}

			const permissions = await ImagePicker.getMediaLibraryPermissionsAsync(false)

			if (!permissions.granted) {
				if (!permissions.canAskAgain) {
					return
				}

				const ask = await ImagePicker.requestMediaLibraryPermissionsAsync(false)

				if (!ask.granted) {
					return
				}
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
		} catch (e) {
			if (e instanceof Error && e.message.toLowerCase().includes("aborted")) {
				return
			}

			throw e
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
		disableLoader,
		disableAlertPrompt
	}: {
		item: DriveCloudItem
		queryParams?: FetchCloudItemsParams
		disableLoader?: boolean
		disableAlertPrompt?: boolean
	}): Promise<void> {
		if (!item.isShared) {
			return
		}

		if (!disableAlertPrompt) {
			const alertPromptResponse = await alertPrompt({
				title: t("drive.prompts.removeSharedInItem.title"),
				message: t("drive.prompts.removeSharedInItem.message")
			})

			if (alertPromptResponse.cancelled) {
				return
			}
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await nodeWorker.proxy("removeSharedItem", {
				uuid: item.uuid
			})

			if (queryParams) {
				driveItemsQueryUpdate({
					params: queryParams,
					updater: prev => prev.filter(prevItem => prevItem.uuid !== item.uuid)
				})
			}

			// Update home screen queries aswell
			driveItemsQueryUpdate({
				params: {
					parent: "sharedIn",
					of: "sharedIn",
					receiverId: 0
				},
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
		disableLoader,
		disableAlertPrompt
	}: {
		item: DriveCloudItem
		queryParams?: FetchCloudItemsParams
		disableLoader?: boolean
		disableAlertPrompt?: boolean
	}): Promise<void> {
		if (!item.isShared) {
			return
		}

		if (!disableAlertPrompt) {
			const alertPromptResponse = await alertPrompt({
				title: t("drive.prompts.removeSharedOutItem.title"),
				message: t("drive.prompts.removeSharedOutItem.message")
			})

			if (alertPromptResponse.cancelled) {
				return
			}
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
				driveItemsQueryUpdate({
					params: queryParams,
					updater: prev => prev.filter(prevItem => prevItem.uuid !== item.uuid)
				})
			}

			// Update home screen queries aswell
			driveItemsQueryUpdate({
				params: {
					parent: "sharedOut",
					of: "sharedOut",
					receiverId: 0
				},
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
		disableLoader,
		disableAlertPrompt
	}: {
		item: DriveCloudItem
		queryParams?: FetchCloudItemsParams
		disableLoader?: boolean
		disableAlertPrompt?: boolean
	}): Promise<void> {
		if (!disableAlertPrompt) {
			const alertPromptResponse = await alertPrompt({
				title: t("drive.prompts.deletePermanently.title"),
				message: t("drive.prompts.deletePermanently.message")
			})

			if (alertPromptResponse.cancelled) {
				return
			}
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
				driveItemsQueryUpdate({
					params: queryParams,
					updater: prev => prev.filter(prevItem => prevItem.uuid !== item.uuid)
				})
			}

			// Update home screen queries aswell
			for (const ofValue of FETCH_DRIVE_ITEMS_POSSIBLE_OF) {
				driveItemsQueryUpdate({
					params: {
						parent: ofValue === "sharedIn" ? "shared-in" : ofValue === "sharedOut" ? "shared-out" : ofValue,
						of: ofValue as FetchCloudItemsParams["of"],
						receiverId: 0
					},
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
				driveItemsQueryUpdate({
					params: queryParams,
					updater: prev => prev.filter(prevItem => prevItem.uuid !== item.uuid)
				})
			}

			// Update home screen queries aswell
			driveItemsQueryUpdate({
				params: {
					parent: "trash",
					of: "trash",
					receiverId: 0
				},
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
			const status = await fetchItemPublicLinkStatus({
				item
			})

			if (!status.enabled) {
				return
			}

			await nodeWorker.proxy("toggleItemPublicLink", {
				item,
				enable: false,
				linkUUID: status.uuid
			})

			if (queryParams) {
				driveItemsQueryUpdate({
					params: queryParams,
					updater: prev => prev.filter(prevItem => prevItem.uuid !== item.uuid)
				})
			}

			// Update home screen queries aswell
			driveItemsQueryUpdate({
				params: {
					parent: "links",
					of: "links",
					receiverId: 0
				},
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

	public async uploadFiles({
		parent,
		queryParams,
		documentPickerAssets,
		disableAlert,
		disableLoader
	}: {
		parent: string
		queryParams?: FetchCloudItemsParams
		documentPickerAssets?: DocumentPicker.DocumentPickerAsset[]
		disableAlert?: boolean
		disableLoader?: boolean
	}): Promise<DriveCloudItem[]> {
		if (!documentPickerAssets) {
			const documentPickerResult = await DocumentPicker.getDocumentAsync({
				copyToCacheDirectory: true,
				multiple: true
			})

			if (documentPickerResult.canceled) {
				return []
			}

			documentPickerAssets = documentPickerResult.assets
		}

		if (documentPickerAssets.length === 0) {
			return []
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			const uploadedItems = (
				await promiseAllChunked(
					documentPickerAssets.map(async asset => {
						try {
							return await upload.file.foreground({
								parent,
								localPath: asset.uri,
								name: asset.name,
								id: randomUUID(),
								size: asset.size ?? 0,
								isShared: false,
								deleteAfterUpload: true
							})
						} catch (e) {
							if (e instanceof Error && e.message.toLowerCase().includes("aborted")) {
								return null
							}

							throw e
						}
					})
				)
			).filter(item => item !== null)

			if (!disableAlert && uploadedItems.length > 0) {
				alerts.normal(
					t("drive.header.rightView.actionSheet.itemsUploaded", {
						count: uploadedItems.length
					})
				)
			}

			if (queryParams && uploadedItems.length > 0) {
				driveItemsQueryUpdate({
					params: queryParams,
					updater: prev => [
						...prev.filter(item => !uploadedItems.some(uploadedItem => uploadedItem.uuid === item.uuid)),
						...uploadedItems
					]
				})
			}

			return uploadedItems
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async createDirectory({
		queryParams,
		parent,
		name,
		disableLoader,
		disableAlert
	}: {
		queryParams?: FetchCloudItemsParams
		parent: string
		name?: string
		disableLoader?: boolean
		disableAlert?: boolean
	}): Promise<string | null> {
		if (!name) {
			const inputPromptResponse = await inputPrompt({
				title: t("drive.header.rightView.actionSheet.create.directory"),
				materialIcon: {
					name: "folder-plus-outline"
				},
				prompt: {
					type: "plain-text",
					keyboardType: "default",
					defaultValue: "",
					placeholder: t("drive.header.rightView.actionSheet.directoryNamePlaceholder")
				}
			})

			if (inputPromptResponse.cancelled || inputPromptResponse.type !== "text") {
				return null
			}

			name = inputPromptResponse.text.trim()
		}

		if (name.length === 0) {
			return null
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			const directoryUUID = await nodeWorker.proxy("createDirectory", {
				parent,
				name
			})

			if (!disableAlert) {
				alerts.normal(
					t("drive.header.rightView.actionSheet.create.created", {
						name
					})
				)
			}

			if (queryParams) {
				driveItemsQueryUpdate({
					params: queryParams,
					updater: prev => [
						...prev.filter(item => item.uuid !== directoryUUID),
						...[
							{
								uuid: directoryUUID,
								name,
								type: "directory",
								parent,
								lastModified: Date.now(),
								isShared: false,
								color: null,
								selected: false,
								size: 0,
								favorited: false,
								timestamp: Date.now()
							} satisfies DriveCloudItem
						]
					]
				})
			}

			cache.directoryUUIDToName.set(directoryUUID, name)

			return directoryUUID
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async uploadMedia({
		queryParams,
		parent,
		disableLoader,
		disableAlert,
		imagePickerAssets
	}: {
		queryParams?: FetchCloudItemsParams
		parent: string
		disableLoader?: boolean
		disableAlert?: boolean
		imagePickerAssets?: ImagePicker.ImagePickerAsset[]
	}): Promise<DriveCloudItem[]> {
		if (!imagePickerAssets) {
			const permissions = await ImagePicker.getMediaLibraryPermissionsAsync(false)

			if (!permissions.granted) {
				if (!permissions.canAskAgain) {
					return []
				}

				const ask = await ImagePicker.requestMediaLibraryPermissionsAsync(false)

				if (!ask.granted) {
					return []
				}
			}

			const imagePickerResult = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ["images", "livePhotos", "videos"],
				allowsEditing: false,
				allowsMultipleSelection: true,
				selectionLimit: 0,
				base64: false,
				exif: true
			})

			if (imagePickerResult.canceled) {
				return []
			}

			imagePickerAssets = imagePickerResult.assets
		}

		if (imagePickerAssets.length === 0) {
			return []
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			const uploadedItems = (
				await promiseAllChunked(
					imagePickerAssets.map(async asset => {
						if (!asset.fileName) {
							return null
						}

						const assetFile = new FileSystem.File(asset.uri)

						if (!assetFile.exists) {
							throw new Error(`Could not find file at "${asset.uri}".`)
						}

						const tmpFile = new FileSystem.File(
							pathModule.posix.join(paths.temporaryUploads(), `${randomUUID()}${pathModule.posix.extname(asset.fileName)}`)
						)

						try {
							if (tmpFile.exists) {
								tmpFile.delete()
							}

							assetFile.copy(tmpFile)

							if (!tmpFile.size) {
								throw new Error(`Could not get size of file at "${tmpFile.uri}".`)
							}

							return await upload.file.foreground({
								parent,
								localPath: tmpFile.uri,
								name: asset.fileName,
								id: randomUUID(),
								size: tmpFile.size,
								isShared: false,
								deleteAfterUpload: true
							})
						} catch (e) {
							if (e instanceof Error && e.message.toLowerCase().includes("aborted")) {
								return null
							}

							throw e
						} finally {
							if (tmpFile.exists) {
								tmpFile.delete()
							}
						}
					})
				)
			).filter(item => item !== null)

			if (!disableAlert && uploadedItems.length > 0) {
				alerts.normal(
					t("drive.header.rightView.actionSheet.itemsUploaded", {
						count: uploadedItems.length
					})
				)
			}

			if (queryParams && uploadedItems.length > 0) {
				driveItemsQueryUpdate({
					params: queryParams,
					updater: prev => [
						...prev.filter(item => !uploadedItems.some(uploadedItem => uploadedItem.uuid === item.uuid)),
						...uploadedItems
					]
				})
			}

			return uploadedItems
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async createPhotos({
		queryParams,
		parent,
		disableLoader,
		disableAlert,
		imagePickerAssets
	}: {
		queryParams?: FetchCloudItemsParams
		parent: string
		disableLoader?: boolean
		disableAlert?: boolean
		imagePickerAssets?: ImagePicker.ImagePickerAsset[]
	}): Promise<DriveCloudItem[]> {
		if (!imagePickerAssets) {
			const permissions = await ImagePicker.getCameraPermissionsAsync()

			if (!permissions.granted) {
				if (!permissions.canAskAgain) {
					return []
				}

				const ask = await ImagePicker.requestCameraPermissionsAsync()

				if (!ask.granted) {
					return []
				}
			}

			const imagePickerResult = await ImagePicker.launchCameraAsync({
				mediaTypes: ["images", "livePhotos", "videos"],
				base64: false,
				exif: true
			})

			if (imagePickerResult.canceled) {
				return []
			}

			imagePickerAssets = imagePickerResult.assets
		}

		if (imagePickerAssets.length === 0) {
			return []
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			const uploadedItems = (
				await promiseAllChunked(
					imagePickerAssets.map(async asset => {
						if (!asset.fileName) {
							asset.fileName = sanitizeFileName(`Photo-${simpleDate(Date.now())}.jpg`)
						}

						const assetFile = new FileSystem.File(asset.uri)

						if (!assetFile.exists) {
							return null
						}

						const tmpFile = new FileSystem.File(
							pathModule.posix.join(paths.temporaryUploads(), `${randomUUID()}${pathModule.posix.extname(asset.fileName)}`)
						)

						try {
							if (tmpFile.exists) {
								tmpFile.delete()
							}

							assetFile.copy(tmpFile)

							if (!tmpFile.exists || !tmpFile.size) {
								return null
							}

							return await upload.file.foreground({
								parent,
								localPath: tmpFile.uri,
								name: asset.fileName,
								id: randomUUID(),
								size: tmpFile.size,
								isShared: false,
								deleteAfterUpload: true
							})
						} catch (e) {
							if (e instanceof Error && e.message.toLowerCase().includes("aborted")) {
								return null
							}

							throw e
						} finally {
							if (tmpFile.exists) {
								tmpFile.delete()
							}
						}
					})
				)
			).filter(item => item !== null)

			if (!disableAlert && uploadedItems.length > 0) {
				alerts.normal(
					t("drive.header.rightView.actionSheet.itemsUploaded", {
						count: uploadedItems.length
					})
				)
			}

			if (queryParams && uploadedItems.length > 0) {
				driveItemsQueryUpdate({
					params: queryParams,
					updater: prev => [
						...prev.filter(item => !uploadedItems.some(uploadedItem => uploadedItem.uuid === item.uuid)),
						...uploadedItems
					]
				})
			}

			return uploadedItems
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async createTextFile({
		queryParams,
		parent,
		name,
		disableLoader,
		disableNavigation
	}: {
		queryParams?: FetchCloudItemsParams
		parent: string
		name?: string
		disableLoader?: boolean
		disableNavigation?: boolean
	}): Promise<DriveCloudItem | null> {
		if (!name) {
			const inputPromptResponse = await inputPrompt({
				title: t("drive.header.rightView.actionSheet.create.textFile"),
				materialIcon: {
					name: "file-plus-outline"
				},
				prompt: {
					type: "plain-text",
					keyboardType: "default",
					defaultValue: "",
					placeholder: t("drive.header.rightView.actionSheet.textFileNamePlaceholder")
				}
			})

			if (inputPromptResponse.cancelled || inputPromptResponse.type !== "text") {
				return null
			}

			name = inputPromptResponse.text.trim()
		}

		if (name.length === 0) {
			return null
		}

		fullScreenLoadingModal.show()

		const fileNameParsed = pathModule.posix.parse(name)
		const fileNameWithExtension = sanitizeFileName(
			fileNameParsed.ext && fileNameParsed.ext.length > 0 && fileNameParsed.ext.includes(".") ? name : `${fileNameParsed.name}.txt`
		)
		const tmpFile = new FileSystem.File(
			pathModule.posix.join(paths.temporaryUploads(), `${randomUUID()}${pathModule.posix.extname(fileNameWithExtension)}`)
		)

		try {
			if (tmpFile.exists) {
				tmpFile.delete()
			}

			tmpFile.create()

			const uploadedItem = await upload.file.foreground({
				parent,
				localPath: tmpFile.uri,
				name: fileNameWithExtension,
				id: randomUUID(),
				size: 0,
				isShared: false,
				deleteAfterUpload: true
			})

			if (queryParams) {
				driveItemsQueryUpdate({
					params: queryParams,
					updater: prev => [...prev.filter(item => item.uuid !== uploadedItem.uuid), uploadedItem]
				})
			}

			if (!disableNavigation) {
				router.push({
					pathname: "/textEditor",
					params: {
						item: JSON.stringify({
							type: "cloud",
							driveItem: uploadedItem
						} satisfies TextEditorItem)
					}
				})
			}

			return uploadedItem
		} catch (e) {
			if (e instanceof Error && e.message.toLowerCase().includes("aborted")) {
				return null
			}

			throw e
		} finally {
			if (tmpFile.exists) {
				tmpFile.delete()
			}

			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async uploadDirectory({
		parent,
		queryParams,
		disableQueryRefetch,
		disableAlert,
		disableLoader,
		selectedSafDirectoryUri
	}: {
		parent: string
		queryParams?: FetchCloudItemsParams
		disableQueryRefetch?: boolean
		disableAlert?: boolean
		disableLoader?: boolean
		selectedSafDirectoryUri?: string
	}): Promise<void> {
		if (Platform.OS !== "android") {
			throw new Error("Feature only supported on Android.")
		}

		if (!selectedSafDirectoryUri) {
			const selectedDirectory = await FileSystemLegacy.StorageAccessFramework.requestDirectoryPermissionsAsync()

			if (!selectedDirectory.granted) {
				return
			}

			selectedSafDirectoryUri = selectedDirectory.directoryUri
		}

		const tmpDir = new FileSystem.Directory(pathModule.posix.join(paths.temporaryUploads(), randomUUID()))

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			if (tmpDir.exists) {
				tmpDir.delete()
			}

			tmpDir.create()

			const directoryName = pathModule.posix.parse(decodeURIComponent(selectedSafDirectoryUri)).name

			await FileSystemLegacy.StorageAccessFramework.copyAsync({
				from: selectedSafDirectoryUri,
				to: tmpDir.uri
			})

			const { totalFiles, totalDirectories, totalSize } = tmpDir.list().reduce(
				(acc, item) => {
					if (item instanceof FileSystem.File) {
						acc.totalFiles += 1
						acc.totalSize += item.size ?? 0
					} else if (item instanceof FileSystem.Directory) {
						acc.totalDirectories += 1
					}

					return acc
				},
				{
					totalFiles: 0,
					totalDirectories: 0,
					totalSize: 0
				}
			)

			if (totalFiles === 0 && totalDirectories === 0) {
				throw new Error("Selected directory is empty.")
			}

			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}

			await upload.directory.foreground({
				parent,
				localPath: tmpDir.uri,
				name: directoryName,
				id: randomUUID(),
				size: totalSize,
				isShared: false,
				deleteAfterUpload: true
			})

			if (!disableAlert) {
				alerts.normal(
					t("drive.header.rightView.actionSheet.upload.uploaded", {
						name: directoryName
					})
				)
			}

			if (!disableQueryRefetch && queryParams) {
				await queryClient.invalidateQueries({
					queryKey: ["useCloudItemsQuery", queryParams.parent, queryParams.of, queryParams.receiverId]
				})
			}
		} catch (e) {
			if (e instanceof Error && e.message.toLowerCase().includes("aborted")) {
				return
			}

			throw e
		} finally {
			if (tmpDir.exists) {
				tmpDir.delete()
			}

			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}
}

export const driveService = new DriveService()

export default driveService
