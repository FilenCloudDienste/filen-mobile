import React, { useEffect, useState, memo, useCallback, useRef } from "react"
import { View, Text, ScrollView, DeviceEventEmitter, ActivityIndicator, TouchableOpacity } from "react-native"
import ActionSheet, { SheetManager } from "react-native-actions-sheet"
import useLang from "../../../lib/hooks/useLang"
import useDimensions from "../../../lib/hooks/useDimensions"
import { convertTimestampToMs, getMasterKeys, simpleDate } from "../../../lib/helpers"
import { showToast } from "../../Toasts"
import { i18n } from "../../../i18n"
import { fetchFileVersionData, restoreArchivedFile } from "../../../lib/api"
import { getColor } from "../../../style/colors"
import { ActionSheetIndicator, ItemActionSheetItemHeader } from "../ActionSheets"
import useDarkMode from "../../../lib/hooks/useDarkMode"
import { Item } from "../../../types"
import { decryptFileMetadata } from "../../../lib/crypto"

const FileVersionsActionSheet = memo(() => {
	const darkMode = useDarkMode()
	const dimensions = useDimensions()
	const lang = useLang()
	const [versionData, setVersionData] = useState<any>([])
	const [buttonsDisabled, setButtonsDisabled] = useState<boolean>(false)
	const [isLoading, setIsLoading] = useState<boolean>(false)
	const [currentItem, setCurrentItem] = useState<Item | undefined>(undefined)
	const currentItemRef = useRef<Item | undefined>(undefined)

	const fetchVersions = useCallback(() => {
		if (typeof currentItemRef.current !== "undefined") {
			setButtonsDisabled(true)
			setVersionData([])
			setIsLoading(true)

			fetchFileVersionData(currentItemRef.current.uuid)
				.then(versions => {
					setVersionData(versions)
					setButtonsDisabled(false)
					setIsLoading(false)
				})
				.catch(err => {
					console.error(err)

					setButtonsDisabled(false)
					setIsLoading(false)

					showToast({ message: err.toString() })
				})
		}
	}, [])

	const deleteItem = useCallback(
		async (item: any) => {
			await SheetManager.hide("FileVersionsActionSheet")

			decryptFileMetadata(getMasterKeys(), item.metadata)
				.then(decrypted => {
					item.name = decrypted.name
					item.size = decrypted.size
					item.mime = decrypted.mime
					item.key = decrypted.key
					item.lastModified = decrypted.lastModified
					item.type = "file"

					DeviceEventEmitter.emit("openConfirmPermanentDeleteDialog", item)
				})
				.catch(err => {
					console.error(err)

					showToast({ message: err.toString() })
				})
		},
		[currentItem]
	)

	const restoreItem = useCallback(
		(item: any) => {
			if (typeof currentItem == "undefined") {
				return
			}

			if (item.uuid !== currentItem.uuid) {
				setButtonsDisabled(true)
				setIsLoading(true)

				const oldUUID = currentItem.uuid

				restoreArchivedFile({ uuid: item.uuid, currentUUID: currentItem.uuid })
					.then(() => {
						currentItem.uuid = item.uuid

						DeviceEventEmitter.emit("event", {
							type: "change-whole-item",
							data: {
								item: currentItem,
								uuid: oldUUID
							}
						})

						fetchVersions()
					})
					.catch(err => {
						console.error(err)

						setButtonsDisabled(false)
						setIsLoading(false)

						showToast({ message: err.toString() })
					})
			}
		},
		[currentItem]
	)

	useEffect(() => {
		const openFileVersionsActionSheetListener = DeviceEventEmitter.addListener("openFileVersionsActionSheet", (item: Item) => {
			setButtonsDisabled(true)
			setVersionData([])
			setIsLoading(true)
			setCurrentItem(item)

			currentItemRef.current = item

			fetchVersions()

			SheetManager.show("FileVersionsActionSheet")
		})

		return () => {
			openFileVersionsActionSheetListener.remove()
		}
	}, [])

	return (
		<ActionSheet
			id="FileVersionsActionSheet"
			gestureEnabled={!buttonsDisabled}
			closeOnPressBack={!buttonsDisabled}
			closeOnTouchBackdrop={!buttonsDisabled}
			closable={!buttonsDisabled}
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
				<ItemActionSheetItemHeader />
				{isLoading ? (
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
							color={getColor(darkMode, "textPrimary")}
						/>
					</View>
				) : (
					<ScrollView
						style={{
							width: "100%",
							overflow: "scroll"
						}}
					>
						{versionData.length > 0 && typeof currentItem !== "undefined" ? (
							<>
								{versionData.map((item: any, index: number) => {
									const dateString: string = simpleDate(convertTimestampToMs(item.timestamp))

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
													color: getColor(darkMode, "textPrimary"),
													fontSize: 15,
													fontWeight: "400"
												}}
											>
												{dateString}
											</Text>
											{item.uuid == currentItem.uuid ? (
												<Text
													style={{
														color: getColor(darkMode, "textPrimary"),
														fontSize: 15,
														fontWeight: "400"
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
													<TouchableOpacity onPress={() => deleteItem(item)}>
														<Text
															style={{
																color: "#0A84FF",
																fontSize: 15,
																fontWeight: "400"
															}}
														>
															{i18n(lang, "delete")}
														</Text>
													</TouchableOpacity>
													{/*<TouchableOpacity
																		style={{
																			marginLeft: 15
																		}}
																		onPress={() => {
																			decryptFileMetadata(getMasterKeys(), item.metadata).then(async (decrypted) => {
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
																				fontSize: 15,
																				fontWeight: "400"
																			}}
																		>
																			{i18n(lang, "preview")}
																		</Text>
																	</TouchableOpacity>*/}
													<TouchableOpacity
														style={{
															marginLeft: 15
														}}
														onPress={() => restoreItem(item)}
													>
														<Text
															style={{
																color: "#0A84FF",
																fontSize: 15,
																fontWeight: "400"
															}}
														>
															{i18n(lang, "restore")}
														</Text>
													</TouchableOpacity>
												</View>
											)}
										</View>
									)
								})}
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
										color: getColor(darkMode, "textPrimary"),
										fontSize: 15,
										fontWeight: "400"
									}}
								>
									{i18n(lang, "noFileVersionsFound")}
								</Text>
							</View>
						)}
					</ScrollView>
				)}
			</View>
		</ActionSheet>
	)
})

export default FileVersionsActionSheet
