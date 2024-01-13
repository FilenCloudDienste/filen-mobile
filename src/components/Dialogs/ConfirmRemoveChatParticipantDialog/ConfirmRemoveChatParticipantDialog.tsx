import React, { useState, useEffect, memo, useCallback } from "react"
import Dialog from "react-native-dialog"
import useLang from "../../../lib/hooks/useLang"
import { ChatConversationParticipant, chatConversationsParticipantsRemove, ChatConversation } from "../../../lib/api"
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

const ConfirmRemoveChatParticipantDialog = memo(() => {
	const [buttonsDisabled, setButtonsDisabled] = useState<boolean>(false)
	const lang = useLang()
	const [open, setOpen] = useState<boolean>(false)
	const [selectedParticipant, setSelectedParticipant] = useState<ChatConversationParticipant | undefined>(undefined)
	const [selectedConversation, setSelectedConversation] = useState<ChatConversation | undefined>(undefined)
	const darkMode = useDarkMode()

	const remove = useCallback(async () => {
		if (!selectedConversation || !selectedParticipant) {
			return
		}

		await hideAllActionSheets()

		showFullScreenLoadingModal()
		setOpen(false)

		try {
			await chatConversationsParticipantsRemove(selectedConversation.uuid, selectedParticipant.userId)

			eventListener.emit("chatConversationParticipantRemoved", {
				uuid: selectedConversation.uuid,
				userId: selectedParticipant.userId
			})
		} catch (e) {
			console.error(e)

			showToast({ message: e.toString() })
		} finally {
			hideFullScreenLoadingModal()
		}
	}, [selectedConversation, selectedParticipant])

	useEffect(() => {
		const openConfirmRemoveChatParticipantDialogListener = DeviceEventEmitter.addListener(
			"openConfirmRemoveChatParticipantDialog",
			({ conversation, participant }: { conversation: ChatConversation; participant: ChatConversationParticipant }) => {
				setButtonsDisabled(false)
				setSelectedConversation(conversation)
				setSelectedParticipant(participant)
				setOpen(true)
			}
		)

		return () => {
			openConfirmRemoveChatParticipantDialogListener.remove()
		}
	}, [])

	return (
		<>
			{selectedConversation && selectedParticipant && (
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
							{i18n(lang, "confirmRemoveChatParticipant", true, ["__NAME__"], [selectedParticipant.email])}
						</Text>
					</Dialog.Title>
					<Dialog.Button
						label={i18n(lang, "cancel")}
						disabled={buttonsDisabled}
						onPress={() => setOpen(false)}
						color={getColor(darkMode, "linkPrimary")}
					/>
					<Dialog.Button
						label={i18n(lang, "remove")}
						disabled={buttonsDisabled}
						onPress={remove}
						color={getColor(darkMode, "red")}
					/>
				</Dialog.Container>
			)}
		</>
	)
})

export default ConfirmRemoveChatParticipantDialog
