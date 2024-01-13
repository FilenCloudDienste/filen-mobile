import React, { useState, useEffect, memo, useCallback } from "react"
import Dialog from "react-native-dialog"
import { useStore } from "../../../lib/state"
import useLang from "../../../lib/hooks/useLang"
import { stopSharingItem } from "../../../lib/api"
import { showToast } from "../../Toasts"
import { i18n } from "../../../i18n"
import { DeviceEventEmitter, Text, Platform } from "react-native"
import { Item } from "../../../types"
import useDarkMode from "../../../lib/hooks/useDarkMode"
import { getColor } from "../../../style"

const ConfirmStopSharingDialog = memo(() => {
	const [buttonsDisabled, setButtonsDisabled] = useState<boolean>(false)
	const lang = useLang()
	const [open, setOpen] = useState<boolean>(false)
	const [currentItem, setCurrentItem] = useState<Item | undefined>(undefined)
	const darkMode = useDarkMode()

	const stopSharing = useCallback(() => {
		if (typeof currentItem == "undefined" || buttonsDisabled) {
			return
		}

		if (typeof currentItem.receivers == "undefined" || !Array.isArray(currentItem.receivers)) {
			return
		}

		setButtonsDisabled(true)
		setOpen(false)

		useStore.setState({ fullscreenLoadingModalVisible: true })

		const promises = []

		for (let i = 0; i < currentItem.receivers.length; i++) {
			const item: Item = {
				...currentItem,
				receiverId: currentItem.receivers[i].id,
				receiverEmail: currentItem.receivers[i].email
			}

			promises.push(stopSharingItem(item.uuid, item.receiverId))
		}

		Promise.all(promises)
			.then(() => {
				DeviceEventEmitter.emit("event", {
					type: "remove-item",
					data: {
						uuid: currentItem.uuid
					}
				})

				setButtonsDisabled(false)

				useStore.setState({ fullscreenLoadingModalVisible: false })

				//showToast({ message: i18n(lang, "stoppedSharingItem", true, ["__NAME__"], [currentActionSheetItem.name]) })
			})
			.catch(err => {
				console.error(err)

				setButtonsDisabled(false)

				useStore.setState({ fullscreenLoadingModalVisible: false })

				showToast({ message: err.toString() })
			})
	}, [currentItem, buttonsDisabled, lang])

	useEffect(() => {
		const openConfirmStopSharingDialogListener = DeviceEventEmitter.addListener("openConfirmStopSharingDialog", (item: Item) => {
			setButtonsDisabled(false)
			setCurrentItem(item)
			setOpen(true)
		})

		return () => {
			openConfirmStopSharingDialogListener.remove()
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
							{i18n(lang, "stopSharingConfirmation", true, ["__NAME__"], [currentItem.name])}
						</Text>
					</Dialog.Title>
					<Dialog.Button
						label={i18n(lang, "cancel")}
						disabled={buttonsDisabled}
						onPress={() => setOpen(false)}
						color={getColor(darkMode, "linkPrimary")}
					/>
					<Dialog.Button
						label={i18n(lang, "stopSharing")}
						disabled={buttonsDisabled}
						onPress={() => stopSharing()}
						color={getColor(darkMode, "red")}
					/>
				</Dialog.Container>
			)}
		</>
	)
})

export default ConfirmStopSharingDialog
