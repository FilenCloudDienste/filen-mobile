import React, { useEffect, useState, memo, useMemo, useCallback } from "react"
import { View, DeviceEventEmitter, Platform, Alert } from "react-native"
import ActionSheet, { SheetManager } from "react-native-actions-sheet"
import storage from "../../../lib/storage"
import { useMMKVString, useMMKVNumber } from "react-native-mmkv"
import { useSafeAreaInsets, EdgeInsets } from "react-native-safe-area-context"
import { useStore } from "../../../lib/state"
import { queueFileDownload } from "../../../lib/services/download/download"
import { getFileExt, getRouteURL, calcPhotosGridSize, toExpoFsPath, safeAwait } from "../../../lib/helpers"
import { showToast } from "../../Toasts"
import { i18n } from "../../../i18n"
import { StackActions } from "@react-navigation/native"
import { hasStoragePermissions, hasPhotoLibraryPermissions } from "../../../lib/permissions"
import {
	bulkFavorite,
	bulkTrash,
	bulkDeletePermanently,
	bulkRestore,
	bulkStopSharing,
	bulkRemoveSharedIn,
	emptyTrash
} from "../../../lib/api"
import { addToSavedToGallery } from "../../../lib/services/items"
import { removeFromOfflineStorage } from "../../../lib/services/offline"
import { getColor } from "../../../style/colors"
import { navigationAnimation } from "../../../lib/state"
import * as MediaLibrary from "expo-media-library"
import { ActionButton, ActionSheetIndicator } from "../ActionSheets"
import useDarkMode from "../../../lib/hooks/useDarkMode"
import useLang from "../../../lib/hooks/useLang"
import { NavigationContainerRef } from "@react-navigation/native"
import { Item } from "../../../types"

export interface TopBarActionSheetProps {
	navigation: NavigationContainerRef<ReactNavigation.RootParamList>
}

const TopBarActionSheet = memo(({ navigation }: TopBarActionSheetProps) => {
	const darkMode = useDarkMode()
	const insets: EdgeInsets = useSafeAreaInsets()
	const [viewMode, setViewMode] = useMMKVString("viewMode", storage)
	const lang = useLang()
	const currentRoutes = useStore(state => state.currentRoutes)
	const [routeURL, setRouteURL] = useState<string>("")
	const [photosGridSize] = useMMKVNumber("photosGridSize", storage)
	const [canShowListViewStyle, setCanShowListViewStyle] = useState<boolean>(false)
	const [canShowSelectAllItems, setCanShowSelectAllItems] = useState<boolean>(false)
	const [canShowUnselectAllItems, setCanShowUnselectAllItems] = useState<boolean>(false)
	const [canShowTransfersButton, setCanShowTransfersButton] = useState<boolean>(false)
	const itemsSelectedCount = useStore(state => state.itemsSelectedCount)
	const [canShowBulkItemsActions, setCanShowBulkItemsActions] = useState<boolean>(false)
	const [canShowMoveItems, setCanShowMoveItems] = useState<boolean>(false)
	const currentItems = useStore(state => state.currentItems)
	const [canShowSaveToGallery, setCanShowSaveToGallery] = useState<boolean>(false)
	const [canShowTrash, setCanShowTrash] = useState<boolean>(false)
	const [canShowRemoveOffline, setCanShowRemoveOffline] = useState<boolean>(false)
	const [canShowRemoveFavorite, setCanShowRemoveFavorite] = useState<boolean>(false)
	const [canShowAddFavorite, setCanShowAddFavorite] = useState<boolean>(false)
	const [canShowRemoveSharedIn, setCanShowRemoveSharedIn] = useState<boolean>(false)
	const [canShowStopSharing, setCanShowStopSharing] = useState<boolean>(false)
	const [currentRouteName, setCurrentRouteName] = useState<string>("")
	const [canMakeAvailableOffline, setCanMakeAvailableOffline] = useState<boolean>(false)
	const [canDownload, setCanDownload] = useState<boolean>(false)
	const [bulkItems, setBulkItems] = useState<Item[]>([])

	const maxBulkActionsItemsCount: number = 10000
	const minBulkActionsItemCount: number = 2

	const viewModeParsed = useMemo(() => {
		if (!viewMode) {
			return {}
		}

		return JSON.parse(viewMode)
	}, [viewMode])

	const doesSelectedItemsContainOfflineStoredItems = useCallback(() => {
		if (!Array.isArray(currentItems)) {
			return false
		}

		return currentItems.filter(item => item.offline && item.selected).length > 0 ? true : false
	}, [JSON.stringify(currentItems)])

	const doesSelectedItemsContainFavoritedItems = useCallback(() => {
		if (!Array.isArray(currentItems)) {
			return false
		}

		return currentItems.filter(item => item.favorited && item.selected).length > 0 ? true : false
	}, [currentItems])

	const doesSelectedItemsContainUnmovableItems = useCallback(() => {
		if (!Array.isArray(currentItems)) {
			return false
		}

		return currentItems.filter(item => (item.isDefault || item.isSync) && item.selected).length > 0 ? true : false
	}, [currentItems])

	const doesSelecteditemsContainGallerySaveableItems = useCallback(() => {
		if (!Array.isArray(currentItems)) {
			return false
		}

		let extArray: string[] = []

		if (Platform.OS == "ios") {
			extArray = ["jpg", "jpeg", "heif", "heic", "png", "gif", "mov", "mp4", "hevc"]
		} else {
			extArray = ["jpg", "jpeg", "png", "gif", "mov", "mp4"]
		}

		return currentItems.filter(item => item.selected && extArray.includes(getFileExt(item.name))).length > 0 ? true : false
	}, [currentItems])

	const doesSelectedItemsContainFolders = useCallback(() => {
		if (!Array.isArray(currentItems)) {
			return false
		}

		return currentItems.filter(item => item.type == "folder" && item.selected).length > 0 ? true : false
	}, [currentItems])

	const can = useCallback(() => {
		setCanShowTransfersButton(true)
		setCanShowSelectAllItems(true)
		setCanShowUnselectAllItems(true)
		setCanShowListViewStyle(true)
		setCanShowBulkItemsActions(true)
		setCanShowMoveItems(true)
		setCanShowSaveToGallery(true)
		setCanShowTrash(true)
		setCanShowRemoveOffline(true)
		setCanShowRemoveFavorite(true)
		setCanShowAddFavorite(true)
		setCanShowRemoveSharedIn(true)
		setCanShowStopSharing(true)
		setCanMakeAvailableOffline(true)
		setCanDownload(true)

		if (routeURL.indexOf("photos") !== -1) {
			setCanShowListViewStyle(false)
			setCanShowMoveItems(false)

			if (calcPhotosGridSize(photosGridSize) >= 6) {
				setCanShowSelectAllItems(false)
				setCanShowUnselectAllItems(false)
			}
		}

		if (routeURL.indexOf("transfers") !== -1) {
			setCanShowBulkItemsActions(false)
		}

		if (routeURL.indexOf("settings") !== -1) {
			setCanShowBulkItemsActions(false)
		}

		if (doesSelecteditemsContainGallerySaveableItems()) {
			setCanShowSaveToGallery(true)
		} else {
			setCanShowSaveToGallery(false)
		}

		if (doesSelectedItemsContainOfflineStoredItems()) {
			setCanShowRemoveOffline(true)
		} else {
			setCanShowRemoveOffline(false)
		}

		if (doesSelectedItemsContainFavoritedItems()) {
			setCanShowRemoveFavorite(true)
		} else {
			setCanShowRemoveFavorite(false)
		}

		if (doesSelectedItemsContainUnmovableItems()) {
			setCanShowMoveItems(false)
		}

		if (routeURL.indexOf("shared-in") !== -1) {
			setCanShowTrash(false)
			setCanShowMoveItems(false)
			setCanShowRemoveOffline(false)
			setCanShowRemoveFavorite(false)
			setCanShowAddFavorite(false)
		}

		if (routeURL.indexOf("shared-in") == -1) {
			setCanShowRemoveSharedIn(false)
		}

		if (routeURL.indexOf("shared-out") == -1) {
			setCanShowStopSharing(false)
		}

		if (doesSelectedItemsContainFolders()) {
			setCanDownload(false)
			setCanMakeAvailableOffline(false)
		}
	}, [routeURL, photosGridSize])

	const updateRouteURL = useCallback(() => {
		if (typeof currentRoutes !== "undefined" && Array.isArray(currentRoutes)) {
			if (typeof currentRoutes[currentRoutes.length - 1] !== "undefined") {
				setRouteURL(getRouteURL(currentRoutes[currentRoutes.length - 1]))
				setCurrentRouteName(currentRoutes[currentRoutes.length - 1].name)
			}
		}
	}, [currentRoutes])

	const sortBy = useCallback(async () => {
		await SheetManager.hide("TopBarActionSheet")

		SheetManager.show("SortByActionSheet")
	}, [])

	const selectAll = useCallback(() => {
		DeviceEventEmitter.emit("event", {
			type: "select-all-items"
		})
	}, [])

	const unselectAll = useCallback(async () => {
		await SheetManager.hide("TopBarActionSheet")

		DeviceEventEmitter.emit("event", {
			type: "unselect-all-items"
		})
	}, [])

	const restore = useCallback(async () => {
		await SheetManager.hide("TopBarActionSheet")

		const items = bulkItems

		if (items.length == 0) {
			return
		}

		useStore.setState({ fullscreenLoadingModalVisible: true })

		bulkRestore(items)
			.then(() => {
				useStore.setState({ fullscreenLoadingModalVisible: false })

				//showToast({ message: i18n(lang, "restoreSelectedItemsSuccess", true, ["__COUNT__"], [items.length]) })
			})
			.catch(err => {
				console.error(err)

				useStore.setState({ fullscreenLoadingModalVisible: false })

				showToast({ message: err.toString() })
			})
	}, [lang, bulkItems])

	const permanentDelete = useCallback(async () => {
		await SheetManager.hide("TopBarActionSheet")

		const items = bulkItems

		if (items.length == 0) {
			return
		}

		Alert.alert(
			i18n(lang, "deleteSelectedItemsPermanently"),
			i18n(lang, "deleteSelectedItemsPermanentlyWarning"),
			[
				{
					text: i18n(lang, "cancel"),
					onPress: () => {
						return false
					},
					style: "cancel"
				},
				{
					text: i18n(lang, "ok"),
					onPress: () => {
						useStore.setState({ fullscreenLoadingModalVisible: true })

						bulkDeletePermanently(items)
							.then(() => {
								useStore.setState({ fullscreenLoadingModalVisible: false })

								//showToast({ message: i18n(lang, "deleteSelectedItemsPermanentlySuccess", true, ["__COUNT__"], [items.length]) })
							})
							.catch(err => {
								console.error(err)

								useStore.setState({ fullscreenLoadingModalVisible: false })

								showToast({ message: err.toString() })
							})
					},
					style: "default"
				}
			],
			{
				cancelable: true
			}
		)
	}, [lang, bulkItems])

	const move = useCallback(async () => {
		await SheetManager.hide("TopBarActionSheet")

		const items = bulkItems

		if (items.length == 0) {
			return
		}

		showToast({ type: "moveBulk", message: i18n(lang, "moveItems"), items })
	}, [lang, bulkItems])

	const favorite = useCallback(async () => {
		await SheetManager.hide("TopBarActionSheet")

		const items = bulkItems

		if (items.length == 0) {
			return
		}

		useStore.setState({ fullscreenLoadingModalVisible: true })

		bulkFavorite(1, items)
			.then(() => {
				useStore.setState({ fullscreenLoadingModalVisible: false })

				//showToast({ message: i18n(lang, "selectedItemsMarkedAsFavorite") })
			})
			.catch(err => {
				console.error(err)

				useStore.setState({ fullscreenLoadingModalVisible: false })

				showToast({ message: err.toString() })
			})
	}, [lang, bulkItems])

	const unfavorite = useCallback(async () => {
		await SheetManager.hide("TopBarActionSheet")

		const items = bulkItems

		if (items.length == 0) {
			return
		}

		useStore.setState({ fullscreenLoadingModalVisible: true })

		bulkFavorite(0, items)
			.then(() => {
				useStore.setState({ fullscreenLoadingModalVisible: false })

				//showToast({ message: i18n(lang, "selectedItemsRemovedAsFavorite") })
			})
			.catch(err => {
				console.error(err)

				useStore.setState({ fullscreenLoadingModalVisible: false })

				showToast({ message: err.toString() })
			})
	}, [lang, bulkItems])

	const saveToGallery = useCallback(async () => {
		await SheetManager.hide("TopBarActionSheet")

		const items = bulkItems

		if (items.length == 0) {
			return
		}

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

		let extArray: any[] = []

		if (Platform.OS == "ios") {
			extArray = ["jpg", "jpeg", "heif", "heic", "png", "gif", "mov", "mp4", "hevc"]
		} else {
			extArray = ["jpg", "jpeg", "png", "gif", "mov", "mp4"]
		}

		items.forEach(item => {
			if (extArray.includes(getFileExt(item.name))) {
				queueFileDownload({
					file: item,
					saveToGalleryCallback: (path: string) => {
						MediaLibrary.createAssetAsync(toExpoFsPath(path))
							.then(asset => {
								addToSavedToGallery(asset)

								showToast({
									message: i18n(lang, "itemSavedToGallery", true, ["__NAME__"], [item.name])
								})
							})
							.catch(err => {
								console.error(err)

								showToast({ message: err.toString() })
							})
					}
				}).catch(err => {
					if (err.toString() == "stopped") {
						return
					}

					if (err.toString() == "wifiOnly") {
						showToast({ message: i18n(lang, "onlyWifiDownloads") })

						return
					}

					console.error(err)

					showToast({ message: err.toString() })
				})
			}
		})
	}, [lang, bulkItems])

	const makeOffline = useCallback(async () => {
		await SheetManager.hide("TopBarActionSheet")

		const items = bulkItems

		if (items.length == 0) {
			return
		}

		const [hasPermissionsError, hasPermissionsResult] = await safeAwait(hasStoragePermissions(true))

		if (hasPermissionsError) {
			showToast({ message: i18n(storage.getString("lang"), "pleaseGrantPermission") })

			return
		}

		if (!hasPermissionsResult) {
			showToast({ message: i18n(storage.getString("lang"), "pleaseGrantPermission") })

			return
		}

		items.forEach(item => {
			if (!item.offline) {
				queueFileDownload({ file: item, storeOffline: true }).catch(err => {
					if (err.toString() == "stopped") {
						return
					}

					if (err.toString() == "wifiOnly") {
						showToast({ message: i18n(lang, "onlyWifiDownloads") })

						return
					}

					console.error(err)

					showToast({ message: err.toString() })
				})
			}
		})
	}, [lang, bulkItems])

	const removeFromOffline = useCallback(async () => {
		await SheetManager.hide("TopBarActionSheet")

		const items = bulkItems

		if (items.length == 0) {
			return
		}

		const [hasPermissionsError, hasPermissionsResult] = await safeAwait(hasStoragePermissions(true))

		if (hasPermissionsError) {
			showToast({ message: i18n(storage.getString("lang"), "pleaseGrantPermission") })

			return
		}

		if (!hasPermissionsResult) {
			showToast({ message: i18n(storage.getString("lang"), "pleaseGrantPermission") })

			return
		}

		items.forEach(item => {
			if (item.offline) {
				removeFromOfflineStorage({ item })
					.then(() => {
						//showToast({ message: i18n(lang, "itemRemovedFromOfflineStorage", true, ["__NAME__"], [item.name]) })
					})
					.catch(err => {
						console.error(err)

						showToast({ message: err.toString() })
					})
			}
		})
	}, [lang, bulkItems])

	const download = useCallback(async () => {
		await SheetManager.hide("TopBarActionSheet")

		const items = bulkItems

		if (items.length == 0) {
			return
		}

		const [hasPermissionsError, hasPermissionsResult] = await safeAwait(hasStoragePermissions(true))

		if (hasPermissionsError) {
			showToast({ message: i18n(storage.getString("lang"), "pleaseGrantPermission") })

			return
		}

		if (!hasPermissionsResult) {
			showToast({ message: i18n(storage.getString("lang"), "pleaseGrantPermission") })

			return
		}

		items.forEach(item => {
			queueFileDownload({ file: item }).catch(err => {
				if (err.toString() == "stopped") {
					return
				}

				if (err.toString() == "wifiOnly") {
					showToast({ message: i18n(lang, "onlyWifiDownloads") })

					return
				}

				console.error(err)

				showToast({ message: err.toString() })
			})
		})
	}, [lang, bulkItems])

	const trash = useCallback(async () => {
		await SheetManager.hide("TopBarActionSheet")

		const items = bulkItems

		if (items.length == 0) {
			return
		}

		useStore.setState({ fullscreenLoadingModalVisible: true })

		bulkTrash(items)
			.then(() => {
				useStore.setState({ fullscreenLoadingModalVisible: false })

				DeviceEventEmitter.emit("event", {
					type: "unselect-all-items"
				})

				//showToast({ message: i18n(lang, "selectedItemsTrashed") })
			})
			.catch(err => {
				console.error(err)

				useStore.setState({ fullscreenLoadingModalVisible: false })

				showToast({ message: err.toString() })
			})
	}, [lang, bulkItems])

	const stopSharing = useCallback(async () => {
		await SheetManager.hide("TopBarActionSheet")

		const items = bulkItems

		if (items.length == 0) {
			return
		}

		Alert.alert(
			i18n(lang, "stopSharing"),
			i18n(lang, "bulkStopSharingWarning", true, ["__COUNT__"], [items.length]),
			[
				{
					text: i18n(lang, "cancel"),
					onPress: () => {
						return false
					},
					style: "cancel"
				},
				{
					text: i18n(lang, "ok"),
					onPress: () => {
						useStore.setState({ fullscreenLoadingModalVisible: true })

						bulkStopSharing(items)
							.then(() => {
								useStore.setState({ fullscreenLoadingModalVisible: false })

								DeviceEventEmitter.emit("event", {
									type: "unselect-all-items"
								})

								//showToast({ message: i18n(lang, "stoppedSharingSelectedItems", true, ["__COUNT__"], [items.length]) })
							})
							.catch(err => {
								console.error(err)

								useStore.setState({ fullscreenLoadingModalVisible: false })

								showToast({ message: err.toString() })
							})
					},
					style: "default"
				}
			],
			{
				cancelable: true
			}
		)
	}, [lang, bulkItems])

	const removeSharedIn = useCallback(async () => {
		await SheetManager.hide("TopBarActionSheet")

		const items = bulkItems

		if (items.length == 0) {
			return
		}

		Alert.alert(
			i18n(lang, "stopSharing"),
			i18n(lang, "bulkRemoveSharedInWarning", true, ["__COUNT__"], [items.length]),
			[
				{
					text: i18n(lang, "cancel"),
					onPress: () => {
						return false
					},
					style: "cancel"
				},
				{
					text: i18n(lang, "ok"),
					onPress: () => {
						useStore.setState({ fullscreenLoadingModalVisible: true })

						bulkRemoveSharedIn(items)
							.then(() => {
								useStore.setState({ fullscreenLoadingModalVisible: false })

								DeviceEventEmitter.emit("event", {
									type: "unselect-all-items"
								})

								//showToast({ message: i18n(lang, "bulkRemoveSharedInSuccess", true, ["__COUNT__"], [items.length]) })
							})
							.catch(err => {
								console.error(err)

								useStore.setState({ fullscreenLoadingModalVisible: false })

								showToast({ message: err.toString() })
							})
					},
					style: "default"
				}
			],
			{
				cancelable: true
			}
		)
	}, [lang, bulkItems])

	const updateViewMode = useCallback(async () => {
		await SheetManager.hide("TopBarActionSheet")

		const routeURL = getRouteURL()

		setViewMode(
			JSON.stringify({
				...viewModeParsed,
				[routeURL]: viewModeParsed[routeURL] !== "grid" ? "grid" : "list"
			})
		)
	}, [viewModeParsed])

	const showTransfers = useCallback(async () => {
		await SheetManager.hide("TopBarActionSheet")

		navigationAnimation({ enable: true }).then(() => {
			navigation.dispatch(StackActions.push("TransfersScreen"))
		})
	}, [])

	const clearTrash = useCallback(async () => {
		await SheetManager.hide("TopBarActionSheet")

		Alert.alert(
			i18n(lang, "emptyTrash"),
			i18n(lang, "emptyTrashWarning"),
			[
				{
					text: i18n(lang, "cancel"),
					onPress: () => {
						return false
					},
					style: "cancel"
				},
				{
					text: i18n(lang, "ok"),
					onPress: () => {
						Alert.alert(
							i18n(lang, "emptyTrash"),
							i18n(lang, "areYouReallySure"),
							[
								{
									text: i18n(lang, "cancel"),
									onPress: () => {
										return false
									},
									style: "cancel"
								},
								{
									text: i18n(lang, "ok"),
									onPress: () => {
										useStore.setState({ fullscreenLoadingModalVisible: true })

										emptyTrash()
											.then(() => {
												DeviceEventEmitter.emit("event", {
													type: "clear-list"
												})

												useStore.setState({ fullscreenLoadingModalVisible: false })
											})
											.catch(err => {
												console.error(err)

												useStore.setState({ fullscreenLoadingModalVisible: false })

												showToast({ message: err.toString() })
											})
									},
									style: "default"
								}
							],
							{
								cancelable: true
							}
						)
					},
					style: "default"
				}
			],
			{
				cancelable: true
			}
		)
	}, [lang])

	useEffect(() => {
		can()
	}, [photosGridSize])

	useEffect(() => {
		can()
	}, [routeURL])

	useEffect(() => {
		can()

		setBulkItems(currentItems.filter(item => item.selected))
	}, [currentItems])

	useEffect(() => {
		updateRouteURL()
		can()
	}, [currentRoutes])

	useEffect(() => {
		updateRouteURL()
		can()
	}, [])

	return (
		// @ts-ignore
		<ActionSheet
			id="TopBarActionSheet"
			gestureEnabled={true}
			containerStyle={{
				backgroundColor: getColor(darkMode, "backgroundSecondary"),
				borderTopLeftRadius: 15,
				borderTopRightRadius: 15
			}}
			indicatorStyle={{
				display: "none"
			}}
		>
			<View
				style={{
					paddingBottom: insets.bottom + (Platform.OS === "android" ? 25 : 5)
				}}
			>
				<View
					style={{
						height: 5
					}}
				/>
				{/*
					currentRouteName == "TransfersScreen" && (
						<>
							<ActionButton
								onPress={stopAllTransfers}
								icon="stop-circle-outline"
								text={i18n(lang, "stopAllTransfers")}
							/>
							<ActionButton
								onPress={pauseAllTransfers}
								icon="pause-circle-outline"
								text={i18n(lang, "pauseAllTransfers")}
							/>
							<ActionButton
								onPress={resumeAllTransfers}
								icon="play-circle-outline"
								text={i18n(lang, "resumeAllTransfers")}
							/>
						</>
					)
				*/}
				{currentRouteName !== "TransfersScreen" && (
					<>
						{routeURL.indexOf("photos") == -1 && routeURL.indexOf("recents") == -1 && currentItems.length > 0 && (
							<ActionButton
								onPress={sortBy}
								icon="funnel-outline"
								text={i18n(lang, "sortBy")}
							/>
						)}
						{canShowSelectAllItems && currentItems.length > 0 && (
							<ActionButton
								onPress={selectAll}
								icon="add-outline"
								text={i18n(lang, "selectAll")}
							/>
						)}
						{canShowUnselectAllItems && currentItems.length > 0 && itemsSelectedCount > 0 && (
							<ActionButton
								onPress={unselectAll}
								icon="remove-outline"
								text={i18n(lang, "unselectAll")}
							/>
						)}
						<>
							{routeURL.indexOf("trash") !== -1 &&
							itemsSelectedCount >= minBulkActionsItemCount &&
							itemsSelectedCount <= maxBulkActionsItemsCount ? (
								<>
									<ActionButton
										onPress={restore}
										icon="refresh-outline"
										text={i18n(lang, "restore")}
									/>
									<ActionButton
										onPress={permanentDelete}
										icon="close-circle-outline"
										text={i18n(lang, "deletePermanently")}
									/>
								</>
							) : (
								<>
									{routeURL.indexOf("recents") == -1 &&
										canShowBulkItemsActions &&
										canShowMoveItems &&
										itemsSelectedCount >= minBulkActionsItemCount &&
										itemsSelectedCount <= maxBulkActionsItemsCount && (
											<ActionButton
												onPress={move}
												icon="move-outline"
												text={i18n(lang, "move")}
											/>
										)}
									{canShowBulkItemsActions &&
										canShowAddFavorite &&
										itemsSelectedCount >= minBulkActionsItemCount &&
										itemsSelectedCount <= maxBulkActionsItemsCount && (
											<ActionButton
												onPress={favorite}
												icon="heart"
												text={i18n(lang, "favorite")}
											/>
										)}
									{canShowBulkItemsActions &&
										canShowRemoveFavorite &&
										itemsSelectedCount >= minBulkActionsItemCount &&
										itemsSelectedCount <= maxBulkActionsItemsCount && (
											<ActionButton
												onPress={unfavorite}
												icon="heart-outline"
												text={i18n(lang, "unfavorite")}
											/>
										)}
									{canShowBulkItemsActions &&
										canShowSaveToGallery &&
										itemsSelectedCount >= minBulkActionsItemCount &&
										itemsSelectedCount <= maxBulkActionsItemsCount && (
											<ActionButton
												onPress={saveToGallery}
												icon="image-outline"
												text={i18n(lang, "saveToGallery")}
											/>
										)}
									{canMakeAvailableOffline &&
										routeURL.indexOf("offline") == -1 &&
										canShowBulkItemsActions &&
										itemsSelectedCount >= minBulkActionsItemCount &&
										itemsSelectedCount <= maxBulkActionsItemsCount && (
											<ActionButton
												onPress={makeOffline}
												icon="save-outline"
												text={i18n(lang, "makeAvailableOffline")}
											/>
										)}
									{canShowBulkItemsActions &&
										canShowRemoveOffline &&
										itemsSelectedCount >= minBulkActionsItemCount &&
										itemsSelectedCount <= maxBulkActionsItemsCount && (
											<ActionButton
												onPress={removeFromOffline}
												icon="close-circle-outline"
												text={i18n(lang, "removeFromOfflineStorage")}
											/>
										)}
									{canDownload &&
										canShowBulkItemsActions &&
										itemsSelectedCount >= minBulkActionsItemCount &&
										itemsSelectedCount <= maxBulkActionsItemsCount && (
											<ActionButton
												onPress={download}
												icon="download-outline"
												text={i18n(lang, "download")}
											/>
										)}
									{canShowBulkItemsActions &&
										canShowTrash &&
										itemsSelectedCount >= minBulkActionsItemCount &&
										itemsSelectedCount <= maxBulkActionsItemsCount && (
											<ActionButton
												onPress={trash}
												icon="trash-outline"
												text={i18n(lang, "trash")}
											/>
										)}
									{/*
												canShowBulkItemsActions && canShowStopSharing && itemsSelectedCount >= minBulkActionsItemCount && itemsSelectedCount <= maxBulkActionsItemsCount && (
													<ActionButton
														onPress={stopSharing}
														icon="close-circle-outline"
														text={i18n(lang, "stopSharing")}
													/>
												)
											}
											{
												canShowBulkItemsActions && canShowRemoveSharedIn && itemsSelectedCount >= minBulkActionsItemCount && itemsSelectedCount <= maxBulkActionsItemsCount && (
													<ActionButton
														onPress={removeSharedIn}
														icon="close-circle-outline"
														text={i18n(lang, "remove")}
													/>
												)
											*/}
								</>
							)}
						</>
						{canShowListViewStyle && (
							<ActionButton
								onPress={updateViewMode}
								icon={viewModeParsed[routeURL] !== "grid" ? "grid-outline" : "list-outline"}
								text={viewModeParsed[routeURL] !== "grid" ? i18n(lang, "gridView") : i18n(lang, "listView")}
							/>
						)}
						{canShowTransfersButton && (
							<ActionButton
								onPress={showTransfers}
								icon="repeat-outline"
								text={i18n(lang, "transfers")}
							/>
						)}
						{routeURL.indexOf("trash") !== -1 && currentItems.length > 0 && (
							<ActionButton
								onPress={clearTrash}
								icon="trash-outline"
								text={i18n(lang, "emptyTrash")}
							/>
						)}
						<ActionButton
							onPress={async () => {
								await SheetManager.hide("TopBarActionSheet")
								await navigationAnimation({ enable: true })

								navigation.dispatch(StackActions.push("SettingsScreen"))
							}}
							icon="cog-outline"
							text={i18n(lang, "settings")}
						/>
					</>
				)}
			</View>
		</ActionSheet>
	)
})

export default TopBarActionSheet
