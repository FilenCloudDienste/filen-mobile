import React, { useState, useEffect, memo, useCallback, useRef } from "react"
import Dialog from "react-native-dialog"
import storage from "../../../lib/storage"
import useLang from "../../../lib/hooks/useLang"
import { Note, editNoteTitle } from "../../../lib/api"
import { showToast } from "../../Toasts"
import { i18n } from "../../../i18n"
import { Text, Platform } from "react-native"
import useDarkMode from "../../../lib/hooks/useDarkMode"
import { getColor } from "../../../style"
import eventListener from "../../../lib/eventListener"
import {
	showFullScreenLoadingModal,
	hideFullScreenLoadingModal
} from "../../../components/Modals/FullscreenLoadingModal/FullscreenLoadingModal"
import { decryptNoteKeyParticipant, encryptNoteTitle } from "../../../lib/crypto"
import { TextInput, Keyboard } from "react-native"
import striptags from "striptags"

const NoteTitleDialog = memo(() => {
	const [buttonsDisabled, setButtonsDisabled] = useState<boolean>(false)
	const lang = useLang()
	const [open, setOpen] = useState<boolean>(false)
	const darkMode = useDarkMode()
	const [selectedNote, setSelectedNote] = useState<Note | undefined>(undefined)
	const [value, setValue] = useState<string>("")
	const inputRef = useRef<TextInput>()

	const edit = useCallback(async () => {
		if (!selectedNote) {
			return
		}

		const title = striptags(value.trim())

		if (!title || title.length === 0) {
			return
		}

		setButtonsDisabled(true)
		setOpen(false)
		showFullScreenLoadingModal()

		Keyboard.dismiss()

		try {
			const userId = storage.getNumber("userId")
			const privateKey = storage.getString("privateKey")

			const noteKey = await decryptNoteKeyParticipant(
				selectedNote.participants.filter(participant => participant.userId === userId)[0].metadata,
				privateKey
			)

			if (noteKey.length === 0) {
				return
			}

			const titleEncrypted = await encryptNoteTitle(title, noteKey)

			await editNoteTitle(selectedNote.uuid, titleEncrypted)

			eventListener.emit("refreshNotes")
			eventListener.emit("noteTitleEdited", { uuid: selectedNote.uuid, title })
		} catch (e) {
			console.error(e)

			showToast({ message: e.toString() })
		} finally {
			hideFullScreenLoadingModal()
			setButtonsDisabled(false)
			setValue("")
		}
	}, [selectedNote, value])

	useEffect(() => {
		const openNoteTitleDialogListener = eventListener.on("openNoteTitleDialog", (note: Note) => {
			setButtonsDisabled(false)
			setSelectedNote(note)
			setValue(note.title)
			setOpen(true)

			setTimeout(() => {
				inputRef?.current?.focus()
			}, 500)
		})

		return () => {
			openNoteTitleDialogListener.remove()
		}
	}, [])

	return (
		<>
			{selectedNote && (
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
							{i18n(lang, "noteTitle")}
						</Text>
					</Dialog.Title>
					<Dialog.Input
						placeholder={i18n(lang, "title")}
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

export default NoteTitleDialog
