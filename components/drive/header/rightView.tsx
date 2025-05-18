import { Icon } from "@roninoss/icons"
import { View, Platform } from "react-native"
import { Button } from "@/components/nativewindui/Button"
import { useColorScheme } from "@/lib/useColorScheme"
import { memo, useCallback, Fragment } from "react"
import { useActionSheet } from "@expo/react-native-action-sheet"
import * as DocumentPicker from "expo-document-picker"
import nodeWorker from "@/lib/nodeWorker"
import { useDriveStore } from "@/stores/drive.store"
import { Text } from "@/components/nativewindui/Text"
import Dropdown from "./dropdown"
import useCloudItemsQuery from "@/queries/useCloudItemsQuery"
import { useIsFocused } from "@react-navigation/native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"
import alerts from "@/lib/alerts"
import { inputPrompt } from "@/components/prompts/inputPrompt"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import * as ImagePicker from "expo-image-picker"
import * as FileSystem from "expo-file-system/next"
import * as FileSystemLegacy from "expo-file-system"
import paths from "@/lib/paths"
import { randomUUID } from "expo-crypto"
import { t } from "@/lib/i18n"
import SAF, { type DocumentFileDetail } from "react-native-saf-x"
import { promiseAllChunked } from "@/lib/utils"
import Transfers from "./transfers"
import useAllowed from "@/hooks/useAllowed"
import { useRouter } from "expo-router"
import { useShallow } from "zustand/shallow"
import { type TextEditorItem } from "@/components/textEditor/editor"

const options: string[] = [
	t("drive.header.rightView.actionSheet.upload.files"),
	...(Platform.OS === "android" ? [t("drive.header.rightView.actionSheet.upload.directory")] : []),
	t("drive.header.rightView.actionSheet.upload.media"),
	t("drive.header.rightView.actionSheet.create.textFile"),
	t("drive.header.rightView.actionSheet.create.directory"),
	t("drive.header.rightView.actionSheet.create.photo"),
	t("drive.header.rightView.actionSheet.cancel")
]

const createOptions = {
	options,
	cancelIndex: options.length - 1,
	indexToType: Platform.select({
		android: {
			0: "uploadFiles",
			1: "uploadDirectory",
			2: "uploadMedia",
			3: "createTextFile",
			4: "createDirectory",
			5: "createPhoto"
		},
		default: {
			0: "uploadFiles",
			1: "uploadMedia",
			2: "createTextFile",
			3: "createDirectory",
			4: "createPhoto"
		}
	}) as Record<number, "uploadFiles" | "uploadDirectory" | "createTextFile" | "createDirectory" | "uploadMedia" | "createPhoto">
}

export const RightView = memo(({ queryParams }: { queryParams: FetchCloudItemsParams }) => {
	const { colors } = useColorScheme()
	const { showActionSheetWithOptions } = useActionSheet()
	const selectedItemsCount = useDriveStore(useShallow(state => state.selectedItems.length))
	const setSelectedItems = useDriveStore(useShallow(state => state.setSelectedItems))
	const itemsCount = useDriveStore(useShallow(state => state.items.length))
	const isFocused = useIsFocused()
	const { bottom: bottomInsets } = useSafeAreaInsets()
	const { t } = useTranslation()
	const allowed = useAllowed()
	const { push: routerPush } = useRouter()

	const { refetch: refetchQuery } = useCloudItemsQuery({
		...queryParams,
		enabled: false
	})

	const onPlusPress = useCallback(() => {
		showActionSheetWithOptions(
			{
				options: createOptions.options,
				cancelButtonIndex: createOptions.cancelIndex,
				destructiveButtonIndex: createOptions.cancelIndex,
				...(Platform.OS === "android"
					? {
							containerStyle: {
								paddingBottom: bottomInsets,
								backgroundColor: colors.card
							},
							textStyle: {
								color: colors.foreground
							}
					  }
					: {})
			},
			async (selectedIndex?: number) => {
				const type = createOptions.indexToType[selectedIndex ?? -1]

				try {
					if (type === "uploadFiles") {
						const documentPickerResult = await DocumentPicker.getDocumentAsync({
							copyToCacheDirectory: true,
							multiple: true
						})

						if (documentPickerResult.canceled) {
							return
						}

						const { parent } = await nodeWorker.proxy("uploadFile", {
							parent: queryParams.parent,
							localPath: documentPickerResult.assets[0]!.uri,
							name: documentPickerResult.assets[0]!.name,
							id: randomUUID(),
							size: documentPickerResult.assets[0]!.size!,
							isShared: false,
							deleteAfterUpload: true
						})

						alerts.normal(
							t("drive.header.rightView.actionSheet.upload.uploaded", {
								name: documentPickerResult.assets[0]!.name
							})
						)

						if (isFocused && parent === queryParams.parent) {
							refetchQuery().catch(console.error)
						}
					} else if (type === "createDirectory") {
						const inputPromptResponse = await inputPrompt({
							title: t("drive.header.rightView.actionSheet.create.directory"),
							materialIcon: {
								name: "folder-plus-outline"
							},
							prompt: {
								type: "plain-text",
								keyboardType: "default",
								defaultValue: "",
								placeholder: t("drive.header.rightView.actionSheet.directoryNamePlaceholder")
							}
						})

						if (inputPromptResponse.cancelled || inputPromptResponse.type !== "text") {
							return
						}

						const directoryName = inputPromptResponse.text.trim()

						if (directoryName.length === 0) {
							return
						}

						fullScreenLoadingModal.show()

						try {
							await nodeWorker.proxy("createDirectory", {
								parent: queryParams.parent,
								name: directoryName
							})

							alerts.normal(
								t("drive.header.rightView.actionSheet.create.created", {
									name: directoryName
								})
							)

							if (isFocused) {
								refetchQuery().catch(console.error)
							}
						} finally {
							fullScreenLoadingModal.hide()
						}
					} else if (type === "uploadMedia") {
						const permissions = await ImagePicker.requestMediaLibraryPermissionsAsync(false)

						if (!permissions.granted) {
							return
						}

						const imagePickerResult = await ImagePicker.launchImageLibraryAsync({
							mediaTypes: ["images", "livePhotos", "videos"],
							allowsEditing: false,
							allowsMultipleSelection: true,
							selectionLimit: 0,
							base64: false,
							exif: true
						})

						if (imagePickerResult.canceled) {
							return
						}

						const uploadedItems = (
							await promiseAllChunked(
								imagePickerResult.assets.map(async asset => {
									if (!asset.fileName) {
										return null
									}

									const assetFile = new FileSystem.File(asset.uri)

									if (!assetFile.exists) {
										throw new Error(`Could not find file at "${asset.uri}".`)
									}

									const tmpFile = new FileSystem.File(FileSystem.Paths.join(paths.temporaryUploads(), randomUUID()))

									if (tmpFile.exists) {
										tmpFile.delete()
									}

									assetFile.copy(tmpFile)

									if (!tmpFile.size) {
										throw new Error(`Could not get size of file at "${tmpFile.uri}".`)
									}

									return await nodeWorker.proxy("uploadFile", {
										parent: queryParams.parent,
										localPath: tmpFile.uri,
										name: asset.fileName,
										id: randomUUID(),
										size: tmpFile.size,
										isShared: false,
										deleteAfterUpload: true
									})
								})
							)
						).filter(item => item !== null)

						alerts.normal(
							t("drive.header.rightView.actionSheet.itemsUploaded", {
								count: uploadedItems.length
							})
						)

						if (isFocused && uploadedItems.some(item => item.parent === queryParams.parent)) {
							refetchQuery().catch(console.error)
						}
					} else if (type === "createPhoto") {
						const permissions = await ImagePicker.requestCameraPermissionsAsync()

						if (!permissions.granted) {
							return
						}

						const imagePickerResult = await ImagePicker.launchCameraAsync({
							mediaTypes: ["images", "livePhotos", "videos"],
							allowsEditing: false,
							allowsMultipleSelection: true,
							selectionLimit: 0,
							base64: false,
							exif: true
						})

						if (imagePickerResult.canceled) {
							return
						}

						const uploadedItems = (
							await promiseAllChunked(
								imagePickerResult.assets.map(async asset => {
									if (!asset.fileName) {
										return null
									}

									const assetFile = new FileSystem.File(asset.uri)

									if (!assetFile.exists) {
										throw new Error(`Could not find file at "${asset.uri}".`)
									}

									const tmpFile = new FileSystem.File(FileSystem.Paths.join(paths.temporaryUploads(), randomUUID()))

									if (tmpFile.exists) {
										tmpFile.delete()
									}

									assetFile.copy(tmpFile)

									if (!tmpFile.size) {
										throw new Error(`Could not get size of file at "${tmpFile.uri}".`)
									}

									return await nodeWorker.proxy("uploadFile", {
										parent: queryParams.parent,
										localPath: tmpFile.uri,
										name: asset.fileName,
										id: randomUUID(),
										size: tmpFile.size,
										isShared: false,
										deleteAfterUpload: true
									})
								})
							)
						).filter(item => item !== null)

						alerts.normal(
							t("drive.header.rightView.actionSheet.itemsUploaded", {
								count: uploadedItems.length
							})
						)

						if (isFocused && uploadedItems.some(item => item.parent === queryParams.parent)) {
							refetchQuery().catch(console.error)
						}
					} else if (type === "uploadDirectory") {
						if (Platform.OS !== "android") {
							throw new Error("Feature only supported on Android.")
						}

						const selectedDirectory = await SAF.openDocumentTree(true)

						if (!selectedDirectory) {
							return
						}

						const tmpDir = new FileSystem.Directory(FileSystem.Paths.join(paths.temporaryUploads(), randomUUID()))

						fullScreenLoadingModal.show()

						try {
							if (!tmpDir.exists) {
								tmpDir.create()
							}

							const items: (DocumentFileDetail & { path: string })[] = []
							const parent = await SAF.stat(selectedDirectory.uri)

							if (!parent.name || parent.name.length === 0) {
								throw new Error("Could not get name of parent directory.")
							}

							const parentPath = `/${parent.name}`

							items.push({
								...parent,
								path: parentPath
							})

							const readDir = async (uri: string, currentPath: string): Promise<void> => {
								const dir = await SAF.listFiles(uri)

								await promiseAllChunked(
									dir.map(async item => {
										if (item.type === "directory") {
											await readDir(item.uri, FileSystem.Paths.join(currentPath, item.name))

											return
										}

										items.push({
											...item,
											path: FileSystem.Paths.join(currentPath, item.name)
										})
									})
								)
							}

							await readDir(selectedDirectory.uri, parentPath)

							const totalSize = items.reduce((acc, item) => acc + (item.type === "directory" ? 0 : item.size), 0)
							const freeDiskSpace = await FileSystemLegacy.getFreeDiskStorageAsync()

							if (freeDiskSpace <= totalSize + 1024 * 1024) {
								throw new Error("Not enough local disk space available.")
							}

							await promiseAllChunked(
								items
									.sort((a, b) => a.path.split("/").length - b.path.split("/").length)
									.map(async item => {
										if (item.type === "directory") {
											return
										}

										const tmpFile = new FileSystem.File(FileSystem.Paths.join(tmpDir.uri, item.path))

										if (!tmpFile.parentDirectory.exists) {
											tmpFile.parentDirectory.create()
										}

										if (tmpFile.exists) {
											tmpFile.delete()
										}

										await SAF.copyFile(item.uri, tmpFile.uri, {
											replaceIfDestinationExists: true
										})
									})
							)

							const tmpDirItems = tmpDir.list()
							const dirToUpload = tmpDirItems.at(0)

							if (
								!dirToUpload ||
								!(dirToUpload instanceof FileSystem.Directory) ||
								!dirToUpload.exists ||
								dirToUpload.name !== parent.name
							) {
								throw new Error("Could not copy directory.")
							}

							await nodeWorker.proxy("uploadDirectory", {
								parent: queryParams.parent,
								localPath: dirToUpload.uri,
								name: dirToUpload.name,
								id: randomUUID(),
								size: totalSize,
								isShared: false,
								deleteAfterUpload: true
							})

							alerts.normal(
								t("drive.header.rightView.actionSheet.upload.uploaded", {
									name: parent.name
								})
							)

							if (isFocused) {
								refetchQuery().catch(console.error)
							}
						} finally {
							if (tmpDir.exists) {
								tmpDir.delete()
							}

							fullScreenLoadingModal.hide()
						}
					} else if (type === "createTextFile") {
						const inputPromptResponse = await inputPrompt({
							title: t("drive.header.rightView.actionSheet.create.textFile"),
							materialIcon: {
								name: "file-plus-outline"
							},
							prompt: {
								type: "plain-text",
								keyboardType: "default",
								defaultValue: "",
								placeholder: t("drive.header.rightView.actionSheet.textFileNamePlaceholder")
							}
						})

						if (inputPromptResponse.cancelled || inputPromptResponse.type !== "text") {
							return
						}

						const fileName = inputPromptResponse.text.trim()

						if (fileName.length === 0) {
							return
						}

						const fileNameParsed = FileSystem.Paths.parse(fileName)
						const fileNameWithExtension =
							fileNameParsed.ext && fileNameParsed.ext.length > 0 && fileNameParsed.ext.includes(".")
								? fileName
								: `${fileNameParsed.name}.txt`

						fullScreenLoadingModal.show()

						const tmpFile = new FileSystem.File(FileSystem.Paths.join(paths.temporaryUploads(), randomUUID()))

						try {
							if (tmpFile.exists) {
								tmpFile.delete()
							}

							tmpFile.create()

							const item = await nodeWorker.proxy("uploadFile", {
								parent: queryParams.parent,
								localPath: tmpFile.uri,
								name: fileNameWithExtension,
								id: randomUUID(),
								size: 0,
								isShared: false,
								deleteAfterUpload: true
							})

							if (isFocused) {
								refetchQuery().catch(console.error)
							}

							routerPush({
								pathname: "/textEditor",
								params: {
									item: JSON.stringify({
										type: "cloud",
										driveItem: item
									} satisfies TextEditorItem)
								}
							})
						} finally {
							fullScreenLoadingModal.hide()
						}
					}
				} catch (e) {
					console.error(e)

					if (e instanceof Error) {
						alerts.error(e.message)
					}
				}
			}
		)
	}, [
		bottomInsets,
		colors.card,
		colors.foreground,
		isFocused,
		queryParams.parent,
		refetchQuery,
		showActionSheetWithOptions,
		t,
		routerPush
	])

	const onSelectPress = useCallback(() => {
		if (selectedItemsCount >= itemsCount) {
			setSelectedItems([])
		} else {
			setSelectedItems(useDriveStore.getState().items)
		}
	}, [itemsCount, setSelectedItems, selectedItemsCount])

	return (
		<View className="flex flex-row items-center">
			{selectedItemsCount === 0 ? (
				<Fragment>
					<Transfers />
					{allowed.upload && (
						<Button
							variant="plain"
							size="icon"
							onPress={onPlusPress}
						>
							<Icon
								size={24}
								name="plus"
								color={colors.foreground}
							/>
						</Button>
					)}
				</Fragment>
			) : (
				<View className="flex flex-row items-center">
					<Text
						className="text-blue-500"
						onPress={onSelectPress}
					>
						{selectedItemsCount >= itemsCount ? t("drive.header.rightView.deselectAll") : t("drive.header.rightView.selectAll")}
					</Text>
				</View>
			)}
			<Dropdown />
		</View>
	)
})

RightView.displayName = "RightView"

export default RightView
