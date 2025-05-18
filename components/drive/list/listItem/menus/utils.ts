import { type ContextItem, type ContextSubMenu } from "@/components/nativewindui/ContextMenu/types"
import { type DropdownItem, type DropdownSubMenu } from "@/components/nativewindui/DropdownMenu/types"
import { createContextItem, createContextSubMenu } from "@/components/nativewindui/ContextMenu/utils"
import * as Clipboard from "expo-clipboard"
import { type Href } from "expo-router"
import { type NavigationOptions } from "expo-router/build/global-state/routing"
import itemActions from "../actions"
import queryUtils from "@/queries/utils"
import { inputPrompt } from "@/components/prompts/inputPrompt"
import { colorPicker } from "@/components/sheets/colorPickerSheet"
import { DEFAULT_DIRECTORY_COLOR } from "@/assets/fileIcons"
import { itemInfo } from "@/components/sheets/itemInfoSheet"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import { useDriveStore } from "@/stores/drive.store"
import alerts from "@/lib/alerts"
import { selectContacts } from "@/app/selectContacts"
import * as Sharing from "expo-sharing"
import { selectDriveItems } from "@/app/selectDriveItems/[parent]"
import { t } from "@/lib/i18n"
import { promiseAllChunked, normalizeFilePathForExpo, getPreviewType } from "@/lib/utils"
import ReactNativeBlobUtil from "react-native-blob-util"
import * as FileSystem from "expo-file-system/next"
import paths from "@/lib/paths"
import { Platform } from "react-native"
import { randomUUID } from "expo-crypto"
import nodeWorker from "@/lib/nodeWorker"
import sqlite from "@/lib/sqlite"
import * as MediaLibrary from "expo-media-library"
import { alertPrompt } from "@/components/prompts/alertPrompt"
import * as FileSystemLegacy from "expo-file-system"
import { validate as validateUUID } from "uuid"

export function createDropdownOrContextMenuItems({
	item,
	isAvailableOffline,
	of,
	parent,
	isProUser
}: {
	item: DriveCloudItem
	isAvailableOffline: boolean
	of: FetchCloudItemsParams["of"]
	parent: string
	isProUser: boolean
}): (ContextItem | ContextSubMenu | DropdownItem | DropdownSubMenu)[] {
	const items: (ContextItem | ContextSubMenu)[] = []
	const isValidParentUUID = validateUUID(parent)

	if (isValidParentUUID || of === "drive") {
		items.push(
			createContextItem({
				actionKey: "select",
				title: t("drive.list.item.menu.select")
			})
		)
	}

	if (item.type === "directory" && of !== "trash") {
		items.push(
			createContextItem({
				actionKey: "openDirectory",
				title: t("drive.list.item.menu.open")
			})
		)
	}

	if (item.type === "directory" ? Platform.OS === "android" : item.size > 0) {
		items.push(
			createContextSubMenu(
				{
					title: t("drive.list.item.menu.download"),
					iOSItemSize: "large"
				},
				[
					...(Platform.OS === "android" && of !== "offline"
						? [
								createContextItem({
									actionKey: "download",
									title: t("drive.list.item.menu.download")
								})
						  ]
						: []),
					...(item.type === "file"
						? [
								createContextItem({
									actionKey: "export",
									title: t("drive.list.item.menu.export")
								})
						  ]
						: []),
					...(["image", "video"].includes(getPreviewType(item.name)) && of !== "offline"
						? [
								createContextItem({
									actionKey: "saveToGallery",
									title: t("drive.list.item.menu.saveToGallery")
								})
						  ]
						: []),
					...(item.type === "file" && of !== "offline"
						? [
								isAvailableOffline
									? createContextItem({
											actionKey: "removeOffline",
											title: t("drive.list.item.menu.removeOffline")
									  })
									: createContextItem({
											actionKey: "makeAvailableOffline",
											title: t("drive.list.item.menu.makeAvailableOffline")
									  })
						  ]
						: [])
				]
			)
		)
	}

	if (of !== "sharedIn" && of !== "offline") {
		if (isProUser) {
			items.push(
				createContextSubMenu(
					{
						title: t("drive.list.item.menu.share"),
						iOSItemSize: "large"
					},
					[
						createContextItem({
							actionKey: "publicLink",
							title: t("drive.list.item.menu.publicLink")
						}),
						createContextItem({
							actionKey: "share",
							title: t("drive.list.item.menu.share")
						})
					]
				)
			)
		} else {
			items.push(
				createContextItem({
					actionKey: "share",
					title: t("drive.list.item.menu.share")
				})
			)
		}
	}

	if (of !== "sharedIn" && of !== "offline") {
		if (item.favorited) {
			items.push(
				createContextItem({
					actionKey: "unfavorite",
					title: t("drive.list.item.menu.unfavorite")
				})
			)
		} else {
			items.push(
				createContextItem({
					actionKey: "favorite",
					title: t("drive.list.item.menu.favorite")
				})
			)
		}
	}

	if (of !== "offline") {
		if (item.type === "directory") {
			items.push(
				createContextItem({
					actionKey: "info",
					title: t("drive.list.item.menu.info")
				})
			)
		} else {
			if (of === "sharedIn") {
				items.push(
					createContextItem({
						actionKey: "info",
						title: t("drive.list.item.menu.info")
					})
				)
			} else {
				items.push(
					createContextSubMenu(
						{
							title: t("drive.list.item.menu.info"),
							iOSItemSize: "large"
						},
						[
							createContextItem({
								actionKey: "info",
								title: t("drive.list.item.menu.properties")
							}),
							createContextItem({
								actionKey: "versionHistory",
								title: t("drive.list.item.menu.versionHistory")
							})
						]
					)
				)
			}
		}
	}

	if (item.type === "directory" && of !== "sharedIn" && of !== "offline") {
		items.push(
			createContextItem({
				actionKey: "color",
				title: t("drive.list.item.menu.color")
			})
		)
	}

	if (of !== "sharedIn" && of !== "offline") {
		items.push(
			createContextItem({
				actionKey: "rename",
				title: t("drive.list.item.menu.rename")
			})
		)
	}

	if (of !== "sharedIn" && of !== "offline") {
		items.push(
			createContextItem({
				actionKey: "move",
				title: t("drive.list.item.menu.move")
			})
		)
	}

	items.push(
		createContextSubMenu(
			{
				title: t("drive.list.item.menu.clipboard"),
				iOSItemSize: "large"
			},
			[
				...(of !== "offline"
					? [
							createContextItem({
								actionKey: "copyPath",
								title: t("drive.list.item.menu.location")
							})
					  ]
					: []),
				createContextItem({
					actionKey: "copyId",
					title: t("drive.list.item.menu.id")
				})
			]
		)
	)

	if (of === "sharedOut") {
		items.push(
			createContextItem({
				actionKey: "removeSharedOut",
				title: t("drive.list.item.menu.removeSharedOut"),
				destructive: true
			})
		)
	}

	if (of !== "offline" && of !== "trash") {
		if (of !== "sharedIn") {
			items.push(
				createContextItem({
					actionKey: "trash",
					title: t("drive.list.item.menu.trash"),
					destructive: true
				})
			)
		} else {
			items.push(
				createContextItem({
					actionKey: "removeSharedIn",
					title: t("drive.list.item.menu.removeSharedIn"),
					destructive: true
				})
			)
		}
	}

	if (of === "trash") {
		items.push(
			createContextItem({
				actionKey: "restore",
				title: t("drive.list.item.menu.restore")
			})
		)

		items.push(
			createContextItem({
				actionKey: "deletePermanently",
				title: t("drive.list.item.menu.deletePermanently"),
				destructive: true
			})
		)
	}

	if (of === "offline" && isAvailableOffline) {
		items.push(
			createContextItem({
				actionKey: "removeOffline",
				title: t("drive.list.item.menu.removeOffline"),
				destructive: true
			})
		)
	}

	return items
}

export async function onDropdownOrContextMenuItemPress({
	item,
	contextItem,
	routerPush,
	queryParams
}: {
	item: DriveCloudItem
	contextItem: Omit<ContextItem | DropdownItem, "icon">
	routerPush: (href: Href, options?: NavigationOptions) => void
	queryParams: FetchCloudItemsParams
}) {
	const isSelected = useDriveStore.getState().selectedItems.some(i => i.uuid === item.uuid)

	if (contextItem.actionKey === "select") {
		useDriveStore
			.getState()
			.setSelectedItems(prev =>
				isSelected ? prev.filter(i => i.uuid !== item.uuid) : [...prev.filter(i => i.uuid !== item.uuid), item]
			)
	} else if (contextItem.actionKey === "openDirectory") {
		if (item.type === "directory") {
			routerPush({
				pathname: "/drive/[uuid]",
				params: {
					uuid: item.uuid
				}
			})
		}
	} else if (contextItem.actionKey === "copyId") {
		await Clipboard.setStringAsync(item.uuid)

		alerts.normal("Copied")
	} else if (contextItem.actionKey === "copyPath") {
		fullScreenLoadingModal.show()

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

			alerts.normal("Copied")
		} finally {
			fullScreenLoadingModal.hide()
		}
	} else if (contextItem.actionKey === "rename") {
		const itemNameParsed = FileSystem.Paths.parse(item.name)
		const itemName = item.type === "file" && item.name.includes(".") ? itemNameParsed?.name ?? item.name : item.name
		const itemExt = item.type === "file" && item.name.includes(".") ? itemNameParsed?.ext ?? "" : ""

		const inputPromptResponse = await inputPrompt({
			title: "rename",
			materialIcon: {
				name: "pencil"
			},
			prompt: {
				type: "plain-text",
				keyboardType: "default",
				defaultValue: itemName
			}
		})

		if (inputPromptResponse.cancelled || inputPromptResponse.type !== "text") {
			return
		}

		const newName = `${inputPromptResponse.text.trim()}${itemExt}`

		if (!newName || newName.length === 0) {
			return
		}

		fullScreenLoadingModal.show()

		try {
			await itemActions.rename({
				item,
				name: newName
			})
		} finally {
			fullScreenLoadingModal.hide()
		}

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
	} else if (contextItem.actionKey === "color") {
		if (item.type !== "directory") {
			return
		}

		const colorPickerResponse = await colorPicker({
			currentColor: item.color ?? DEFAULT_DIRECTORY_COLOR
		})

		if (colorPickerResponse.cancelled) {
			return
		}

		const newColor = colorPickerResponse.color.trim().toLowerCase()

		if (!newColor || newColor.length === 0 || newColor === item.color?.toLowerCase()) {
			return
		}

		fullScreenLoadingModal.show()

		try {
			await itemActions.changeDirectoryColor({
				item,
				color: newColor
			})
		} finally {
			fullScreenLoadingModal.hide()
		}

		queryUtils.useCloudItemsQuerySet({
			...queryParams,
			updater: prev =>
				prev.map(prevItem =>
					prevItem.uuid === item.uuid
						? {
								...prevItem,
								color: newColor
						  }
						: prevItem
				)
		})
	} else if (contextItem.actionKey === "info") {
		itemInfo(item)
	} else if (contextItem.actionKey === "favorite" || contextItem.actionKey === "unfavorite") {
		fullScreenLoadingModal.show()

		try {
			await itemActions.favorite({
				item,
				favorite: contextItem.actionKey === "favorite"
			})
		} finally {
			fullScreenLoadingModal.hide()
		}

		if (queryParams.of === "favorites" && contextItem.actionKey === "unfavorite") {
			queryUtils.useCloudItemsQuerySet({
				...queryParams,
				updater: prev => prev.filter(prevItem => prevItem.uuid !== item.uuid)
			})
		} else {
			queryUtils.useCloudItemsQuerySet({
				...queryParams,
				updater: prev =>
					prev.map(prevItem =>
						prevItem.uuid === item.uuid
							? {
									...prevItem,
									favorited: contextItem.actionKey === "favorite"
							  }
							: prevItem
					)
			})
		}
	} else if (contextItem.actionKey === "share") {
		const selectContactsResponse = await selectContacts({
			type: "all",
			multiple: true,
			max: 1000
		})

		if (selectContactsResponse.cancelled) {
			return
		}

		fullScreenLoadingModal.show()

		try {
			await promiseAllChunked(
				selectContactsResponse.contacts.map(contact =>
					itemActions.shareItems({
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
		} finally {
			fullScreenLoadingModal.hide()
		}

		alerts.normal("shared")
	} else if (contextItem.actionKey === "export") {
		if (item.type !== "file" || !(await Sharing.isAvailableAsync())) {
			return
		}

		const freeDiskSpace = await FileSystemLegacy.getFreeDiskStorageAsync()

		if (freeDiskSpace <= item.size + 1024 * 1024) {
			throw new Error("Not enough local disk space available.")
		}

		fullScreenLoadingModal.show()

		let uri: string | null = null

		try {
			uri = await itemActions.downloadToTemporaryLocation(item)
		} finally {
			fullScreenLoadingModal.hide()
		}

		if (!uri) {
			return
		}

		await new Promise<void>(resolve => setTimeout(resolve, 250))

		await Sharing.shareAsync(uri, {
			mimeType: item.mime,
			dialogTitle: item.name
		})
	} else if (contextItem.actionKey === "trash") {
		const alertPromptResponse = await alertPrompt({
			title: "trash",
			message: "Are u sure"
		})

		if (alertPromptResponse.cancelled) {
			return
		}

		fullScreenLoadingModal.show()

		try {
			await itemActions.trashItem({
				item,
				trash: true
			})
		} finally {
			fullScreenLoadingModal.hide()
		}

		queryUtils.useCloudItemsQuerySet({
			...queryParams,
			updater: prev => prev.filter(prevItem => prevItem.uuid !== item.uuid)
		})

		alerts.normal("trashed")
	} else if (contextItem.actionKey === "move") {
		const selectDriveItemsResponse = await selectDriveItems({
			type: "directory",
			max: 1,
			dismissHref: "/drive",
			toMove: [item.uuid]
		})

		if (selectDriveItemsResponse.cancelled || selectDriveItemsResponse.items.length !== 1) {
			return
		}

		const parent = selectDriveItemsResponse.items.at(0)?.uuid

		if (!parent) {
			return
		}

		fullScreenLoadingModal.show()

		try {
			await itemActions.moveItem({
				item,
				parent
			})
		} finally {
			fullScreenLoadingModal.hide()
		}

		if (item.parent === parent) {
			queryUtils.useCloudItemsQuerySet({
				...queryParams,
				updater: prev => prev.filter(prevItem => prevItem.uuid !== item.uuid)
			})
		}

		alerts.normal("moved")
	} else if (contextItem.actionKey === "publicLink") {
		routerPush({
			pathname: "/editPublicLink",
			params: {
				item: JSON.stringify(item)
			}
		})
	} else if (contextItem.actionKey === "download") {
		if (Platform.OS !== "android") {
			throw new Error("Direct downloads are only available on Android.")
		}

		if (item.type === "directory") {
			const tmpDir = new FileSystem.Directory(FileSystem.Paths.join(paths.temporaryDownloads(), randomUUID()))

			fullScreenLoadingModal.show()

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
					throw new Error("Not enough local disk space available.")
				}

				fullScreenLoadingModal.hide()

				await nodeWorker.proxy("downloadDirectory", {
					uuid: item.uuid,
					destination: tmpDir.uri,
					size,
					name: item.name,
					id: randomUUID()
				})

				const files: { name: string; path: string; mime: string }[] = []

				const readDir = async (uri: string) => {
					const dir = new FileSystem.Directory(uri)

					if (!dir.exists) {
						return
					}

					const entries = dir.listAsRecords()

					await promiseAllChunked(
						entries.map(async entry => {
							if (entry.isDirectory) {
								await readDir(entry.path)

								return
							}

							const file = new FileSystem.File(entry.path)

							if (!file.exists) {
								return
							}

							files.push({
								name: file.name,
								path: entry.path,
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

				fullScreenLoadingModal.hide()
			}
		} else {
			const freeDiskSpace = await FileSystemLegacy.getFreeDiskStorageAsync()

			if (freeDiskSpace <= item.size + 1024 * 1024) {
				throw new Error("Not enough local disk space available.")
			}

			const tmpFile = new FileSystem.File(FileSystem.Paths.join(paths.temporaryDownloads(), randomUUID()))

			fullScreenLoadingModal.show()

			try {
				await nodeWorker.proxy("downloadFile", {
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

				fullScreenLoadingModal.hide()
			}
		}
	} else if (contextItem.actionKey === "makeAvailableOffline") {
		if (item.type !== "file") {
			return
		}

		if (await sqlite.offlineFiles.contains(item.uuid)) {
			return
		}

		const freeDiskSpace = await FileSystemLegacy.getFreeDiskStorageAsync()

		if (freeDiskSpace <= item.size + 1024 * 1024) {
			throw new Error("Not enough local disk space available.")
		}

		const offlineFileDestination = new FileSystem.File(FileSystem.Paths.join(paths.offlineFiles(), item.uuid))

		await nodeWorker.proxy("downloadFile", {
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

		alerts.normal("Available offline")
	} else if (contextItem.actionKey === "removeOffline") {
		if (item.type !== "file") {
			return
		}

		const offlineFile = new FileSystem.File(FileSystem.Paths.join(paths.offlineFiles(), item.uuid))

		if (offlineFile.exists) {
			offlineFile.delete()
		}

		await sqlite.offlineFiles.remove(item)

		queryUtils.useFileOfflineStatusQuerySet({
			uuid: item.uuid,
			updater: () => ({
				exists: false
			})
		})

		alerts.normal("Removed offline")
	} else if (contextItem.actionKey === "saveToGallery") {
		if (item.type !== "file") {
			return
		}
		const freeDiskSpace = await FileSystemLegacy.getFreeDiskStorageAsync()

		if (freeDiskSpace <= item.size + 1024 * 1024) {
			throw new Error("Not enough local disk space available.")
		}

		const permissions = await MediaLibrary.requestPermissionsAsync(false)

		if (!permissions.granted) {
			return
		}

		const tmpFile = new FileSystem.File(FileSystem.Paths.join(paths.temporaryDownloads(), randomUUID(), item.name))

		fullScreenLoadingModal.show()

		try {
			if (!tmpFile.parentDirectory.exists) {
				tmpFile.parentDirectory.create()
			}

			await nodeWorker.proxy("downloadFile", {
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

			await MediaLibrary.saveToLibraryAsync(normalizeFilePathForExpo(tmpFile.uri))
		} finally {
			if (tmpFile.parentDirectory.exists) {
				tmpFile.parentDirectory.delete()
			}

			fullScreenLoadingModal.hide()
		}
	} else if (contextItem.actionKey === "versionHistory") {
		routerPush({
			pathname: "/fileVersionHistory",
			params: {
				item: JSON.stringify(item)
			}
		})
	} else if (contextItem.actionKey === "removeSharedIn") {
		fullScreenLoadingModal.show()

		try {
			await nodeWorker.proxy("removeSharedItem", {
				uuid: item.uuid
			})
		} finally {
			fullScreenLoadingModal.hide()
		}

		queryUtils.useCloudItemsQuerySet({
			...queryParams,
			updater: prev => prev.filter(prevItem => prevItem.uuid !== item.uuid)
		})

		alerts.normal("removed")
	} else if (contextItem.actionKey === "removeSharedOut") {
		if (!item.isShared) {
			return
		}

		fullScreenLoadingModal.show()

		try {
			await nodeWorker.proxy("stopSharingItem", {
				uuid: item.uuid,
				receiverId: item.receiverId
			})
		} finally {
			fullScreenLoadingModal.hide()
		}

		queryUtils.useCloudItemsQuerySet({
			...queryParams,
			updater: prev => prev.filter(prevItem => prevItem.uuid !== item.uuid)
		})

		alerts.normal("removed")
	} else if (contextItem.actionKey === "deletePermanently") {
		const alertPromptResponse = await alertPrompt({
			title: "deletePermanently",
			message: "Are u sure"
		})

		if (alertPromptResponse.cancelled) {
			return
		}

		fullScreenLoadingModal.show()

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
		} finally {
			fullScreenLoadingModal.hide()
		}

		queryUtils.useCloudItemsQuerySet({
			...queryParams,
			updater: prev => prev.filter(prevItem => prevItem.uuid !== item.uuid)
		})

		alerts.normal("deleted")
	} else if (contextItem.actionKey === "restore") {
		fullScreenLoadingModal.show()

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
		} finally {
			fullScreenLoadingModal.hide()
		}

		queryUtils.useCloudItemsQuerySet({
			...queryParams,
			updater: prev => prev.filter(prevItem => prevItem.uuid !== item.uuid)
		})

		alerts.normal("restored")
	}
}
