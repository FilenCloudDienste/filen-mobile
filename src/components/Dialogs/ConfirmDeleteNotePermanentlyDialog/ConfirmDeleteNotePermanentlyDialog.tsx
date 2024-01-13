import React, { useState, useEffect, memo, useCallback } from "react"
import Dialog from "react-native-dialog"
import useLang from "../../../lib/hooks/useLang"
import { Note, deleteNote } from "../../../lib/api"
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
import { hideAllActionSheets } from "../../../components/ActionSheets"
import { NavigationContainerRef } from "@react-navigation/native"

const ConfirmDeleteNotePermanentlyDialog = memo(({ navigation }: { navigation: NavigationContainerRef<ReactNavigation.RootParamList> }) => {
	const [buttonsDisabled, setButtonsDisabled] = useState<boolean>(false)
	const lang = useLang()
	const [open, setOpen] = useState<boolean>(false)
	const [selectedNote, setSelectedNote] = useState<Note | undefined>(undefined)
	const [isInsideNote, setIsInsideNote] = useState<boolean>(false)
	const darkMode = useDarkMode()

	const refresh = useCallback(async () => {
		const notesAndTags = await fetchNotesAndTags(true)

		eventListener.emit("notesUpdate", notesAndTags.notes)
		eventListener.emit("refreshNotes")
	}, [])

	const deletePermanently = useCallback(async () => {
		if (!selectedNote) {
			return
		}

		await hideAllActionSheets()

		showFullScreenLoadingModal()
		setOpen(false)

		try {
			await deleteNote(selectedNote.uuid)
			await refresh()

			if (isInsideNote && navigation.canGoBack()) {
				navigation.goBack()
			}
		} catch (e) {
			console.error(e)

			showToast({ message: e.toString() })
		} finally {
			hideFullScreenLoadingModal()
		}
	}, [selectedNote, isInsideNote, navigation])

	useEffect(() => {
		const openConfirmDeleteNotePermanentlyDialogListener = DeviceEventEmitter.addListener(
			"openConfirmDeleteNotePermanentlyDialog",
			({ note, isInsideNote: inside }: { note: Note; isInsideNote: boolean }) => {
				setButtonsDisabled(false)
				setIsInsideNote(inside)
				setSelectedNote(note)
				setOpen(true)
			}
		)

		return () => {
			openConfirmDeleteNotePermanentlyDialogListener.remove()
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
							{i18n(lang, "confirmDeleteNamePermanently", true, ["__NAME__"], [selectedNote.title])}
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
						onPress={deletePermanently}
						color={getColor(darkMode, "red")}
					/>
				</Dialog.Container>
			)}
		</>
	)
})

export default ConfirmDeleteNotePermanentlyDialog
