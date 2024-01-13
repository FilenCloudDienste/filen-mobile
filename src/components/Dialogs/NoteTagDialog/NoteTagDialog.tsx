import React, { useState, useEffect, memo, useCallback, useRef } from "react"
import Dialog from "react-native-dialog"
import useLang from "../../../lib/hooks/useLang"
import { notesTags, NoteTag, notesTagsRename } from "../../../lib/api"
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
import { decryptNoteTagName, encryptNoteTagName } from "../../../lib/crypto"
import { TextInput, Keyboard } from "react-native"
import { fetchNotesAndTags } from "../../../screens/NotesScreen/utils"
import { getMasterKeys } from "../../../lib/helpers"
import striptags from "striptags"

const NoteTagDialog = memo(() => {
	const [buttonsDisabled, setButtonsDisabled] = useState<boolean>(false)
	const lang = useLang()
	const [open, setOpen] = useState<boolean>(false)
	const darkMode = useDarkMode()
	const [value, setValue] = useState<string>("")
	const inputRef = useRef<TextInput>()
	const [selectedTag, setSelectedTag] = useState<NoteTag | undefined>(undefined)

	const refresh = useCallback(async () => {
		const notesAndTags = await fetchNotesAndTags(true)

		eventListener.emit("notesUpdate", notesAndTags.notes)
		eventListener.emit("notesTagsUpdate", notesAndTags.tags)
		eventListener.emit("refreshNotes")
	}, [])

	const rename = useCallback(async () => {
		const name = striptags(value.trim())

		if (!name || name.length === 0) {
			return
		}

		setButtonsDisabled(true)
		setOpen(false)
		showFullScreenLoadingModal()

		Keyboard.dismiss()

		try {
			const tagsRes = await notesTags()
			const masterKeys = getMasterKeys()
			const existingNames: string[] = []
			const promises: Promise<void>[] = []

			for (const tag of tagsRes) {
				promises.push(
					new Promise(async (resolve, reject) => {
						try {
							const decryptedName = await decryptNoteTagName(tag.name, masterKeys)

							if (decryptedName.length > 0) {
								existingNames.push(decryptedName)
							}
						} catch (e) {
							reject(e)

							return
						}

						resolve()
					})
				)
			}

			await Promise.all(promises)

			if (existingNames.includes(name)) {
				return
			}

			const nameEncrypted = await encryptNoteTagName(name, masterKeys[masterKeys.length - 1])

			await notesTagsRename(selectedTag.uuid, nameEncrypted)
			await refresh()
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
		const openNoteTagDialogListener = eventListener.on("openNoteTagDialog", (tag: NoteTag) => {
			setButtonsDisabled(false)
			setValue(tag.name)
			setOpen(true)
			setSelectedTag(tag)

			setTimeout(() => {
				inputRef?.current?.focus()
			}, 500)
		})

		return () => {
			openNoteTagDialogListener.remove()
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
							{i18n(lang, "editTag")}
						</Text>
					</Dialog.Title>
					<Dialog.Input
						placeholder={i18n(lang, "tagName")}
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
						label={i18n(lang, "delete")}
						disabled={buttonsDisabled}
						onPress={() => {
							setOpen(false)

							eventListener.emit("openConfirmDeleteNoteTagDialog", selectedTag)
						}}
						color={getColor(darkMode, "red")}
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
						onPress={rename}
						color={getColor(darkMode, "linkPrimary")}
					/>
				</Dialog.Container>
			)}
		</>
	)
})

export default NoteTagDialog
