import React, { useEffect, useState, memo, useCallback } from "react"
import { View, ScrollView, DeviceEventEmitter, Platform } from "react-native"
import ActionSheet, { SheetManager } from "react-native-actions-sheet"
import storage from "../../../lib/storage"
import { useMMKVString, useMMKVNumber } from "react-native-mmkv"
import useDimensions from "../../../lib/hooks/useDimensions"
import { useStore } from "../../../lib/state"
import { queueFileDownload, downloadFile, downloadFolder } from "../../../lib/services/download/download"
import { getFileExt, getParent, getRouteURL, getFilePreviewType, calcPhotosGridSize, toExpoFsPath, safeAwait } from "../../../lib/helpers"
import { showToast } from "../../Toasts"
import { i18n } from "../../../i18n"
import { StackActions } from "@react-navigation/native"
import { hasStoragePermissions, hasPhotoLibraryPermissions } from "../../../lib/permissions"
import { favoriteItem, trashItem, restoreItem, fileExists, folderExists } from "../../../lib/api"
import { addToSavedToGallery } from "../../../lib/services/items"
import { removeFromOfflineStorage } from "../../../lib/services/offline"
import { getColor } from "../../../style/colors"
import { navigationAnimation } from "../../../lib/state"
import * as fs from "../../../lib/fs"
import * as MediaLibrary from "expo-media-library"
import useNetworkInfo from "../../../lib/services/isOnline/useNetworkInfo"
import { ActionButton, ItemActionSheetItemHeader } from "../ActionSheets"
import useDarkMode from "../../../lib/hooks/useDarkMode"
import useLang from "../../../lib/hooks/useLang"
import { NavigationContainerRef } from "@react-navigation/native"
import * as db from "../../../lib/db"
import Share from "react-native-share"
import pathModule from "path"

const ItemActionSheet = memo(({ navigation }: { navigation: NavigationContainerRef<ReactNavigation.RootParamList> }) => {
	const darkMode = useDarkMode()
	const dimensions = useDimensions()
	const currentActionSheetItem = useStore(state => state.currentActionSheetItem)
	const lang = useLang()
	const [canSaveToGallery, setCanSaveToGallery] = useState<boolean>(false)
	const [itemListParent, setItemListParent] = useState<string>("")
	const [routeURL, setRouteURL] = useState<string>("")
	const [canDownload, setCanDownload] = useState<boolean>(false)
	const [canEdit, setCanEdit] = useState<boolean>(false)
	const setTextEditorState = useStore(state => state.setTextEditorState)
	const setTextEditorText = useStore(state => state.setTextEditorText)
	const setCreateTextFileDialogName = useStore(state => state.setCreateTextFileDialogName)
	const setTextEditorParent = useStore(state => state.setTextEditorParent)
	const [photosGridSize] = useMMKVNumber("photosGridSize", storage)
	const [publicKey] = useMMKVString("publicKey", storage)
	const [privateKey] = useMMKVString("privateKey", storage)
	const networkInfo = useNetworkInfo()

	const can = useCallback(async () => {
		if (currentActionSheetItem) {
			const userId: number = storage.getNumber("userId")
			const isAvailableOffline =
				currentActionSheetItem.type == "folder" ? false : await db.has(userId + ":offlineItems:" + currentActionSheetItem.uuid)
			const routeURL: string = getRouteURL()

			if (Platform.OS == "ios") {
				if (["jpg", "jpeg", "heif", "heic", "png", "gif", "mov", "mp4", "hevc"].includes(getFileExt(currentActionSheetItem.name))) {
					if (networkInfo.online) {
						setCanSaveToGallery(true)
					} else {
						if (isAvailableOffline) {
							setCanSaveToGallery(true)
						} else {
							setCanSaveToGallery(false)
						}
					}
				}
			} else {
				if (["jpg", "jpeg", "png", "gif", "mov", "mp4"].includes(getFileExt(currentActionSheetItem.name))) {
					if (networkInfo.online) {
						setCanSaveToGallery(true)
					} else {
						if (isAvailableOffline) {
							setCanSaveToGallery(true)
						} else {
							setCanSaveToGallery(false)
						}
					}
				}
			}

			if (
				["text", "code"].includes(getFilePreviewType(getFileExt(currentActionSheetItem.name))) &&
				routeURL.indexOf("shared") == -1
			) {
				setCanEdit(true)
			} else {
				setCanEdit(false)
			}

			if (networkInfo.online) {
				setCanDownload(true)
			} else {
				if (isAvailableOffline) {
					setCanDownload(true)
				} else {
					setCanDownload(false)
				}
			}
		}
	}, [currentActionSheetItem, networkInfo])

	const selection = useCallback(async () => {
		if (!currentActionSheetItem) {
			return
		}

		await SheetManager.hide("ItemActionSheet")

		DeviceEventEmitter.emit("event", {
			type: currentActionSheetItem.selected ? "unselect-item" : "select-item",
			data: currentActionSheetItem
		})
	}, [currentActionSheetItem])

	const share = useCallback(async () => {
		await SheetManager.hide("ItemActionSheet")

		DeviceEventEmitter.emit("openShareActionSheet", currentActionSheetItem)
	}, [currentActionSheetItem])

	const publicLink = useCallback(async () => {
		await SheetManager.hide("ItemActionSheet")

		DeviceEventEmitter.emit("showPublicLinkActionSheet", currentActionSheetItem)
	}, [currentActionSheetItem])

	const saveToGallery = useCallback(async () => {
		if (!currentActionSheetItem) {
			return
		}

		await SheetManager.hide("ItemActionSheet")

		useStore.setState({ fullscreenLoadingModalVisible: false })

		const [hasStoragePermissionsError, hasStoragePermissionsResult] = await safeAwait(hasStoragePermissions(true))
		const [hasPhotoLibraryPermissionsError, hasPhotoLibraryPermissionsResult] = await safeAwait(hasPhotoLibraryPermissions(true))

		if (hasStoragePermissionsError || hasPhotoLibraryPermissionsError) {
			showToast({ message: i18n(storage.getString("lang"), "pleaseGrantPermission") })

			return
		}

		if (!hasStoragePermissionsResult || !hasPhotoLibraryPermissionsResult) {
			showToast({ message: i18n(storage.getString("lang"), "pleaseGrantPermission") })

			return
		}

		queueFileDownload({
			file: currentActionSheetItem,
			saveToGalleryCallback: (path: string) => {
				MediaLibrary.createAssetAsync(toExpoFsPath(path))
					.then(asset => {
						addToSavedToGallery(asset)

						showToast({
							message: i18n(lang, "itemSavedToGallery", true, ["__NAME__"], [currentActionSheetItem.name])
						})
					})
					.catch(err => {
						console.log(err)

						showToast({ message: err.toString() })
					})
			}
		}).catch(err => {
			if (err.toString() == "stopped") {
				return
			}

			if (err.toString() == "wifiOnly") {
				return showToast({ message: i18n(lang, "onlyWifiDownloads") })
			}

			console.error(err)

			showToast({ message: err.toString() })
		})
	}, [currentActionSheetItem, lang])

	const edit = useCallback(async () => {
		if (!currentActionSheetItem) {
			return
		}

		await SheetManager.hide("ItemActionSheet")

		const [hasPermissionsError, hasPermissionsResult] = await safeAwait(hasStoragePermissions(true))

		if (hasPermissionsError) {
			showToast({ message: i18n(storage.getString("lang"), "pleaseGrantPermission") })

			return
		}

		if (!hasPermissionsResult) {
			showToast({ message: i18n(storage.getString("lang"), "pleaseGrantPermission") })

			return
		}

		downloadFile(currentActionSheetItem, false, currentActionSheetItem.chunks)
			.then(path => {
				fs.readAsString(path, "utf8")
					.then(data => {
						setTextEditorState("edit")
						setTextEditorParent(currentActionSheetItem.parent)
						setCreateTextFileDialogName(currentActionSheetItem.name)
						setTextEditorText(data)

						navigationAnimation({ enable: true }).then(() => {
							navigation.dispatch(StackActions.push("TextEditorScreen"))
						})
					})
					.catch(err => {
						console.error(err)

						showToast({ message: err.toString() })
					})
			})
			.catch(err => {
				console.error(err)

				showToast({ message: err.toString() })
			})
	}, [currentActionSheetItem])

	const exportFile = useCallback(async () => {
		if (!currentActionSheetItem || currentActionSheetItem.type === "folder") {
			return
		}

		await SheetManager.hide("ItemActionSheet")

		const [hasPermissionsError, hasPermissionsResult] = await safeAwait(hasStoragePermissions(true))

		if (hasPermissionsError) {
			showToast({ message: i18n(lang, "pleaseGrantPermission") })

			return
		}

		if (!hasPermissionsResult) {
			showToast({ message: i18n(lang, "pleaseGrantPermission") })

			return
		}

		try {
			const [downloadedPath, tempPath] = await Promise.all([
				downloadFile(currentActionSheetItem, true, currentActionSheetItem.chunks),
				fs.getDownloadPath({ type: "temp" })
			])

			const tmpPath = pathModule.join(tempPath, currentActionSheetItem.name)

			if ((await fs.stat(tmpPath)).exists) {
				await fs.unlink(tmpPath)
			}

			await fs.move(downloadedPath, tmpPath)

			Share.open({
				title: i18n(lang, "export"),
				url: tmpPath,
				failOnCancel: false,
				filename: currentActionSheetItem.name
			})
				.then(() => {
					fs.unlink(tmpPath).catch(console.error)
				})
				.catch(err => {
					console.error(err)

					fs.unlink(tmpPath).catch(console.error)
				})
		} catch (e) {
			if (e === "stopped") {
				return
			}

			if (e === "wifiOnly") {
				showToast({ message: i18n(lang, "onlyWifiDownloads") })

				return
			}

			console.error(e)

			showToast({ message: e.toString() })
		}
	}, [currentActionSheetItem, lang])

	const download = useCallback(async () => {
		if (!currentActionSheetItem) {
			return
		}

		await SheetManager.hide("ItemActionSheet")

		const [hasPermissionsError, hasPermissionsResult] = await safeAwait(hasStoragePermissions(true))

		if (hasPermissionsError) {
			showToast({ message: i18n(lang, "pleaseGrantPermission") })

			return
		}

		if (!hasPermissionsResult) {
			showToast({ message: i18n(lang, "pleaseGrantPermission") })

			return
		}

		try {
			if (currentActionSheetItem.type === "folder") {
				await downloadFolder({
					folder: currentActionSheetItem,
					shared: typeof currentActionSheetItem.sharerId === "number" && currentActionSheetItem.sharerId > 0
				})
			} else {
				await queueFileDownload({ file: currentActionSheetItem, showNotification: true })
			}
		} catch (e) {
			if (e === "stopped") {
				return
			}

			if (e === "wifiOnly") {
				showToast({ message: i18n(lang, "onlyWifiDownloads") })

				return
			}

			console.error(e)

			showToast({ message: e.toString() })
		}
	}, [currentActionSheetItem, lang])

	const removeFromOffline = useCallback(async () => {
		if (!currentActionSheetItem) {
			return
		}

		await SheetManager.hide("ItemActionSheet")

		const [hasPermissionsError, hasPermissionsResult] = await safeAwait(hasStoragePermissions(true))

		if (hasPermissionsError) {
			showToast({ message: i18n(storage.getString("lang"), "pleaseGrantPermission") })

			return
		}

		if (!hasPermissionsResult) {
			showToast({ message: i18n(storage.getString("lang"), "pleaseGrantPermission") })

			return
		}

		removeFromOfflineStorage({ item: currentActionSheetItem })
			.then(() => {
				//showToast({ message: i18n(lang, "itemRemovedFromOfflineStorage", true, ["__NAME__"], [currentActionSheetItem.name]) })
			})
			.catch(err => {
				console.log(err)

				showToast({ message: err.toString() })
			})
	}, [currentActionSheetItem])

	const makeOffline = useCallback(async () => {
		if (!currentActionSheetItem) {
			return
		}

		await SheetManager.hide("ItemActionSheet")

		const [hasPermissionsError, hasPermissionsResult] = await safeAwait(hasStoragePermissions(true))

		if (hasPermissionsError) {
			showToast({ message: i18n(storage.getString("lang"), "pleaseGrantPermission") })

			return
		}

		if (!hasPermissionsResult) {
			showToast({ message: i18n(storage.getString("lang"), "pleaseGrantPermission") })

			return
		}

		queueFileDownload({ file: currentActionSheetItem, storeOffline: true }).catch(err => {
			if (err.toString() == "stopped") {
				return
			}

			if (err.toString() == "wifiOnly") {
				return showToast({ message: i18n(lang, "onlyWifiDownloads") })
			}

			console.error(err)

			showToast({ message: err.toString() })
		})
	}, [currentActionSheetItem, lang])

	const versions = useCallback(async () => {
		await SheetManager.hide("ItemActionSheet")

		DeviceEventEmitter.emit("openFileVersionsActionSheet", currentActionSheetItem)
	}, [currentActionSheetItem])

	const favorite = useCallback(async () => {
		if (!currentActionSheetItem) {
			return
		}

		await SheetManager.hide("ItemActionSheet")

		useStore.setState({ fullscreenLoadingModalVisible: true })

		const value: 0 | 1 = currentActionSheetItem.favorited ? 0 : 1

		favoriteItem(currentActionSheetItem.type, currentActionSheetItem.uuid, value)
			.then(async () => {
				DeviceEventEmitter.emit("event", {
					type: "mark-item-favorite",
					data: {
						uuid: currentActionSheetItem.uuid,
						value: value == 1 ? true : false
					}
				})

				useStore.setState({ fullscreenLoadingModalVisible: false })

				//showToast({ message: i18n(lang, value == 1 ? "itemFavorited" : "itemUnfavorited", true, ["__NAME__"], [currentActionSheetItem.name]) })
			})
			.catch(err => {
				console.error(err)

				useStore.setState({ fullscreenLoadingModalVisible: false })

				showToast({ message: err.toString() })
			})
	}, [currentActionSheetItem])

	const folderColor = useCallback(async () => {
		await SheetManager.hide("ItemActionSheet")

		DeviceEventEmitter.emit("openFolderColorActionSheet", currentActionSheetItem)
	}, [currentActionSheetItem])

	const move = useCallback(async () => {
		if (!currentActionSheetItem) {
			return
		}

		await SheetManager.hide("ItemActionSheet")

		showToast({ type: "move", message: i18n(lang, "moveItem", true, ["__NAME__"], [currentActionSheetItem.name]) })
	}, [currentActionSheetItem])

	const trash = useCallback(async () => {
		if (!currentActionSheetItem) {
			return
		}

		await SheetManager.hide("ItemActionSheet")

		useStore.setState({ fullscreenLoadingModalVisible: true })

		trashItem(currentActionSheetItem.type, currentActionSheetItem.uuid)
			.then(() => {
				DeviceEventEmitter.emit("event", {
					type: "remove-item",
					data: {
						uuid: currentActionSheetItem.uuid
					}
				})

				useStore.setState({ fullscreenLoadingModalVisible: false })

				//showToast({ message: i18n(lang, "itemTrashed", true, ["__NAME__"], [currentActionSheetItem.name]) })
			})
			.catch(err => {
				console.error(err)

				if (err.toString().toLowerCase().indexOf("already in the trash") !== -1) {
					DeviceEventEmitter.emit("event", {
						type: "remove-item",
						data: {
							uuid: currentActionSheetItem.uuid
						}
					})
				} else {
					showToast({ message: err.toString() })
				}

				useStore.setState({ fullscreenLoadingModalVisible: false })
			})
	}, [currentActionSheetItem])

	const rename = useCallback(async () => {
		await SheetManager.hide("ItemActionSheet")

		DeviceEventEmitter.emit("openRenameDialog", currentActionSheetItem)
	}, [currentActionSheetItem])

	const permanentDelete = useCallback(async () => {
		await SheetManager.hide("ItemActionSheet")

		DeviceEventEmitter.emit("openConfirmPermanentDeleteDialog", currentActionSheetItem)
	}, [currentActionSheetItem])

	const restore = useCallback(async () => {
		if (!currentActionSheetItem) {
			return
		}

		await SheetManager.hide("ItemActionSheet")

		useStore.setState({ fullscreenLoadingModalVisible: true })

		const restore = () => {
			restoreItem(currentActionSheetItem.type, currentActionSheetItem.uuid)
				.then(() => {
					DeviceEventEmitter.emit("event", {
						type: "remove-item",
						data: {
							uuid: currentActionSheetItem.uuid
						}
					})

					useStore.setState({ fullscreenLoadingModalVisible: false })

					showToast({
						message: i18n(lang, "itemRestored", true, ["__NAME__"], [currentActionSheetItem.name])
					})
				})
				.catch(err => {
					console.error(err)

					showToast({ message: err.toString() })

					useStore.setState({ fullscreenLoadingModalVisible: false })
				})
		}

		if (currentActionSheetItem.type == "file") {
			fileExists({ name: currentActionSheetItem.name, parent: currentActionSheetItem.parent })
				.then(res => {
					if (res.exists) {
						useStore.setState({ fullscreenLoadingModalVisible: false })

						return showToast({
							message: i18n(lang, "alreadyExistsAtRestoreDestination", true, ["__NAME__"], [currentActionSheetItem.name])
						})
					}

					restore()
				})
				.catch(err => {
					console.error(err)

					showToast({ message: err.toString() })

					useStore.setState({ fullscreenLoadingModalVisible: false })
				})
		} else {
			folderExists({ name: currentActionSheetItem.name, parent: currentActionSheetItem.parent })
				.then(res => {
					if (res.exists) {
						useStore.setState({ fullscreenLoadingModalVisible: false })

						return showToast({
							message: i18n(lang, "alreadyExistsAtRestoreDestination", true, ["__NAME__"], [currentActionSheetItem.name])
						})
					}

					restore()
				})
				.catch(err => {
					console.error(err)

					showToast({ message: err.toString() })

					useStore.setState({ fullscreenLoadingModalVisible: false })
				})
		}
	}, [currentActionSheetItem, lang])

	const removeSharedIn = useCallback(async () => {
		await SheetManager.hide("ItemActionSheet")

		DeviceEventEmitter.emit("openConfirmRemoveFromSharedInDialog", currentActionSheetItem)
	}, [currentActionSheetItem])

	const stopSharing = useCallback(async () => {
		await SheetManager.hide("ItemActionSheet")

		DeviceEventEmitter.emit("openConfirmStopSharingDialog", currentActionSheetItem)
	}, [currentActionSheetItem])

	const deviceOffline = useCallback(async () => {
		await SheetManager.hide("ItemActionSheet")
	}, [])

	useEffect(() => {
		can()
	}, [networkInfo])

	useEffect(() => {
		if (typeof currentActionSheetItem !== "undefined") {
			can()
			setItemListParent(getParent())
			setRouteURL(getRouteURL())
		}
	}, [currentActionSheetItem])

	return (
		<ActionSheet
			id="ItemActionSheet"
			gestureEnabled={true}
			containerStyle={{
				backgroundColor: getColor(darkMode, "backgroundSecondary"),
				borderTopLeftRadius: 15,
				borderTopRightRadius: 15
			}}
			indicatorStyle={{
				backgroundColor: getColor(darkMode, "backgroundTertiary")
			}}
		>
			<ScrollView
				style={{
					paddingBottom: dimensions.insets.bottom + dimensions.navigationBarHeight
				}}
			>
				{currentActionSheetItem && (
					<>
						<ItemActionSheetItemHeader />
						<View
							style={{
								marginTop: 0
							}}
						>
							{routeURL.indexOf("photos") !== -1 && calcPhotosGridSize(photosGridSize) < 6 && (
								<ActionButton
									onPress={selection}
									icon="checkmark-circle-outline"
									text={i18n(lang, currentActionSheetItem.selected ? "unselect" : "select")}
								/>
							)}
							{networkInfo.online &&
								itemListParent !== "trash" &&
								routeURL.indexOf("shared-in") == -1 &&
								itemListParent !== "offline" &&
								typeof publicKey == "string" &&
								typeof privateKey == "string" &&
								publicKey.length > 16 &&
								privateKey.length > 16 && (
									<>
										<ActionButton
											onPress={share}
											icon="share-social-outline"
											text={i18n(lang, "share")}
										/>
										<ActionButton
											onPress={publicLink}
											icon="link-outline"
											text={i18n(lang, "publicLink")}
										/>
									</>
								)}
							{canSaveToGallery && currentActionSheetItem.type == "file" && (
								<ActionButton
									onPress={saveToGallery}
									icon="image-outline"
									text={i18n(lang, "saveToGallery")}
								/>
							)}
							{canEdit &&
								currentActionSheetItem.type == "file" &&
								itemListParent !== "offline" &&
								routeURL.indexOf("shared-in") == -1 && (
									<ActionButton
										onPress={edit}
										icon="create-outline"
										text={i18n(lang, "edit")}
									/>
								)}
							{canDownload && itemListParent !== "offline" && (
								<>
									<ActionButton
										onPress={download}
										icon="download-outline"
										text={i18n(lang, "download")}
									/>
									{currentActionSheetItem.type === "file" && (
										<ActionButton
											onPress={exportFile}
											icon="arrow-down-circle-outline"
											text={i18n(lang, "export")}
										/>
									)}
								</>
							)}
							{currentActionSheetItem.type == "file" && itemListParent !== "trash" && currentActionSheetItem.offline && (
								<ActionButton
									onPress={removeFromOffline}
									icon="close-circle-outline"
									text={i18n(lang, "removeFromOfflineStorage")}
								/>
							)}
							{networkInfo.online &&
								currentActionSheetItem.type == "file" &&
								itemListParent !== "trash" &&
								!currentActionSheetItem.offline && (
									<ActionButton
										onPress={makeOffline}
										icon="save-outline"
										text={i18n(lang, "makeAvailableOffline")}
									/>
								)}
							{networkInfo.online &&
								currentActionSheetItem.type == "file" &&
								itemListParent !== "trash" &&
								routeURL.indexOf("shared-in") == -1 &&
								itemListParent !== "offline" && (
									<ActionButton
										onPress={versions}
										icon="time-outline"
										text={i18n(lang, "versionHistory")}
									/>
								)}
							{networkInfo.online &&
								itemListParent !== "trash" &&
								routeURL.indexOf("shared-in") == -1 &&
								itemListParent !== "offline" && (
									<ActionButton
										onPress={favorite}
										icon="heart-outline"
										text={currentActionSheetItem.favorited ? i18n(lang, "unfavorite") : i18n(lang, "favorite")}
									/>
								)}
							{networkInfo.online &&
								currentActionSheetItem.type == "folder" &&
								routeURL.indexOf("shared-in") == -1 &&
								itemListParent !== "offline" && (
									<ActionButton
										onPress={folderColor}
										icon="color-fill-outline"
										text={i18n(lang, "color")}
									/>
								)}
							{networkInfo.online &&
								!currentActionSheetItem.isSync &&
								!currentActionSheetItem.isDefault &&
								itemListParent !== "trash" &&
								routeURL.indexOf("shared-in") == -1 &&
								routeURL.indexOf("shared-out") == -1 &&
								routeURL.indexOf("links") == -1 &&
								routeURL.indexOf("favorites") == -1 &&
								routeURL.indexOf("offline") == -1 &&
								routeURL.indexOf("recents") == -1 &&
								routeURL.indexOf("photos") == -1 && (
									<ActionButton
										onPress={move}
										icon="move-outline"
										text={i18n(lang, "move")}
									/>
								)}
							{!currentActionSheetItem.isSync &&
								networkInfo.online &&
								routeURL.indexOf("shared-in") == -1 &&
								itemListParent !== "offline" &&
								routeURL.indexOf("photos") == -1 && (
									<ActionButton
										onPress={rename}
										icon="text-outline"
										text={i18n(lang, "rename")}
									/>
								)}
							{networkInfo.online &&
								!currentActionSheetItem.isSync &&
								!currentActionSheetItem.isDefault &&
								itemListParent !== "trash" &&
								routeURL.indexOf("shared-in") == -1 &&
								itemListParent !== "offline" && (
									<ActionButton
										onPress={trash}
										icon="trash-outline"
										text={i18n(lang, "trash")}
									/>
								)}
							{typeof currentActionSheetItem == "object" &&
								networkInfo.online &&
								itemListParent == "trash" &&
								routeURL.indexOf("shared-in") == -1 && (
									<>
										<ActionButton
											onPress={permanentDelete}
											icon="close-circle-outline"
											text={i18n(lang, "deletePermanently")}
										/>
										<ActionButton
											onPress={restore}
											icon="refresh-outline"
											text={i18n(lang, "restore")}
										/>
									</>
								)}
							{networkInfo.online && routeURL.indexOf("shared-in") !== -1 && getParent().length < 32 && (
								<ActionButton
									onPress={removeSharedIn}
									icon="close-circle-outline"
									text={i18n(lang, "removeFromSharedIn")}
								/>
							)}
							{networkInfo.online && routeURL.indexOf("shared-out") !== -1 && getParent().length < 32 && (
								<ActionButton
									onPress={stopSharing}
									icon="close-circle-outline"
									text={i18n(lang, "stopSharing")}
								/>
							)}
							{!networkInfo.online && (
								<ActionButton
									onPress={deviceOffline}
									icon="cloud-offline-outline"
									text={i18n(lang, "deviceOffline")}
								/>
							)}
						</View>
					</>
				)}
			</ScrollView>
		</ActionSheet>
	)
})

export default ItemActionSheet
