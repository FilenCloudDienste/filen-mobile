import React, { useState, useEffect, memo, useCallback, useRef } from "react"
import Dialog from "react-native-dialog"
import storage from "../../../lib/storage"
import useLang from "../../../lib/hooks/useLang"
import { ChatConversation, chatConversationNameEdit } from "../../../lib/api"
import { showToast } from "../../Toasts"
import { i18n } from "../../../i18n"
import { Text, Platform } from "react-native"
import useDarkMode from "../../../lib/hooks/useDarkMode"
import { getColor } from "../../../style"
import eventListener from "../../../lib/eventListener"
import { showFullScreenLoadingModal, hideFullScreenLoadingModal } from "../../Modals/FullscreenLoadingModal/FullscreenLoadingModal"
import { decryptChatMessageKey, encryptChatConversationName } from "../../../lib/crypto"
import { TextInput, Keyboard } from "react-native"
import striptags from "striptags"
import { useMMKVNumber } from "react-native-mmkv"

const ChatConversationNameDialog = memo(() => {
	const [buttonsDisabled, setButtonsDisabled] = useState<boolean>(false)
	const lang = useLang()
	const [open, setOpen] = useState<boolean>(false)
	const darkMode = useDarkMode()
	const [selectedConversation, setSelectedConversation] = useState<ChatConversation | undefined>(undefined)
	const [value, setValue] = useState<string>("")
	const inputRef = useRef<TextInput>()
	const [userId] = useMMKVNumber("userId", storage)

	const edit = useCallback(async () => {
		if (!selectedConversation || selectedConversation.ownerId !== userId) {
			return
		}

		const name = striptags(value.trim())

		setButtonsDisabled(true)
		setOpen(false)
		showFullScreenLoadingModal()

		Keyboard.dismiss()

		try {
			const privateKey = storage.getString("privateKey")
			const metadata = selectedConversation.participants.filter(p => p.userId === userId)

			if (metadata.length !== 1) {
				return
			}

			const keyDecrypted = await decryptChatMessageKey(metadata[0].metadata, privateKey)

			if (keyDecrypted.length === 0) {
				return
			}

			const nameEncrypted = await encryptChatConversationName(name, keyDecrypted)

			await chatConversationNameEdit(selectedConversation.uuid, nameEncrypted)

			eventListener.emit("chatConversationNameEdited", { uuid: selectedConversation.uuid, name })
		} catch (e) {
			console.error(e)

			showToast({ message: e.toString() })
		} finally {
			hideFullScreenLoadingModal()
			setButtonsDisabled(false)
			setValue("")
		}
	}, [selectedConversation, value, userId])

	useEffect(() => {
		const openChatConversationNameDialogListener = eventListener.on(
			"openChatConversationNameDialog",
			(conversation: ChatConversation) => {
				setButtonsDisabled(false)
				setSelectedConversation(conversation)
				setValue(typeof conversation.name === "string" && conversation.name.length > 0 ? conversation.name : "")
				setOpen(true)

				setTimeout(() => {
					inputRef?.current?.focus()
				}, 500)
			}
		)

		return () => {
			openChatConversationNameDialogListener.remove()
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
							{i18n(lang, "chatConversationName")}
						</Text>
					</Dialog.Title>
					<Dialog.Input
						placeholder={i18n(lang, "name")}
						value={value}
						selection={undefined}
						autoFocus={true}
						onChangeText={val => setValue(val)}
						textInputRef={inputRef}
						cursorColor={Platform.OS === "android" && getColor(darkMode, "linkPrimary")}
						underlineColorAndroid={getColor(darkMode, "backgroundTertiary")}
						style={
							Platform.OS === "android" && {
								color: getColor(darkMode, "textPrimary")
							}
						}
					/>
					<Dialog.Button
						label={i18n(lang, "cancel")}
						disabled={buttonsDisabled}
						onPress={() => setOpen(false)}
						color={getColor(darkMode, "linkPrimary")}
					/>
					<Dialog.Button
						label={i18n(lang, "edit")}
						disabled={buttonsDisabled}
						onPress={edit}
						color={getColor(darkMode, "linkPrimary")}
					/>
				</Dialog.Container>
			)}
		</>
	)
})

export default ChatConversationNameDialog
