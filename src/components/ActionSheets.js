import React, { useEffect, useState, useCallback, useRef } from "react"
import { View, Text, ScrollView, TouchableHighlight, DeviceEventEmitter, Platform, ActivityIndicator, Switch, TextInput, TouchableOpacity, Share } from "react-native"
import ActionSheet, { SheetManager } from "react-native-actions-sheet"
import { storage } from "../lib/storage"
import { useMMKVBoolean, useMMKVString, useMMKVNumber } from "react-native-mmkv"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import FastImage from "react-native-fast-image"
import { getImageForItem } from "../assets/thumbnails"
import Ionicon from "react-native-vector-icons/Ionicons"
import { pickMultiple } from "react-native-document-picker"
import { launchCamera, launchImageLibrary } from "react-native-image-picker"
import { useStore } from "../lib/state"
import { queueFileDownload, downloadWholeFileFSStream } from "../lib/download"
import { getFileExt, getFolderColor, formatBytes, getAvailableFolderColors, getMasterKeys, decryptFolderLinkKey, getParent, getRouteURL, decryptFileMetadata, getFilePreviewType, calcPhotosGridSize } from "../lib/helpers"
import { queueFileUpload } from "../lib/upload"
import { showToast } from "./Toasts"
import { i18n } from "../i18n/i18n"
import { StackActions } from "@react-navigation/native"
import CameraRoll from "@react-native-community/cameraroll"
import { hasStoragePermissions, hasPhotoLibraryPermissions, hasCameraPermissions } from "../lib/permissions"
import { changeFolderColor, favoriteItem, itemPublicLinkInfo, editItemPublicLink, getPublicKeyFromEmail, shareItemToUser, trashItem, restoreItem, fileExists, folderExists, fetchFileVersionData, restoreArchivedFile } from "../lib/api"
import Clipboard from "@react-native-clipboard/clipboard"
import { previewItem } from "../lib/services/items"
import { removeFromOfflineStorage } from "../lib/services/offline"
import RNFS from "react-native-fs"
import RNPickerSelect from "react-native-picker-select"
import { getColor } from "../lib/style/colors"
import { navigationAnimation } from "../lib/state"

export const ActionButton = ({ onPress, icon, text, color }) => {
	const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)

	return (
		<TouchableHighlight underlayColor={getColor(darkMode, "underlayActionSheet")} style={{
			width: "100%",
			height: 45
		}} onPress={onPress}>
			<View style={{
				width: "100%",
				height: 45,
				flexDirection: "row",
				alignContent: "flex-start",
				paddingLeft: 20,
				paddingRight: 20
			}}>
				{
					typeof color !== "undefined" ? (
						<View style={{
							backgroundColor: color,
							height: 22,
							width: 22,
							borderRadius: 22,
							marginTop: 12
						}}></View>
					) : (
						<View style={{
							paddingTop: 11
						}}>
							<Ionicon name={icon} size={22} color={darkMode ? "gray" : "gray"} />
						</View>
					)
				}
				<View style={{
					paddingTop: 14,
					marginLeft: 15,
					borderBottomColor: getColor(darkMode, "actionSheetBorder"),
					borderBottomWidth: 1,
					width: "100%"
				}}>
					<Text style={{
						color: darkMode ? "white" : "black"
					}}>{text}</Text>
				</View>
			</View>
		</TouchableHighlight>
	)
}

export const BottomBarAddActionSheet = ({ navigation, route }) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
	const currentRoutes = useStore(state => state.currentRoutes)
	const insets = useSafeAreaInsets()
	const setCreateFolderDialogVisible = useStore(state => state.setCreateFolderDialogVisible)
	const [lang, setLang] = useMMKVString("lang", storage)
	const setCreateTextFileDialogVisible = useStore(state => state.setCreateTextFileDialogVisible)

    return (
        <ActionSheet id="BottomBarAddActionSheet" gestureEnabled={true} containerStyle={{
			backgroundColor: darkMode ? "#171717" : "white",
			borderTopLeftRadius: 15,
			borderTopRightRadius: 15
		}} indicatorStyle={{
			display: "none"
		}}>
          	<View style={{
				paddingBottom: (insets.bottom + 25)
			}}>
				<ActionSheetIndicator />
				<View style={{ height: 15 }}></View>
				<ActionButton onPress={async () => {
					await SheetManager.hide("BottomBarAddActionSheet")

					setCreateFolderDialogVisible(true)
				}} icon="folder-outline" text={i18n(lang, "createFolder")} />
				{
					typeof currentRoutes == "object" && typeof currentRoutes[currentRoutes.length - 1].params == "object" && currentRoutes[currentRoutes.length - 1].params.parent !== "base" && (
						<>
							<ActionButton onPress={async () => {
								await SheetManager.hide("BottomBarAddActionSheet")

								setCreateTextFileDialogVisible(true)
							}} icon="create-outline" text={i18n(lang, "createTextFile")} />
							<ActionButton onPress={async () => {
								await SheetManager.hide("BottomBarAddActionSheet")

								setTimeout(() => {
									hasCameraPermissions().then(() => {
										launchCamera({
											maxWidth: 999999999,
											maxHeight: 999999999,
											videoQuality: "high",
											cameraType: "back",
											includeBase64: false,
											includeExtra: true,
											saveToPhotos: false
										}).then((response) => {
											const parent = getParent()
	
											if(parent.length < 16){
												return false
											}
	
											if(typeof response.assets !== "undefined"){
												for(let i = 0; i < response.assets.length; i++){
													if(typeof response.assets[i].fileName == "string" && typeof response.assets[i].uri == "string"){
														queueFileUpload({
															pickedFile: {
																name: i18n(lang, "photo") + "_" + new Date().toLocaleString().split(" ").join("_").split(",").join("_").split(":").join("_").split(".").join("_") + "." + getFileExt(response.assets[i].fileName),
																size: response.assets[i].fileSize,
																type: response.assets[i].type,
																uri: response.assets[i].uri
															},
															parent
														})
													}
												}
											}
										}).catch((err) => {
											console.log(err)
										})
									}).catch((err) => {
										console.log(err)

										showToast({ message: err.toString() })
									})
								}, 500)
							}} icon="camera-outline" text={i18n(lang, "takePhotoAndUpload")} />
							{
								Platform.OS == "ios" && (
									<ActionButton onPress={async () => {
										await SheetManager.hide("BottomBarAddActionSheet")
		
										setTimeout(() => {
											launchImageLibrary({
												mediaType: "mixed",
												selectionLimit: 0,
												includeBase64: false,
												includeExtra: true
											}).then((response) => {
												const parent = getParent()

												if(parent.length < 16){
													return false
												}

												if(typeof response.assets !== "undefined"){
													for(let i = 0; i < response.assets.length; i++){
														if(typeof response.assets[i].fileName == "string" && typeof response.assets[i].uri == "string" && typeof response.assets[i].timestamp == "string"){
															queueFileUpload({
																pickedFile: {
																	name: i18n(lang, "photo") + "_" + new Date(response.assets[i].timestamp).toLocaleString().split(" ").join("_").split(",").join("_").split(":").join("_").split(".").join("_") + "." + getFileExt(response.assets[i].fileName),
																	size: response.assets[i].fileSize,
																	type: response.assets[i].type,
																	uri: response.assets[i].uri
																},
																parent
															})
														}
													}
												}
											}).catch((err) => {
												console.log(err)
											})
										}, 500)
									}} icon="image-outline" text={i18n(lang, "uploadFromGallery")} />
								)
							}
							<ActionButton onPress={async () => {
								await SheetManager.hide("BottomBarAddActionSheet")

								setTimeout(() => {
									pickMultiple({
										allowMultiSelection: true,
										copyTo: "cachesDirectory"
									}).then((response) => {
										const parent = getParent()

										if(parent.length < 16){
											return false
										}

										for(let i = 0; i < response.length; i++){
											if(typeof response[i].name == "string" && typeof response[i].uri == "string"){
												queueFileUpload({
													pickedFile: {
														name: response[i].name,
														size: response[i].size,
														type: response[i].type,
														uri: "file:///" + response[i].fileCopyUri.replace("file:/", "").replace("file://", "").replace("file:", ""),
														clearCache: true
													},
													parent
												})
											}
										}
									}).catch((err) => {
										console.log(err)
									})
								}, 500)
							}} icon="cloud-upload-outline" text={i18n(lang, "uploadFiles")} />
						</>
					)
				}
			</View>
        </ActionSheet>
    )
}

export const TopBarActionSheet = ({ navigation }) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
	const insets = useSafeAreaInsets()
	const [itemViewMode, setItemViewMode] = useMMKVString("itemViewMode", storage)
	const [lang, setLang] = useMMKVString("lang", storage)
	const currentRoutes = useStore(state => state.currentRoutes)
	const [routeURL, setRouteURL] = useState("")
	const [photosGridSize, setPhotosGridSize] = useMMKVNumber("photosGridSize", storage)
	const [canShowListViewStyle, setCanShowListViewStyle] = useState(false)
	const [canShowSelectAllItems, setCanShowSelectAllItems] = useState(false)
	const [canShowUnselectAllItems, setCanShowUnselectAllItems] = useState(false)
	const [canShowTransfersButton, setCanShowTransfersButton] = useState(false)

	const can = useCallback(() => {
		setCanShowTransfersButton(true)
		setCanShowSelectAllItems(true)
		setCanShowUnselectAllItems(true)
		setCanShowListViewStyle(true)

		if(routeURL.indexOf("photos") !== -1){
			setCanShowListViewStyle(false)

			if(calcPhotosGridSize(photosGridSize) >= 6){
				setCanShowSelectAllItems(false)
				setCanShowUnselectAllItems(false)
			}
		}
	})

	const updateRouteURL = useCallback(() => {
		if(typeof currentRoutes !== "undefined"){
			if(typeof currentRoutes[currentRoutes.length - 1] !== "undefined"){
				setRouteURL(getRouteURL(currentRoutes[currentRoutes.length - 1]))
			}
		}
	})

	useEffect(() => {
		can()
	}, [photosGridSize])

	useEffect(() => {
		can()
	}, [routeURL])

	useEffect(() => {
		updateRouteURL()
		can()
	}, [currentRoutes])

	useEffect(() => {
		updateRouteURL()
		can()
	}, [])

    return (
        <ActionSheet id="TopBarActionSheet" gestureEnabled={true} containerStyle={{
			backgroundColor: darkMode ? "#171717" : "white",
			borderTopLeftRadius: 15,
			borderTopRightRadius: 15
		}} indicatorStyle={{
			display: "none"
		}}>
          	<View style={{
				paddingBottom: (insets.bottom + 25)
			}}>
				<ActionSheetIndicator />
				<View style={{ height: 15 }}></View>
				{
					canShowSelectAllItems && (
						<ActionButton onPress={async () => {
							await SheetManager.hide("TopBarActionSheet")
		
							DeviceEventEmitter.emit("event", {
								type: "select-all-items"
							})
						}} icon="add-outline" text={i18n(lang, "selectAll")} />
					)
				}
				{
					canShowUnselectAllItems && (
						<ActionButton onPress={async () => {
							await SheetManager.hide("TopBarActionSheet")
		
							DeviceEventEmitter.emit("event", {
								type: "unselect-all-items"
							})
						}} icon="remove-outline" text={i18n(lang, "unselectAll")} />
					)
				}
				{
					canShowListViewStyle && (
						<ActionButton onPress={async () => {
							await SheetManager.hide("TopBarActionSheet")
		
							if(itemViewMode !== "grid"){
								setItemViewMode("grid")
							}
							else{
								setItemViewMode("list")
							}
						}} icon={itemViewMode !== "grid" ? "grid-outline" : "list-outline"} text={itemViewMode !== "grid" ? i18n(lang, "gridView") : i18n(lang, "listView")} />
					)
				}
				{
					canShowTransfersButton && (
						<ActionButton onPress={async () => {
							await SheetManager.hide("TopBarActionSheet")
		
							navigationAnimation({ enable: true }).then(() => {
								navigation.current.dispatch(StackActions.push("TransfersScreen"))
							})
						}} icon="repeat-outline" text={i18n(lang, "transfers")} />
					)
				}
          	</View>
        </ActionSheet>
    )
}

export const ItemActionSheetItemHeader = ({ navigation, route }) => {
	const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
	const currentActionSheetItem = useStore(state => state.currentActionSheetItem)
	const [email, setEmail] = useMMKVString("email", storage)
	const [lang, setLang] = useMMKVString("lang", storage)
    const [hideThumbnails, setHideThumbnails] = useMMKVBoolean("hideThumbnails:" + email, storage)
    const [hideFileNames, setHideFileNames] = useMMKVBoolean("hideFileNames:" + email, storage)
	const [hideSizes, setHideSizes] = useMMKVBoolean("hideSizes:" + email, storage)

	if(typeof currentActionSheetItem == "undefined"){
		return null
	}

	return (
		<View style={{
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
		}}>
			{
				currentActionSheetItem.type == "folder" ? (
					<Ionicon name="folder" size={34} color={getFolderColor(currentActionSheetItem.color)} style={{
						paddingTop: 0
					}} />
				) : (
					<FastImage source={hideThumbnails ? getImageForItem(currentActionSheetItem) : typeof currentActionSheetItem.thumbnail !== "undefined" ? { uri: (currentActionSheetItem.thumbnail.indexOf("file://") == -1 ? "file://" + currentActionSheetItem.thumbnail : currentActionSheetItem.thumbnail) } : getImageForItem(currentActionSheetItem)} style={{
						width: 30,
						height: 30,
						marginTop: currentActionSheetItem.type == "folder" ? 1 : 2,
						marginLeft: 2,
						borderRadius: 5
					}} />
				)
			}
			<View style={{
				width: "85%",
				paddingLeft: 10,
				paddingTop: currentActionSheetItem.type == "folder" ? 6 : 3
			}}>
				<Text style={{
					color: darkMode ? "white" : "black",
					fontWeight: "bold",
					fontSize: 12
				}} numberOfLines={1}>{hideFileNames ? i18n(lang, currentActionSheetItem.type == "folder" ? "folder" : "file") : currentActionSheetItem.name}</Text>
				<Text style={{
					color: darkMode ? "white" : "black",
					fontSize: 11
				}} numberOfLines={1}>
					{
						currentActionSheetItem.offline && (
							<>
								<Ionicon name="arrow-down-circle" size={12} color={"green"} />
								<Text>&nbsp;&nbsp;&#8226;&nbsp;&nbsp;</Text>
							</>
						)
					}
					{
						currentActionSheetItem.favorited == 1 && (
							<>
								<Ionicon name="heart" size={12} color={"#F6C358"} />
								<Text>&nbsp;&nbsp;&#8226;&nbsp;&nbsp;</Text>
							</>
						)
					}
					{hideSizes ? formatBytes(0) : formatBytes(currentActionSheetItem.size)}
					{
						typeof currentActionSheetItem.sharerEmail == "string" && (
							<>
								<Text>&nbsp;&nbsp;&#8226;&nbsp;&nbsp;</Text>
								<Text>{currentActionSheetItem.sharerEmail}</Text>
							</>
						)
					}
					{
						typeof currentActionSheetItem.receiverEmail == "string" && (
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
}

export const ActionSheetIndicator = () => {
	const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)

	return (
		<View style={{
			height: 6,
			width: 45,
			borderRadius: 100,
			backgroundColor: darkMode ? "#555555" : "lightgray",
			marginVertical: 5,
			alignSelf: "center",
			position: "absolute",
			zIndex: 2
		}}></View>
	)
}

export const ItemActionSheet = ({ navigation, route }) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
	const insets = useSafeAreaInsets()
	const currentActionSheetItem = useStore(state => state.currentActionSheetItem)
	const setRenameDialogVisible = useStore(state => state.setRenameDialogVisible)
	const [lang, setLang] = useMMKVString("lang", storage)
	const [canSaveToGallery, setCanSaveToGallery] = useState(false)
	const [itemListParent, setItemListParent] = useState("")
	const [routeURL, setRouteURL] = useState("")
	const setConfirmPermanentDeleteDialogVisible = useStore(state => state.setConfirmPermanentDeleteDialogVisible)
	const setRemoveFromSharedInDialogVisible = useStore(state => state.setRemoveFromSharedInDialogVisible)
	const setStopSharingDialogVisible = useStore(state => state.setStopSharingDialogVisible)
	const netInfo = useStore(state => state.netInfo)
	const [isDeviceOnline, setIsDeviceOnline] = useState(false)
	const [canDownload, setCanDownload] = useState(false)
	const [canEdit, setCanEdit] = useState(false)
	const setTextEditorState = useStore(state => state.setTextEditorState)
	const setTextEditorText = useStore(state => state.setTextEditorText)
	const setCreateTextFileDialogName = useStore(state => state.setCreateTextFileDialogName)
	const setTextEditorParent = useStore(state => state.setTextEditorParent)
	const [photosGridSize, setPhotosGridSize] = useMMKVNumber("photosGridSize", storage)

	const can = useCallback(() => {
		if(typeof currentActionSheetItem !== "undefined"){
			let itemAvailableOffline = false

			try{
				const email = storage.getString("email")
				
				itemAvailableOffline = (typeof email !== "undefined" ? (storage.getBoolean(email + ":offlineItems:" + currentActionSheetItem.uuid) ? true : false) : false)
			}
			catch(e){
				//console.log(e)
			}

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
	})

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
        <ActionSheet id="ItemActionSheet" gestureEnabled={true} containerStyle={{
			backgroundColor: darkMode ? "#171717" : "white",
			borderTopLeftRadius: 15,
			borderTopRightRadius: 15
		}} indicatorStyle={{
			display: "none"
		}}>
          	<ScrollView style={{
				paddingBottom: (insets.bottom + 25)
			}}>
				{
					typeof currentActionSheetItem !== "undefined" && (
						<>
							<ActionSheetIndicator />
							<ItemActionSheetItemHeader navigation={navigation} route={route} />
							<View style={{
								marginTop: 0
							}}>
								{
									routeURL.indexOf("photos") !== -1 && calcPhotosGridSize(photosGridSize) < 6 && (
										<ActionButton onPress={async () => {
											await SheetManager.hide("ItemActionSheet")

											DeviceEventEmitter.emit("event", {
												type: currentActionSheetItem.selected ? "unselect-item" : "select-item",
												data: currentActionSheetItem
											})
										}} icon="checkmark-circle-outline" text={i18n(lang, currentActionSheetItem.selected ? "unselect" : "select")} />
									)
								}
								{
									isDeviceOnline && itemListParent !== "trash" && routeURL.indexOf("shared-in") == -1 && itemListParent !== "offline" && (
										<>
											<ActionButton onPress={async () => {
												useStore.setState({ reRenderShareActionSheet: Math.random() })

												await SheetManager.hide("ItemActionSheet")
			
												SheetManager.show("ShareActionSheet")
											}} icon="share-social-outline" text={i18n(lang, "share")} />
											<ActionButton onPress={async () => {
												useStore.setState({ reRenderPublicLinkActionSheet: Math.random() })

												await SheetManager.hide("ItemActionSheet")
			
												SheetManager.show("PublicLinkActionSheet")
											}} icon="link-outline" text="Public link" />
										</>
									)
								}
								{
									canSaveToGallery && currentActionSheetItem.type == "file" && (
										<ActionButton onPress={async () => {
											await SheetManager.hide("ItemActionSheet")

											useStore.setState({ fullscreenLoadingModalVisible: false })

											hasStoragePermissions().then(() => {
												hasPhotoLibraryPermissions().then(() => {
													queueFileDownload({
														file: currentActionSheetItem,
														saveToGalleryCallback: (path) => {
	
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
										}} icon="image-outline" text={i18n(lang, "saveToGallery")} />
									)
								}
								{
									canEdit && currentActionSheetItem.type == "file" && itemListParent !== "offline" && routeURL.indexOf("shared-in") == -1 && (
										<ActionButton onPress={async () => {
											await SheetManager.hide("ItemActionSheet")
		
											hasStoragePermissions().then(() => {
												downloadWholeFileFSStream({
													file: currentActionSheetItem
												}).then((path) => {
													RNFS.readFile(path, "utf8").then((data) => {
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
										}} icon="create-outline" text={i18n(lang, "edit")} />
									)
								}
								{
									canDownload && currentActionSheetItem.type == "file" && itemListParent !== "offline" && Platform.OS == "android" && (
										<ActionButton onPress={async () => {
											await SheetManager.hide("ItemActionSheet")
		
											hasStoragePermissions().then(() => {
												queueFileDownload({ file: currentActionSheetItem })
											}).catch((err) => {
												console.log(err)

												showToast({ message: err.toString() })
											})
										}} icon="download-outline" text={i18n(lang, "download")} />
									)
								}
								{
									currentActionSheetItem.type == "file" && itemListParent !== "trash" && currentActionSheetItem.offline && (
										<ActionButton onPress={async () => {
											await SheetManager.hide("ItemActionSheet")
		
											hasStoragePermissions().then(() => {
												removeFromOfflineStorage({ item: currentActionSheetItem }).then(async () => {
													DeviceEventEmitter.emit("event", {
														type: "mark-item-offline",
														data: {
															uuid: currentActionSheetItem.uuid,
															value: false
														}
													})

													showToast({ message: i18n(lang, "itemRemovedFromOfflineStorage", true, ["__NAME__"], [currentActionSheetItem.name]) })
												}).catch((err) => {
													console.log(err)
	
													showToast({ message: err.toString() })
												})
											}).catch((err) => {
												console.log(err)

												showToast({ message: err.toString() })
											})
										}} icon="close-circle-outline" text={i18n(lang, "removeFromOfflineStorage")} />
									)
								}
								{
									isDeviceOnline && currentActionSheetItem.type == "file" && itemListParent !== "trash" && !currentActionSheetItem.offline && (
										<ActionButton onPress={async () => {
											await SheetManager.hide("ItemActionSheet")
		
											hasStoragePermissions().then(() => {
												queueFileDownload({ file: currentActionSheetItem, storeOffline: true })
											}).catch((err) => {
												console.log(err)

												showToast({ message: err.toString() })
											})
										}} icon="save-outline" text={i18n(lang, "makeAvailableOffline")} />
									)
								}
								{
									isDeviceOnline && currentActionSheetItem.type == "file" && itemListParent !== "trash" && routeURL.indexOf("shared-in") == -1 && itemListParent !== "offline" && (
										<ActionButton onPress={async () => {
											useStore.setState({ reRenderFileVersionsActionSheet: Math.random() })

											await SheetManager.hide("ItemActionSheet")
		
											SheetManager.show("FileVersionsActionSheet")
										}} icon="time-outline" text={i18n(lang, "versionHistory")} />
									)
								}
								{
									isDeviceOnline && itemListParent !== "trash" && routeURL.indexOf("shared-in") == -1 && itemListParent !== "offline" && (
										<ActionButton onPress={async () => {
											await SheetManager.hide("ItemActionSheet")

											useStore.setState({ fullscreenLoadingModalVisible: true })
		
											const value = currentActionSheetItem.favorited == 1 ? 0 : 1
		
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
		
												showToast({ message: i18n(lang, value == 1 ? "itemFavorited" : "itemUnfavorited", true, ["__NAME__"], [currentActionSheetItem.name]) })
											}).catch((err) => {
												console.log(err)
		
												useStore.setState({ fullscreenLoadingModalVisible: false })
		
												showToast({ message: err.toString() })
											})
										}} icon="heart-outline" text={currentActionSheetItem.favorited == 1 ? i18n(lang, "unfavorite") : i18n(lang, "favorite")} />
									)
								}
								{
									isDeviceOnline && currentActionSheetItem.type == "folder" && routeURL.indexOf("shared-in") == -1 && itemListParent !== "offline" && (
										<ActionButton onPress={async () => {
											await SheetManager.hide("ItemActionSheet")

											SheetManager.show("FolderColorActionSheet")
										}} icon="color-fill-outline" text={i18n(lang, "color")} />
									)
								}
								{
									isDeviceOnline && !currentActionSheetItem.isSync && !currentActionSheetItem.isDefault && itemListParent !== "trash" && routeURL.indexOf("shared-in") == -1 && routeURL.indexOf("shared-out") == -1 && routeURL.indexOf("links") == -1 && routeURL.indexOf("favorites") == -1 && routeURL.indexOf("offline") == -1 && routeURL.indexOf("recents") == -1 && routeURL.indexOf("photos") == -1 && (
										<ActionButton onPress={async () => {
											await SheetManager.hide("ItemActionSheet")
		
											showToast({ type: "move", message: i18n(lang, "moveItem", true, ["__NAME__"], [currentActionSheetItem.name]) })
										}} icon="move-outline" text={i18n(lang, "move")} />
									)
								}
								{
									isDeviceOnline && routeURL.indexOf("shared-in") == -1 && itemListParent !== "offline" && routeURL.indexOf("photos") == -1 && (
										<ActionButton onPress={async () => {
											await SheetManager.hide("ItemActionSheet")
		
											setRenameDialogVisible(true)
										}} icon="text-outline" text="Rename" />
									)
								}
								{
									isDeviceOnline && !currentActionSheetItem.isSync && !currentActionSheetItem.isDefault && itemListParent !== "trash" && routeURL.indexOf("shared-in") == -1 && itemListParent !== "offline" && (
										<ActionButton onPress={async () => {
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

												showToast({ message: i18n(lang, "itemTrashed", true, ["__NAME__"], [currentActionSheetItem.name]) })
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
										}} icon="trash-outline" text={i18n(lang, "trash")} />
									)
								}
								{
									isDeviceOnline && itemListParent == "trash" && routeURL.indexOf("shared-in") == -1 && (
										<>
											<ActionButton onPress={async () => {
												await SheetManager.hide("ItemActionSheet")

												setConfirmPermanentDeleteDialogVisible(true)
											}} icon="close-circle-outline" text={i18n(lang, "deletePermanently")} />
											<ActionButton onPress={async () => {
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
											}} icon="refresh-outline" text={i18n(lang, "restore")} />
										</>
									)
								}
								{
									isDeviceOnline && routeURL.indexOf("shared-in") !== -1 && (
										<ActionButton onPress={async () => {
											await SheetManager.hide("ItemActionSheet")

											setRemoveFromSharedInDialogVisible(true)
										}} icon="close-circle-outline" text={i18n(lang, "removeFromSharedIn")} />
									)
								}
								{
									isDeviceOnline && routeURL.indexOf("shared-out") !== -1 && (
										<ActionButton onPress={async () => {
											await SheetManager.hide("ItemActionSheet")

											setStopSharingDialogVisible(true)
										}} icon="close-circle-outline" text={i18n(lang, "stopSharing")} />
									)
								}
								{
									!isDeviceOnline && (
										<ActionButton onPress={async () => {
											await SheetManager.hide("ItemActionSheet")
										}} icon="cloud-offline-outline" text={i18n(lang, "deviceOffline")} />
									)
								}
							</View>
						</>
					)
				}
          	</ScrollView>
        </ActionSheet>
    )
}

export const FolderColorActionSheet = ({ navigation, route }) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
	const insets = useSafeAreaInsets()
	const [lang, setLang] = useMMKVString("lang", storage)
	const currentActionSheetItem = useStore(state => state.currentActionSheetItem)
	const [buttonsDisabled, setButtonsDisabled] = useState(false)

	const availableFolderColors = getAvailableFolderColors()

	useEffect(() => {
		setButtonsDisabled(false)
	}, [currentActionSheetItem])

    return (
        <ActionSheet id="FolderColorActionSheet" gestureEnabled={true} containerStyle={{
			backgroundColor: darkMode ? "#171717" : "white",
			borderTopLeftRadius: 15,
			borderTopRightRadius: 15
		}} indicatorStyle={{
			display: "none"
		}}>
          	<View style={{
				paddingBottom: (insets.bottom + 25)
			}}>
				<ActionSheetIndicator />
				<ItemActionSheetItemHeader />
				{
					Object.keys(availableFolderColors).map((prop) => {
						return (
							<ActionButton key={prop} onPress={async () => {
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
											uuid: currentActionSheetItem.uuid,
											color: prop
										}
									})

									setButtonsDisabled(false)

									useStore.setState({ fullscreenLoadingModalVisible: false })

									showToast({ message: i18n(lang, "folderColorChanged", true, ["__NAME__", "__COLOR__"], [currentActionSheetItem.name, i18n(lang, "color_" + prop)]) })
								}).catch((err) => {
									console.log(err)

									setButtonsDisabled(false)

									useStore.setState({ fullscreenLoadingModalVisible: false })

									showToast({ message: err.toString() })
								})
							}} color={availableFolderColors[prop]} text={i18n(lang, "color_" + prop)} />
						)
					})
				}
          	</View>
        </ActionSheet>
    )
}

export const PublicLinkActionSheet = ({ navigation, route }) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
	const insets = useSafeAreaInsets()
	const [lang, setLang] = useMMKVString("lang", storage)
	const currentActionSheetItem = useStore(state => state.currentActionSheetItem)
	const [buttonsDisabled, setButtonsDisabled] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [publicLinkExists, setPublicLinkExists] = useState(false)
    const [switchEnabled, setSwitchEnabled] = useState(false)
	const [password, setPassword] = useState("")
	const [expires, setExpires] = useState("never")
	const [downloadBtn, setDownloadBtn] = useState("enable")
	const [linkUUID, setLinkUUID] = useState("")
	const [passwordPlaceholder, setPasswordPlaceholder] = useState("")
	const [linkURL, setLinkURL] = useState("")
	const [isEdit, setIsEdit] = useState(false)
	const [linkKey, setLinkKey] = useState("")
	const [progress, setProgress] = useState({itemsDone: 0, totalItems: 1})
	const [type, setType] = useState(true)
	const reRenderPublicLinkActionSheet = useStore(state => state.reRenderPublicLinkActionSheet)
	const [pickerValue, setPickerValue] = useState("never")

	const resetState = useCallback(() => {
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
	})

	const editLink = useCallback((type = true, downloadButton = "enabled", pass = "", expire = "never", progressCallback) => {
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
			progressCallback: (itemsDone, totalItems) => {
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
						setLinkURL("https://filen.io/" + (currentActionSheetItem.type == "file" ? "d" : "f") + "/" + data.linkUUID + "#!" + data.linkKey)
					}
					else{
						setLinkUUID(data)
						setLinkURL("https://filen.io/" + (currentActionSheetItem.type == "file" ? "d" : "f") + "/" + data + "#!" + currentActionSheetItem.key)
					}
				}
				else{
					setLinkUUID(data)
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
		}).catch((err) => {
			setIsLoading(false)

			console.log(err)

			showToast({ message: err.toString(), placement: "top" })
		})
	})

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
          	<View style={{
				paddingBottom: (insets.bottom + 25)
			}}>
				<ActionSheetIndicator />
				<ItemActionSheetItemHeader />
				{
					isLoading ? (
						<View style={{
                            width: "100%",
                            height: 100,
                            justifyContent: "center",
                            alignItems: "center"
                        }}>
                            <ActivityIndicator size="small" color={darkMode ? "white" : "black"} />
							{
								typeof currentActionSheetItem !== "undefined" && currentActionSheetItem.type == "folder" && !isEdit && type && (
									<Text style={{
										color: darkMode ? "white" : "black",
										marginTop: 15
									}}>
										{i18n(lang, "folderPublicLinkProgress", true, ["__DONE__", "__TOTAL__"], [progress.itemsDone, progress.totalItems])}
									</Text>
								)
							}
                        </View>
					) : (
						<>
							<View style={{
								width: "100%",
								height: 45,
								flexDirection: "row",
								justifyContent: "space-between",
								borderBottomColor: getColor(darkMode, "actionSheetBorder"),
								borderBottomWidth: 1,
								paddingLeft: 15,
								paddingRight: 15
							}}>
								<Text style={{
									color: darkMode ? "white" : "black",
									paddingTop: 12
								}}>
									{i18n(lang, "publicLinkEnabled")}
								</Text>
								<View style={{
									paddingTop: Platform.OS == "ios" ? 6 : 8
								}}>
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
										<View style={{
											width: "100%",
											height: 45,
											flexDirection: "row",
											justifyContent: "space-between",
											borderBottomColor: getColor(darkMode, "actionSheetBorder"),
											borderBottomWidth: 1,
											paddingLeft: 15,
											paddingRight: 15
										}}>
											<TouchableOpacity style={{
												width: "65%"
											}} onPress={() => {
												Clipboard.setString(linkURL)
											
												showToast({ message: i18n(lang, "copiedToClipboard"), placement: "top" })
											}}>
												<Text style={{
													color: darkMode ? "white" : "black",
													paddingTop: 12
												}} numberOfLines={1}>
													{linkURL}
												</Text>
											</TouchableOpacity>
											<View style={{
												flexDirection: "row"
											}}>
												<TouchableOpacity onPress={() => {
													Share.share({
														message: linkURL,
														url: linkURL
													})
												}}>
													<Text style={{
														color: darkMode ? "white" : "black",
														paddingTop: 12,
														color: "#0A84FF",
														fontWeight: "bold"
													}}>
														{i18n(lang, "share")}
													</Text>
												</TouchableOpacity>
												<TouchableOpacity onPress={() => {
													Clipboard.setString(linkURL)
												
													showToast({ message: i18n(lang, "copiedToClipboard"), placement: "top" })
												}}>
													<Text style={{
														color: darkMode ? "white" : "black",
														paddingTop: 12,
														color: "#0A84FF",
														fontWeight: "bold",
														marginLeft: 15
													}}>
														{i18n(lang, "copy")}
													</Text>
												</TouchableOpacity>
											</View>
										</View>
										<View style={{
											width: "100%",
											height: 45,
											flexDirection: "row",
											justifyContent: "space-between",
											borderBottomColor: getColor(darkMode, "actionSheetBorder"),
											borderBottomWidth: 1,
											paddingLeft: 15,
											paddingRight: 15
										}}>
											<TextInput secureTextEntry={true} placeholder={passwordPlaceholder.length > 0 ? new Array(16).join("*") : i18n(lang, "publicLinkPassword")} value={password} onChangeText={setPassword} style={{
												width: "60%",
												paddingLeft: 0,
												paddingRight: 0
											}} />
											<View style={{
												flexDirection: "row"
											}}>
												{
													passwordPlaceholder.length > 0 && (
														<TouchableOpacity onPress={() => {
															setPassword("")
															setPasswordPlaceholder("")
															editLink(true, downloadBtn, "", expires)
														}}>
															<Text style={{
																color: darkMode ? "white" : "black",
																paddingTop: 12,
																color: "#0A84FF",
																fontWeight: "bold",
																marginLeft: 15
															}}>
																{i18n(lang, "remove")}
															</Text>
														</TouchableOpacity>
													)
												}
												{
													password.length > 0 && (
														<TouchableOpacity onPress={() => {
															if(password.length > 0){
																editLink(true, downloadBtn, password, expires)
															}
														}}>
															<Text style={{
																color: darkMode ? "white" : "black",
																paddingTop: 12,
																color: "#0A84FF",
																fontWeight: "bold",
																marginLeft: 15
															}}>
																{i18n(lang, "save")}
															</Text>
														</TouchableOpacity>
													)
												}
											</View>
										</View>
										{
											currentActionSheetItem.type == "file" && (
												<View style={{
													width: "100%",
													height: 45,
													flexDirection: "row",
													justifyContent: "space-between",
													borderBottomColor: getColor(darkMode, "actionSheetBorder"),
													borderBottomWidth: 1,
													paddingLeft: 15,
													paddingRight: 15
												}}>
													<Text style={{
														color: darkMode ? "white" : "black",
														paddingTop: 12
													}}>
														{i18n(lang, "publicLinkDownloadBtnEnabled")}
													</Text>
													<View style={{
														paddingTop: Platform.OS == "ios" ? 7 : 8
													}}>
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
											<TouchableOpacity style={{
												width: "100%",
												flexDirection: "row",
												justifyContent: "space-between",
												marginTop: 15,
												height: 45
											}}>
												<Text style={{
													marginLeft: 15,
													color: darkMode ? "white" : "black",
													fontSize: 15
												}}>
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
												<Ionicon name="chevron-forward-outline" size={18} color={darkMode ? "white" : "black"} style={{
													marginRight: 15
												}} />
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
}

export const ShareActionSheet = ({ navigation, route }) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
	const insets = useSafeAreaInsets()
	const [lang, setLang] = useMMKVString("lang", storage)
	const currentActionSheetItem = useStore(state => state.currentActionSheetItem)
	const [buttonsDisabled, setButtonsDisabled] = useState(false)
	const [email, setEmail] = useState("")
	const [isLoading, setIsLoading] = useState(false)
	const [progress, setProgress] = useState({ itemsDone: 0, totalItems: 1 })
	const reRenderShareActionSheet = useStore(state => state.reRenderShareActionSheet)
	const inputRef = useRef()

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
          	<View style={{
				paddingBottom: (insets.bottom + 25)
			}}>
				<ActionSheetIndicator />
				<ItemActionSheetItemHeader />
				{
					isLoading ? (
						<View style={{
                            width: "100%",
                            height: 100,
                            justifyContent: "center",
                            alignItems: "center"
                        }}>
                            <ActivityIndicator size="small" color={darkMode ? "white" : "black"} />
							{
								typeof currentActionSheetItem !== "undefined" && currentActionSheetItem.type == "folder" && (
									<Text style={{
										color: darkMode ? "white" : "black",
										marginTop: 15
									}}>
										{i18n(lang, "folderPublicLinkProgress", true, ["__DONE__", "__TOTAL__"], [progress.itemsDone, progress.totalItems])}
									</Text>
								)
							}
                        </View>
					) : (
						<View style={{
							width: "100%",
							height: 45,
							flexDirection: "row",
							justifyContent: "space-between",
							borderBottomColor: getColor(darkMode, "actionSheetBorder"),
							borderBottomWidth: 1,
							paddingLeft: 15,
							paddingRight: 15
						}}>
							<TextInput placeholder={i18n(lang, "sharePlaceholder")} value={email} onChangeText={setEmail} ref={inputRef} style={{
								width: "75%",
								paddingLeft: 0,
								paddingRight: 0
							}} />
							<View style={{
								flexDirection: "row"
							}}>
								{
									email.length > 0 && (
										<TouchableOpacity onPress={() => {
											if(buttonsDisabled){
												return false
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
													progressCallback: (itemsDone, totalItems) => {
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
										}}>
											{
												!buttonsDisabled && (
													<Text style={{
														paddingTop: 12,
														color: "#0A84FF",
														fontWeight: "bold"
													}}>
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
}

export const FileVersionsActionSheet = ({ navigation, route }) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
	const insets = useSafeAreaInsets()
	const [lang, setLang] = useMMKVString("lang", storage)
	const currentActionSheetItem = useStore(state => state.currentActionSheetItem)
	const [versionData, setVersionData] = useState([])
    const [buttonsDisabled, setButtonsDisabled] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const reRenderFileVersionsActionSheet = useStore(state => state.reRenderFileVersionsActionSheet)

	const fetchVersions = useCallback(() => {
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
	})

    useEffect(() => {
        fetchVersions()
    }, [reRenderFileVersionsActionSheet])

    return (
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
          	<View style={{
				paddingBottom: (insets.bottom + 25)
			}}>
				<ActionSheetIndicator />
				<ItemActionSheetItemHeader />
				{
					isLoading ? (
						<View style={{
                            width: "100%",
                            height: 100,
                            justifyContent: "center",
                            alignItems: "center"
                        }}>
                            <ActivityIndicator size="small" color={darkMode ? "white" : "black"} />
                        </View>
					) : (
						<ScrollView style={{
                            width: "100%",
                            overflow: "scroll"
                        }}>
                            {
                                versionData.length > 0 && typeof currentActionSheetItem !== "undefined" ? (
                                    <>
                                        {
                                            versionData.map((item, index) => {
                                                const uploadDate = (new Date(item.timestamp * 1000)).toString().split(" ")
                                                const dateString = uploadDate[1] + ` ` + uploadDate[2] + ` ` + uploadDate[3] + ` ` + uploadDate[4]

                                                return (
                                                    <View key={index} style={{
                                                        paddingLeft: 15,
                                                        paddingRight: 15,
                                                        paddingTop: 10,
                                                        paddingBottom: 10,
                                                        borderBottomColor: getColor(darkMode, "actionSheetBorder"),
                                                        borderBottomWidth: 1,
                                                        flexDirection: "row",
                                                        justifyContent: "space-between"
                                                    }}>
                                                        <Text style={{
                                                            color: darkMode ? "white" : "black"
                                                        }}>
                                                            {dateString}
                                                        </Text>
                                                        {
                                                            item.uuid == currentActionSheetItem.uuid ? (
                                                                <Text style={{
                                                                    color: darkMode ? "white" : "black"
                                                                }}>
                                                                    {i18n(lang, "currentVersion")}
                                                                </Text>
                                                            ) : (
                                                                <View style={{
																	flexDirection: "row"
																}}>
																	<TouchableOpacity onPress={async () => {
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
																	}}>
																		<Text style={{
																			color: "#0A84FF",
																			fontWeight: "bold"
																		}}>
																			{i18n(lang, "delete")}
																		</Text>
																	</TouchableOpacity>
																	<TouchableOpacity style={{
																		marginLeft: 15
																	}} onPress={() => {
																		decryptFileMetadata(getMasterKeys(), item.metadata, item.uuid).then((decrypted) => {
																			item.name = decrypted.name
																			item.size = decrypted.size
																			item.mime = decrypted.mime
																			item.key = decrypted.key
																			item.lastModified = decrypted.lastModified

																			previewItem({ item, setCurrentActionSheetItem: false })
																		}).catch((err) => {
																			console.log(err)

																			showToast({ message: err.toString() })
																		})
																	}}>
																		<Text style={{
																			color: "#0A84FF",
																			fontWeight: "bold"
																		}}>
																			{i18n(lang, "preview")}
																		</Text>
																	</TouchableOpacity>
																	<TouchableOpacity style={{
																		marginLeft: 15
																	}} onPress={() => {
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
																	}}>
																		<Text style={{
																			color: "#0A84FF",
																			fontWeight: "bold"
																		}}>
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
									<View style={{
										paddingLeft: 15,
										paddingRight: 15,
										paddingTop: 10,
										paddingBottom: 10
									}}>
										<Text style={{
											color: darkMode ? "white" : "black"
										}}>
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
}