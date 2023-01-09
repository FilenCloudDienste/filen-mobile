import React, { useEffect, useState, memo, useCallback } from "react"
import { View, ScrollView, DeviceEventEmitter, Platform } from "react-native"
import ActionSheet, { SheetManager } from "react-native-actions-sheet"
import storage from "../../../lib/storage"
import { useMMKVString, useMMKVNumber } from "react-native-mmkv"
import { useSafeAreaInsets, EdgeInsets } from "react-native-safe-area-context"
import { useStore } from "../../../lib/state"
import { queueFileDownload, downloadFile } from "../../../lib/services/download/download"
import { getFileExt, getParent, getRouteURL, getFilePreviewType, calcPhotosGridSize } from "../../../lib/helpers"
import { showToast } from "../../Toasts"
import { i18n } from "../../../i18n"
import { StackActions } from "@react-navigation/native"
import { hasStoragePermissions, hasPhotoLibraryPermissions } from "../../../lib/permissions"
import { favoriteItem, trashItem, restoreItem, fileExists, folderExists } from "../../../lib/api"
import { addToSavedToGallery } from "../../../lib/services/items"
import { removeFromOfflineStorage } from "../../../lib/services/offline"
import { getColor } from "../../../style/colors"
import { navigationAnimation } from "../../../lib/state"
import ReactNativeBlobUtil from "react-native-blob-util"
import * as MediaLibrary from "expo-media-library"
import { isOnline } from "../../../lib/services/isOnline"
import useNetworkInfo from "../../../lib/services/isOnline/useNetworkInfo"
import { ActionButton, ActionSheetIndicator, ItemActionSheetItemHeader } from "../ActionSheets"
import useDarkMode from "../../../lib/hooks/useDarkMode"
import useLang from "../../../lib/hooks/useLang"
import type { NavigationContainerRef } from "@react-navigation/native"

export interface ItemActionSheetProps {
	navigation: NavigationContainerRef<ReactNavigation.RootParamList>
}

const ItemActionSheet = memo(({ navigation }: ItemActionSheetProps) => {
    const darkMode = useDarkMode()
	const insets: EdgeInsets = useSafeAreaInsets()
	const currentActionSheetItem = useStore(state => state.currentActionSheetItem)
	const lang = useLang()
	const [canSaveToGallery, setCanSaveToGallery] = useState<boolean>(false)
	const [itemListParent, setItemListParent] = useState<string>("")
	const [routeURL, setRouteURL] = useState<string>("")
	const [isDeviceOnline, setIsDeviceOnline] = useState<boolean>(false)
	const [canDownload, setCanDownload] = useState<boolean>(false)
	const [canEdit, setCanEdit] = useState<boolean>(false)
	const setTextEditorState = useStore(state => state.setTextEditorState)
	const setTextEditorText = useStore(state => state.setTextEditorText)
	const setCreateTextFileDialogName = useStore(state => state.setCreateTextFileDialogName)
	const setTextEditorParent = useStore(state => state.setTextEditorParent)
	const [photosGridSize, setPhotosGridSize] = useMMKVNumber("photosGridSize", storage)
	const [publicKey, setPublicKey] = useMMKVString("publicKey", storage)
    const [privateKey, setPrivateKey] = useMMKVString("privateKey", storage)
	const networkInfo = useNetworkInfo()

	const can = useCallback(() => {
		if(typeof currentActionSheetItem !== "undefined"){
			const userId: number = storage.getNumber("userId")
			const itemAvailableOffline: boolean = (typeof userId !== "undefined" ? (storage.getBoolean(userId + ":offlineItems:" + currentActionSheetItem.uuid) ? true : false) : false)
			const routeURL: string = getRouteURL()

			setCanSaveToGallery(false)
			setCanEdit(false)

			if(routeURL.indexOf("photos") == -1){
				if(Platform.OS == "ios"){
					if(["jpg", "jpeg", "heif", "heic", "png", "gif", "mov", "mp4", "hevc"].includes(getFileExt(currentActionSheetItem.name))){
						if(isOnline()){
							setCanSaveToGallery(true)
						}
						else{
							if(itemAvailableOffline){
								setCanSaveToGallery(true)
							}
						}
					}
				}
				else{
					if(["jpg", "jpeg", "png", "gif", "mov", "mp4"].includes(getFileExt(currentActionSheetItem.name))){
						if(isOnline()){
							setCanSaveToGallery(true)
						}
						else{
							if(itemAvailableOffline){
								setCanSaveToGallery(true)
							}
						}
					}
				}
			}

			if(["text", "code"].includes(getFilePreviewType(getFileExt(currentActionSheetItem.name))) && routeURL.indexOf("shared") == -1){
				setCanEdit(true)
			}

			setCanDownload(false)

			if(isOnline()){
				setCanDownload(true)
			}
			else{
				if(itemAvailableOffline){
					setCanDownload(true)
				}
			}
		}
	}, [currentActionSheetItem])

	useEffect(() => {
		setIsDeviceOnline(networkInfo.online)
		can()
	}, [networkInfo])

	useEffect(() => {
		setIsDeviceOnline(isOnline())

		if(typeof currentActionSheetItem !== "undefined"){
			can()
			setItemListParent(getParent())
			setRouteURL(getRouteURL())
		}
	}, [currentActionSheetItem])

    return (
		// @ts-ignore
        <ActionSheet
			id="ItemActionSheet"
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
          	<ScrollView
				style={{
					paddingBottom: (insets.bottom + 25)
				}}
			>
				{
					typeof currentActionSheetItem !== "undefined" && (
						<>
							<ActionSheetIndicator />
							<ItemActionSheetItemHeader />
							<View
								style={{
									marginTop: 0
								}}
							>
								{
									routeURL.indexOf("photos") !== -1 && calcPhotosGridSize(photosGridSize) < 6 && (
										<ActionButton
											onPress={async () => {
												await SheetManager.hide("ItemActionSheet")

												DeviceEventEmitter.emit("event", {
													type: currentActionSheetItem.selected ? "unselect-item" : "select-item",
													data: currentActionSheetItem
												})
											}}
											icon="checkmark-circle-outline"
											text={i18n(lang, currentActionSheetItem.selected ? "unselect" : "select")}
										/>
									)
								}
								{
									isDeviceOnline && itemListParent !== "trash" && routeURL.indexOf("shared-in") == -1 && itemListParent !== "offline" && typeof publicKey == "string" && typeof privateKey == "string" && publicKey.length > 16 && privateKey.length > 16 && (
										<>
											<ActionButton
												onPress={async () => {
													await SheetManager.hide("ItemActionSheet")
				
													DeviceEventEmitter.emit("openShareActionSheet", currentActionSheetItem)
												}}
												icon="share-social-outline"
												text={i18n(lang, "share")}
											/>
											<ActionButton
												onPress={async () => {
													await SheetManager.hide("ItemActionSheet")

													DeviceEventEmitter.emit("showPublicLinkActionSheet", currentActionSheetItem)
												}}
												icon="link-outline"
												text={i18n(lang, "publicLink")}
											/>
										</>
									)
								}
								{
									canSaveToGallery && currentActionSheetItem.type == "file" && (
										<ActionButton
											onPress={async () => {
												await SheetManager.hide("ItemActionSheet")

												useStore.setState({ fullscreenLoadingModalVisible: false })

												hasStoragePermissions().then(() => {
													hasPhotoLibraryPermissions().then(() => {
														queueFileDownload({
															file: currentActionSheetItem,
															saveToGalleryCallback: (path: string) => {
																MediaLibrary.saveToLibraryAsync(path).then(() => {
																	addToSavedToGallery(currentActionSheetItem)

																	showToast({ message: i18n(lang, "itemSavedToGallery", true, ["__NAME__"], [currentActionSheetItem.name]) })
																}).catch((err) => {
																	console.log(err)
			
																	showToast({ message: err.toString() })
																})
															}
														}).catch((err) => {
															if(err == "stopped"){
																return
															}

															if(err == "wifiOnly"){
																return showToast({ message: i18n(lang, "onlyWifiDownloads") })
															}

															console.error(err)

															showToast({ message: err.toString() })
														})
													}).catch((err) => {
														console.log(err)

														showToast({ message: err.toString() })
													})
												}).catch((err) => {
													console.log(err)

													showToast({ message: err.toString() })
												})
											}}
											icon="image-outline"
											text={i18n(lang, "saveToGallery")} 
										/>
									)
								}
								{
									canEdit && currentActionSheetItem.type == "file" && itemListParent !== "offline" && routeURL.indexOf("shared-in") == -1 && (
										<ActionButton
											onPress={async () => {
												await SheetManager.hide("ItemActionSheet")
			
												hasStoragePermissions().then(() => {
													downloadFile(currentActionSheetItem, false, false).then((path) => {
														ReactNativeBlobUtil.fs.readFile(path, "utf8").then((data) => {
															setTextEditorState("edit")
															setTextEditorParent(currentActionSheetItem.parent)
															setCreateTextFileDialogName(currentActionSheetItem.name)
															setTextEditorText(data)
															
															navigationAnimation({ enable: true }).then(() => {
																navigation.dispatch(StackActions.push("TextEditorScreen"))
															})
														}).catch((err) => {
															console.log(err)

															showToast({ message: err.toString() })
														})
													}).catch((err) => {
														console.log(err)
		
														showToast({ message: err.toString() })
													})
												}).catch((err) => {
													console.log(err)

													showToast({ message: err.toString() })
												})
											}}
											icon="create-outline"
											text={i18n(lang, "edit")}
										/>
									)
								}
								{
									canDownload && currentActionSheetItem.type == "file" && itemListParent !== "offline" && (
										<ActionButton
											onPress={async () => {
												await SheetManager.hide("ItemActionSheet")
			
												hasStoragePermissions().then(() => {
													queueFileDownload({ file: currentActionSheetItem, showNotification: true }).catch((err) => {
														if(err == "stopped"){
															return
														}

														if(err == "wifiOnly"){
															return showToast({ message: i18n(lang, "onlyWifiDownloads") })
														}

														console.error(err)

														showToast({ message: err.toString() })
													})
												}).catch((err) => {
													console.log(err)

													showToast({ message: err.toString() })
												})
											}}
											icon="download-outline"
											text={i18n(lang, "download")}
										/>
									)
								}
								{
									currentActionSheetItem.type == "file" && itemListParent !== "trash" && currentActionSheetItem.offline && (
										<ActionButton
											onPress={async () => {
												await SheetManager.hide("ItemActionSheet")
			
												hasStoragePermissions().then(() => {
													removeFromOfflineStorage({ item: currentActionSheetItem }).then(() => {
														//showToast({ message: i18n(lang, "itemRemovedFromOfflineStorage", true, ["__NAME__"], [currentActionSheetItem.name]) })
													}).catch((err) => {
														console.log(err)
		
														showToast({ message: err.toString() })
													})
												}).catch((err) => {
													console.log(err)

													showToast({ message: err.toString() })
												})
											}}
											icon="close-circle-outline"
											text={i18n(lang, "removeFromOfflineStorage")}
										/>
									)
								}
								{
									isDeviceOnline && currentActionSheetItem.type == "file" && itemListParent !== "trash" && !currentActionSheetItem.offline && (
										<ActionButton
											onPress={async () => {
												await SheetManager.hide("ItemActionSheet")
			
												hasStoragePermissions().then(() => {
													queueFileDownload({ file: currentActionSheetItem, storeOffline: true }).catch((err) => {
														if(err == "stopped"){
															return
														}
														
														if(err == "wifiOnly"){
															return showToast({ message: i18n(lang, "onlyWifiDownloads") })
														}

														console.error(err)

														showToast({ message: err.toString() })
													})
												}).catch((err) => {
													console.log(err)

													showToast({ message: err.toString() })
												})
											}}
											icon="save-outline"
											text={i18n(lang, "makeAvailableOffline")}
										/>
									)
								}
								{
									isDeviceOnline && currentActionSheetItem.type == "file" && itemListParent !== "trash" && routeURL.indexOf("shared-in") == -1 && itemListParent !== "offline" && (
										<ActionButton 
											onPress={async () => {
												await SheetManager.hide("ItemActionSheet")
			
												DeviceEventEmitter.emit("openFileVersionsActionSheet", currentActionSheetItem)
											}}
											icon="time-outline"
											text={i18n(lang, "versionHistory")}
										/>
									)
								}
								{
									isDeviceOnline && itemListParent !== "trash" && routeURL.indexOf("shared-in") == -1 && itemListParent !== "offline" && (
										<ActionButton
											onPress={async () => {
												await SheetManager.hide("ItemActionSheet")

												useStore.setState({ fullscreenLoadingModalVisible: true })
			
												const value = currentActionSheetItem.favorited ? 0 : 1
			
												favoriteItem({
													item: currentActionSheetItem,
													value
												}).then(async () => {
													DeviceEventEmitter.emit("event", {
														type: "mark-item-favorite",
														data: {
															uuid: currentActionSheetItem.uuid,
															value: value == 1 ? true : false
														}
													})
			
													useStore.setState({ fullscreenLoadingModalVisible: false })
			
													//showToast({ message: i18n(lang, value == 1 ? "itemFavorited" : "itemUnfavorited", true, ["__NAME__"], [currentActionSheetItem.name]) })
												}).catch((err) => {
													console.log(err)
			
													useStore.setState({ fullscreenLoadingModalVisible: false })
			
													showToast({ message: err.toString() })
												})
											}}
											icon="heart-outline"
											text={currentActionSheetItem.favorited ? i18n(lang, "unfavorite") : i18n(lang, "favorite")}
										/>
									)
								}
								{
									isDeviceOnline && currentActionSheetItem.type == "folder" && routeURL.indexOf("shared-in") == -1 && itemListParent !== "offline" && (
										<ActionButton
											onPress={async () => {
												await SheetManager.hide("ItemActionSheet")

												DeviceEventEmitter.emit("openFolderColorActionSheet", currentActionSheetItem)
											}}
											icon="color-fill-outline"
											text={i18n(lang, "color")}
										/>
									)
								}
								{
									isDeviceOnline && !currentActionSheetItem.isSync && !currentActionSheetItem.isDefault && itemListParent !== "trash" && routeURL.indexOf("shared-in") == -1 && routeURL.indexOf("shared-out") == -1 && routeURL.indexOf("links") == -1 && routeURL.indexOf("favorites") == -1 && routeURL.indexOf("offline") == -1 && routeURL.indexOf("recents") == -1 && routeURL.indexOf("photos") == -1 && (
										<ActionButton 
											onPress={async () => {
												await SheetManager.hide("ItemActionSheet")
			
												showToast({ type: "move", message: i18n(lang, "moveItem", true, ["__NAME__"], [currentActionSheetItem.name]) })
											}}
											icon="move-outline"
											text={i18n(lang, "move")}
										/>
									)
								}
								{
									!currentActionSheetItem.isSync && isDeviceOnline && routeURL.indexOf("shared-in") == -1 && itemListParent !== "offline" && routeURL.indexOf("photos") == -1 && (
										<ActionButton 
											onPress={async () => {
												await SheetManager.hide("ItemActionSheet")
			
												DeviceEventEmitter.emit("openRenameDialog", currentActionSheetItem)
											}}
											icon="text-outline"
											text={i18n(lang, "rename")}
										/>
									)
								}
								{
									isDeviceOnline && !currentActionSheetItem.isSync && !currentActionSheetItem.isDefault && itemListParent !== "trash" && routeURL.indexOf("shared-in") == -1 && itemListParent !== "offline" && (
										<ActionButton
											onPress={async () => {
												await SheetManager.hide("ItemActionSheet")

												useStore.setState({ fullscreenLoadingModalVisible: true })
			
												trashItem({ item: currentActionSheetItem }).then(async () => {
													DeviceEventEmitter.emit("event", {
														type: "remove-item",
														data: {
															uuid: currentActionSheetItem.uuid
														}
													})

													useStore.setState({ fullscreenLoadingModalVisible: false })

													//showToast({ message: i18n(lang, "itemTrashed", true, ["__NAME__"], [currentActionSheetItem.name]) })
												}).catch(async (err) => {
													console.log(err)

													if(err.toString().toLowerCase().indexOf("already in the trash") !== -1){
														DeviceEventEmitter.emit("event", {
															type: "remove-item",
															data: {
																uuid: currentActionSheetItem.uuid
															}
														})
													}
													else{
														showToast({ message: err.toString() })
													}

													useStore.setState({ fullscreenLoadingModalVisible: false })
												})
											}}
											icon="trash-outline"
											text={i18n(lang, "trash")}
										/>
									)
								}
								{
									typeof currentActionSheetItem == "object" && isDeviceOnline && itemListParent == "trash" && routeURL.indexOf("shared-in") == -1 && (
										<>
											<ActionButton
												onPress={async () => {
													await SheetManager.hide("ItemActionSheet")

													DeviceEventEmitter.emit("openConfirmPermanentDeleteDialog", currentActionSheetItem)
												}}
												icon="close-circle-outline"
												text={i18n(lang, "deletePermanently")}
											/>
											<ActionButton
												onPress={async () => {
													await SheetManager.hide("ItemActionSheet")

													useStore.setState({ fullscreenLoadingModalVisible: true })

													const restore = () => {
														restoreItem({ item: currentActionSheetItem }).then(async () => {
															DeviceEventEmitter.emit("event", {
																type: "remove-item",
																data: {
																	uuid: currentActionSheetItem.uuid
																}
															})
		
															useStore.setState({ fullscreenLoadingModalVisible: false })
		
															showToast({ message: i18n(lang, "itemRestored", true, ["__NAME__"], [currentActionSheetItem.name]) })
														}).catch((err) => {
															console.log(err)

															showToast({ message: err.toString() })
		
															useStore.setState({ fullscreenLoadingModalVisible: false })
														})
													}

													if(currentActionSheetItem.type == "file"){
														fileExists({ name: currentActionSheetItem.name, parent: currentActionSheetItem.parent }).then((res) => {
															if(res.exists){
																useStore.setState({ fullscreenLoadingModalVisible: false })

																return showToast({ message: i18n(lang, "alreadyExistsAtRestoreDestination", true, ["__NAME__"], [currentActionSheetItem.name]) })
															}

															restore()
														}).catch((err) => {
															console.log(err)
		
															showToast({ message: err.toString() })
		
															useStore.setState({ fullscreenLoadingModalVisible: false })
														})
													}
													else{
														folderExists({ name: currentActionSheetItem.name, parent: currentActionSheetItem.parent }).then((res) => {
															if(res.exists){
																useStore.setState({ fullscreenLoadingModalVisible: false })

																return showToast({ message: i18n(lang, "alreadyExistsAtRestoreDestination", true, ["__NAME__"], [currentActionSheetItem.name]) })
															}

															restore()
														}).catch((err) => {
															console.log(err)
		
															showToast({ message: err.toString() })
		
															useStore.setState({ fullscreenLoadingModalVisible: false })
														})
													}
												}}
												icon="refresh-outline"
												text={i18n(lang, "restore")}
											/>
										</>
									)
								}
								{
									isDeviceOnline && routeURL.indexOf("shared-in") !== -1 && getParent().length < 32 && (
										<ActionButton
											onPress={async () => {
												await SheetManager.hide("ItemActionSheet")

												DeviceEventEmitter.emit("openConfirmRemoveFromSharedInDialog", currentActionSheetItem)
											}}
											icon="close-circle-outline"
											text={i18n(lang, "removeFromSharedIn")}
										/>
									)
								}
								{
									isDeviceOnline && routeURL.indexOf("shared-out") !== -1 && getParent().length < 32 && (
										<ActionButton
											onPress={async () => {
												await SheetManager.hide("ItemActionSheet")

												DeviceEventEmitter.emit("openConfirmStopSharingDialog", currentActionSheetItem)
											}}
											icon="close-circle-outline"
											text={i18n(lang, "stopSharing")}
										/>
									)
								}
								{
									!isDeviceOnline && (
										<ActionButton
											onPress={async () => {
												await SheetManager.hide("ItemActionSheet")
											}}
											icon="cloud-offline-outline"
											text={i18n(lang, "deviceOffline")}
										/>
									)
								}
							</View>
						</>
					)
				}
          	</ScrollView>
        </ActionSheet>
    )
})

export default ItemActionSheet