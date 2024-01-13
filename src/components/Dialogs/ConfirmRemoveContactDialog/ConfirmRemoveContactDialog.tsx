import React, { useState, useEffect, memo, useCallback } from "react"
import Dialog from "react-native-dialog"
import useLang from "../../../lib/hooks/useLang"
import { Contact, contactsDelete } from "../../../lib/api"
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

const ConfirmRemoveContactDialog = memo(() => {
	const [buttonsDisabled, setButtonsDisabled] = useState<boolean>(false)
	const lang = useLang()
	const [open, setOpen] = useState<boolean>(false)
	const [selectedContact, setSelectedContact] = useState<Contact | undefined>(undefined)
	const darkMode = useDarkMode()

	const remove = useCallback(async () => {
		if (!selectedContact) {
			return
		}

		await hideAllActionSheets()

		showFullScreenLoadingModal()
		setOpen(false)

		try {
			await contactsDelete(selectedContact.uuid)

			eventListener.emit("contactDeleted", selectedContact.uuid)
			eventListener.emit("updateContactsList")
		} catch (e) {
			console.error(e)

			showToast({ message: e.toString() })
		} finally {
			hideFullScreenLoadingModal()
		}
	}, [selectedContact])

	useEffect(() => {
		const openConfirmRemoveContactDialogListener = DeviceEventEmitter.addListener(
			"openConfirmRemoveContactDialog",
			(contact: Contact) => {
				setButtonsDisabled(false)
				setSelectedContact(contact)
				setOpen(true)
			}
		)

		return () => {
			openConfirmRemoveContactDialogListener.remove()
		}
	}, [])

	return (
		<>
			{selectedContact && (
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
							{i18n(lang, "confirmRemoveContact", true, ["__NAME__"], [selectedContact.email])}
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

export default ConfirmRemoveContactDialog
