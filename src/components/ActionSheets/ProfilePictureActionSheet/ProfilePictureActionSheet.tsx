import React, { memo, useCallback } from "react"
import { View } from "react-native"
import ActionSheet, { SheetManager } from "react-native-actions-sheet"
import storage from "../../../lib/storage"
import useLang from "../../../lib/hooks/useLang"
import useDimensions from "../../../lib/hooks/useDimensions"
import { useStore } from "../../../lib/state"
import { formatBytes, getAPIServer, getAPIKey, safeAwait } from "../../../lib/helpers"
import { showToast } from "../../Toasts"
import { i18n } from "../../../i18n"
import { hasStoragePermissions, hasPhotoLibraryPermissions, hasCameraPermissions } from "../../../lib/permissions"
import { getColor } from "../../../style/colors"
import { updateUserInfo } from "../../../lib/services/user/info"
import * as RNImagePicker from "react-native-image-picker"
import { ActionButton } from "../ActionSheets"
import useDarkMode from "../../../lib/hooks/useDarkMode"
import axios from "axios"

const CryptoJS = require("crypto-js")

const allowedTypes: string[] = ["image/jpg", "image/png", "image/jpeg"]

const ProfilePictureActionSheet = memo(() => {
	const darkMode = useDarkMode()
	const dimensions = useDimensions()
	const lang = useLang()

	const uploadAvatarImage = useCallback(async (base64: string) => {
		useStore.setState({ fullscreenLoadingModalVisible: true })

		try {
			const data = JSON.stringify({
				avatar: base64,
				hash: CryptoJS.SHA512(base64).toString(CryptoJS.enc.Hex)
			})

			const checksum = await nodeThread.createHashHexFromString({ name: "sha512", data })
			const response = await axios.post(getAPIServer() + "/v3/user/avatar", data, {
				headers: {
					Authorization: "Bearer " + getAPIKey(),
					"Content-Type": "application/json",
					Checksum: checksum
				}
			})

			if (!response.data.status) {
				console.error(new Error(response.data.message))

				showToast({ message: response.data.message })

				useStore.setState({ fullscreenLoadingModalVisible: false })

				return
			}

			updateUserInfo()
		} catch (e: any) {
			console.error(e)

			showToast({ message: e.toString() })
		}

		useStore.setState({ fullscreenLoadingModalVisible: false })
	}, [])

	const takePhoto = useCallback(async () => {
		await SheetManager.hide("ProfilePictureActionSheet")
		await new Promise(resolve => setTimeout(resolve, 250))

		const [hasPermissionsError, hasPermissionsResult] = await safeAwait(hasCameraPermissions(true))

		if (hasPermissionsError) {
			showToast({ message: i18n(storage.getString("lang"), "pleaseGrantPermission") })

			return
		}

		if (!hasPermissionsResult) {
			showToast({ message: i18n(storage.getString("lang"), "pleaseGrantPermission") })

			return
		}

		storage.set("lastBiometricScreen:" + storage.getNumber("userId"), Date.now() + 3600000)

		RNImagePicker.launchCamera(
			{
				maxWidth: 999999999,
				maxHeight: 999999999,
				videoQuality: "low",
				cameraType: "back",
				quality: 0.2,
				includeBase64: true,
				saveToPhotos: false,
				mediaType: "photo"
			},
			response => {
				storage.set("lastBiometricScreen:" + storage.getNumber("userId"), Date.now() - 5000)

				if (response.errorMessage) {
					console.log(response.errorMessage)

					showToast({ message: response.errorMessage })

					return
				}

				if (response.didCancel) {
					return
				}

				if (response.errorMessage) {
					console.error(response.errorMessage)

					showToast({ message: response.errorMessage.toString() })

					return
				}

				if (typeof response.assets == "undefined") {
					return
				}

				if (!Array.isArray(response.assets)) {
					return
				}

				if (typeof response.assets[0] == "undefined") {
					return
				}

				const image = response.assets[0]

				if (!allowedTypes.includes(image.type as string) || typeof image.base64 !== "string") {
					showToast({ message: i18n(lang, "avatarInvalidImage") })

					return
				}

				if ((image.fileSize as number) > 1024 * 1024 * 2.99) {
					useStore.setState({ fullscreenLoadingModalVisible: false })

					showToast({
						message: i18n(lang, "avatarMaxImageSize", true, ["__SIZE__"], [formatBytes(1024 * 1024 * 3)])
					})

					return
				}

				uploadAvatarImage(image.base64)
			}
		)
	}, [lang])

	const fromGallery = useCallback(async () => {
		await SheetManager.hide("ProfilePictureActionSheet")
		await new Promise(resolve => setTimeout(resolve, 250))

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

		storage.set("lastBiometricScreen:" + storage.getNumber("userId"), Date.now() + 3600000)

		RNImagePicker.launchImageLibrary(
			{
				mediaType: "photo",
				selectionLimit: 1,
				quality: 0.2,
				videoQuality: "low",
				includeBase64: true,
				maxWidth: 999999999,
				maxHeight: 999999999
			},
			response => {
				storage.set("lastBiometricScreen:" + storage.getNumber("userId"), Date.now() - 5000)

				if (response.didCancel) {
					return
				}

				if (response.errorMessage) {
					console.error(response.errorMessage)

					showToast({ message: response.errorMessage.toString() })

					return
				}

				if (typeof response.assets == "undefined") {
					showToast({ message: i18n(lang, "avatarInvalidImage") })

					return
				}

				if (!Array.isArray(response.assets)) {
					showToast({ message: i18n(lang, "avatarInvalidImage") })

					return
				}

				if (typeof response.assets[0] == "undefined") {
					showToast({ message: i18n(lang, "avatarInvalidImage") })

					return
				}

				const image = response.assets[0]

				if (!allowedTypes.includes(image.type as string) || typeof image.base64 !== "string") {
					showToast({ message: i18n(lang, "avatarInvalidImage") })

					return
				}

				if ((image.fileSize as number) > 1024 * 1024 * 2.99) {
					useStore.setState({ fullscreenLoadingModalVisible: false })

					showToast({
						message: i18n(lang, "avatarMaxImageSize", true, ["__SIZE__"], [formatBytes(1024 * 1024 * 3)])
					})

					return
				}

				uploadAvatarImage(image.base64)
			}
		)
	}, [])

	return (
		<ActionSheet
			id="ProfilePictureActionSheet"
			gestureEnabled={true}
			containerStyle={{
				backgroundColor: getColor(darkMode, "backgroundSecondary"),
				borderTopLeftRadius: 15,
				borderTopRightRadius: 15,
				paddingBottom: 15
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
					onPress={takePhoto}
					icon="camera-outline"
					text={i18n(lang, "takePhotoAndUpload")}
				/>
				<ActionButton
					onPress={fromGallery}
					icon="image-outline"
					text={i18n(lang, "uploadFromGallery")}
				/>
			</View>
		</ActionSheet>
	)
})

export default ProfilePictureActionSheet
