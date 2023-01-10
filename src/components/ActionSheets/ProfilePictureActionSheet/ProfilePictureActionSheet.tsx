import React, { memo, useCallback } from "react"
import { View } from "react-native"
import ActionSheet, { SheetManager } from "react-native-actions-sheet"
import storage from "../../../lib/storage"
import useLang from "../../../lib/hooks/useLang"
import { useSafeAreaInsets, EdgeInsets } from "react-native-safe-area-context"
import { useStore } from "../../../lib/state"
import { formatBytes, convertUint8ArrayToBinaryString, base64ToArrayBuffer, getAPIServer, getAPIKey } from "../../../lib/helpers"
import { showToast } from "../../Toasts"
import { i18n } from "../../../i18n"
import { hasStoragePermissions, hasPhotoLibraryPermissions, hasCameraPermissions } from "../../../lib/permissions"
import { getColor } from "../../../style/colors"
import { updateUserInfo } from "../../../lib/services/user/info"
import ReactNativeBlobUtil from "react-native-blob-util"
import * as RNImagePicker from "react-native-image-picker"
import { ActionSheetIndicator, ActionButton } from "../ActionSheets"
import useDarkMode from "../../../lib/hooks/useDarkMode"

const allowedTypes: string[] = [
	"image/jpg",
	"image/png",
	"image/jpeg"
]

const ProfilePictureActionSheet = memo(() => {
    const darkMode = useDarkMode()
	const insets: EdgeInsets = useSafeAreaInsets()
	const lang = useLang()

	const uploadAvatarImage = useCallback((uri: string) => {
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
				console.error(err)
	
				useStore.setState({ fullscreenLoadingModalVisible: false })
	
				showToast({ message: err.toString() })
			})
		}).catch((err) => {
			console.error(err)

			useStore.setState({ fullscreenLoadingModalVisible: false })

			showToast({ message: err.toString() })
		})
	}, [])

	const takePhoto = useCallback(async () => {
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
					saveToPhotos: false,
					mediaType: "photo"
				}, (response) => {
					if(response.errorMessage){
						console.log(response.errorMessage)

						showToast({ message: response.errorMessage })

						return
					}
					
					if(response.didCancel){
						return
					}

					if(response.errorMessage){
						console.error(response.errorMessage)

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
						showToast({ message: i18n(lang, "avatarInvalidImage") })

						return
					}

					if(image.fileSize as number > ((1024 * 1024) * 2.99)){
						useStore.setState({ fullscreenLoadingModalVisible: false })
			
						showToast({ message: i18n(lang, "avatarMaxImageSize", true, ["__SIZE__"], [formatBytes(((1024 * 1024) * 3))]) })

						return
					}

					uploadAvatarImage(decodeURIComponent(image.uri as string))
				})
			}).catch((err) => {
				console.error(err)

				showToast({ message: err.toString() })
			})
		}, 500)
	}, [lang])

	const fromGallery = useCallback(async () => {
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
						maxWidth: 999999999,
						maxHeight: 999999999
					}, (response) => {
						if(response.didCancel){
							return
						}

						if(response.errorMessage){
							console.error(response.errorMessage)

							showToast({ message: response.errorMessage.toString() })

							return
						}

						if(typeof response.assets == "undefined"){
							showToast({ message: i18n(lang, "avatarInvalidImage") })

							return
						}
	
						if(!Array.isArray(response.assets)){
							showToast({ message: i18n(lang, "avatarInvalidImage") })

							return
						}
	
						if(typeof response.assets[0] == "undefined"){
							showToast({ message: i18n(lang, "avatarInvalidImage") })

							return
						}
	
						const image = response.assets[0]

						if(!allowedTypes.includes(image.type as string)){
							showToast({ message: i18n(lang, "avatarInvalidImage") })

							return
						}

						if(image.fileSize as number > ((1024 * 1024) * 2.99)){
							useStore.setState({ fullscreenLoadingModalVisible: false })
				
							showToast({ message: i18n(lang, "avatarMaxImageSize", true, ["__SIZE__"], [formatBytes(((1024 * 1024) * 3))]) })

							return
						}

						uploadAvatarImage(decodeURIComponent(image.uri as string))
					})
				}).catch((err) => {
					console.error(err)

					showToast({ message: err.toString() })
				})
			}).catch((err) => {
				console.error(err)

				showToast({ message: err.toString() })
			})
		}, 500)
	}, [])

    return (
		// @ts-ignore
        <ActionSheet
			id="ProfilePictureActionSheet"
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