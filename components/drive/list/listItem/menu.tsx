import { memo, useMemo, useCallback } from "react"
import { ContextMenu } from "@/components/nativewindui/ContextMenu"
import { createContextSubMenu, createContextItem } from "@/components/nativewindui/ContextMenu/utils"
import { type ContextItem, type ContextSubMenu } from "@/components/nativewindui/ContextMenu/types"
import { DropdownMenu } from "@/components/nativewindui/DropdownMenu"
import { useTranslation } from "react-i18next"
import { useRouter, usePathname } from "expo-router"
import useDimensions from "@/hooks/useDimensions"
import queryUtils from "@/queries/utils"
import nodeWorker from "@/lib/nodeWorker"
import alerts from "@/lib/alerts"
import * as FileSystemLegacy from "expo-file-system"
import * as Sharing from "expo-sharing"
import paths from "@/lib/paths"
import * as FileSystem from "expo-file-system/next"
import * as Clipboard from "expo-clipboard"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import { validate as validateUUID } from "uuid"
import { alertPrompt } from "@/components/prompts/alertPrompt"
import { getPreviewType, promiseAllChunked, sanitizeFileName, normalizeFilePathForExpo } from "@/lib/utils"
import { useDriveStore } from "@/stores/drive.store"
import { randomUUID } from "expo-crypto"
import { inputPrompt } from "@/components/prompts/inputPrompt"
import { Platform, View } from "react-native"
import useIsProUser from "@/hooks/useIsProUser"
import { type FileMetadata, type FolderMetadata } from "@filen/sdk"
import { colorPicker } from "@/components/sheets/colorPickerSheet"
import { DEFAULT_DIRECTORY_COLOR } from "@/assets/fileIcons"
import { itemInfo } from "@/components/sheets/itemInfoSheet"
import { selectContacts } from "@/app/selectContacts"
import { selectDriveItems } from "@/app/selectDriveItems/[parent]"
import ReactNativeBlobUtil from "react-native-blob-util"
import sqlite from "@/lib/sqlite"
import * as MediaLibrary from "expo-media-library"
import { Image } from "expo-image"

export const Menu = memo(
	({
		item,
		type,
		children,
		insidePreview,
		queryParams,
		isAvailableOffline
	}: {
		item: DriveCloudItem
		type: "context" | "dropdown"
		children: React.ReactNode
		insidePreview: boolean
		isAvailableOffline: boolean
		queryParams: FetchCloudItemsParams
	}) => {
		const { t } = useTranslation()
		const router = useRouter()
		const { isPortrait, isTablet, screen } = useDimensions()
		const isProUser = useIsProUser()
		const pathname = usePathname()

		const menuItems = useMemo(() => {
			const items: (ContextItem | ContextSubMenu)[] = []
			const isValidParentUUID = validateUUID(queryParams.parent)

			if (isValidParentUUID || queryParams.of === "drive") {
				items.push(
					createContextItem({
						actionKey: "select",
						title: t("drive.list.item.menu.select")
					})
				)
			}

			if (item.type === "directory" && queryParams.of !== "trash") {
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
							...(Platform.OS === "android" && queryParams.of !== "offline"
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
							...(["image", "video"].includes(getPreviewType(item.name)) && queryParams.of !== "offline"
								? [
										createContextItem({
											actionKey: "saveToGallery",
											title: t("drive.list.item.menu.saveToGallery")
										})
								  ]
								: []),
							...(item.type === "file" && queryParams.of !== "offline"
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

			if (queryParams.of !== "sharedIn" && queryParams.of !== "offline") {
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

			if (queryParams.of !== "sharedIn" && queryParams.of !== "offline") {
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

			if (queryParams.of !== "offline") {
				if (item.type === "directory") {
					items.push(
						createContextItem({
							actionKey: "info",
							title: t("drive.list.item.menu.info")
						})
					)
				} else {
					if (queryParams.of === "sharedIn") {
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

			if (item.type === "directory" && queryParams.of !== "sharedIn" && queryParams.of !== "offline") {
				items.push(
					createContextItem({
						actionKey: "color",
						title: t("drive.list.item.menu.color")
					})
				)
			}

			if (queryParams.of !== "sharedIn" && queryParams.of !== "offline") {
				items.push(
					createContextItem({
						actionKey: "rename",
						title: t("drive.list.item.menu.rename")
					})
				)
			}

			if (queryParams.of !== "sharedIn" && queryParams.of !== "offline") {
				items.push(
					createContextItem({
						actionKey: "move",
						title: t("drive.list.item.menu.move")
					})
				)
			}

			/*items.push(
				createContextSubMenu(
					{
						title: t("drive.list.item.menu.clipboard"),
						iOSItemSize: "large"
					},
					[
						...(queryParams.of !== "offline"
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
			)*/

			if (queryParams.of === "sharedOut") {
				items.push(
					createContextItem({
						actionKey: "removeSharedOut",
						title: t("drive.list.item.menu.removeSharedOut"),
						destructive: true
					})
				)
			}

			if (queryParams.of !== "offline" && queryParams.of !== "trash") {
				if (queryParams.of !== "sharedIn") {
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

			if (queryParams.of === "trash") {
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

			if (queryParams.of === "offline" && isAvailableOffline) {
				items.push(
					createContextItem({
						actionKey: "removeOffline",
						title: t("drive.list.item.menu.removeOffline"),
						destructive: true
					})
				)
			}

			return items
		}, [isAvailableOffline, item, queryParams, t, isProUser])

		const select = useCallback(() => {
			const isSelected = useDriveStore.getState().selectedItems.some(i => i.uuid === item.uuid)

			useDriveStore
				.getState()
				.setSelectedItems(prev =>
					isSelected ? prev.filter(i => i.uuid !== item.uuid) : [...prev.filter(i => i.uuid !== item.uuid), item]
				)
		}, [item])

		const openDirectory = useCallback(() => {
			if (item.type !== "directory") {
				return
			}

			router.push({
				pathname: "/drive/[uuid]",
				params: {
					uuid: item.uuid
				}
			})
		}, [item.uuid, item.type, router])

		const copyId = useCallback(async () => {
			await Clipboard.setStringAsync(item.uuid)

			alerts.normal("Copied")
		}, [item.uuid])

		const copyPath = useCallback(async () => {
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
		}, [item.uuid, item.type])

		const rename = useCallback(async () => {
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
		}, [item, queryParams])

		const color = useCallback(async () => {
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
				await nodeWorker.proxy("changeDirectoryColor", {
					uuid: item.uuid,
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
		}, [item, queryParams])

		const info = useCallback(() => {
			itemInfo(item)
		}, [item])

		const favorite = useCallback(
			async (favorite: boolean) => {
				fullScreenLoadingModal.show()

				try {
					if (item.type === "directory") {
						await nodeWorker.proxy("favoriteDirectory", {
							uuid: item.uuid,
							favorite
						})
					} else {
						await nodeWorker.proxy("favoriteFile", {
							uuid: item.uuid,
							favorite
						})
					}
				} finally {
					fullScreenLoadingModal.hide()
				}

				if (queryParams.of === "favorites" && !favorite) {
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
											favorited: favorite
									  }
									: prevItem
							)
					})
				}
			},
			[item, queryParams]
		)

		const share = useCallback(async () => {
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
			} finally {
				fullScreenLoadingModal.hide()
			}

			alerts.normal("shared")
		}, [item])

		const exportItem = useCallback(async () => {
			if (item.type !== "file" || !(await Sharing.isAvailableAsync())) {
				return
			}

			const freeDiskSpace = await FileSystemLegacy.getFreeDiskStorageAsync()

			if (freeDiskSpace <= item.size + 1024 * 1024) {
				throw new Error("Not enough local disk space available.")
			}

			fullScreenLoadingModal.show()

			const tempLocation = new FileSystem.File(FileSystem.Paths.join(paths.exports(), sanitizeFileName(item.name)))

			try {
				if (tempLocation.exists) {
					tempLocation.delete()
				}

				await nodeWorker.proxy("downloadFile", {
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
			} finally {
				fullScreenLoadingModal.hide()
			}

			await new Promise<void>(resolve => setTimeout(resolve, 250))

			await Sharing.shareAsync(tempLocation.uri, {
				mimeType: item.mime,
				dialogTitle: item.name
			})
		}, [item])

		const trash = useCallback(async () => {
			const alertPromptResponse = await alertPrompt({
				title: "trash",
				message: "Are u sure"
			})

			if (alertPromptResponse.cancelled) {
				return
			}

			fullScreenLoadingModal.show()

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
			} finally {
				fullScreenLoadingModal.hide()
			}

			queryUtils.useCloudItemsQuerySet({
				...queryParams,
				updater: prev => prev.filter(prevItem => prevItem.uuid !== item.uuid)
			})

			alerts.normal("trashed")
		}, [item, queryParams])

		const move = useCallback(async () => {
			const selectDriveItemsResponse = await selectDriveItems({
				type: "directory",
				max: 1,
				dismissHref: pathname,
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
		}, [item, queryParams, pathname])

		const publicLink = useCallback(() => {
			router.push({
				pathname: "/editPublicLink",
				params: {
					item: JSON.stringify(item)
				}
			})
		}, [router, item])

		const download = useCallback(async () => {
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
		}, [item])

		const makeAvailableOffline = useCallback(async () => {
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
		}, [item])

		const removeOffline = useCallback(async () => {
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
		}, [item])

		const saveToGallery = useCallback(async () => {
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
		}, [item])

		const versionHistory = useCallback(() => {
			router.push({
				pathname: "/fileVersionHistory",
				params: {
					item: JSON.stringify(item)
				}
			})
		}, [item, router])

		const removeSharedIn = useCallback(async () => {
			if (!item.isShared) {
				return
			}

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
		}, [item, queryParams])

		const removeSharedOut = useCallback(async () => {
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
		}, [item, queryParams])

		const deletePermanently = useCallback(async () => {
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
		}, [item, queryParams])

		const restore = useCallback(async () => {
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
		}, [item, queryParams])

		const onItemPress = useCallback(
			async (item: Omit<ContextItem, "icon">, _?: boolean) => {
				try {
					switch (item.actionKey) {
						case "select": {
							select()

							break
						}

						case "openDirectory": {
							openDirectory()

							break
						}

						case "copyId": {
							await copyId()

							break
						}

						case "copyPath": {
							await copyPath()

							break
						}

						case "rename": {
							await rename()

							break
						}

						case "color": {
							await color()

							break
						}

						case "info": {
							info()

							break
						}

						case "favorite": {
							await favorite(true)

							break
						}

						case "unfavorite": {
							await favorite(false)

							break
						}

						case "share": {
							await share()

							break
						}

						case "export": {
							await exportItem()

							break
						}

						case "trash": {
							await trash()

							break
						}

						case "move": {
							await move()

							break
						}

						case "publicLink": {
							publicLink()

							break
						}

						case "download": {
							await download()

							break
						}

						case "makeAvailableOffline": {
							await makeAvailableOffline()

							break
						}

						case "removeOffline": {
							await removeOffline()

							break
						}

						case "saveToGallery": {
							await saveToGallery()

							break
						}

						case "versionHistory": {
							versionHistory()

							break
						}

						case "removeSharedIn": {
							await removeSharedIn()

							break
						}

						case "removeSharedOut": {
							await removeSharedOut()

							break
						}

						case "deletePermanently": {
							await deletePermanently()

							break
						}

						case "restore": {
							await restore()

							break
						}
					}
				} catch (e) {
					console.error(e)

					if (e instanceof Error) {
						alerts.error(e.message)
					}
				}
			},
			[
				select,
				openDirectory,
				copyId,
				copyPath,
				rename,
				color,
				info,
				favorite,
				share,
				exportItem,
				trash,
				move,
				publicLink,
				download,
				makeAvailableOffline,
				removeOffline,
				saveToGallery,
				versionHistory,
				removeSharedIn,
				removeSharedOut,
				deletePermanently,
				restore
			]
		)

		const iosRenderPreview = useCallback(() => {
			return (
				<View
					className="flex-row items-center justify-center bg-background"
					style={{
						width: Math.floor(screen.width - 32),
						height: Math.floor(screen.height / 3)
					}}
				>
					<Image
						className="rounded-lg"
						source={{
							uri: item.thumbnail
						}}
						contentFit="contain"
						style={{
							width: "100%",
							height: "100%"
						}}
					/>
				</View>
			)
		}, [item.thumbnail, screen])

		if (type === "context") {
			return (
				<ContextMenu
					items={menuItems}
					onItemPress={onItemPress}
					key={`${isPortrait}:${isTablet}`}
					iosRenderPreview={!insidePreview && item.thumbnail && (isPortrait || isTablet) ? iosRenderPreview : undefined}
				>
					{children}
				</ContextMenu>
			)
		}

		return (
			<DropdownMenu
				items={menuItems}
				onItemPress={onItemPress}
			>
				{children}
			</DropdownMenu>
		)
	}
)

Menu.displayName = "Menu"

export default Menu
