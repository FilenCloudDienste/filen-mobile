import React, { useState, useEffect, memo, useCallback } from "react"
import Dialog from "react-native-dialog"
import useLang from "../../../lib/hooks/useLang"
import { NoteTag, notesTagsDelete } from "../../../lib/api"
import { showToast } from "../../Toasts"
import { i18n } from "../../../i18n"
import { DeviceEventEmitter, Platform, Text, Keyboard } from "react-native"
import useDarkMode from "../../../lib/hooks/useDarkMode"
import { getColor } from "../../../style"
import {
	showFullScreenLoadingModal,
	hideFullScreenLoadingModal
} from "../../../components/Modals/FullscreenLoadingModal/FullscreenLoadingModal"
import eventListener from "../../../lib/eventListener"
import { fetchNotesAndTags } from "../../../screens/NotesScreen/utils"

const ConfirmDeleteNoteTagDialog = memo(() => {
	const [buttonsDisabled, setButtonsDisabled] = useState<boolean>(false)
	const lang = useLang()
	const [open, setOpen] = useState<boolean>(false)
	const [selectedTag, setSelectedTag] = useState<NoteTag | undefined>(undefined)
	const darkMode = useDarkMode()

	const refresh = useCallback(async () => {
		const notesAndTags = await fetchNotesAndTags(true)

		eventListener.emit("notesUpdate", notesAndTags.notes)
		eventListener.emit("notesTagsUpdate", notesAndTags.tags)
		eventListener.emit("refreshNotes")
	}, [])

	const del = useCallback(async () => {
		if (!selectedTag) {
			return
		}

		setButtonsDisabled(true)
		setOpen(false)
		showFullScreenLoadingModal()

		Keyboard.dismiss()

		try {
			await notesTagsDelete(selectedTag.uuid)
			await refresh()
		} catch (e) {
			console.error(e)

			showToast({ message: e.toString() })
		} finally {
			hideFullScreenLoadingModal()
			setButtonsDisabled(false)
		}
	}, [selectedTag])

	useEffect(() => {
		const openConfirmDeleteNoteTagDialogListener = DeviceEventEmitter.addListener("openConfirmDeleteNoteTagDialog", (tag: NoteTag) => {
			setButtonsDisabled(false)
			setSelectedTag(tag)
			setOpen(true)
		})

		return () => {
			openConfirmDeleteNoteTagDialogListener.remove()
		}
	}, [])

	return (
		<>
			{selectedTag && (
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
							{i18n(lang, "confirmDeleteName", true, ["__NAME__"], [selectedTag.name])}
						</Text>
					</Dialog.Title>
					<Dialog.Button
						label={i18n(lang, "cancel")}
						disabled={buttonsDisabled}
						onPress={() => setOpen(false)}
						color={getColor(darkMode, "linkPrimary")}
					/>
					<Dialog.Button
						label={i18n(lang, "delete")}
						disabled={buttonsDisabled}
						onPress={del}
						color={getColor(darkMode, "red")}
					/>
				</Dialog.Container>
			)}
		</>
	)
})

export default ConfirmDeleteNoteTagDialog
