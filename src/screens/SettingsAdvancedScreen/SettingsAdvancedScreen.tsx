import React, { useState, useEffect, memo, useCallback } from "react"
import { View, Text, ScrollView, Alert } from "react-native"
import storage from "../../lib/storage"
import useLang from "../../lib/hooks/useLang"
import { i18n } from "../../i18n"
import { SettingsGroup, SettingsButtonLinkHighlight } from "../SettingsScreen/SettingsScreen"
import { useStore } from "../../lib/state"
import { showToast } from "../../components/Toasts"
import DeviceInfo from "react-native-device-info"
import { formatBytes } from "../../lib/helpers"
import memoryCache from "../../lib/memoryCache"
import * as fs from "../../lib/fs"
import DefaultTopBar from "../../components/TopBar/DefaultTopBar"
import useDarkMode from "../../lib/hooks/useDarkMode"
import FastImage from "react-native-fast-image"
import { clearCacheDirectories } from "../../lib/services/setup"
import { getColor } from "../../style"

export const calculateFolderSize = async (folderPath: string, size: number = 0): Promise<number> => {
	if (folderPath.slice(0, -1) == "/") {
		folderPath = folderPath.slice(0, -1)
	}

	const dirList = await fs.readDirectory(folderPath)

	for (let i = 0; i < dirList.length; i++) {
		const item = dirList[i]

		try {
			const stat = await fs.stat(folderPath + "/" + item)

			if (!stat.exists) {
				continue
			}

			if (stat.isDirectory) {
				size = await calculateFolderSize(folderPath + "/" + item, size)
			} else {
				size = size + (stat.size || 0)
			}
		} catch (e) {
			console.error(e)
		}
	}

	return size
}

export interface SettingsAdvancedScreenProps {
	navigation: any
}

export const SettingsAdvancedScreen = memo(({ navigation }: SettingsAdvancedScreenProps) => {
	const darkMode = useDarkMode()
	const lang = useLang()
	const [thumbnailCacheLocalFolderSize, setThumbnailCacheLocalFolderSize] = useState<number>(0)
	const [cachesLocalFolderSize, setCachesLocalFolderSize] = useState<number>(0)
	const [isCalculatingFolderSizes, setIsCalculatingFolderSizes] = useState<boolean>(true)

	const calculateFolderSizes = useCallback(async () => {
		setIsCalculatingFolderSizes(true)

		try {
			const thumbnailCachePath = await fs.getDownloadPath({ type: "thumbnail" })

			const [thumbnailCacheSize, cachesSize] = await Promise.all([
				calculateFolderSize(thumbnailCachePath),
				calculateFolderSize(fs.cacheDirectory())
			])

			setThumbnailCacheLocalFolderSize(thumbnailCacheSize)
			setCachesLocalFolderSize(cachesSize)
		} catch (e: any) {
			console.error(e)

			showToast({ message: e.toString() })
		}

		setIsCalculatingFolderSizes(false)
	}, [])

	useEffect(() => {
		calculateFolderSizes()
	}, [])

	return (
		<>
			<DefaultTopBar
				onPressBack={() => navigation.goBack()}
				leftText={i18n(lang, "settings")}
				middleText={i18n(lang, "advanced")}
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
						title={i18n(lang, "clearThumbnailCache")}
						rightText={isCalculatingFolderSizes ? "ActivityIndicator" : formatBytes(thumbnailCacheLocalFolderSize)}
						borderTopRadius={10}
						withBottomBorder={true}
						onPress={() => {
							Alert.alert(
								i18n(lang, "clearThumbnailCache"),
								i18n(lang, "clearThumbnailCacheInfo"),
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
												i18n(lang, "clearThumbnailCache"),
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
															useStore.setState({ fullscreenLoadingModalVisible: true })

															const keys = storage.getAllKeys()

															for (let i = 0; i < keys.length; i++) {
																if (keys[i].indexOf("thumbnailCache:") !== -1) {
																	storage.delete(keys[i])
																}
															}

															memoryCache.cache.forEach((value, key) => {
																if (
																	key.indexOf("thumbnailCache:") !== -1 ||
																	key.indexOf("cachedThumbnailPaths:") !== -1
																) {
																	memoryCache.delete(key)
																}
															})

															try {
																const tempPath = await fs.getDownloadPath({ type: "thumbnail" })
																var dirList = await fs.readDirectory(tempPath)

																for (let i = 0; i < dirList.length; i++) {
																	await fs.unlink(tempPath + dirList[i])
																}

																await FastImage.clearDiskCache()
															} catch (e) {
																console.log(e)
															}

															showToast({ message: i18n(lang, "thumbnailCacheCleared") })

															useStore.setState({ fullscreenLoadingModalVisible: false })

															calculateFolderSizes()
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
					<SettingsButtonLinkHighlight
						title={i18n(lang, "clearCachesDirectory")}
						rightText={isCalculatingFolderSizes ? "ActivityIndicator" : formatBytes(cachesLocalFolderSize)}
						borderBottomRadius={10}
						onPress={() => {
							Alert.alert(
								i18n(lang, "clearCachesDirectory"),
								i18n(lang, "clearCachesDirectoryInfo"),
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
												i18n(lang, "clearCachesDirectory"),
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
															useStore.setState({ fullscreenLoadingModalVisible: true })

															await clearCacheDirectories().catch(console.error)

															showToast({
																message: i18n(lang, "clearCachesDirectoryCleared")
															})

															useStore.setState({ fullscreenLoadingModalVisible: false })

															calculateFolderSizes()
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
						marginTop: 15,
						paddingLeft: 17
					}}
				>
					<Text
						style={{
							color: darkMode ? "gray" : "gray",
							fontSize: 11
						}}
					>
						{i18n(lang, "version")} {DeviceInfo.getVersion()} ({DeviceInfo.getBuildNumber()})
					</Text>
				</View>
				<View
					style={{
						height: 25
					}}
				/>
			</ScrollView>
		</>
	)
})
