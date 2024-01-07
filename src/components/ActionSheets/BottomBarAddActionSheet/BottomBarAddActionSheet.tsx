import React, { memo, useCallback } from "react"
import { View, DeviceEventEmitter, Platform } from "react-native"
import ActionSheet, { SheetManager } from "react-native-actions-sheet"
import storage, { sharedStorage } from "../../../lib/storage/storage"
import useLang from "../../../lib/hooks/useLang"
import { useStore } from "../../../lib/state"
import { getRandomArbitrary, convertTimestampToMs, getFileExt, getParent, getFilePreviewType, safeAwait } from "../../../lib/helpers"
import { queueFileUpload, UploadFile, uploadFolder } from "../../../lib/services/upload/upload"
import { showToast } from "../../Toasts"
import { i18n } from "../../../i18n"
import { hasStoragePermissions, hasPhotoLibraryPermissions, hasCameraPermissions } from "../../../lib/permissions"
import { getColor } from "../../../style/colors"
import * as fs from "../../../lib/fs"
import RNDocumentPicker, { DocumentPickerResponse } from "react-native-document-picker"
import * as RNImagePicker from "react-native-image-picker"
import mimeTypes from "mime-types"
import { ActionButton } from "../ActionSheets"
import useDarkMode from "../../../lib/hooks/useDarkMode"
import { getLastModified } from "../../../lib/services/cameraUpload"
import useDimensions from "../../../lib/hooks/useDimensions"
import { openDocumentTree } from "react-native-saf-x"
import { MaterialIcons } from "@expo/vector-icons"

const BottomBarAddActionSheet = memo(() => {
	const darkMode = useDarkMode()
	const currentRoutes = useStore(state => state.currentRoutes)
	const dimensions = useDimensions()
	const lang = useLang()

	const createFolder = useCallback(async () => {
		await SheetManager.hide("BottomBarAddActionSheet")

		DeviceEventEmitter.emit("openCreateFolderDialog")
	}, [])

	const createTextFile = useCallback(async () => {
		await SheetManager.hide("BottomBarAddActionSheet")

		DeviceEventEmitter.emit("openCreateTextFileDialog")
	}, [])

	const takePhoto = useCallback(async () => {
		await SheetManager.hide("BottomBarAddActionSheet")

		const [hasPermissionsError, hasPermissionsResult] = await safeAwait(hasCameraPermissions(true))

		if (hasPermissionsError) {
			showToast({ message: i18n(storage.getString("lang"), "pleaseGrantPermission") })

			return
		}

		if (!hasPermissionsResult) {
			showToast({ message: i18n(storage.getString("lang"), "pleaseGrantPermission") })

			return
		}

		storage.set("lastBiometricScreen:" + storage.getNumber("userId"), Date.now() + 5000)
		sharedStorage.set("lastBiometricScreen:" + storage.getNumber("userId"), Date.now() + 5000)

		const getFileInfo = (asset: RNImagePicker.Asset): Promise<UploadFile> => {
			return new Promise((resolve, reject) => {
				if (!asset.uri) {
					return reject(new Error("Could not copy file"))
				}

				const fileURI = decodeURIComponent(asset.uri.replace("file://", ""))

				fs.stat(fileURI)
					.then(info => {
						if (!info.exists) {
							return reject(new Error(fileURI + " does not exist"))
						}

						return resolve({
							path: fileURI,
							name:
								i18n(lang, getFilePreviewType(getFileExt(fileURI)) == "image" ? "photo" : "video") +
								"_" +
								new Date().toISOString().split(":").join("-").split(".").join("-") +
								getRandomArbitrary(1, 999999999) +
								"." +
								getFileExt(fileURI),
							size: info.size,
							mime: mimeTypes.lookup(fileURI) || "",
							lastModified: convertTimestampToMs(info.modificationTime || Date.now())
						})
					})
					.catch(reject)
			})
		}

		RNImagePicker.launchCamera(
			{
				maxWidth: 999999999,
				maxHeight: 999999999,
				videoQuality: "high",
				cameraType: "back",
				quality: 1,
				includeBase64: false,
				saveToPhotos: false,
				mediaType: "photo",
				durationLimit: 86400000
			},
			async response => {
				storage.set("lastBiometricScreen:" + storage.getNumber("userId"), Date.now() + 5000)
				sharedStorage.set("lastBiometricScreen:" + storage.getNumber("userId"), Date.now() + 5000)

				if (response.errorMessage) {
					console.error(response.errorMessage)

					showToast({ message: response.errorMessage })

					return
				}

				if (response.didCancel) {
					return
				}

				const parent = getParent()

				if (parent.length < 16) {
					return
				}

				if (response.assets) {
					for (const asset of response.assets) {
						if (asset.uri) {
							try {
								const file = await getFileInfo(asset)

								queueFileUpload({ file, parent }).catch(err => {
									if (err == "wifiOnly") {
										return showToast({ message: i18n(lang, "onlyWifiUploads") })
									}

									console.error(err)

									showToast({ message: err.toString() })
								})
							} catch (e: any) {
								console.error(e)

								showToast({ message: e.toString() })
							}
						}
					}
				}
			}
		)
	}, [])

	const uploadFromGallery = useCallback(async () => {
		await SheetManager.hide("BottomBarAddActionSheet")

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

		storage.set("lastBiometricScreen:" + storage.getNumber("userId"), Date.now() + 5000)
		sharedStorage.set("lastBiometricScreen:" + storage.getNumber("userId"), Date.now() + 5000)

		DeviceEventEmitter.emit("openSelectMediaScreen")
	}, [])

	const uploadFolders = useCallback(async () => {
		await SheetManager.hide("BottomBarAddActionSheet")

		const [hasPermissionsError, hasPermissionsResult] = await safeAwait(hasStoragePermissions(true))

		if (hasPermissionsError) {
			showToast({ message: i18n(storage.getString("lang"), "pleaseGrantPermission") })

			return
		}

		if (!hasPermissionsResult) {
			showToast({ message: i18n(storage.getString("lang"), "pleaseGrantPermission") })

			return
		}

		storage.set("lastBiometricScreen:" + storage.getNumber("userId"), Date.now() + 5000)
		sharedStorage.set("lastBiometricScreen:" + storage.getNumber("userId"), Date.now() + 5000)

		try {
			let uri = ""
			const result = Platform.OS === "android" ? await openDocumentTree(true) : await RNDocumentPicker.pickDirectory()

			if (result && result.uri) {
				uri = result.uri
			}

			if (!uri || uri.length <= 0) {
				return
			}

			const parent = getParent()

			if (parent.length < 16) {
				return
			}

			uploadFolder({ uri, parent, showFullScreenLoading: true }).catch(err => {
				if (err === "stopped") {
					return
				}

				if (err === "wifiOnly") {
					showToast({ message: i18n(lang, "onlyWifiUploads") })

					return
				}

				console.error(err)

				showToast({ message: err.toString() })
			})
		} catch (e) {
			storage.set("lastBiometricScreen:" + storage.getNumber("userId"), Date.now() + 5000)
			sharedStorage.set("lastBiometricScreen:" + storage.getNumber("userId"), Date.now() + 5000)

			if (RNDocumentPicker.isCancel(e)) {
				return
			}

			console.error(e)

			showToast({ message: e.toString() })
		}
	}, [lang])

	const uploadFiles = useCallback(async () => {
		await SheetManager.hide("BottomBarAddActionSheet")

		const [hasPermissionsError, hasPermissionsResult] = await safeAwait(hasStoragePermissions(true))

		if (hasPermissionsError) {
			showToast({ message: i18n(storage.getString("lang"), "pleaseGrantPermission") })

			return
		}

		if (!hasPermissionsResult) {
			showToast({ message: i18n(storage.getString("lang"), "pleaseGrantPermission") })

			return
		}

		storage.set("lastBiometricScreen:" + storage.getNumber("userId"), Date.now() + 5000)
		sharedStorage.set("lastBiometricScreen:" + storage.getNumber("userId"), Date.now() + 5000)

		const getFileInfo = (result: DocumentPickerResponse): Promise<UploadFile> => {
			return new Promise((resolve, reject) => {
				if (result.copyError) {
					return reject(new Error("Could not copy file"))
				}

				if (typeof result.fileCopyUri !== "string") {
					return reject(new Error("Could not copy file"))
				}

				const fileURI = decodeURIComponent(result.fileCopyUri.replace("file://", "").replace("file:", ""))

				fs.stat(fileURI)
					.then(info => {
						if (!info.exists) {
							return reject(new Error(fileURI + " does not exist"))
						}

						getLastModified(fileURI, result.name, convertTimestampToMs(info.modificationTime || Date.now()))
							.then(lastModified => {
								return resolve({
									path: fileURI,
									name: result.name,
									size: info.size,
									mime: mimeTypes.lookup(result.name) || result.type || "",
									lastModified
								})
							})
							.catch(reject)
					})
					.catch(reject)
			})
		}

		RNDocumentPicker.pickMultiple({
			type: [RNDocumentPicker.types.allFiles],
			copyTo: "cachesDirectory"
		})
			.then(async result => {
				storage.set("lastBiometricScreen:" + storage.getNumber("userId"), Date.now() + 5000)
				sharedStorage.set("lastBiometricScreen:" + storage.getNumber("userId"), Date.now() + 5000)

				const parent = getParent()

				if (parent.length < 16) {
					return
				}

				for (let i = 0; i < result.length; i++) {
					try {
						const file = await getFileInfo(result[i])

						queueFileUpload({ file, parent }).catch(err => {
							if (err == "wifiOnly") {
								return showToast({ message: i18n(lang, "onlyWifiUploads") })
							}

							console.error(err)

							showToast({ message: err.toString() })
						})
					} catch (e: any) {
						console.log(e)

						showToast({ message: e.toString() })
					}
				}
			})
			.catch(err => {
				storage.set("lastBiometricScreen:" + storage.getNumber("userId"), Date.now() + 5000)
				sharedStorage.set("lastBiometricScreen:" + storage.getNumber("userId"), Date.now() + 5000)

				if (RNDocumentPicker.isCancel(err)) {
					return
				}

				console.log(err)

				showToast({ message: err.toString() })
			})
	}, [])

	return (
		<ActionSheet
			id="BottomBarAddActionSheet"
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
			<View
				style={{
					paddingBottom: dimensions.insets.bottom + dimensions.navigationBarHeight
				}}
			>
				<ActionButton
					onPress={createFolder}
					icon="folder-outline"
					text={i18n(lang, "createFolder")}
				/>
				{typeof currentRoutes == "object" &&
					Array.isArray(currentRoutes) &&
					typeof currentRoutes[currentRoutes.length - 1].params == "object" &&
					typeof currentRoutes[currentRoutes.length - 1].params.parent !== "undefined" &&
					currentRoutes[currentRoutes.length - 1].params.parent !== "base" && (
						<>
							<ActionButton
								onPress={createTextFile}
								icon="create-outline"
								text={i18n(lang, "createTextFile")}
							/>
							<ActionButton
								onPress={takePhoto}
								icon="camera-outline"
								text={i18n(lang, "takePhotoAndUpload")}
							/>
							<ActionButton
								onPress={uploadFromGallery}
								icon="image-outline"
								text={i18n(lang, "uploadFromGallery")}
							/>
							<ActionButton
								onPress={uploadFolders}
								icon={
									<View
										style={{
											marginLeft: -2
										}}
									>
										<MaterialIcons
											name="drive-folder-upload"
											size={24}
											color={getColor(darkMode, "textSecondary")}
										/>
									</View>
								}
								text={i18n(lang, "uploadFolders")}
							/>
							<ActionButton
								onPress={uploadFiles}
								icon="cloud-upload-outline"
								text={i18n(lang, "uploadFiles")}
							/>
						</>
					)}
			</View>
		</ActionSheet>
	)
})

export default BottomBarAddActionSheet
