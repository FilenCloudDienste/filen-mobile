import React, { memo } from "react"
import { View, Platform, DeviceEventEmitter } from "react-native"
import ActionSheet, { SheetManager } from "react-native-actions-sheet"
import storage from "../../../lib/storage"
import useLang from "../../../lib/hooks/useLang"
import { useSafeAreaInsets, EdgeInsets } from "react-native-safe-area-context"
import { useStore } from "../../../lib/state"
import { getRandomArbitrary, convertTimestampToMs, getFileExt, getParent, getFilePreviewType } from "../../../lib/helpers"
import { queueFileUpload, UploadFile } from "../../../lib/services/upload/upload"
import { showToast } from "../../Toasts"
import { i18n } from "../../../i18n"
import { hasStoragePermissions, hasPhotoLibraryPermissions, hasCameraPermissions } from "../../../lib/permissions"
import { getColor } from "../../../style/colors"
import ReactNativeBlobUtil from "react-native-blob-util"
import RNDocumentPicker, { DocumentPickerResponse } from "react-native-document-picker"
import * as RNImagePicker from "react-native-image-picker"
import mimeTypes from "mime-types"
import { ActionButton, ActionSheetIndicator } from "../ActionSheets"
import useDarkMode from "../../../lib/hooks/useDarkMode"

const BottomBarAddActionSheet = memo(() => {
    const darkMode = useDarkMode()
	const currentRoutes = useStore(state => state.currentRoutes)
	const insets: EdgeInsets = useSafeAreaInsets()
	const lang = useLang()

    return (
		// @ts-ignore
        <ActionSheet
			id="BottomBarAddActionSheet"
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

						DeviceEventEmitter.emit("openCreateFolderDialog")
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

									DeviceEventEmitter.emit("openCreateTextFileDialog")
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
													if(!asset.uri){
														return reject(new Error("Could not copy file"))
													}

													const fileURI = decodeURIComponent(asset.uri.replace("file://", ""))

													ReactNativeBlobUtil.fs.stat(fileURI).then((info) => {
														return resolve({
															path: fileURI,
															name: i18n(lang, getFilePreviewType(getFileExt(fileURI)) == "image" ? "photo" : "video") + "_" + new Date().toISOString().split(":").join("-").split(".").join("-") + getRandomArbitrary(1, 999999999) +  "." + getFileExt(fileURI),
															size: info.size as number,
															mime: mimeTypes.lookup(fileURI) || "",
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
												saveToPhotos: false,
												mediaType: "photo",
												durationLimit: 86400000
											}, async (response) => {
												if(response.errorMessage){
													console.log(response.errorMessage)

													showToast({ message: response.errorMessage })

													return
												}
												
												if(response.didCancel){
													return
												}

												const parent = getParent()

												if(parent.length < 16){
													return
												}

												if(response.assets){
													for(const asset of response.assets){
														if(asset.uri){
															try{
																const file = await getFileInfo(asset)
		
																queueFileUpload({ file, parent }).catch((err) => {
																	if(err == "wifiOnly"){
																		return showToast({ message: i18n(lang, "onlyWifiUploads") })
																	}
		
																	console.error(err)
		
																	showToast({ message: err.toString() })
																})
															}
															catch(e: any){
																console.log(e)
		
																showToast({ message: e.toString() })
															}
														}
													}
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

												if(Platform.OS == "ios"){
													const getFileInfo = (asset: RNImagePicker.Asset): Promise<UploadFile> => {
														return new Promise((resolve, reject) => {
															if(!asset.uri){
																return reject(new Error("Could not copy file"))
															}
	
															const fileURI = decodeURIComponent(asset.uri.replace("file://", ""))
	
															ReactNativeBlobUtil.fs.stat(fileURI).then((info) => {
																return resolve({
																	path: fileURI,
																	name: i18n(lang, getFilePreviewType(getFileExt(fileURI)) == "image" ? "photo" : "video") + "_" + new Date().toISOString().split(":").join("-").split(".").join("-") + getRandomArbitrary(1, 999999999) +  "." + getFileExt(fileURI),
																	size: info.size as number,
																	mime: mimeTypes.lookup(fileURI) || "",
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
														maxWidth: 999999999,
														maxHeight: 999999999
													}, async (response) => {
														if(response.errorMessage){
															console.log(response.errorMessage)
		
															showToast({ message: response.errorMessage })
		
															return
														}
														
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
				
																		queueFileUpload({ file, parent }).catch((err) => {
																			if(err == "wifiOnly"){
																				return showToast({ message: i18n(lang, "onlyWifiUploads") })
																			}
				
																			console.error(err)
				
																			showToast({ message: err.toString() })
																		})
																	}
																	catch(e: any){
																		console.log(e)
				
																		showToast({ message: e.toString() })
																	}
																}
															}
														}
													})
												}
												else{
													const getFileInfo = (result: DocumentPickerResponse): Promise<UploadFile> => {
														return new Promise((resolve, reject) => {
															if(result.copyError){
																return reject(new Error("Could not copy file"))
															}
		
															if(typeof result.fileCopyUri !== "string"){
																return reject(new Error("Could not copy file"))
															}
		
															const fileURI = decodeURIComponent(result.fileCopyUri.replace("file://", "").replace("file:", ""))
		
															ReactNativeBlobUtil.fs.stat(fileURI).then((info) => {
																return resolve({
																	path: fileURI,
																	name: result.name,
																	size: info.size as number,
																	mime: mimeTypes.lookup(result.name) || result.type || "",
																	lastModified: convertTimestampToMs(info.lastModified || new Date().getTime())
																})
															}).catch(reject)
														})
													}
		
													RNDocumentPicker.pickMultiple({
														type: [RNDocumentPicker.types.video, RNDocumentPicker.types.images],
														copyTo: "cachesDirectory"
													}).then(async (result) => {
														const parent = getParent()
					
														if(parent.length < 16){
															return
														}
		
														for(let i = 0; i < result.length; i++){
															try{
																const file = await getFileInfo(result[i])
		
																queueFileUpload({ file, parent }).catch((err) => {
																	if(err == "wifiOnly"){
																		return showToast({ message: i18n(lang, "onlyWifiUploads") })
																	}
		
																	console.error(err)
		
																	showToast({ message: err.toString() })
																})
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
												}
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

											const getFileInfo = (result: DocumentPickerResponse): Promise<UploadFile> => {
												return new Promise((resolve, reject) => {
													if(result.copyError){
														return reject(new Error("Could not copy file"))
													}

													if(typeof result.fileCopyUri !== "string"){
														return reject(new Error("Could not copy file"))
													}

													const fileURI = decodeURIComponent(result.fileCopyUri.replace("file://", "").replace("file:", ""))

													ReactNativeBlobUtil.fs.stat(fileURI).then((info) => {
														return resolve({
															path: fileURI,
															name: result.name,
															size: info.size as number,
															mime: mimeTypes.lookup(result.name) || result.type || "",
															lastModified: convertTimestampToMs(info.lastModified || new Date().getTime())
														})
													}).catch(reject)
												})
											}

											RNDocumentPicker.pickMultiple({
												type: [RNDocumentPicker.types.allFiles],
												copyTo: "cachesDirectory"
											}).then(async (result) => {
												const parent = getParent()
			
												if(parent.length < 16){
													return
												}

												for(let i = 0; i < result.length; i++){
													try{
														const file = await getFileInfo(result[i])

														queueFileUpload({ file, parent }).catch((err) => {
															if(err == "wifiOnly"){
																return showToast({ message: i18n(lang, "onlyWifiUploads") })
															}

															console.error(err)

															showToast({ message: err.toString() })
														})
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

export default BottomBarAddActionSheet