import React, { useState, useEffect, memo, useCallback } from "react"
import { View, Text, Platform, TouchableOpacity } from "react-native"
import useLang from "../../../lib/hooks/useLang"
import { useStore } from "../../../lib/state"
import { getParent, getRouteURL, promiseAllSettled, randomIdUnsafe, safeAwait, Semaphore } from "../../../lib/helpers"
import { i18n } from "../../../i18n"
import { queueFileUpload, UploadFile, uploadFolder } from "../../../lib/services/upload/upload"
import mimeTypes from "mime-types"
import { hasStoragePermissions } from "../../../lib/permissions"
import * as fs from "../../../lib/fs"
import { getColor } from "../../../style"
import { hideAllToasts, showToast } from "../Toasts"
import useDarkMode from "../../../lib/hooks/useDarkMode"
import {
	showFullScreenLoadingModal,
	hideFullScreenLoadingModal
} from "../../../components/Modals/FullscreenLoadingModal/FullscreenLoadingModal"
import pathModule from "path"
import * as ExpoFS from "expo-file-system"

const copySemaphore = new Semaphore(32)

const UploadToast = memo(() => {
	const darkMode = useDarkMode()
	const lang = useLang()
	const currentShareItems = useStore(state => state.currentShareItems)
	const setCurrentShareItems = useStore(state => state.setCurrentShareItems)
	const [uris, setURIs] = useState<string[]>([])
	const currentRoutes = useStore(state => state.currentRoutes)
	const [currentParent, setCurrentParent] = useState(getParent())
	const [currentRouteURL, setCurrentRouteURL] = useState(getRouteURL())

	const upload = useCallback(async () => {
		if (
			currentRouteURL.indexOf("shared-in") !== -1 ||
			currentRouteURL.indexOf("recents") !== -1 ||
			currentRouteURL.indexOf("trash") !== -1 ||
			currentRouteURL.indexOf("photos") !== -1 ||
			currentRouteURL.indexOf("offline") !== -1 ||
			!Array.isArray(uris)
		) {
			return
		}

		const parent = getParent()

		if (parent.length < 16) {
			return
		}

		const [hasPermissionsError, hasPermissionsResult] = await safeAwait(hasStoragePermissions(true))

		if (hasPermissionsError || !hasPermissionsResult) {
			showToast({ message: i18n(lang, "pleaseGrantPermission") })

			return
		}

		showFullScreenLoadingModal()

		const items: UploadFile[] = []
		const copyPromises: Promise<void>[] = []
		const foldersToUpload: string[] = []
		const uploadPromises: Promise<void>[] = []

		try {
			const tempPath = await fs.getDownloadPath({ type: "temp" })

			for (const uri of uris) {
				copyPromises.push(
					new Promise(async (resolve, reject) => {
						await copySemaphore.acquire()

						try {
							const isAndroidSAF = uri.startsWith("content://") && Platform.OS === "android"

							if (isAndroidSAF) {
								const stat = await fs.saf.stat(uri)

								if (stat.isDirectory) {
									foldersToUpload.push(uri)
								} else {
									const tempFilePath = pathModule.join(tempPath, await global.nodeThread.uuidv4())

									if ((await fs.stat(tempFilePath)).exists) {
										await fs.unlink(tempFilePath)
									}

									await ExpoFS.StorageAccessFramework.copyAsync({
										from: uri,
										to: tempFilePath
									})

									items.push({
										name: stat.name,
										lastModified: stat.lastModified || Date.now(),
										mime: mimeTypes.lookup(stat.name) || "application/octet-stream",
										size: stat.size || 0,
										path: tempFilePath
									})
								}
							} else {
								const stat = await fs.stat(uri)

								if (!stat.exists) {
									resolve()

									return
								}

								if (stat.isDirectory) {
									foldersToUpload.push(uri)
								} else {
									const fileName = pathModule.parse(uri).name

									if (!fileName || fileName.length <= 0) {
										resolve()

										return
									}

									const tempFilePath = pathModule.join(tempPath, await global.nodeThread.uuidv4())

									if ((await fs.stat(tempFilePath)).exists) {
										await fs.unlink(tempFilePath)
									}

									await fs.copy(uri, tempFilePath)

									items.push({
										name: fileName,
										lastModified: stat.modificationTime || Date.now(),
										mime: mimeTypes.lookup(fileName) || "application/octet-stream",
										size: stat.size || 0,
										path: tempFilePath
									})
								}
							}

							try {
								if (fs.documentDirectory().includes(uri) || fs.cacheDirectory().includes(uri) || tempPath.includes(uri)) {
									if ((await fs.stat(uri)).exists) {
										await fs.unlink(uri)
									}
								}
							} catch {
								// Noop
							}

							resolve()
						} catch (e) {
							reject(e)
						} finally {
							copySemaphore.release()
						}
					})
				)
			}

			await Promise.all(copyPromises)

			hideFullScreenLoadingModal()
			setCurrentShareItems(null)
			hideAllToasts()

			for (const uri of foldersToUpload) {
				uploadPromises.push(uploadFolder({ uri, parent, showFullScreenLoading: true }))
			}

			for (const item of items) {
				uploadPromises.push(queueFileUpload({ file: item, parent }))
			}

			await promiseAllSettled(uploadPromises)
		} catch (e) {
			console.error(e)

			setCurrentShareItems(null)
			hideAllToasts()

			showToast({ message: e.toString() })
		} finally {
			hideFullScreenLoadingModal()
		}
	}, [currentRouteURL, uris, lang])

	useEffect(() => {
		if (Array.isArray(currentRoutes)) {
			const parent = getParent(currentRoutes[currentRoutes.length - 1])

			if (typeof parent === "string" && parent.length > 0) {
				setCurrentParent(parent)
				setCurrentRouteURL(getRouteURL(currentRoutes[currentRoutes.length - 1]))
			}
		}
	}, [currentRoutes])

	useEffect(() => {
		setURIs([])

		if (currentShareItems) {
			if (
				!Array.isArray(currentShareItems.data) &&
				typeof currentShareItems.data === "string" &&
				(currentShareItems.data.startsWith("file:") ||
					currentShareItems.data.startsWith("content:") ||
					currentShareItems.data.startsWith("asset:") ||
					currentShareItems.data.startsWith("ph:") ||
					currentShareItems.data.startsWith("assets-library:"))
			) {
				setURIs([currentShareItems.data])
			} else {
				const uriArray: string[] = []

				for (const item of currentShareItems.data) {
					if (typeof item === "string") {
						if (
							!(
								item.startsWith("file:") ||
								item.startsWith("content:") ||
								item.startsWith("asset:") ||
								item.startsWith("ph:") ||
								item.startsWith("assets-library:")
							)
						) {
							continue
						}

						uriArray.push(item)
					} else {
						if (
							!(
								item.data.startsWith("file:") ||
								item.data.startsWith("content:") ||
								item.data.startsWith("asset:") ||
								item.data.startsWith("ph:") ||
								item.data.startsWith("assets-library:")
							)
						) {
							continue
						}

						uriArray.push(item.data)
					}
				}

				setURIs(uriArray)
			}
		}
	}, [currentShareItems])

	if (uris.length === 0) {
		return null
	}

	return (
		<>
			{uris.length > 0 && (
				<View
					style={{
						flexDirection: "row",
						justifyContent: "space-between",
						width: "100%",
						height: "100%",
						zIndex: 999999
					}}
				>
					<View>
						<Text
							style={{
								color: getColor(darkMode, "textPrimary"),
								fontSize: 15,
								fontWeight: "400"
							}}
						>
							{i18n(lang, "cameraUploadChooseFolder")}
						</Text>
					</View>
					<View
						style={{
							flexDirection: "row"
						}}
					>
						<TouchableOpacity
							hitSlop={{
								right: 20,
								left: 20,
								top: 10,
								bottom: 10
							}}
							onPress={() => {
								hideAllToasts()
								setCurrentShareItems(null)
							}}
						>
							<Text
								style={{
									color: getColor(darkMode, "textPrimary"),
									fontSize: 15,
									fontWeight: "400"
								}}
							>
								{i18n(lang, "cancel")}
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							hitSlop={{
								right: 20,
								left: 20,
								top: 10,
								bottom: 10
							}}
							style={{
								marginLeft: 20
							}}
							onPress={upload}
						>
							<Text
								style={{
									fontSize: 15,
									fontWeight: "400",
									color:
										currentRouteURL.indexOf("shared-in") === -1 &&
										currentRouteURL.indexOf("recents") === -1 &&
										currentRouteURL.indexOf("trash") === -1 &&
										currentRouteURL.indexOf("photos") === -1 &&
										currentRouteURL.indexOf("offline") === -1 &&
										currentParent.length > 32
											? getColor(darkMode, "linkPrimary")
											: getColor(darkMode, "textSecondary")
								}}
							>
								{i18n(lang, "upload")}
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			)}
		</>
	)
})

export default UploadToast
