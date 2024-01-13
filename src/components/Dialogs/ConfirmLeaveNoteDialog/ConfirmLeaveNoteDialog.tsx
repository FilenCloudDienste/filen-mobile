import React, { useState, useEffect, memo, useCallback } from "react"
import Dialog from "react-native-dialog"
import useLang from "../../../lib/hooks/useLang"
import { Note, noteParticipantsRemove } from "../../../lib/api"
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
import { fetchNotesAndTags } from "../../../screens/NotesScreen/utils"

const ConfirmLeaveNoteDialog = memo(() => {
	const [buttonsDisabled, setButtonsDisabled] = useState<boolean>(false)
	const lang = useLang()
	const [open, setOpen] = useState<boolean>(false)
	const [selectedNote, setSelectedNote] = useState<Note | undefined>(undefined)
	const darkMode = useDarkMode()
	const [userId] = useMMKVNumber("userId", storage)

	const refresh = useCallback(async () => {
		const notesAndTags = await fetchNotesAndTags(true)

		eventListener.emit("notesUpdate", notesAndTags.notes)
		eventListener.emit("refreshNotes")
	}, [])

	const leave = useCallback(async () => {
		if (!selectedNote) {
			return
		}

		await hideAllActionSheets()

		showFullScreenLoadingModal()
		setOpen(false)

		try {
			await noteParticipantsRemove({ uuid: selectedNote.uuid, userId })
			await refresh()
		} catch (e) {
			console.error(e)

			showToast({ message: e.toString() })
		} finally {
			hideFullScreenLoadingModal()
		}
	}, [selectedNote, userId])

	useEffect(() => {
		const openConfirmLeaveNoteDialogListener = DeviceEventEmitter.addListener("openConfirmLeaveNoteDialog", (note: Note) => {
			setButtonsDisabled(false)
			setSelectedNote(note)
			setOpen(true)
		})

		return () => {
			openConfirmLeaveNoteDialogListener.remove()
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
							{i18n(lang, "confirmLeaveNotePermanently")}
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

export default ConfirmLeaveNoteDialog
