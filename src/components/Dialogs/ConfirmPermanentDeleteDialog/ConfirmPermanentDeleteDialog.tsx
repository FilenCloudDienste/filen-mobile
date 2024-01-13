import React, { useState, useEffect, memo, useCallback } from "react"
import Dialog from "react-native-dialog"
import { useStore } from "../../../lib/state"
import useLang from "../../../lib/hooks/useLang"
import { deleteItemPermanently } from "../../../lib/api"
import { showToast } from "../../Toasts"
import { i18n } from "../../../i18n"
import { DeviceEventEmitter, Platform, Text } from "react-native"
import { Item } from "../../../types"
import useDarkMode from "../../../lib/hooks/useDarkMode"
import { getColor } from "../../../style"

const ConfirmPermanentDeleteDialog = memo(() => {
	const [buttonsDisabled, setButtonsDisabled] = useState<boolean>(false)
	const lang = useLang()
	const [open, setOpen] = useState<boolean>(false)
	const [currentItem, setCurrentItem] = useState<Item | undefined>(undefined)
	const darkMode = useDarkMode()

	const permanentDelete = useCallback(() => {
		if (typeof currentItem == "undefined" || buttonsDisabled) {
			return
		}

		setButtonsDisabled(true)
		setOpen(false)

		useStore.setState({ fullscreenLoadingModalVisible: true })

		deleteItemPermanently(currentItem.type, currentItem.uuid)
			.then(() => {
				DeviceEventEmitter.emit("event", {
					type: "remove-item",
					data: {
						uuid: currentItem.uuid
					}
				})

				setButtonsDisabled(false)

				useStore.setState({ fullscreenLoadingModalVisible: false })

				//showToast({ message: i18n(lang, "itemDeletedPermanently", true, ["__NAME__"], [currentActionSheetItem.name]) })
			})
			.catch(err => {
				console.error(err)

				setButtonsDisabled(false)

				useStore.setState({ fullscreenLoadingModalVisible: false })

				showToast({ message: err.toString() })
			})
	}, [lang, currentItem, buttonsDisabled])

	useEffect(() => {
		const openConfirmPermanentDeleteDialogListener = DeviceEventEmitter.addListener(
			"openConfirmPermanentDeleteDialog",
			(item: Item) => {
				setButtonsDisabled(false)
				setCurrentItem(item)
				setOpen(true)
			}
		)

		return () => {
			openConfirmPermanentDeleteDialogListener.remove()
		}
	}, [])

	return (
		<>
			{typeof currentItem !== "undefined" && (
				<Dialog.Container
					visible={open}
					useNativeDriver={false}
					onRequestClose={() => setOpen(false)}
					onBackdropPress={() => setOpen(false)}
					contentStyle={
						Platform.OS == "android" && {
							backgroundColor: getColor(darkMode, "backgroundSecondary")
						}
					}
				>
					<Dialog.Title>
						<Text
							style={
								Platform.OS == "android" && {
									color: getColor(darkMode, "textPrimary")
								}
							}
						>
							{i18n(lang, "itemDeletedPermanentlyConfirmation", true, ["__NAME__"], [currentItem.name])}
						</Text>
					</Dialog.Title>
					<Dialog.Button
						label={i18n(lang, "cancel")}
						disabled={buttonsDisabled}
						onPress={() => setOpen(false)}
						color={getColor(darkMode, "linkPrimary")}
					/>
					<Dialog.Button
						label={i18n(lang, "deletePermanently")}
						disabled={buttonsDisabled}
						onPress={permanentDelete}
						color={getColor(darkMode, "red")}
					/>
				</Dialog.Container>
			)}
		</>
	)
})

export default ConfirmPermanentDeleteDialog
