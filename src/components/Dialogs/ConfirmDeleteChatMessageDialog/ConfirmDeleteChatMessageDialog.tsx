import React, { useState, useEffect, memo, useCallback } from "react"
import Dialog from "react-native-dialog"
import useLang from "../../../lib/hooks/useLang"
import { ChatMessage, chatDelete } from "../../../lib/api"
import { showToast } from "../../Toasts"
import { i18n } from "../../../i18n"
import { DeviceEventEmitter, Platform, Text } from "react-native"
import useDarkMode from "../../../lib/hooks/useDarkMode"
import { getColor } from "../../../style"
import {
	showFullScreenLoadingModal,
	hideFullScreenLoadingModal
} from "../../../components/Modals/FullscreenLoadingModal/FullscreenLoadingModal"
import eventListener from "../../../lib/eventListener"
import { hideAllActionSheets } from "../../../components/ActionSheets"

const ConfirmDeleteChatMessageDialog = memo(() => {
	const [buttonsDisabled, setButtonsDisabled] = useState<boolean>(false)
	const lang = useLang()
	const [open, setOpen] = useState<boolean>(false)
	const [selectedMessage, setSelectedMessage] = useState<ChatMessage | undefined>(undefined)
	const darkMode = useDarkMode()

	const del = useCallback(async () => {
		if (!selectedMessage) {
			return
		}

		await hideAllActionSheets()

		showFullScreenLoadingModal()
		setOpen(false)

		try {
			await chatDelete(selectedMessage.uuid)

			eventListener.emit("chatMessageDelete", selectedMessage.uuid)
		} catch (e) {
			console.error(e)

			showToast({ message: e.toString() })
		} finally {
			hideFullScreenLoadingModal()
		}
	}, [selectedMessage])

	useEffect(() => {
		const openConfirmDeleteChatMessageDialogListener = DeviceEventEmitter.addListener(
			"openConfirmDeleteChatMessageDialog",
			(message: ChatMessage) => {
				setButtonsDisabled(false)
				setSelectedMessage(message)
				setOpen(true)
			}
		)

		return () => {
			openConfirmDeleteChatMessageDialogListener.remove()
		}
	}, [])

	return (
		<>
			{selectedMessage && (
				<Dialog.Container
					visible={open}
					useNativeDriver={false}
					onRequestClose={() => setOpen(false)}
					onBackdropPress={() => setOpen(false)}
					contentStyle={
						Platform.OS === "android" && {
							backgroundColor: getColor(darkMode, "backgroundSecondary")
						}
					}
				>
					<Dialog.Title>
						<Text
							style={
								Platform.OS === "android" && {
									color: getColor(darkMode, "textPrimary")
								}
							}
						>
							{i18n(lang, "confirmDeleteChatMessagePermanently")}
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
						onPress={del}
						color={getColor(darkMode, "red")}
					/>
				</Dialog.Container>
			)}
		</>
	)
})

export default ConfirmDeleteChatMessageDialog
