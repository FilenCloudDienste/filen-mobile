import React, { useEffect, useState, useRef, memo } from "react"
import { View, Text, ScrollView, TouchableHighlight, DeviceEventEmitter, Platform, ActivityIndicator, Switch, TextInput, TouchableOpacity, Share, Alert } from "react-native"
import ActionSheet, { SheetManager } from "react-native-actions-sheet"
import storage from "../lib/storage"
import { useMMKVBoolean, useMMKVString, useMMKVNumber } from "react-native-mmkv"
import { useSafeAreaInsets, EdgeInsets } from "react-native-safe-area-context"
import FastImage from "react-native-fast-image"
import { getImageForItem } from "../assets/thumbnails"
import Ionicon from "@expo/vector-icons/Ionicons"
import { useStore } from "../lib/state"
import { queueFileDownload, downloadFile } from "../lib/download"
import { getRandomArbitrary, convertTimestampToMs, getFileExt, getFolderColor, formatBytes, getAvailableFolderColors, getMasterKeys, decryptFolderLinkKey, getParent, getRouteURL, decryptFileMetadata, getFilePreviewType, calcPhotosGridSize, convertUint8ArrayToBinaryString, base64ToArrayBuffer, getAPIServer, getAPIKey, simpleDate } from "../lib/helpers"
import { queueFileUpload, UploadFile } from "../lib/upload"
import { showToast } from "./Toasts"
import { i18n } from "../i18n/i18n"
import { StackActions } from "@react-navigation/native"
import CameraRoll from "@react-native-community/cameraroll"
import { hasStoragePermissions, hasPhotoLibraryPermissions, hasCameraPermissions } from "../lib/permissions"
import { changeFolderColor, favoriteItem, itemPublicLinkInfo, editItemPublicLink, getPublicKeyFromEmail, shareItemToUser, trashItem, restoreItem, fileExists, folderExists, fetchFileVersionData, restoreArchivedFile, bulkFavorite, bulkTrash, bulkDeletePermanently, bulkRestore, bulkStopSharing, bulkRemoveSharedIn, emptyTrash, reportError } from "../lib/api"
import * as Clipboard from "expo-clipboard"
import { previewItem } from "../lib/services/items"
import { removeFromOfflineStorage } from "../lib/services/offline"
import RNPickerSelect from "react-native-picker-select"
import { getColor } from "../lib/style/colors"
import { navigationAnimation } from "../lib/state"
import { updateUserInfo } from "../lib/user/info"
import ReactNativeBlobUtil from "react-native-blob-util"
import * as RNDocumentPicker from "react-native-document-picker"
import * as RNImagePicker from "react-native-image-picker"

const mimeTypes = require("mime-types")

const THUMBNAIL_BASE_PATH: string = ReactNativeBlobUtil.fs.dirs.DocumentDir + "/thumbnailCache/"

interface ActionButtonProps {
	onPress: any,
	icon?: any,
	text: string,
	color?: string,
	key?: string | number
}

export const ActionButton = memo(({ onPress, icon, text, color }: ActionButtonProps) => {
	const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)

	return (
		<TouchableHighlight
			underlayColor={getColor(darkMode, "underlayActionSheet")}
			style={{
				width: "100%",
				height: 45
			}}
			onPress={onPress}
		>
			<View
				style={{
					width: "100%",
					height: 45,
					flexDirection: "row",
					alignContent: "flex-start",
					paddingLeft: 20,
					paddingRight: 20
				}}
			>
				{
					typeof color !== "undefined" ? (
						<View
							style={{
								backgroundColor: color,
								height: 22,
								width: 22,
								borderRadius: 22,
								marginTop: 12
							}}
						/>
					) : (
						<View
							style={{
								paddingTop: 11
							}}
						>
							<Ionicon
								name={icon}
								size={22}
								color={darkMode ? "gray" : "gray"}
							/>
						</View>
					)
				}
				<View
					style={{
						paddingTop: 14,
						marginLeft: 15,
						borderBottomColor: getColor(darkMode, "actionSheetBorder"),
						borderBottomWidth: 1,
						width: "100%"
					}}
				>
					<Text
						style={{
							color: darkMode ? "white" : "black"
						}}
					>
						{text}
					</Text>
				</View>
			</View>
		</TouchableHighlight>
	)
})

export const BottomBarAddActionSheet = memo(() => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
	const currentRoutes = useStore(state => state.currentRoutes)
	const insets: EdgeInsets = useSafeAreaInsets()
	const setCreateFolderDialogVisible = useStore(state => state.setCreateFolderDialogVisible)
	const [lang, setLang] = useMMKVString("lang", storage)
	const setCreateTextFileDialogVisible = useStore(state => state.setCreateTextFileDialogVisible)

    return (
		// @ts-ignore
        <ActionSheet
			id="BottomBarAddActionSheet"
			gestureEnabled={true}
			containerStyle={{
				backgroundColor: darkMode ? "#171717" : "white",
				borderTopLeftRadius: 15,
				borderTopRightRadius: 15
			}}
			indicatorStyle={{
				display: "none"
			}}
		>
          	<View
				style={{
					paddingBottom: (insets.bottom + 25)
				}}
			>
				<ActionSheetIndicator />
				<View
					style={{
						height: 15
					}}
				/>
				<ActionButton
					onPress={async () => {
						await SheetManager.hide("BottomBarAddActionSheet")

						setCreateFolderDialogVisible(true)
					}}
					icon="folder-outline"
					text={i18n(lang, "createFolder")}
				/>
				{
					typeof currentRoutes == "object"
					&& Array.isArray(currentRoutes)
					&& typeof currentRoutes[currentRoutes.length - 1].params == "object"
					&& typeof currentRoutes[currentRoutes.length - 1].params.parent !== "undefined"
					&& currentRoutes[currentRoutes.length - 1].params.parent !== "base"
					&& (
						<>
							<ActionButton
								onPress={async () => {
									await SheetManager.hide("BottomBarAddActionSheet")

									setCreateTextFileDialogVisible(true)
								}}
								icon="create-outline"
								text={i18n(lang, "createTextFile")}
							/>
							<ActionButton 
								onPress={async () => {
									await SheetManager.hide("BottomBarAddActionSheet")

									setTimeout(() => {
										hasCameraPermissions().then(() => {
											storage.set("biometricPinAuthTimeout:" + storage.getNumber("userId"), (Math.floor(+new Date()) + 500000))

											const getFileInfo = (asset: RNImagePicker.Asset): Promise<UploadFile> => {
												return new Promise((resolve, reject) => {
													ReactNativeBlobUtil.fs.stat(asset.uri?.replace("file://", "") as string).then((info) => {
														return resolve({
															path: asset.uri?.replace("file://", "") as string,
															name: i18n(lang, getFilePreviewType(getFileExt(asset.uri as string)) == "image" ? "photo" : "video") + "_" + new Date().toISOString().split(":").join("-").split(".").join("-") + getRandomArbitrary(1, 999999999) +  "." + getFileExt(asset.uri as string),
															size: info.size as number,
															mime: typeof mimeTypes.lookup(asset.uri as string) == "string" ? mimeTypes.lookup(asset.uri as string) : asset.type as string,
															lastModified: convertTimestampToMs(info.lastModified || new Date().getTime())
														})
													}).catch(reject)
												})
											}

											RNImagePicker.launchCamera({
												maxWidth: 999999999,
												maxHeight: 999999999,
												videoQuality: "high",
												cameraType: "back",
												quality: 1,
												includeBase64: false,
												includeExtra: true,
												saveToPhotos: false,
												mediaType: "photo"
											}).then(async (response) => {
												if(response.didCancel){
													return
												}

												const parent = getParent()

												if(parent.length < 16){
													return
												}

												if(response.errorMessage){
													console.log(response.errorMessage)

													return showToast({ message: response.errorMessage.toString() })
												}

												if(response.assets){
													for(const asset of response.assets){
														if(asset.uri){
															try{
																const file = await getFileInfo(asset)
		
																queueFileUpload({ file, parent })
															}
															catch(e: any){
																console.log(e)
		
																showToast({ message: e.toString() })
															}
														}
													}
												}
											}).catch((err) => {
												if(err.toString().toLowerCase().indexOf("cancelled") == -1 && err.toString().toLowerCase().indexOf("canceled") == -1){
													console.log(err)

													reportError(err, "actionSheets:launchImageLibrary:launchCamera")

													showToast({ message: err.toString() })
												}
											})
										}).catch((err) => {
											console.log(err)

											showToast({ message: err.toString() })
										})
									}, 500)
								}}
								icon="camera-outline"
								text={i18n(lang, "takePhotoAndUpload")}
							/>
							<ActionButton
								onPress={async () => {
									await SheetManager.hide("BottomBarAddActionSheet")
	
									setTimeout(() => {
										hasPhotoLibraryPermissions().then(() => {
											hasStoragePermissions().then(() => {
												storage.set("biometricPinAuthTimeout:" + storage.getNumber("userId"), (Math.floor(+new Date()) + 500000))

												const getFileInfo = (asset: RNImagePicker.Asset): Promise<UploadFile> => {
													return new Promise((resolve, reject) => {
														ReactNativeBlobUtil.fs.stat(asset.uri?.replace("file://", "") as string).then((info) => {
															return resolve({
																path: asset.uri?.replace("file://", "") as string,
																name: i18n(lang, getFilePreviewType(getFileExt(asset.uri as string)) == "image" ? "photo" : "video") + "_" + new Date().toISOString().split(":").join("-").split(".").join("-") + getRandomArbitrary(1, 999999999) +  "." + getFileExt(asset.uri as string),
																size: info.size as number,
																mime: typeof mimeTypes.lookup(asset.uri as string) == "string" ? mimeTypes.lookup(asset.uri as string) : asset.type as string,
																lastModified: convertTimestampToMs(info.lastModified || new Date().getTime())
															})
														}).catch(reject)
													})
												}

												RNImagePicker.launchImageLibrary({
													mediaType: "mixed",
													selectionLimit: 100,
													quality: 1,
													videoQuality: "high",
													includeBase64: false,
													includeExtra: true,
													maxWidth: 999999999,
													maxHeight: 999999999
												}).then(async (response) => {
													if(response.didCancel){
														return
													}

													const parent = getParent()
	
													if(parent.length < 16){
														return
													}

													if(response.errorMessage){
														console.log(response.errorMessage)

														return showToast({ message: response.errorMessage.toString() })
													}

													if(response.assets){
														for(const asset of response.assets){
															if(asset.uri){
																try{
																	const file = await getFileInfo(asset)
			
																	queueFileUpload({ file, parent })
																}
																catch(e: any){
																	console.log(e)
			
																	showToast({ message: e.toString() })
																}
															}
														}
													}
												}).catch((err) => {
													if(err.toString().toLowerCase().indexOf("cancelled") == -1 && err.toString().toLowerCase().indexOf("canceled") == -1){
														console.log(err)

														showToast({ message: err.toString() })
													}
												})
											}).catch((err) => {
												console.log(err)

												showToast({ message: err.toString() })
											})
										}).catch((err) => {
											console.log(err)

											showToast({ message: err.toString() })
										})
									}, 500)
								}}
								icon="image-outline"
								text={i18n(lang, "uploadFromGallery")}
							/>
							<ActionButton
								onPress={async () => {
									await SheetManager.hide("BottomBarAddActionSheet")

									setTimeout(() => {
										hasStoragePermissions().then(() => {
											storage.set("biometricPinAuthTimeout:" + storage.getNumber("userId"), (Math.floor(+new Date()) + 500000))

											const getFileInfo = (result: RNDocumentPicker.DocumentPickerResponse): Promise<UploadFile> => {
												return new Promise((resolve, reject) => {
													const tempPath = ReactNativeBlobUtil.fs.dirs.CacheDir + "/" + new Date().getTime() + "_" + result.name

													ReactNativeBlobUtil.fs.stat(result.uri.replace("file://", "")).then((info) => {
														ReactNativeBlobUtil.fs.cp(result.uri.replace("file://", ""), tempPath).then(() => {
															return resolve({
																path: tempPath,
																name: result.name,
																size: info.size as number,
																mime: typeof mimeTypes.lookup(result.name) == "string" ? mimeTypes.lookup(result.name) : result.type,
																lastModified: convertTimestampToMs(info.lastModified || new Date().getTime())
															})
														}).catch(reject)
													}).catch(reject)
												})
											}

											RNDocumentPicker.pickMultiple({
												mode: "open",
												allowMultiSelection: true
											}).then(async (result) => {
												const parent = getParent()
			
												if(parent.length < 16){
													return
												}

												for(let i = 0; i < result.length; i++){
													try{
														const file = await getFileInfo(result[i])

														queueFileUpload({ file, parent })
													}
													catch(e: any){
														console.log(e)

														showToast({ message: e.toString() })
													}
												}
											}).catch((err) => {
												if(RNDocumentPicker.isCancel(err)){
													return
												}

												console.log(err)

												showToast({ message: err.toString() })
											})
										}).catch((err) => {
											console.log(err)

											showToast({ message: err.toString() })
										})
									}, 500)
								}}
								icon="cloud-upload-outline"
								text={i18n(lang, "uploadFiles")}
							/>
						</>
					)
				}
			</View>
        </ActionSheet>
    )
})

export interface TopBarActionSheetProps {
	navigation: any
}

export const TopBarActionSheet = memo(({ navigation }: TopBarActionSheetProps) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
	const insets: EdgeInsets = useSafeAreaInsets()
	const [itemViewMode, setItemViewMode] = useMMKVString("itemViewMode", storage)
	const [lang, setLang] = useMMKVString("lang", storage)
	const currentRoutes = useStore(state => state.currentRoutes)
	const [routeURL, setRouteURL] = useState<string>("")
	const [photosGridSize, setPhotosGridSize] = useMMKVNumber("photosGridSize", storage)
	const [canShowListViewStyle, setCanShowListViewStyle] = useState<boolean>(false)
	const [canShowSelectAllItems, setCanShowSelectAllItems] = useState<boolean>(false)
	const [canShowUnselectAllItems, setCanShowUnselectAllItems] = useState<boolean>(false)
	const [canShowTransfersButton, setCanShowTransfersButton] = useState<boolean>(false)
	const itemsSelectedCount = useStore(state => state.itemsSelectedCount)
	const [canShowBulkItemsActions, setCanShowBulkItemsActions] = useState<boolean>(false)
	const [canShowMoveItems, setCanShowMoveItems] = useState<boolean>(false)
	const currentItems = useStore(state => state.currentItems)
	const [canShowSaveToGallery, setCanShowSaveToGallery] = useState<boolean>(false)
	const [canShowShare, setCanShowShare] = useState<boolean>(false)
	const [canShowTrash, setCanShowTrash] = useState<boolean>(false)
	const [canShowRemoveOffline, setCanShowRemoveOffline] = useState<boolean>(false)
	const [canShowRemoveFavorite, setCanShowRemoveFavorite] = useState<boolean>(false)
	const setCurrentBulkItems = useStore(state => state.setCurrentBulkItems)
	const setBulkShareDialogVisible = useStore(state => state.setBulkShareDialogVisible)
	const [canShowAddFavorite, setCanShowAddFavorite] = useState<boolean>(false)
	const [canShowRemoveSharedIn, setCanShowRemoveSharedIn] = useState<boolean>(false)
	const [canShowStopSharing, setCanShowStopSharing] = useState<boolean>(false)
	const [publicKey, setPublicKey] = useMMKVString("publicKey", storage)
    const [privateKey, setPrivateKey] = useMMKVString("privateKey", storage)
	const [currentRouteName, setCurrentRouteName] = useState<string>("")
	const [canMakeAvailableOffline, setCanMakeAvailableOffline] = useState<boolean>(false)
	const [canDownload, setCanDownload] = useState<boolean>(false)

	const maxBulkActionsItemsCount: number = 10000
	const minBulkActionsItemCount: number = 2

	const doesSelectedItemsContainOfflineStoredItems = (): boolean => {
		if(!Array.isArray(currentItems)){
			return false
		}

		return currentItems.filter(item => item.offline && item.selected).length > 0 ? true : false
	}

	const doesSelectedItemsContainFavoritedItems = (): boolean => {
		if(!Array.isArray(currentItems)){
			return false
		}

		return currentItems.filter(item => item.favorited && item.selected).length > 0 ? true : false
	}

	const doesSelectedItemsContainUnmovableItems = (): boolean => {
		if(!Array.isArray(currentItems)){
			return false
		}

		return currentItems.filter(item => (item.isDefault || item.isSync) && item.selected).length > 0 ? true : false
	}

	const doesSelecteditemsContainGallerySaveableItems = (): boolean => {
		if(!Array.isArray(currentItems)){
			return false
		}

		let extArray: any[] = []

		if(Platform.OS == "ios"){
			extArray = ["jpg", "jpeg", "heif", "heic", "png", "gif", "mov", "mp4", "hevc"]
		}
		else{
			extArray = ["jpg", "jpeg", "png", "gif", "mov", "mp4"]
		}

		return currentItems.filter(item => item.selected && extArray.includes(getFileExt(item.name))).length > 0 ? true : false
	}

	const doesSelectedItemsContainFolders = (): boolean => {
		if(!Array.isArray(currentItems)){
			return false
		}

		return currentItems.filter(item => item.type == "folder" && item.selected).length > 0 ? true : false
	}

	const updateBulkItems = (): any[] => {
		const bulkItems: any[] = []

		for(let i = 0; i < currentItems.length; i++){
			if(currentItems[i].selected){
				bulkItems.push(currentItems[i])
			}
		}

		setCurrentBulkItems(bulkItems)

		return bulkItems
	}

	const can = (): void => {
		setCanShowTransfersButton(true)
		setCanShowSelectAllItems(true)
		setCanShowUnselectAllItems(true)
		setCanShowListViewStyle(true)
		setCanShowBulkItemsActions(true)
		setCanShowMoveItems(true)
		setCanShowSaveToGallery(true)
		setCanShowShare(true)
		setCanShowTrash(true)
		setCanShowRemoveOffline(true)
		setCanShowRemoveFavorite(true)
		setCanShowAddFavorite(true)
		setCanShowRemoveSharedIn(true)
		setCanShowStopSharing(true)
		setCanMakeAvailableOffline(true)
		setCanDownload(true)

		if(routeURL.indexOf("photos") !== -1){
			setCanShowListViewStyle(false)
			setCanShowMoveItems(false)

			if(calcPhotosGridSize(photosGridSize) >= 6){
				setCanShowSelectAllItems(false)
				setCanShowUnselectAllItems(false)
			}
		}

		if(routeURL.indexOf("transfers") !== -1){
			setCanShowBulkItemsActions(false)
		}

		if(routeURL.indexOf("settings") !== -1){
			setCanShowBulkItemsActions(false)
		}

		if(doesSelecteditemsContainGallerySaveableItems()){
			setCanShowSaveToGallery(true)
		}
		else{
			setCanShowSaveToGallery(false)
		}

		if(doesSelectedItemsContainOfflineStoredItems()){
			setCanShowRemoveOffline(true)
		}
		else{
			setCanShowRemoveOffline(false)
		}

		if(doesSelectedItemsContainFavoritedItems()){
			setCanShowRemoveFavorite(true)
		}
		else{
			setCanShowRemoveFavorite(false)
		}

		if(doesSelectedItemsContainUnmovableItems()){
			setCanShowMoveItems(false)
		}

		if(routeURL.indexOf("shared-in") !== -1){
			setCanShowShare(false)
			setCanShowTrash(false)
			setCanShowMoveItems(false)
			setCanShowRemoveOffline(false)
			setCanShowRemoveFavorite(false)
			setCanShowAddFavorite(false)
		}

		if(routeURL.indexOf("shared-in") == -1){
			setCanShowRemoveSharedIn(false)
		}

		if(routeURL.indexOf("shared-out") == -1){
			setCanShowStopSharing(false)
		}

		if(typeof publicKey == "string" && typeof privateKey == "string"){
			if(publicKey.length < 16 && privateKey.length < 16){
				setCanShowShare(false)
			}
		}
		else{
			setCanShowShare(false)
		}

		if(doesSelectedItemsContainFolders()){
			setCanDownload(false)
			setCanMakeAvailableOffline(false)
		}
	}

	const updateRouteURL = (): void => {
		if(typeof currentRoutes !== "undefined"){
			if(typeof currentRoutes[currentRoutes.length - 1] !== "undefined"){
				setRouteURL(getRouteURL(currentRoutes[currentRoutes.length - 1]))
				setCurrentRouteName(currentRoutes[currentRoutes.length - 1].name)
			}
		}
	}

	useEffect(() => {
		can()
	}, [photosGridSize])

	useEffect(() => {
		can()
	}, [routeURL])

	useEffect(() => {
		can()
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
				backgroundColor: darkMode ? "#171717" : "white",
				borderTopLeftRadius: 15,
				borderTopRightRadius: 15
			}}
			indicatorStyle={{
				display: "none"
			}}
		>
          	<View
				style={{
					paddingBottom: (insets.bottom + 25)
				}}
			>
				<ActionSheetIndicator />
				<View
					style={{
						height: 15
					}}
				/>
				{
					currentRouteName == "TransfersScreen" && (
						<>
							<ActionButton
								onPress={async () => {
									await SheetManager.hide("TopBarActionSheet")
				
									const currentUploads = useStore.getState().uploads
									const currentDownloads = useStore.getState().downloads

									for(let prop in currentUploads){
										currentUploads[prop].stopped = true
									}

									for(let prop in currentDownloads){
										currentDownloads[prop].stopped = true
									}

									useStore.setState({
										uploads: currentUploads,
										downloads: currentDownloads
									})
								}}
								icon="stop-circle-outline"
								text={i18n(lang, "stopAllTransfers")}
							/>
							<ActionButton
								onPress={async () => {
									await SheetManager.hide("TopBarActionSheet")
				
									const currentUploads = useStore.getState().uploads
									const currentDownloads = useStore.getState().downloads

									for(let prop in currentUploads){
										currentUploads[prop].paused = true
									}

									for(let prop in currentDownloads){
										currentDownloads[prop].paused = true
									}

									useStore.setState({
										uploads: currentUploads,
										downloads: currentDownloads
									})
								}}
								icon="pause-circle-outline"
								text={i18n(lang, "pauseAllTransfers")}
							/>
							<ActionButton
								onPress={async () => {
									await SheetManager.hide("TopBarActionSheet")
				
									const currentUploads = useStore.getState().uploads
									const currentDownloads = useStore.getState().downloads

									for(let prop in currentUploads){
										currentUploads[prop].paused = false
									}

									for(let prop in currentDownloads){
										currentDownloads[prop].paused = false
									}

									useStore.setState({
										uploads: currentUploads,
										downloads: currentDownloads
									})
								}}
								icon="play-circle-outline"
								text={i18n(lang, "resumeAllTransfers")}
							/>
						</>
					)
				}
				{
					currentRouteName !== "TransfersScreen" && (
						<>
							{
								routeURL.indexOf("photos") == -1 && routeURL.indexOf("recents") == -1 && currentItems.length > 0 && (
									<ActionButton
										onPress={async () => {
											await SheetManager.hide("TopBarActionSheet")
						
											SheetManager.show("SortByActionSheet")
										}}
										icon="funnel-outline"
										text={i18n(lang, "sortBy")} 
									/>
								)
							}
							{
								canShowSelectAllItems && currentItems.length > 0 && (
									<ActionButton
										onPress={async () => {
											//await SheetManager.hide("TopBarActionSheet")
						
											DeviceEventEmitter.emit("event", {
												type: "select-all-items"
											})
										}}
										icon="add-outline"
										text={i18n(lang, "selectAll")}
									/>
								)
							}
							{
								canShowUnselectAllItems && currentItems.length > 0 && itemsSelectedCount > 0 && (
									<ActionButton
										onPress={async () => {
											await SheetManager.hide("TopBarActionSheet")
						
											DeviceEventEmitter.emit("event", {
												type: "unselect-all-items"
											})
										}}
										icon="remove-outline"
										text={i18n(lang, "unselectAll")}
									/>
								)
							}
							<>
								{
									routeURL.indexOf("trash") !== -1 && itemsSelectedCount >= minBulkActionsItemCount && itemsSelectedCount <= maxBulkActionsItemsCount ? (
										<>
											<ActionButton
												onPress={async () => {
													await SheetManager.hide("TopBarActionSheet")
								
													useStore.setState({ fullscreenLoadingModalVisible: true })

													const items = updateBulkItems()

													bulkRestore({ items }).then(() => {
														useStore.setState({ fullscreenLoadingModalVisible: false })

														//showToast({ message: i18n(lang, "restoreSelectedItemsSuccess", true, ["__COUNT__"], [items.length]) })
													}).catch((err) => {
														console.log(err)

														useStore.setState({ fullscreenLoadingModalVisible: false })

														showToast({ message: err.toString() })
													})
												}}
												icon="refresh-outline"
												text={i18n(lang, "restore")} 
											/>
											<ActionButton
												onPress={async () => {
													await SheetManager.hide("TopBarActionSheet")
								
													Alert.alert(i18n(lang, "deleteSelectedItemsPermanently"), i18n(lang, "deleteSelectedItemsPermanentlyWarning"), [
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

																const items = updateBulkItems()

																bulkDeletePermanently({ items }).then(() => {
																	useStore.setState({ fullscreenLoadingModalVisible: false })

																	//showToast({ message: i18n(lang, "deleteSelectedItemsPermanentlySuccess", true, ["__COUNT__"], [items.length]) })
																}).catch((err) => {
																	console.log(err)

																	useStore.setState({ fullscreenLoadingModalVisible: false })

																	showToast({ message: err.toString() })
																})
															},
															style: "default"
														}
													], {
														cancelable: true
													})
												}}
												icon="close-circle-outline"
												text={i18n(lang, "deletePermanently")} 
											/>
										</>
									) : (
										<>
											{/*
												canShowBulkItemsActions && canShowShare && itemsSelectedCount >= minBulkActionsItemCount && itemsSelectedCount <= maxBulkActionsItemsCount && (
													<ActionButton
														onPress={async () => {
															await SheetManager.hide("TopBarActionSheet")
										
															updateBulkItems()

															setBulkShareDialogVisible(true)
														}}
														icon="share-social-outline"
														text={i18n(lang, "share")}
													/>
												)
											*/}
											{
												routeURL.indexOf("recents") == -1 && canShowBulkItemsActions && canShowMoveItems && itemsSelectedCount >= minBulkActionsItemCount && itemsSelectedCount <= maxBulkActionsItemsCount && (
													<ActionButton
														onPress={async () => {
															await SheetManager.hide("TopBarActionSheet")

															updateBulkItems()
										
															showToast({ type: "moveBulk", message: i18n(lang, "moveItems") })
														}}
														icon="move-outline"
														text={i18n(lang, "move")}
													/>
												)
											}
											{
												canShowBulkItemsActions && canShowAddFavorite && itemsSelectedCount >= minBulkActionsItemCount && itemsSelectedCount <= maxBulkActionsItemsCount && (
													<ActionButton
														onPress={async () => {
															await SheetManager.hide("TopBarActionSheet")

															useStore.setState({ fullscreenLoadingModalVisible: true })

															bulkFavorite({ value: 1, items: updateBulkItems() }).then(() => {
																useStore.setState({ fullscreenLoadingModalVisible: false })

																//showToast({ message: i18n(lang, "selectedItemsMarkedAsFavorite") })
															}).catch((err) => {
																console.log(err)

																useStore.setState({ fullscreenLoadingModalVisible: false })

																showToast({ message: err.toString() })
															})
														}}
														icon="heart"
														text={i18n(lang, "favorite")}
													/>
												)
											}
											{
												canShowBulkItemsActions && canShowRemoveFavorite && itemsSelectedCount >= minBulkActionsItemCount && itemsSelectedCount <= maxBulkActionsItemsCount && (
													<ActionButton
														onPress={async () => {
															await SheetManager.hide("TopBarActionSheet")

															useStore.setState({ fullscreenLoadingModalVisible: true })

															bulkFavorite({ value: 0, items: updateBulkItems() }).then(() => {
																useStore.setState({ fullscreenLoadingModalVisible: false })

																//showToast({ message: i18n(lang, "selectedItemsRemovedAsFavorite") })
															}).catch((err) => {
																console.log(err)

																useStore.setState({ fullscreenLoadingModalVisible: false })

																showToast({ message: err.toString() })
															})
														}}
														icon="heart-outline"
														text={i18n(lang, "unfavorite")}
													/>
												)
											}
											{
												canShowBulkItemsActions && canShowSaveToGallery && itemsSelectedCount >= minBulkActionsItemCount && itemsSelectedCount <= maxBulkActionsItemsCount && (
													<ActionButton
														onPress={async () => {
															await SheetManager.hide("TopBarActionSheet")
										
															useStore.setState({ fullscreenLoadingModalVisible: false })

															hasStoragePermissions().then(() => {
																hasPhotoLibraryPermissions().then(async () => {
																	let extArray: any[] = []

																	if(Platform.OS == "ios"){
																		extArray = ["jpg", "jpeg", "heif", "heic", "png", "gif", "mov", "mp4", "hevc"]
																	}
																	else{
																		extArray = ["jpg", "jpeg", "png", "gif", "mov", "mp4"]
																	}

																	updateBulkItems().forEach((item) => {
																		if(extArray.includes(getFileExt(item.name))){
																			queueFileDownload({
																				file: item,
																				saveToGalleryCallback: (path: string) => {
																					CameraRoll.save(path).then(() => {
																						showToast({ message: i18n(lang, "itemSavedToGallery", true, ["__NAME__"], [item.name]) })
																					}).catch((err) => {
																						console.log(err)
								
																						showToast({ message: err.toString() })
																					})
																				}
																			})
																		}
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
												canMakeAvailableOffline && routeURL.indexOf("offline") == -1 && canShowBulkItemsActions && itemsSelectedCount >= minBulkActionsItemCount && itemsSelectedCount <= maxBulkActionsItemsCount && (
													<ActionButton
														onPress={async () => {
															await SheetManager.hide("TopBarActionSheet")
										
															hasStoragePermissions().then(() => {
																updateBulkItems().forEach((item) => {
																	if(!item.offline){
																		queueFileDownload({ file: item, storeOffline: true })
																	}
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
												canShowBulkItemsActions && canShowRemoveOffline && itemsSelectedCount >= minBulkActionsItemCount && itemsSelectedCount <= maxBulkActionsItemsCount && (
													<ActionButton
														onPress={async () => {
															await SheetManager.hide("TopBarActionSheet")
										
															hasStoragePermissions().then(() => {
																updateBulkItems().forEach((item) => {
																	if(item.offline){
																		removeFromOfflineStorage({ item }).then(() => {
																			//showToast({ message: i18n(lang, "itemRemovedFromOfflineStorage", true, ["__NAME__"], [item.name]) })
																		}).catch((err) => {
																			console.log(err)
							
																			showToast({ message: err.toString() })
																		})
																	}
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
												canDownload && canShowBulkItemsActions && itemsSelectedCount >= minBulkActionsItemCount && itemsSelectedCount <= maxBulkActionsItemsCount && (
													<ActionButton
														onPress={async () => {
															await SheetManager.hide("TopBarActionSheet")
										
															hasStoragePermissions().then(() => {
																updateBulkItems().forEach((item) => {
																	queueFileDownload({ file: item })
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
												canShowBulkItemsActions && canShowTrash && itemsSelectedCount >= minBulkActionsItemCount && itemsSelectedCount <= maxBulkActionsItemsCount && (
													<ActionButton
														onPress={async () => {
															await SheetManager.hide("TopBarActionSheet")

															useStore.setState({ fullscreenLoadingModalVisible: true })

															bulkTrash({ items: updateBulkItems() }).then(() => {
																useStore.setState({ fullscreenLoadingModalVisible: false })

																DeviceEventEmitter.emit("event", {
																	type: "unselect-all-items"
																})

																//showToast({ message: i18n(lang, "selectedItemsTrashed") })
															}).catch((err) => {
																console.log(err)

																useStore.setState({ fullscreenLoadingModalVisible: false })

																showToast({ message: err.toString() })
															})
														}}
														icon="trash-outline"
														text={i18n(lang, "trash")} 
													/>
												)
											}
											{
												canShowBulkItemsActions && canShowStopSharing && itemsSelectedCount >= minBulkActionsItemCount && itemsSelectedCount <= maxBulkActionsItemsCount && (
													<ActionButton
														onPress={async () => {
															await SheetManager.hide("TopBarActionSheet")

															const items = updateBulkItems()

															Alert.alert(i18n(lang, "stopSharing"), i18n(lang, "bulkStopSharingWarning", true, ["__COUNT__"], [items.length]), [
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

																		bulkStopSharing({ items }).then(() => {
																			useStore.setState({ fullscreenLoadingModalVisible: false })

																			DeviceEventEmitter.emit("event", {
																				type: "unselect-all-items"
																			})

																			//showToast({ message: i18n(lang, "stoppedSharingSelectedItems", true, ["__COUNT__"], [items.length]) })
																		}).catch((err) => {
																			console.log(err)

																			useStore.setState({ fullscreenLoadingModalVisible: false })

																			showToast({ message: err.toString() })
																		})
																	},
																	style: "default"
																}
															], {
																cancelable: true
															})
														}}
														icon="close-circle-outline"
														text={i18n(lang, "stopSharing")}
													/>
												)
											}
											{
												canShowBulkItemsActions && canShowRemoveSharedIn && itemsSelectedCount >= minBulkActionsItemCount && itemsSelectedCount <= maxBulkActionsItemsCount && (
													<ActionButton
														onPress={async () => {
															await SheetManager.hide("TopBarActionSheet")

															const items = updateBulkItems()

															Alert.alert(i18n(lang, "stopSharing"), i18n(lang, "bulkRemoveSharedInWarning", true, ["__COUNT__"], [items.length]), [
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

																		bulkRemoveSharedIn({ items }).then(() => {
																			useStore.setState({ fullscreenLoadingModalVisible: false })

																			DeviceEventEmitter.emit("event", {
																				type: "unselect-all-items"
																			})

																			//showToast({ message: i18n(lang, "bulkRemoveSharedInSuccess", true, ["__COUNT__"], [items.length]) })
																		}).catch((err) => {
																			console.log(err)

																			useStore.setState({ fullscreenLoadingModalVisible: false })

																			showToast({ message: err.toString() })
																		})
																	},
																	style: "default"
																}
															], {
																cancelable: true
															})
														}}
														icon="close-circle-outline"
														text={i18n(lang, "remove")}
													/>
												)
											}
										</>
									)
								}
							</>
							{
								canShowListViewStyle && (
									<ActionButton
										onPress={async () => {
											await SheetManager.hide("TopBarActionSheet")

											setItemViewMode(itemViewMode !== "grid" ? "grid" : "list")
										}}
										icon={itemViewMode !== "grid" ? "grid-outline" : "list-outline"}
										text={itemViewMode !== "grid" ? i18n(lang, "gridView") : i18n(lang, "listView")}
									/>
								)
							}
							{
								canShowTransfersButton && (
									<ActionButton 
										onPress={async () => {
											await SheetManager.hide("TopBarActionSheet")
						
											navigationAnimation({ enable: true }).then(() => {
												navigation.current.dispatch(StackActions.push("TransfersScreen"))
											})
										}}
										icon="repeat-outline"
										text={i18n(lang, "transfers")}
									/>
								)
							}
							{
								routeURL.indexOf("trash") !== -1 && currentItems.length > 0 && (
									<ActionButton
										onPress={async () => {
											await SheetManager.hide("TopBarActionSheet")

											Alert.alert(i18n(lang, "emptyTrash"), i18n(lang, "emptyTrashWarning"), [
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
														Alert.alert(i18n(lang, "emptyTrash"), i18n(lang, "areYouReallySure"), [
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
						
																	emptyTrash().then(() => {
																		currentItems.map((item) => {
																			DeviceEventEmitter.emit("event", {
																				type: "remove-item",
																				data: {
																					uuid: item.uuid
																				}
																			})
																		})

																		useStore.setState({ fullscreenLoadingModalVisible: false })
																	}).catch((err) => {
																		console.log(err)

																		useStore.setState({ fullscreenLoadingModalVisible: false })

																		showToast({ message: err.toString() })
																	})
																},
																style: "default"
															}
														], {
															cancelable: true
														})
													},
													style: "default"
												}
											], {
												cancelable: true
											})
										}}
										icon="trash-outline"
										text={i18n(lang, "emptyTrash")}
									/>
								)
							}
						</>
					)
				}
          	</View>
        </ActionSheet>
    )
})

export const ItemActionSheetItemHeader = memo(() => {
	const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
	const currentActionSheetItem = useStore(state => state.currentActionSheetItem)
	const [userId, setUserId] = useMMKVNumber("userId", storage)
	const [lang, setLang] = useMMKVString("lang", storage)
    const [hideThumbnails, setHideThumbnails] = useMMKVBoolean("hideThumbnails:" + userId, storage)
    const [hideFileNames, setHideFileNames] = useMMKVBoolean("hideFileNames:" + userId, storage)
	const [hideSizes, setHideSizes] = useMMKVBoolean("hideSizes:" + userId, storage)

	if(typeof currentActionSheetItem == "undefined"){
		return null
	}

	return (
		<View
			style={{
				flexDirection: "row",
				alignContent: "flex-start",
				borderBottomColor: getColor(darkMode, "actionSheetBorder"),
				borderBottomWidth: 0,
				backgroundColor: darkMode ? "#171717" : "white",
				borderTopRightRadius: 15,
				borderTopLeftRadius: 15,
				zIndex: 1,
				height: 70,
				paddingTop: 20,
				paddingLeft: 20,
				paddingRight: 20,
				marginTop: 5
			}}
		>
			{
				currentActionSheetItem.type == "folder" ? (
					<Ionicon
						name="folder"
						size={34}
						color={getFolderColor(currentActionSheetItem.color)}
						style={{
							paddingTop: 0
						}}
					/>
				) : (
					<FastImage
						source={hideThumbnails ? getImageForItem(currentActionSheetItem) : typeof currentActionSheetItem.thumbnail !== "undefined" ? { uri: "file://" + THUMBNAIL_BASE_PATH + currentActionSheetItem.uuid + ".jpg" } : getImageForItem(currentActionSheetItem)}
						style={{
							width: 30,
							height: 30,
							marginTop: 1,
							marginLeft: 2,
							borderRadius: 5
						}}
					/>
				)
			}
			<View
				style={{
					width: "85%",
					paddingLeft: 10,
					paddingTop: currentActionSheetItem.type == "folder" ? 6 : 3
				}}
			>
				<Text
					style={{
						color: darkMode ? "white" : "black",
						fontWeight: "bold",
						fontSize: 12
					}}
					numberOfLines={1}
				>
					{hideFileNames ? i18n(lang, currentActionSheetItem.type == "folder" ? "folder" : "file") : currentActionSheetItem.name}
				</Text>
				<Text
					style={{
						color: darkMode ? "white" : "black",
						fontSize: 11
					}}
					numberOfLines={1}
				>
					{
						typeof currentActionSheetItem.offline == "boolean" && currentActionSheetItem.offline && (
							<>
								<Ionicon
									name="arrow-down-circle"
									size={12}
									color="green" 
								/>
								<Text>&nbsp;&nbsp;&#8226;&nbsp;&nbsp;</Text>
							</>
						)
					}
					{
						typeof currentActionSheetItem.favorited == "boolean" && currentActionSheetItem.favorited && (
							<>
								<Ionicon
									name="heart"
									size={12}
									color="white"
								/>
								<Text>&nbsp;&nbsp;&#8226;&nbsp;&nbsp;</Text>
							</>
						)
					}
					{hideSizes ? formatBytes(0) : formatBytes(currentActionSheetItem.size)}
					{
						typeof currentActionSheetItem.sharerEmail == "string" && currentActionSheetItem.sharerEmail.length > 0 && (
							<>
								<Text>&nbsp;&nbsp;&#8226;&nbsp;&nbsp;</Text>
								<Text>{currentActionSheetItem.sharerEmail}</Text>
							</>
						)
					}
					{
						typeof currentActionSheetItem.receiverEmail == "string" && currentActionSheetItem.receiverEmail.length > 0 && (
							<>
								<Text>&nbsp;&nbsp;&#8226;&nbsp;&nbsp;</Text>
								<Text>{currentActionSheetItem.receiverEmail}</Text>
							</>
						)
					}
					&nbsp;&nbsp;&#8226;&nbsp;&nbsp;
					{currentActionSheetItem.date}
				</Text>
			</View>
		</View>
	)
})

export const ActionSheetIndicator = memo(() => {
	const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)

	return (
		<View
			style={{
				height: 6,
				width: 45,
				borderRadius: 100,
				backgroundColor: darkMode ? "#555555" : "lightgray",
				marginVertical: 5,
				alignSelf: "center",
				position: "absolute",
				zIndex: 2
			}}
		/>
	)
})

export interface ItemActionSheetProps {
	navigation: any
}

export const ItemActionSheet = memo(({ navigation }: ItemActionSheetProps) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
	const insets: EdgeInsets = useSafeAreaInsets()
	const currentActionSheetItem = useStore(state => state.currentActionSheetItem)
	const setRenameDialogVisible = useStore(state => state.setRenameDialogVisible)
	const [lang, setLang] = useMMKVString("lang", storage)
	const [canSaveToGallery, setCanSaveToGallery] = useState<boolean>(false)
	const [itemListParent, setItemListParent] = useState<string>("")
	const [routeURL, setRouteURL] = useState<string>("")
	const setConfirmPermanentDeleteDialogVisible = useStore(state => state.setConfirmPermanentDeleteDialogVisible)
	const setRemoveFromSharedInDialogVisible = useStore(state => state.setRemoveFromSharedInDialogVisible)
	const setStopSharingDialogVisible = useStore(state => state.setStopSharingDialogVisible)
	const netInfo = useStore(state => state.netInfo)
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

	const can = (): void => {
		if(typeof currentActionSheetItem !== "undefined"){
			const userId: number = storage.getNumber("userId")
			const itemAvailableOffline: boolean = (typeof userId !== "undefined" ? (storage.getBoolean(userId + ":offlineItems:" + currentActionSheetItem.uuid) ? true : false) : false)

			setCanSaveToGallery(false)
			setCanEdit(false)

			if(Platform.OS == "ios"){
				if(["jpg", "jpeg", "heif", "heic", "png", "gif", "mov", "mp4", "hevc"].includes(getFileExt(currentActionSheetItem.name))){
					if(netInfo.isInternetReachable && netInfo.isConnected){
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
					if(netInfo.isInternetReachable && netInfo.isConnected){
						setCanSaveToGallery(true)
					}
					else{
						if(itemAvailableOffline){
							setCanSaveToGallery(true)
						}
					}
				}
			}

			if(["text", "code"].includes(getFilePreviewType(getFileExt(currentActionSheetItem.name)))){
				setCanEdit(true)
			}

			setCanDownload(false)

			if(netInfo.isInternetReachable && netInfo.isConnected){
				setCanDownload(true)
			}
			else{
				if(itemAvailableOffline){
					setCanDownload(true)
				}
			}
		}
	}

	useEffect(() => {
		setIsDeviceOnline(netInfo.isInternetReachable && netInfo.isConnected)
		can()
	}, [netInfo])

	useEffect(() => {
		setIsDeviceOnline(netInfo.isInternetReachable && netInfo.isConnected)

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
				backgroundColor: darkMode ? "#171717" : "white",
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
													useStore.setState({ reRenderShareActionSheet: Math.random() })

													await SheetManager.hide("ItemActionSheet")
				
													SheetManager.show("ShareActionSheet")
												}}
												icon="share-social-outline"
												text={i18n(lang, "share")}
											/>
											<ActionButton
												onPress={async () => {
													useStore.setState({ reRenderPublicLinkActionSheet: Math.random() })

													await SheetManager.hide("ItemActionSheet")
				
													SheetManager.show("PublicLinkActionSheet")
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
																CameraRoll.save(path).then(() => {
																	showToast({ message: i18n(lang, "itemSavedToGallery", true, ["__NAME__"], [currentActionSheetItem.name]) })
																}).catch((err) => {
																	console.log(err)
			
																	showToast({ message: err.toString() })
																})
															}
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
													downloadFile(currentActionSheetItem).then((path) => {
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
													queueFileDownload({ file: currentActionSheetItem, showNotification: true })
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
													queueFileDownload({ file: currentActionSheetItem, storeOffline: true })
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
												useStore.setState({ reRenderFileVersionsActionSheet: Math.random() })

												await SheetManager.hide("ItemActionSheet")
			
												SheetManager.show("FileVersionsActionSheet")
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

												SheetManager.show("FolderColorActionSheet")
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
			
												setRenameDialogVisible(true)
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

													setConfirmPermanentDeleteDialogVisible(true)
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
									isDeviceOnline && routeURL.indexOf("shared-in") !== -1 && (
										<ActionButton
											onPress={async () => {
												await SheetManager.hide("ItemActionSheet")

												setRemoveFromSharedInDialogVisible(true)
											}}
											icon="close-circle-outline"
											text={i18n(lang, "removeFromSharedIn")}
										/>
									)
								}
								{
									isDeviceOnline && routeURL.indexOf("shared-out") !== -1 && (
										<ActionButton
											onPress={async () => {
												await SheetManager.hide("ItemActionSheet")

												setStopSharingDialogVisible(true)
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

export const FolderColorActionSheet = memo(() => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
	const insets: EdgeInsets = useSafeAreaInsets()
	const [lang, setLang] = useMMKVString("lang", storage)
	const currentActionSheetItem = useStore(state => state.currentActionSheetItem)
	const [buttonsDisabled, setButtonsDisabled] = useState<boolean>(false)
	const availableFolderColors: any = getAvailableFolderColors()

	useEffect(() => {
		setButtonsDisabled(false)
	}, [currentActionSheetItem])

    return (
		// @ts-ignore
        <ActionSheet
			id="FolderColorActionSheet"
			gestureEnabled={true}
			containerStyle={{
				backgroundColor: darkMode ? "#171717" : "white",
				borderTopLeftRadius: 15,
				borderTopRightRadius: 15
			}}
			indicatorStyle={{
				display: "none"
			}}
		>
          	<View
				style={{
					paddingBottom: (insets.bottom + 25)
				}}
			>
				<ActionSheetIndicator />
				<ItemActionSheetItemHeader />
				{
					Object.keys(availableFolderColors).map((prop) => {
						return (
							<ActionButton
								key={prop}
								onPress={async () => {
									if(buttonsDisabled){
										return false
									}

									setButtonsDisabled(true)

									await SheetManager.hide("FolderColorActionSheet")

									useStore.setState({ fullscreenLoadingModalVisible: true })
				
									changeFolderColor({
										folder: currentActionSheetItem,
										color: prop
									}).then(async () => {
										DeviceEventEmitter.emit("event", {
											type: "change-folder-color",
											data: {
												uuid: currentActionSheetItem?.uuid,
												color: prop
											}
										})

										setButtonsDisabled(false)

										useStore.setState({ fullscreenLoadingModalVisible: false })

										showToast({ message: i18n(lang, "folderColorChanged", true, ["__NAME__", "__COLOR__"], [currentActionSheetItem?.name, i18n(lang, "color_" + prop)]) })
									}).catch((err) => {
										console.log(err)

										setButtonsDisabled(false)

										useStore.setState({ fullscreenLoadingModalVisible: false })

										showToast({ message: err.toString() })
									})
								}}
								color={availableFolderColors[prop] as string}
								text={i18n(lang, "color_" + prop)}
							/>
						)
					})
				}
          	</View>
        </ActionSheet>
    )
})

export const PublicLinkActionSheet = memo(() => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
	const insets: EdgeInsets = useSafeAreaInsets()
	const [lang, setLang] = useMMKVString("lang", storage)
	const currentActionSheetItem = useStore(state => state.currentActionSheetItem)
	const [buttonsDisabled, setButtonsDisabled] = useState<boolean>(false)
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [publicLinkExists, setPublicLinkExists] = useState<boolean>(false)
    const [switchEnabled, setSwitchEnabled] = useState<boolean>(false)
	const [password, setPassword] = useState<string>("")
	const [expires, setExpires] = useState<string>("never")
	const [downloadBtn, setDownloadBtn] = useState<string>("enable")
	const [linkUUID, setLinkUUID] = useState<string>("")
	const [passwordPlaceholder, setPasswordPlaceholder] = useState<string>("")
	const [linkURL, setLinkURL] = useState<string>("")
	const [isEdit, setIsEdit] = useState<boolean>(false)
	const [linkKey, setLinkKey] = useState<string>("")
	const [progress, setProgress] = useState<{ itemsDone: number, totalItems: number }>({ itemsDone: 0, totalItems: 1 })
	const [type, setType] = useState<boolean>(true)
	const reRenderPublicLinkActionSheet = useStore(state => state.reRenderPublicLinkActionSheet)
	const [pickerValue, setPickerValue] = useState<string>("never")

	const resetState = (): void => {
		setIsLoading(false)
        setButtonsDisabled(false)
        setPublicLinkExists(false)
		setPassword("")
		setExpires("never")
		setDownloadBtn("enable")
		setLinkUUID("")
		setPasswordPlaceholder("")
		setLinkURL("")
		setIsEdit(false)
		setLinkKey("")
		setProgress({itemsDone: 0, totalItems: 1})
		setType(true)
		setPickerValue("never")
	}

	const editLink = (type: boolean = true, downloadButton: string = "enabled", pass: string = "", expire: string = "never"): void => {
		if(!currentActionSheetItem){
			return
		}

		setIsLoading(true)
		setType(type)
										
		editItemPublicLink({
			item: currentActionSheetItem,
			type,
			linkUUID,
			expires: expire,
			password: pass,
			downloadBtn: downloadButton,
			isEdit,
			progressCallback: (itemsDone: number, totalItems: number) => {
				setProgress({ itemsDone, totalItems })
			}
		}).then((data) => {
			setPublicLinkExists(type)
			setIsEdit(true)

			if(pass.length > 0){
				setPasswordPlaceholder(pass)
				setPassword("")
			}

			if(!isEdit){
				if(currentActionSheetItem.type == "folder"){
					if(data.linkKey !== "undefined"){
						setLinkUUID(data.linkUUID)
						setLinkKey(data.linkKey)
						setLinkURL("https://filen.io/f/" + data.linkUUID + "#!" + data.linkKey)
					}
					else{
						setLinkUUID(data.linkUUID)
						setLinkURL("https://filen.io/f/" + data + "#!" + currentActionSheetItem.key)
					}
				}
				else{
					setLinkUUID(data.linkUUID)
					setLinkURL("https://filen.io/" + (currentActionSheetItem.type == "file" ? "d" : "f") + "/" + data + "#!" + currentActionSheetItem.key)
				}
			}

			setIsLoading(false)

			if(!type){ // Public link disabled, reset state and remove item from list
				if(getRouteURL().indexOf("links") !== -1){
					DeviceEventEmitter.emit("event", {
						type: "remove-public-link",
						data: {
							uuid: currentActionSheetItem.uuid
						}
					})
				}

				resetState()
			}
			else{
				if(getRouteURL().indexOf("links") !== -1){
					DeviceEventEmitter.emit("event", {
						type: "reload-list",
						data: {
							parent: "links"
						}
					})
				}
			}

			SheetManager.show("PublicLinkActionSheet")
		}).catch((err) => {
			setIsLoading(false)

			console.log(err)

			showToast({ message: err.toString(), placement: "top" })
		})
	}

    useEffect(() => {
        resetState()

        if(typeof currentActionSheetItem !== "undefined"){
            if(getRouteURL().indexOf("shared-in") == - 1){
				itemPublicLinkInfo({ item: currentActionSheetItem }).then((data) => {
					let linkEnabled = false
	
					if(currentActionSheetItem.type == "file"){
						if(data.enabled){
							linkEnabled = true
						}
					}
					else{
						if(data.exists){
							linkEnabled = true
						}
					}
					
					setPublicLinkExists(linkEnabled)
					setSwitchEnabled(linkEnabled)
	
					if(linkEnabled){
						setLinkUUID(typeof data.uuid == "string" ? data.uuid : "")
						setDownloadBtn(data.downloadBtn == 1 ? "enable" : "disable")
						setExpires(data.expirationText)
						setPickerValue(data.expirationText)
						setPasswordPlaceholder(typeof data.password == "string" ? data.password : "")
	
						if(currentActionSheetItem.type == "file"){
							setLinkURL("https://filen.io/" + (currentActionSheetItem.type == "file" ? "d" : "f") + "/" + (typeof data.uuid == "string" ? data.uuid : "") + "#!" + currentActionSheetItem.key)
						}
	
						if(currentActionSheetItem.type == "folder"){
							setIsEdit(true)
	
							const masterKeys = getMasterKeys()
	
							decryptFolderLinkKey(masterKeys, data.key).then((decryptedKey) => {
								setLinkKey(decryptedKey)
								setLinkURL("https://filen.io/" + (currentActionSheetItem.type == "file" ? "d" : "f") + "/" + (typeof data.uuid == "string" ? data.uuid : "") + "#!" + decryptedKey)
								setIsLoading(false)
							}).catch((err) => {
								console.log(err)
	
								setIsLoading(false)
							})
						}
						else{
							setIsLoading(false)
						}
					}
					else{
						setIsLoading(false)
					}
				}).catch((err) => {
					console.log(err)
					
					showToast({ message: err.toString(), placement: "top" })
				})
			}
        }
    }, [reRenderPublicLinkActionSheet])

    return (
		// @ts-ignore
        <ActionSheet
			id="PublicLinkActionSheet"
			gestureEnabled={isLoading ? false : true}
			closeOnPressBack={isLoading ? false : true}
			closeOnTouchBackdrop={isLoading ? false : true}
			closable={isLoading ? false : true}
			containerStyle={{
				backgroundColor: darkMode ? "#171717" : "white",
				borderTopLeftRadius: 15,
				borderTopRightRadius: 15
			}}
			indicatorStyle={{
				display: "none"
			}}
		>
          	<View
				style={{
					paddingBottom: (insets.bottom + 25)
				}}
			>
				<ActionSheetIndicator />
				<ItemActionSheetItemHeader />
				{
					isLoading ? (
						<View
							style={{
								width: "100%",
								height: 100,
								justifyContent: "center",
								alignItems: "center"
							}}
						>
                            <ActivityIndicator
								size="small"
								color={darkMode ? "white" : "black"}
							/>
							{
								typeof currentActionSheetItem !== "undefined" && currentActionSheetItem.type == "folder" && !isEdit && type && (
									<Text
										style={{
											color: darkMode ? "white" : "black",
											marginTop: 15
										}}
									>
										{i18n(lang, "folderPublicLinkProgress", true, ["__DONE__", "__TOTAL__"], [progress.itemsDone, progress.totalItems])}
									</Text>
								)
							}
                        </View>
					) : (
						<>
							<View
								style={{
									width: "100%",
									height: 45,
									flexDirection: "row",
									justifyContent: "space-between",
									borderBottomColor: getColor(darkMode, "actionSheetBorder"),
									borderBottomWidth: 1,
									paddingLeft: 15,
									paddingRight: 15
								}}
							>
								<Text
									style={{
										color: darkMode ? "white" : "black",
										paddingTop: 12
									}}
								>
									{i18n(lang, "publicLinkEnabled")}
								</Text>
								<View
									style={{
										paddingTop: Platform.OS == "ios" ? 6 : 8
									}}
								>
									<Switch
										trackColor={getColor(darkMode, "switchTrackColor")}
										thumbColor={switchEnabled ? getColor(darkMode, "switchThumbColorEnabled") : getColor(darkMode, "switchThumbColorDisabled")}
										ios_backgroundColor={getColor(darkMode, "switchIOSBackgroundColor")}
										onValueChange={() => {
											setSwitchEnabled(!switchEnabled)
											editLink(!switchEnabled)
										}}
										value={switchEnabled}
									/>
								</View>
							</View>
							{
								publicLinkExists && (
									<>
										<View
											style={{
												width: "100%",
												height: 45,
												flexDirection: "row",
												justifyContent: "space-between",
												borderBottomColor: getColor(darkMode, "actionSheetBorder"),
												borderBottomWidth: 1,
												paddingLeft: 15,
												paddingRight: 15
											}}
										>
											<TouchableOpacity
												style={{
													width: "65%"
												}}
												onPress={() => {
													Clipboard.setString(linkURL)
												
													showToast({ message: i18n(lang, "copiedToClipboard"), placement: "top" })
												}}
											>
												<Text
													style={{
														color: darkMode ? "white" : "black",
														paddingTop: 12
													}}
													numberOfLines={1}
												>
													{linkURL}
												</Text>
											</TouchableOpacity>
											<View
												style={{
													flexDirection: "row"
												}}
											>
												<TouchableOpacity
													onPress={() => {
														Share.share({
															message: linkURL,
															url: linkURL
														})
													}}
												>
													<Text
														style={{
															paddingTop: 12,
															color: "#0A84FF",
															fontWeight: "bold"
														}}
													>
														{i18n(lang, "share")}
													</Text>
												</TouchableOpacity>
												<TouchableOpacity
													onPress={() => {
														Clipboard.setString(linkURL)
													
														showToast({ message: i18n(lang, "copiedToClipboard"), placement: "top" })
													}}
												>
													<Text
														style={{
															paddingTop: 12,
															color: "#0A84FF",
															fontWeight: "bold",
															marginLeft: 15
														}}
													>
														{i18n(lang, "copy")}
													</Text>
												</TouchableOpacity>
											</View>
										</View>
										<View
											style={{
												width: "100%",
												height: 45,
												flexDirection: "row",
												justifyContent: "space-between",
												borderBottomColor: getColor(darkMode, "actionSheetBorder"),
												borderBottomWidth: 1,
												paddingLeft: 15,
												paddingRight: 15
											}}
										>
											<TextInput
												secureTextEntry={true}
												placeholder={passwordPlaceholder.length > 0 ? new Array(16).join("*") : i18n(lang, "publicLinkPassword")}
												value={password}
												onChangeText={setPassword}
												style={{
													width: "60%",
													paddingLeft: 0,
													paddingRight: 0,
													color: darkMode ? "white" : "black"
												}}
											/>
											<View
												style={{
													flexDirection: "row"
												}}
											>
												{
													passwordPlaceholder.length > 0 && (
														<TouchableOpacity
															onPress={() => {
																setPassword("")
																setPasswordPlaceholder("")
																editLink(true, downloadBtn, "", expires)
															}}
														>
															<Text
																style={{
																	paddingTop: 12,
																	color: "#0A84FF",
																	fontWeight: "bold",
																	marginLeft: 15
																}}
															>
																{i18n(lang, "remove")}
															</Text>
														</TouchableOpacity>
													)
												}
												{
													password.length > 0 && (
														<TouchableOpacity
															onPress={() => {
																if(password.length > 0){
																	editLink(true, downloadBtn, password, expires)
																}
															}}
														>
															<Text
																style={{
																	paddingTop: 12,
																	color: "#0A84FF",
																	fontWeight: "bold",
																	marginLeft: 15
																}}
															>
																{i18n(lang, "save")}
															</Text>
														</TouchableOpacity>
													)
												}
											</View>
										</View>
										{
											currentActionSheetItem?.type == "file" && (
												<View
													style={{
														width: "100%",
														height: 45,
														flexDirection: "row",
														justifyContent: "space-between",
														borderBottomColor: getColor(darkMode, "actionSheetBorder"),
														borderBottomWidth: 1,
														paddingLeft: 15,
														paddingRight: 15
													}}
												>
													<Text
														style={{
															color: darkMode ? "white" : "black",
															paddingTop: 12
														}}
													>
														{i18n(lang, "publicLinkDownloadBtnEnabled")}
													</Text>
													<View
														style={{
															paddingTop: Platform.OS == "ios" ? 7 : 8
														}}
													>
														<Switch
															trackColor={getColor(darkMode, "switchTrackColor")}
															thumbColor={downloadBtn == "enable" ? getColor(darkMode, "switchThumbColorEnabled") : getColor(darkMode, "switchThumbColorDisabled")}
															ios_backgroundColor={getColor(darkMode, "switchIOSBackgroundColor")}
															onValueChange={() => {
																if(downloadBtn == "enable"){
																	setDownloadBtn("disable")
																	editLink(true, "disable")
																}
																else{
																	setDownloadBtn("enable")
																	editLink(true, "enable")
																}
															}}
															value={downloadBtn == "enable"}
														/>
													</View>
												</View>
											)
										}
										<RNPickerSelect
											onValueChange={(itemValue) => {
												setPickerValue(itemValue)

												if(Platform.OS == "android"){
													if(itemValue !== expires){
														setExpires(itemValue)
	
														editLink(true, downloadBtn, password, itemValue)
													}
												}
											}}
											onDonePress={() => {
												if(pickerValue !== expires){
													setExpires(pickerValue)

													editLink(true, downloadBtn, password, pickerValue)
												}
											}}
											value={pickerValue}
											placeholder={{}}
											items={[
												{
													label: i18n(lang, "publicLinkExpiresNever"),
													value: "never"
												},
												{
													label: i18n(lang, "publicLinkExpiresHour", true, ["__NUM__"], [1]),
													value: "1h"
												},
												{
													label: i18n(lang, "publicLinkExpiresHours", true, ["__NUM__"], [6]),
													value: "6h"
												},
												{
													label: i18n(lang, "publicLinkExpiresDay", true, ["__NUM__"], [1]),
													value: "1d"
												},
												{
													label: i18n(lang, "publicLinkExpiresDays", true, ["__NUM__"], [3]),
													value: "3d"
												},
												{
													label: i18n(lang, "publicLinkExpiresDays", true, ["__NUM__"], [7]),
													value: "7d"
												},
												{
													label: i18n(lang, "publicLinkExpiresDays", true, ["__NUM__"], [14]),
													value: "14d"
												},
												{
													label: i18n(lang, "publicLinkExpiresDays", true, ["__NUM__"], [30]),
													value: "30d"
												}
											]}
										>
											<TouchableOpacity
												style={{
													width: "100%",
													flexDirection: "row",
													justifyContent: "space-between",
													marginTop: 15,
													height: 45
												}}
											>
												<Text
													style={{
														marginLeft: 15,
														color: darkMode ? "white" : "black",
														fontSize: 15
													}}
												>
													{
														pickerValue == "never" && i18n(lang, "publicLinkExpiresNever")
													}
													{
														pickerValue == "1h" && i18n(lang, "publicLinkExpiresHour", true, ["__NUM__"], [1])
													}
													{
														pickerValue == "6h" && i18n(lang, "publicLinkExpiresHours", true, ["__NUM__"], [6])
													}
													{
														pickerValue == "1d" && i18n(lang, "publicLinkExpiresDay", true, ["__NUM__"], [1])
													}
													{
														pickerValue == "3d" && i18n(lang, "publicLinkExpiresDays", true, ["__NUM__"], [3])
													}
													{
														pickerValue == "7d" && i18n(lang, "publicLinkExpiresDays", true, ["__NUM__"], [7])
													}
													{
														pickerValue == "14d" && i18n(lang, "publicLinkExpiresDays", true, ["__NUM__"], [14])
													}
													{
														pickerValue == "30d" && i18n(lang, "publicLinkExpiresDays", true, ["__NUM__"], [30])
													}
												</Text>
												<Ionicon
													name="chevron-forward-outline"
													size={18} color={darkMode ? "white" : "black"}
													style={{
														marginRight: 15
													}}
												/>
											</TouchableOpacity>
										</RNPickerSelect>
									</>
								)
							}
						</>
					)
				}
          	</View>
        </ActionSheet>
    )
})

export const ShareActionSheet = memo(() => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
	const insets: EdgeInsets = useSafeAreaInsets()
	const [lang, setLang] = useMMKVString("lang", storage)
	const currentActionSheetItem = useStore(state => state.currentActionSheetItem)
	const [buttonsDisabled, setButtonsDisabled] = useState<boolean>(false)
	const [email, setEmail] = useState<string>("")
	const [isLoading, setIsLoading] = useState<boolean>(false)
	const [progress, setProgress] = useState<{ itemsDone: number, totalItems: number }>({ itemsDone: 0, totalItems: 1 })
	const reRenderShareActionSheet = useStore(state => state.reRenderShareActionSheet)
	const inputRef = useRef<any>()

	useEffect(() => {
		setButtonsDisabled(false)
		setEmail("")
		setIsLoading(false)
		setProgress({ itemsDone: 0, totalItems: 1 })

		if(typeof currentActionSheetItem !== "undefined"){
			setTimeout(() => {
				if(typeof inputRef.current !== "undefined" && inputRef.current !== null){
					if(typeof inputRef.current.focus == "function"){
						inputRef.current.focus()
					}
				}
			}, 500)
		}
	}, [reRenderShareActionSheet])

    return (
		// @ts-ignore
        <ActionSheet
			id="ShareActionSheet"
			gestureEnabled={buttonsDisabled ? false : true}
			closeOnPressBack={buttonsDisabled ? false : true}
			closeOnTouchBackdrop={buttonsDisabled ? false : true}
			closable={buttonsDisabled ? false : true}
			containerStyle={{
				backgroundColor: darkMode ? "#171717" : "white",
				borderTopLeftRadius: 15,
				borderTopRightRadius: 15
			}}
			indicatorStyle={{
				display: "none"
			}}
		>
          	<View
				style={{
					paddingBottom: (insets.bottom + 25)
				}}
			>
				<ActionSheetIndicator />
				<ItemActionSheetItemHeader />
				{
					isLoading ? (
						<View
							style={{
								width: "100%",
								height: 100,
								justifyContent: "center",
								alignItems: "center"
							}}
						>
                            <ActivityIndicator
								size="small"
								color={darkMode ? "white" : "black"}
							/>
							{
								typeof currentActionSheetItem !== "undefined" && currentActionSheetItem.type == "folder" && (
									<Text
										style={{
											color: darkMode ? "white" : "black",
											marginTop: 15
										}}
									>
										{i18n(lang, "folderPublicLinkProgress", true, ["__DONE__", "__TOTAL__"], [progress.itemsDone, progress.totalItems])}
									</Text>
								)
							}
                        </View>
					) : (
						<View
							style={{
								width: "100%",
								height: 45,
								flexDirection: "row",
								justifyContent: "space-between",
								borderBottomColor: getColor(darkMode, "actionSheetBorder"),
								borderBottomWidth: 1,
								paddingLeft: 15,
								paddingRight: 15
							}}
						>
							<TextInput 
								placeholder={i18n(lang, "sharePlaceholder")} 
								value={email} 
								onChangeText={setEmail} 
								ref={inputRef}
								autoCapitalize="none"
								textContentType="emailAddress"
								keyboardType="email-address"
								returnKeyType="done"
								style={{
									width: "75%",
									paddingLeft: 0,
									paddingRight: 0,
									color: darkMode ? "white" : "black"
								}}
							/>
							<View
								style={{
									flexDirection: "row"
								}}
							>
								{
									email.length > 0 && (
										<TouchableOpacity
											onPress={() => {
												if(buttonsDisabled){
													return
												}

												if(email == storage.getString("email")){
													return
												}
			
												setButtonsDisabled(true)
												setIsLoading(true)

												getPublicKeyFromEmail({ email }).then((publicKey) => {
													if(typeof publicKey !== "string"){
														setButtonsDisabled(false)
														setIsLoading(false)
														setEmail("")

														return showToast({ message: i18n(lang, "shareUserNotFound"), placement: "top" })
													}

													if(publicKey.length < 16){
														setButtonsDisabled(false)
														setIsLoading(false)
														setEmail("")

														return showToast({ message: i18n(lang, "shareUserNotFound"), placement: "top" })
													}

													shareItemToUser({
														item: currentActionSheetItem,
														publicKey,
														email,
														progressCallback: (itemsDone: number, totalItems: number) => {
															setProgress({ itemsDone, totalItems })
														}
													}).then(() => {
														setButtonsDisabled(false)
														setIsLoading(false)
														setEmail("")

														showToast({ message: i18n(lang, "sharedWithSuccess", true, ["__EMAIL__"], [email]), placement: "top" })
													}).catch((err) => {
														console.log(err)

														showToast({ message: err.toString(), placement: "top" })

														setButtonsDisabled(false)
														setIsLoading(false)
													})
												}).catch((err) => {
													console.log(err)

													if(err.toString().toLowerCase().indexOf("not found") !== -1){
														showToast({ message: i18n(lang, "shareUserNotFound"), placement: "top" })

														setEmail("")
													}
													else{
														showToast({ message: err.toString(), placement: "top" })
													}

													setButtonsDisabled(false)
													setIsLoading(false)
												})
											}}
										>
											{
												!buttonsDisabled && (
													<Text
														style={{
															paddingTop: 12,
															color: "#0A84FF",
															fontWeight: "bold"
														}}
													>
														{i18n(lang, "share")}
													</Text>
												)
											}
										</TouchableOpacity>
									)
								}
							</View>
						</View>
					)
				}
          	</View>
        </ActionSheet>
    )
})

export interface FileVersionsActionSheetProps {
	navigation: any
}

export const FileVersionsActionSheet = memo(({ navigation }: FileVersionsActionSheetProps) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
	const insets: EdgeInsets = useSafeAreaInsets()
	const [lang, setLang] = useMMKVString("lang", storage)
	const currentActionSheetItem = useStore(state => state.currentActionSheetItem)
	const [versionData, setVersionData] = useState<any>([])
    const [buttonsDisabled, setButtonsDisabled] = useState<boolean>(false)
	const [isLoading, setIsLoading] = useState<boolean>(false)
	const reRenderFileVersionsActionSheet = useStore(state => state.reRenderFileVersionsActionSheet)

	const fetchVersions = (): void => {
		if(typeof currentActionSheetItem !== "undefined"){
            setButtonsDisabled(true)
            setVersionData([])
			setIsLoading(true)

            fetchFileVersionData({ file: currentActionSheetItem }).then((versions) => {
                setVersionData(versions)
                setButtonsDisabled(false)
				setIsLoading(false)
            }).catch((err) => {
                console.log(err)

				setButtonsDisabled(false)
				setIsLoading(false)

                showToast({ message: err.toString() })
            })
        }
	}

    useEffect(() => {
        fetchVersions()
    }, [reRenderFileVersionsActionSheet])

    return (
		// @ts-ignore
        <ActionSheet
			id="FileVersionsActionSheet"
			gestureEnabled={buttonsDisabled ? false : true}
			closeOnPressBack={buttonsDisabled ? false : true}
			closeOnTouchBackdrop={buttonsDisabled ? false : true}
			closable={buttonsDisabled ? false : true}
			containerStyle={{
				backgroundColor: darkMode ? "#171717" : "white",
				borderTopLeftRadius: 15,
				borderTopRightRadius: 15
			}}
			indicatorStyle={{
				display: "none"
			}}
		>
          	<View
				style={{
					paddingBottom: (insets.bottom + 25)
				}}
			>
				<ActionSheetIndicator />
				<ItemActionSheetItemHeader />
				{
					isLoading ? (
						<View
							style={{
								width: "100%",
								height: 100,
								justifyContent: "center",
								alignItems: "center"
							}}
						>
                            <ActivityIndicator
								size="small"
								color={darkMode ? "white" : "black"}
							/>
                        </View>
					) : (
						<ScrollView
							style={{
								width: "100%",
								overflow: "scroll"
							}}
						>
                            {
                                versionData.length > 0 && typeof currentActionSheetItem !== "undefined" ? (
                                    <>
                                        {
                                            versionData.map((item: any, index: number) => {
                                                const dateString: string = simpleDate(item.timestamp * 1000)

                                                return (
                                                    <View
														key={index.toString()}
														style={{
															paddingLeft: 15,
															paddingRight: 15,
															paddingTop: 10,
															paddingBottom: 10,
															borderBottomColor: getColor(darkMode, "actionSheetBorder"),
															borderBottomWidth: 1,
															flexDirection: "row",
															justifyContent: "space-between"
														}}
													>
                                                        <Text
															style={{
																color: darkMode ? "white" : "black"
															}}
														>
                                                            {dateString}
                                                        </Text>
                                                        {
                                                            item.uuid == currentActionSheetItem.uuid ? (
                                                                <Text
																	style={{
																		color: darkMode ? "white" : "black"
																	}}
																>
                                                                    {i18n(lang, "currentVersion")}
                                                                </Text>
                                                            ) : (
                                                                <View
																	style={{
																		flexDirection: "row"
																	}}
																>
																	<TouchableOpacity
																		onPress={async () => {
																			await SheetManager.hide("FileVersionsActionSheet")

																			decryptFileMetadata(getMasterKeys(), item.metadata, item.uuid).then((decrypted) => {
																				item.name = decrypted.name
																				item.size = decrypted.size
																				item.mime = decrypted.mime
																				item.key = decrypted.key
																				item.lastModified = decrypted.lastModified
																				item.type = "file"

																				useStore.setState({ currentActionSheetItem: item })
																				useStore.setState({ confirmPermanentDeleteDialogVisible: true })
																			}).catch((err) => {
																				console.log(err)

																				showToast({ message: err.toString() })
																			})
																		}}
																	>
																		<Text
																			style={{
																				color: "#0A84FF",
																				fontWeight: "bold"
																			}}
																		>
																			{i18n(lang, "delete")}
																		</Text>
																	</TouchableOpacity>
																	<TouchableOpacity
																		style={{
																			marginLeft: 15
																		}}
																		onPress={() => {
																			decryptFileMetadata(getMasterKeys(), item.metadata, item.uuid).then(async (decrypted) => {
																				item.name = decrypted.name
																				item.size = decrypted.size
																				item.mime = decrypted.mime
																				item.key = decrypted.key
																				item.lastModified = decrypted.lastModified

																				await SheetManager.hide("FileVersionsActionSheet")

																				previewItem({ item, setCurrentActionSheetItem: false, navigation })
																			}).catch((err) => {
																				console.log(err)

																				showToast({ message: err.toString() })
																			})
																		}}
																	>
																		<Text
																			style={{
																				color: "#0A84FF",
																				fontWeight: "bold"
																			}}
																		>
																			{i18n(lang, "preview")}
																		</Text>
																	</TouchableOpacity>
																	<TouchableOpacity
																		style={{
																			marginLeft: 15
																		}}
																		onPress={() => {
																			if(item.uuid !== currentActionSheetItem.uuid){
																				setButtonsDisabled(true)
																				setIsLoading(true)

																				const oldUUID = currentActionSheetItem.uuid

																				restoreArchivedFile({ uuid: item.uuid, currentUUID: currentActionSheetItem.uuid }).then(async () => {
																					currentActionSheetItem.uuid = item.uuid

																					DeviceEventEmitter.emit("event", {
																						type: "change-whole-item",
																						data: {
																							item: currentActionSheetItem,
																							uuid: oldUUID
																						}
																					})

																					fetchVersions()
																				}).catch((err) => {
																					console.log(err)

																					setButtonsDisabled(false)
																					setIsLoading(false)

																					showToast({ message: err.toString() })
																				})
																			}
																		}}
																	>
																		<Text
																			style={{
																				color: "#0A84FF",
																				fontWeight: "bold"
																			}}
																		>
																			{i18n(lang, "restore")}
																		</Text>
																	</TouchableOpacity>
																</View>
                                                            )
                                                        }
                                                    </View>
                                                )
                                            })
                                        }
                                    </>
                                ) : (
									<View
										style={{
											paddingLeft: 15,
											paddingRight: 15,
											paddingTop: 10,
											paddingBottom: 10
										}}
									>
										<Text
											style={{
												color: darkMode ? "white" : "black"
											}}
										>
											{i18n(lang, "noFileVersionsFound")}
										</Text>
									</View>
								)
                            }
                        </ScrollView>
					)
				}
          	</View>
        </ActionSheet>
    )
})

export const ProfilePictureActionSheet = memo(() => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
	const insets: EdgeInsets = useSafeAreaInsets()
	const [lang, setLang] = useMMKVString("lang", storage)

	const allowedTypes: string[] = [
		"image/jpg",
		"image/png",
		"image/jpeg"
	]

	const uploadAvatarImage = (uri: string): void => {
		useStore.setState({ fullscreenLoadingModalVisible: true })

		ReactNativeBlobUtil.fs.readFile(uri, "base64").then((base64) => {
			ReactNativeBlobUtil.fetch("POST", getAPIServer() + "/v1/user/avatar/upload/" + getAPIKey(), {}, convertUint8ArrayToBinaryString(base64ToArrayBuffer(base64))).then((response) => {
				const json = response.json()

				useStore.setState({ fullscreenLoadingModalVisible: false })
		
				if(!json.status){
					return showToast({ message: json.message })
				}

				updateUserInfo()
			}).catch((err) => {
				console.log(err)
	
				useStore.setState({ fullscreenLoadingModalVisible: false })
	
				showToast({ message: err.toString() })
			})
		}).catch((err) => {
			console.log(err)

			useStore.setState({ fullscreenLoadingModalVisible: false })

			showToast({ message: err.toString() })
		})
	}

    return (
		// @ts-ignore
        <ActionSheet
			id="ProfilePictureActionSheet"
			gestureEnabled={true}
			containerStyle={{
				backgroundColor: darkMode ? "#171717" : "white",
				borderTopLeftRadius: 15,
				borderTopRightRadius: 15
			}}
			indicatorStyle={{
				display: "none"
			}}
		>
          	<View
				style={{
					paddingBottom: (insets.bottom + 25)
				}}
			>
				<ActionSheetIndicator />
				<View
					style={{
						height: 15
					}}
				/>
				<ActionButton
					onPress={async () => {
						await SheetManager.hide("ProfilePictureActionSheet")

						setTimeout(() => {
							hasCameraPermissions().then(() => {
								storage.set("biometricPinAuthTimeout:" + storage.getNumber("userId"), (Math.floor(+new Date()) + 500000))

								RNImagePicker.launchCamera({
									maxWidth: 999999999,
									maxHeight: 999999999,
									videoQuality: "low",
									cameraType: "back",
									quality: 0.2,
									includeBase64: false,
									includeExtra: false,
									saveToPhotos: false,
									mediaType: "photo"
								}).then((response) => {
									if(response.didCancel){
										return
									}

									if(response.errorMessage){
										console.log(response.errorMessage)

										showToast({ message: response.errorMessage.toString() })

										return
									}

									if(typeof response.assets == "undefined"){
										return
									}
				
									if(!Array.isArray(response.assets)){
										return
									}
				
									if(typeof response.assets[0] == "undefined"){
										return
									}
				
									const image = response.assets[0]

									if(!allowedTypes.includes(image.type as string)){
										return showToast({ message: i18n(lang, "avatarInvalidImage") })
									}

									if(image.fileSize as number > ((1024 * 1024) * 2.99)){
										useStore.setState({ fullscreenLoadingModalVisible: false })
							
										return showToast({ message: i18n(lang, "avatarMaxImageSize", true, ["__SIZE__"], [formatBytes(((1024 * 1024) * 3))]) })
									}

									uploadAvatarImage(decodeURIComponent(image.uri as string))
								}).catch((err) => {
									if(err.toString().toLowerCase().indexOf("cancelled") == -1 && err.toString().toLowerCase().indexOf("canceled") == -1){
										console.log(err)

										reportError(err, "actionSheets:launchCamera:takePictureAndUpload")

										showToast({ message: err.toString() })
									}
								})
							}).catch((err) => {
								console.log(err)

								showToast({ message: err.toString() })
							})
						}, 500)
					}}
					icon="camera-outline"
					text={i18n(lang, "takePhotoAndUpload")}
				/>
				<ActionButton
					onPress={async () => {
						await SheetManager.hide("ProfilePictureActionSheet")

						setTimeout(() => {
							hasPhotoLibraryPermissions().then(() => {
								hasStoragePermissions().then(() => {
									storage.set("biometricPinAuthTimeout:" + storage.getNumber("userId"), (Math.floor(+new Date()) + 500000))

									RNImagePicker.launchImageLibrary({
										mediaType: "photo",
										selectionLimit: 1,
										quality: 0.2,
										videoQuality: "low",
										includeBase64: false,
										includeExtra: true,
										maxWidth: 999999999,
										maxHeight: 999999999
									}).then((response) => {
										if(response.didCancel){
											return
										}

										if(response.errorMessage){
											console.log(response.errorMessage)

											return showToast({ message: response.errorMessage.toString() })
										}

										if(typeof response.assets == "undefined"){
											return showToast({ message: i18n(lang, "avatarInvalidImage") })
										}
					
										if(!Array.isArray(response.assets)){
											return showToast({ message: i18n(lang, "avatarInvalidImage") })
										}
					
										if(typeof response.assets[0] == "undefined"){
											return showToast({ message: i18n(lang, "avatarInvalidImage") })
										}
					
										const image = response.assets[0]

										if(!allowedTypes.includes(image.type as string)){
											return showToast({ message: i18n(lang, "avatarInvalidImage") })
										}

										if(image.fileSize as number > ((1024 * 1024) * 2.99)){
											useStore.setState({ fullscreenLoadingModalVisible: false })
								
											return showToast({ message: i18n(lang, "avatarMaxImageSize", true, ["__SIZE__"], [formatBytes(((1024 * 1024) * 3))]) })
										}

										uploadAvatarImage(decodeURIComponent(image.uri as string))
									}).catch((err) => {
										if(err.toString().toLowerCase().indexOf("cancelled") == -1 && err.toString().toLowerCase().indexOf("canceled") == -1){
											console.log(err)

											reportError(err, "actionSheets:launchImageLibrary:uploadProfilePicture")

											showToast({ message: err.toString() })
										}
									})
								}).catch((err) => {
									console.log(err)

									showToast({ message: err.toString() })
								})
							}).catch((err) => {
								console.log(err)

								showToast({ message: err.toString() })
							})
						}, 500)
					}}
					icon="image-outline"
					text={i18n(lang, "uploadFromGallery")}
				/>
			</View>
        </ActionSheet>
    )
})

export const SortByActionSheet = memo(() => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
	const insets: EdgeInsets = useSafeAreaInsets()
	const [lang, setLang] = useMMKVString("lang", storage)
	const [showASCDESC, setShowASCDESC] = useState<boolean>(false)
	const [sortBy, setSortBy] = useState<string>("")
	const setItemsSortBy = useStore(state => state.setItemsSortBy)

	useEffect(() => {
		if(sortBy.indexOf("Asc") !== -1 || sortBy.indexOf("Desc") !== -1){
			setItemsSortBy(sortBy)
		}
	}, [sortBy])

    return (
		// @ts-ignore
        <ActionSheet
			id="SortByActionSheet"
			gestureEnabled={true}
			containerStyle={{
				backgroundColor: darkMode ? "#171717" : "white",
				borderTopLeftRadius: 15,
				borderTopRightRadius: 15
			}}
			indicatorStyle={{
				display: "none"
			}}
			onBeforeShow={() => {
				setShowASCDESC(false)
				setSortBy("")
			}}
		>
          	<View
				style={{
					paddingBottom: (insets.bottom + 25)
				}}
			>
				<ActionSheetIndicator />
				<View
					style={{
						height: 15
					}}
				/>
				{
					showASCDESC ? (
						<>
							<ActionButton
								onPress={() => {
									setSortBy(prev => prev.indexOf("Asc") == -1 ? prev + "Asc" : prev)

									SheetManager.hide("SortByActionSheet")
								}}
								icon="arrow-up-outline"
								text={i18n(lang, "ascending")}
							/>
							<ActionButton
								onPress={() => {
									setSortBy(prev => prev.indexOf("Desc") == -1 ? prev + "Desc" : prev)

									SheetManager.hide("SortByActionSheet")
								}}
								icon="arrow-down-outline"
								text={i18n(lang, "descending")}
							/>
						</>
					) : (
						<>
							<ActionButton
								onPress={() => {
									setSortBy("name")
									setShowASCDESC(true)
								}}
								icon="text-outline"
								text={i18n(lang, "sortByName")}
							/>
							<ActionButton 
								onPress={() => {
									setSortBy("size")
									setShowASCDESC(true)
								}}
								icon="barbell-outline"
								text={i18n(lang, "sortBySize")} 
							/>
							<ActionButton
								onPress={() => {
									setSortBy("date")
									setShowASCDESC(true)
								}}
								icon="time-outline"
								text={i18n(lang, "sortByDate")}
							/>
							<ActionButton
								onPress={() => {
									setSortBy("type")
									setShowASCDESC(true)
								}}
								icon="albums-outline" text={i18n(lang, "sortByType")} />
							<ActionButton
								onPress={() => {
									setItemsSortBy("nameAsc")

									SheetManager.hide("SortByActionSheet")
								}}
								icon="refresh-outline"
								text={i18n(lang, "reset")}
							/>
						</>
					)
				}
			</View>
        </ActionSheet>
    )
})