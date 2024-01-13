import React, { useState, useEffect, memo, useCallback } from "react"
import Dialog from "react-native-dialog"
import useLang from "../../../lib/hooks/useLang"
import { ChatConversation, chatConversationsLeave } from "../../../lib/api"
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
import { useMMKVNumber } from "react-native-mmkv"
import storage from "../../../lib/storage"

const ConfirmLeaveChatDialog = memo(() => {
	const [buttonsDisabled, setButtonsDisabled] = useState<boolean>(false)
	const lang = useLang()
	const [open, setOpen] = useState<boolean>(false)
	const [selectedConversation, setSelectedConversation] = useState<ChatConversation | undefined>(undefined)
	const darkMode = useDarkMode()
	const [userId] = useMMKVNumber("userId", storage)

	const leave = useCallback(async () => {
		if (!selectedConversation || selectedConversation.ownerId === userId) {
			return
		}

		await hideAllActionSheets()

		showFullScreenLoadingModal()
		setOpen(false)

		try {
			await chatConversationsLeave(selectedConversation.uuid)

			eventListener.emit("chatConversationLeft", selectedConversation.uuid)
		} catch (e) {
			console.error(e)

			showToast({ message: e.toString() })
		} finally {
			hideFullScreenLoadingModal()
		}
	}, [selectedConversation, userId])

	useEffect(() => {
		const openConfirmLeaveChatDialogListener = DeviceEventEmitter.addListener(
			"openConfirmLeaveChatDialog",
			(convo: ChatConversation) => {
				setButtonsDisabled(false)
				setSelectedConversation(convo)
				setOpen(true)
			}
		)

		return () => {
			openConfirmLeaveChatDialogListener.remove()
		}
	}, [])

	return (
		<>
			{selectedConversation && (
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
							{i18n(lang, "confirmLeaveChatPermanently")}
						</Text>
					</Dialog.Title>
					<Dialog.Button
						label={i18n(lang, "cancel")}
						disabled={buttonsDisabled}
						onPress={() => setOpen(false)}
						color={getColor(darkMode, "linkPrimary")}
					/>
					<Dialog.Button
						label={i18n(lang, "leave")}
						disabled={buttonsDisabled}
						onPress={leave}
						color={getColor(darkMode, "red")}
					/>
				</Dialog.Container>
			)}
		</>
	)
})

export default ConfirmLeaveChatDialog
