import React, { useEffect, useState, memo } from "react"
import { View, Text, Switch, Platform, ScrollView, Alert } from "react-native"
import storage from "../../lib/storage"
import { useMMKVBoolean, useMMKVString, useMMKVNumber } from "react-native-mmkv"
import { i18n } from "../../i18n"
import { StackActions } from "@react-navigation/native"
import { navigationAnimation } from "../../lib/state"
import { SettingsGroup, SettingsButtonLinkHighlight } from "../SettingsScreen/SettingsScreen"
import { showToast } from "../../components/Toasts"
import { hasStoragePermissions, hasPhotoLibraryPermissions } from "../../lib/permissions"
import { getColor } from "../../style/colors"
import DefaultTopBar from "../../components/TopBar/DefaultTopBar"
import useDarkMode from "../../lib/hooks/useDarkMode"
import useLang from "../../lib/hooks/useLang"
import { NavigationContainerRef } from "@react-navigation/native"
import {
	showFullScreenLoadingModal,
	hideFullScreenLoadingModal
} from "../../components/Modals/FullscreenLoadingModal/FullscreenLoadingModal"
import * as db from "../../lib/db"

export interface CameraUploadScreenProps {
	navigation: NavigationContainerRef<ReactNavigation.RootParamList>
}

export const CameraUploadScreen = memo(({ navigation }: CameraUploadScreenProps) => {
	const darkMode = useDarkMode()
	const lang = useLang()
	const [userId] = useMMKVNumber("userId", storage)
	const [cameraUploadEnabled, setCameraUploadEnabled] = useMMKVBoolean("cameraUploadEnabled:" + userId, storage)
	const [cameraUploadIncludeImages, setCameraUploadIncludeImages] = useMMKVBoolean("cameraUploadIncludeImages:" + userId, storage)
	const [cameraUploadIncludeVideos, setCameraUploadIncludeVideos] = useMMKVBoolean("cameraUploadIncludeVideos:" + userId, storage)
	const [cameraUploadFolderUUID] = useMMKVString("cameraUploadFolderUUID:" + userId, storage)
	const [cameraUploadFolderName] = useMMKVString("cameraUploadFolderName:" + userId, storage)
	const [hasPermissions, setHasPermissions] = useState<boolean>(false)
	const [cameraUploadEnableHeic, setCameraUploadEnableHeic] = useMMKVBoolean("cameraUploadEnableHeic:" + userId, storage)
	const [cameraUploadAfterEnabled, setCameraUploadAfterEnabled] = useMMKVBoolean("cameraUploadAfterEnabled:" + userId, storage)
	const [cameraUploadOnlyUploadOriginal, setCameraUploadOnlyUploadOriginal] = useMMKVBoolean(
		"cameraUploadOnlyUploadOriginal:" + userId,
		storage
	)
	const [cameraUploadConvertLiveAndBurst, setCameraUploadConvertLiveAndBurst] = useMMKVBoolean(
		"cameraUploadConvertLiveAndBurst:" + userId,
		storage
	)
	const [cameraUploadConvertLiveAndBurstAndKeepOriginal, setCameraUploadConvertLiveAndBurstAndKeepOriginal] = useMMKVBoolean(
		"cameraUploadConvertLiveAndBurstAndKeepOriginal:" + userId,
		storage
	)
	const [cameraUploadCompressImages, setCameraUploadCompressImages] = useMMKVBoolean("cameraUploadCompressImages:" + userId, storage)
	const [cameraUploadAutoOrganize, setCameraUploadAutoOrganize] = useMMKVBoolean("cameraUploadAutoOrganize:" + userId, storage)

	const chooseFolder = async () => {
		await navigationAnimation({ enable: true })

		showToast({ type: "cameraUploadChooseFolder", message: i18n(lang, "cameraUploadChooseFolder"), navigation })

		navigation.dispatch(
			StackActions.push("MainScreen", {
				parent: storage.getBoolean("defaultDriveOnly:" + userId) ? storage.getString("defaultDriveUUID:" + userId) : "base"
			})
		)
	}

	useEffect(() => {
		if (!cameraUploadOnlyUploadOriginal && !cameraUploadConvertLiveAndBurst && !cameraUploadConvertLiveAndBurstAndKeepOriginal) {
			setCameraUploadOnlyUploadOriginal(true)
		}
	}, [cameraUploadOnlyUploadOriginal, cameraUploadConvertLiveAndBurst, cameraUploadConvertLiveAndBurstAndKeepOriginal])

	useEffect(() => {
		Promise.all([hasStoragePermissions(true), hasPhotoLibraryPermissions(true)])
			.then(hasPermissions => {
				if (!hasPermissions[0] || !hasPermissions[1]) {
					setHasPermissions(false)

					showToast({ message: i18n(storage.getString("lang"), "pleaseGrantPermission") })

					return
				}

				setHasPermissions(true)
			})
			.catch(err => {
				showToast({ message: err.toString() })

				setHasPermissions(false)

				console.error(err)
			})
	}, [])

	return (
		<>
			<DefaultTopBar
				onPressBack={() => navigation.goBack()}
				leftText={i18n(lang, "settings")}
				middleText={i18n(lang, "cameraUpload")}
			/>
			<ScrollView
				style={{
					height: "100%",
					width: "100%",
					backgroundColor: getColor(darkMode, "backgroundPrimary"),
					marginTop: 10
				}}
			>
				<SettingsGroup marginTop={5}>
					<SettingsButtonLinkHighlight
						title={i18n(lang, "enabled")}
						borderBottomRadius={10}
						borderTopRadius={10}
						rightComponent={
							<Switch
								trackColor={getColor(darkMode, "switchTrackColor")}
								thumbColor={
									cameraUploadEnabled
										? getColor(darkMode, "switchThumbColorEnabled")
										: getColor(darkMode, "switchThumbColorDisabled")
								}
								ios_backgroundColor={getColor(darkMode, "switchIOSBackgroundColor")}
								disabled={!hasPermissions}
								onValueChange={(): void => {
									const newValue = !cameraUploadEnabled

									if (newValue) {
										if (typeof cameraUploadFolderUUID !== "string") {
											setCameraUploadEnabled(false)
											chooseFolder()

											return
										}
									}

									if (newValue) {
										setCameraUploadIncludeImages(true)
									}

									setCameraUploadEnabled(newValue)
								}}
								value={cameraUploadEnabled}
							/>
						}
					/>
				</SettingsGroup>
				{!hasPermissions && (
					<Text
						style={{
							color: "gray",
							fontSize: 12,
							paddingLeft: 17,
							paddingTop: 5,
							paddingRight: 17
						}}
					>
						{i18n(lang, "pleaseGrantPermission")}
					</Text>
				)}
				<SettingsGroup>
					{cameraUploadEnabled ? (
						<SettingsButtonLinkHighlight
							title={i18n(lang, "cameraUploadFolder")}
							borderBottomRadius={10}
							borderTopRadius={10}
							withBottomBorder={true}
							rightComponent={
								<Text
									style={{
										color: "gray",
										paddingRight: 5,
										fontSize: 17,
										maxWidth: 200
									}}
									numberOfLines={1}
								>
									{cameraUploadFolderName}
								</Text>
							}
						/>
					) : (
						<SettingsButtonLinkHighlight
							rightText={
								typeof cameraUploadFolderUUID == "string" && cameraUploadFolderUUID.length > 16
									? cameraUploadFolderName
									: i18n(lang, "cameraUploadChooseFolder")
							}
							onPress={() => {
								chooseFolder()
							}}
							borderBottomRadius={10}
							borderTopRadius={10}
							title={i18n(lang, "cameraUploadFolder")}
							withBottomBorder={true}
						/>
					)}
					<SettingsButtonLinkHighlight
						title={i18n(lang, "cameraUploadIncludeImages")}
						withBottomBorder={true}
						rightComponent={
							<Switch
								trackColor={getColor(darkMode, "switchTrackColor")}
								thumbColor={
									cameraUploadIncludeImages
										? getColor(darkMode, "switchThumbColorEnabled")
										: getColor(darkMode, "switchThumbColorDisabled")
								}
								ios_backgroundColor={getColor(darkMode, "switchIOSBackgroundColor")}
								onValueChange={() => setCameraUploadIncludeImages(!cameraUploadIncludeImages)}
								value={cameraUploadIncludeImages}
							/>
						}
					/>
					<SettingsButtonLinkHighlight
						title={i18n(lang, "cameraUploadIncludeVideos")}
						withBottomBorder={true}
						rightComponent={
							<Switch
								trackColor={getColor(darkMode, "switchTrackColor")}
								thumbColor={
									cameraUploadIncludeVideos
										? getColor(darkMode, "switchThumbColorEnabled")
										: getColor(darkMode, "switchThumbColorDisabled")
								}
								ios_backgroundColor={getColor(darkMode, "switchIOSBackgroundColor")}
								onValueChange={() => setCameraUploadIncludeVideos(!cameraUploadIncludeVideos)}
								value={cameraUploadIncludeVideos}
							/>
						}
					/>
					<SettingsButtonLinkHighlight
						title={i18n(lang, "cameraUploadAfterEnabled")}
						withBottomBorder={true}
						rightComponent={
							<Switch
								trackColor={getColor(darkMode, "switchTrackColor")}
								thumbColor={
									cameraUploadAfterEnabled
										? getColor(darkMode, "switchThumbColorEnabled")
										: getColor(darkMode, "switchThumbColorDisabled")
								}
								ios_backgroundColor={getColor(darkMode, "switchIOSBackgroundColor")}
								onValueChange={() => {
									const newValue = !cameraUploadAfterEnabled

									setCameraUploadAfterEnabled(newValue)

									if (newValue) {
										storage.set("cameraUploadAfterEnabledTime:" + userId, Date.now())
									} else {
										storage.set("cameraUploadAfterEnabledTime:" + userId, 0)
									}
								}}
								value={cameraUploadAfterEnabled}
							/>
						}
					/>
					<SettingsButtonLinkHighlight
						title={i18n(lang, "cameraUploadCompressImages")}
						rightComponent={
							<Switch
								trackColor={getColor(darkMode, "switchTrackColor")}
								thumbColor={
									cameraUploadCompressImages
										? getColor(darkMode, "switchThumbColorEnabled")
										: getColor(darkMode, "switchThumbColorDisabled")
								}
								ios_backgroundColor={getColor(darkMode, "switchIOSBackgroundColor")}
								onValueChange={() => setCameraUploadCompressImages(!cameraUploadCompressImages)}
								value={cameraUploadCompressImages}
							/>
						}
					/>
					<SettingsButtonLinkHighlight
						onPress={() => {
							navigationAnimation({ enable: true }).then(() => {
								navigation.dispatch(StackActions.push("CameraUploadAlbumsScreen"))
							})
						}}
						title={i18n(lang, "albums")}
						withBottomBorder={true}
					/>
					<SettingsButtonLinkHighlight
						title={i18n(lang, "cameraUploadAutoOrganize")}
						withBottomBorder={false}
						borderBottomRadius={10}
						rightComponent={
							<Switch
								trackColor={getColor(darkMode, "switchTrackColor")}
								thumbColor={
									cameraUploadAutoOrganize
										? getColor(darkMode, "switchThumbColorEnabled")
										: getColor(darkMode, "switchThumbColorDisabled")
								}
								ios_backgroundColor={getColor(darkMode, "switchIOSBackgroundColor")}
								onValueChange={() => setCameraUploadAutoOrganize(!cameraUploadAutoOrganize)}
								value={cameraUploadAutoOrganize}
							/>
						}
					/>
				</SettingsGroup>
				{Platform.OS == "ios" && (
					<SettingsGroup>
						<SettingsButtonLinkHighlight
							title={i18n(lang, "cameraUploadEnableHeic")}
							borderBottomRadius={10}
							withBottomBorder={true}
							rightComponent={
								<Switch
									trackColor={getColor(darkMode, "switchTrackColor")}
									thumbColor={
										cameraUploadEnableHeic
											? getColor(darkMode, "switchThumbColorEnabled")
											: getColor(darkMode, "switchThumbColorDisabled")
									}
									ios_backgroundColor={getColor(darkMode, "switchIOSBackgroundColor")}
									onValueChange={() => setCameraUploadEnableHeic(!cameraUploadEnableHeic)}
									value={cameraUploadEnableHeic}
								/>
							}
						/>
						<SettingsButtonLinkHighlight
							title={i18n(lang, "cameraUploadKeepImageOnly")}
							borderBottomRadius={10}
							withBottomBorder={true}
							rightComponent={
								<Switch
									trackColor={getColor(darkMode, "switchTrackColor")}
									thumbColor={
										cameraUploadOnlyUploadOriginal
											? getColor(darkMode, "switchThumbColorEnabled")
											: getColor(darkMode, "switchThumbColorDisabled")
									}
									ios_backgroundColor={getColor(darkMode, "switchIOSBackgroundColor")}
									onValueChange={() => {
										const newValue = !cameraUploadOnlyUploadOriginal

										setCameraUploadOnlyUploadOriginal(newValue)

										if (newValue) {
											setCameraUploadConvertLiveAndBurst(false)
											setCameraUploadConvertLiveAndBurstAndKeepOriginal(false)
										}
									}}
									value={cameraUploadOnlyUploadOriginal}
								/>
							}
						/>
						<SettingsButtonLinkHighlight
							title={i18n(lang, "cameraUploadKeepLivePhotoVideoOnly")}
							borderBottomRadius={10}
							withBottomBorder={true}
							rightComponent={
								<Switch
									trackColor={getColor(darkMode, "switchTrackColor")}
									thumbColor={
										cameraUploadConvertLiveAndBurst
											? getColor(darkMode, "switchThumbColorEnabled")
											: getColor(darkMode, "switchThumbColorDisabled")
									}
									ios_backgroundColor={getColor(darkMode, "switchIOSBackgroundColor")}
									onValueChange={() => {
										const newValue = !cameraUploadConvertLiveAndBurst

										setCameraUploadConvertLiveAndBurst(newValue)

										if (newValue) {
											setCameraUploadOnlyUploadOriginal(false)
											setCameraUploadConvertLiveAndBurstAndKeepOriginal(false)
										}
									}}
									value={cameraUploadConvertLiveAndBurst}
								/>
							}
						/>
						<SettingsButtonLinkHighlight
							title={i18n(lang, "cameraUploadSaveAllAssets")}
							borderBottomRadius={10}
							rightComponent={
								<Switch
									trackColor={getColor(darkMode, "switchTrackColor")}
									thumbColor={
										cameraUploadConvertLiveAndBurstAndKeepOriginal
											? getColor(darkMode, "switchThumbColorEnabled")
											: getColor(darkMode, "switchThumbColorDisabled")
									}
									ios_backgroundColor={getColor(darkMode, "switchIOSBackgroundColor")}
									onValueChange={() => {
										const newValue = !cameraUploadConvertLiveAndBurstAndKeepOriginal

										setCameraUploadConvertLiveAndBurstAndKeepOriginal(newValue)

										if (newValue) {
											setCameraUploadOnlyUploadOriginal(false)
											setCameraUploadConvertLiveAndBurst(false)
										}
									}}
									value={cameraUploadConvertLiveAndBurstAndKeepOriginal}
								/>
							}
						/>
					</SettingsGroup>
				)}
				<SettingsGroup>
					<SettingsButtonLinkHighlight
						title={i18n(lang, "cameraUploadReset")}
						borderBottomRadius={10}
						borderTopRadius={10}
						onPress={() => {
							Alert.alert(
								i18n(lang, "cameraUploadReset"),
								i18n(lang, "cameraUploadResetInfo"),
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
												i18n(lang, "cameraUploadReset"),
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
														onPress: async () => {
															showFullScreenLoadingModal()

															await Promise.all([
																db.query("DELETE FROM camera_upload_last_modified"),
																db.query("DELETE FROM camera_upload_last_modified_stat"),
																db.query("DELETE FROM camera_upload_last_size")
															]).catch(console.error)

															hideFullScreenLoadingModal()
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
						}}
					/>
				</SettingsGroup>
				<View
					style={{
						height: 25
					}}
				/>
			</ScrollView>
		</>
	)
})
