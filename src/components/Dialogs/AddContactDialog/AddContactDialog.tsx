import React, { useState, useEffect, memo, useCallback, useRef } from "react"
import Dialog from "react-native-dialog"
import useLang from "../../../lib/hooks/useLang"
import { contactsRequestsSend } from "../../../lib/api"
import { showToast } from "../../Toasts"
import { i18n } from "../../../i18n"
import useDarkMode from "../../../lib/hooks/useDarkMode"
import { getColor } from "../../../style"
import eventListener from "../../../lib/eventListener"
import {
	showFullScreenLoadingModal,
	hideFullScreenLoadingModal
} from "../../../components/Modals/FullscreenLoadingModal/FullscreenLoadingModal"
import { TextInput, Keyboard, Text, Platform } from "react-native"

const AddContactDialog = memo(() => {
	const [buttonsDisabled, setButtonsDisabled] = useState<boolean>(false)
	const lang = useLang()
	const [open, setOpen] = useState<boolean>(false)
	const darkMode = useDarkMode()
	const [value, setValue] = useState<string>("")
	const inputRef = useRef<TextInput>()

	const add = useCallback(async () => {
		const email = value

		if (!email || email.length === 0) {
			return
		}

		setButtonsDisabled(true)
		setOpen(false)
		showFullScreenLoadingModal()

		Keyboard.dismiss()

		try {
			await contactsRequestsSend(email)

			eventListener.emit("contactRequestSend", email)
			eventListener.emit("updateContactsList")
			eventListener.emit("showContactsPending")
		} catch (e) {
			console.error(e)

			showToast({ message: e.toString() })
		} finally {
			hideFullScreenLoadingModal()
			setButtonsDisabled(false)
			setValue("")
		}
	}, [value])

	useEffect(() => {
		const openAddContactDialogListener = eventListener.on("openAddContactDialog", () => {
			setButtonsDisabled(false)
			setValue("")
			setOpen(true)

			setTimeout(() => {
				inputRef?.current?.focus()
			}, 500)
		})

		return () => {
			openAddContactDialogListener.remove()
		}
	}, [])

	return (
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
					{i18n(lang, "addContactDialogTitle")}
				</Text>
			</Dialog.Title>
			<Dialog.Input
				placeholder={i18n(lang, "addContactDialogTitleEmailPlaceholder")}
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
				label={i18n(lang, "send")}
				disabled={buttonsDisabled}
				onPress={add}
				color={getColor(darkMode, "linkPrimary")}
			/>
		</Dialog.Container>
	)
})

export default AddContactDialog
