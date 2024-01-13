import React, { useState, useEffect, memo, useCallback } from "react"
import Dialog from "react-native-dialog"
import { useStore } from "../../../lib/state"
import useLang from "../../../lib/hooks/useLang"
import { removeSharedInItem } from "../../../lib/api"
import { showToast } from "../../Toasts"
import { i18n } from "../../../i18n"
import { DeviceEventEmitter, Text, Platform } from "react-native"
import { Item } from "../../../types"
import useDarkMode from "../../../lib/hooks/useDarkMode"
import { getColor } from "../../../style"

const ConfirmRemoveFromSharedInDialog = memo(() => {
	const [buttonsDisabled, setButtonsDisabled] = useState<boolean>(false)
	const lang = useLang()
	const [open, setOpen] = useState<boolean>(false)
	const [currentItem, setCurrentItem] = useState<Item | undefined>(undefined)
	const darkMode = useDarkMode()

	const remove = useCallback(() => {
		if (typeof currentItem == "undefined" || buttonsDisabled) {
			return
		}

		setButtonsDisabled(true)
		setOpen(false)

		useStore.setState({ fullscreenLoadingModalVisible: true })

		removeSharedInItem(currentItem.uuid)
			.then(() => {
				DeviceEventEmitter.emit("event", {
					type: "remove-item",
					data: {
						uuid: currentItem.uuid
					}
				})

				setButtonsDisabled(false)

				useStore.setState({ fullscreenLoadingModalVisible: false })

				//showToast({ message: i18n(lang, "removedFromSharedIn", true, ["__NAME__"], [currentActionSheetItem.name]) })
			})
			.catch(err => {
				console.error(err)

				setButtonsDisabled(false)

				useStore.setState({ fullscreenLoadingModalVisible: false })

				showToast({ message: err.toString() })
			})
	}, [lang, buttonsDisabled, currentItem])

	useEffect(() => {
		const openConfirmRemoveFromSharedInDialogListener = DeviceEventEmitter.addListener(
			"openConfirmRemoveFromSharedInDialog",
			(item: Item) => {
				setButtonsDisabled(false)
				setCurrentItem(item)
				setOpen(true)
			}
		)

		return () => {
			openConfirmRemoveFromSharedInDialogListener.remove()
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
							{i18n(lang, "removeFromSharedInConfirmation", true, ["__NAME__"], [currentItem.name])}
						</Text>
					</Dialog.Title>
					<Dialog.Button
						label={i18n(lang, "cancel")}
						disabled={buttonsDisabled}
						onPress={() => setOpen(false)}
						color={getColor(darkMode, "linkPrimary")}
					/>
					<Dialog.Button
						label={i18n(lang, "removeFromSharedIn")}
						disabled={buttonsDisabled}
						onPress={remove}
						color={getColor(darkMode, "red")}
					/>
				</Dialog.Container>
			)}
		</>
	)
})

export default ConfirmRemoveFromSharedInDialog
