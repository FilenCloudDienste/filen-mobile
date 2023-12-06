import React, { memo, useCallback, useState, useEffect } from "react"
import { View, Platform } from "react-native"
import ActionSheet, { SheetManager } from "react-native-actions-sheet"
import useLang from "../../../lib/hooks/useLang"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { i18n } from "../../../i18n"
import { getColor } from "../../../style/colors"
import { ActionButton, ActionSheetIndicator, hideAllActionSheets } from "../ActionSheets"
import useDarkMode from "../../../lib/hooks/useDarkMode"
import Ionicon from "@expo/vector-icons/Ionicons"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { noteChangeType, Note, NoteType } from "../../../lib/api"
import storage from "../../../lib/storage"
import { encryptNoteContent, encryptNotePreview, decryptNoteKeyParticipant } from "../../../lib/crypto"
import { showToast } from "../../../components/Toasts"
import {
	showFullScreenLoadingModal,
	hideFullScreenLoadingModal
} from "../../../components/Modals/FullscreenLoadingModal/FullscreenLoadingModal"
import { createNotePreviewFromContentText, fetchNoteContent, fetchNotesAndTags } from "../../../screens/NotesScreen/utils"
import eventListener from "../../../lib/eventListener"

const NoteChangeTypeActionSheet = memo(() => {
	const darkMode = useDarkMode()
	const insets = useSafeAreaInsets()
	const lang = useLang()
	const [selectedNote, setSelectedNote] = useState<Note | undefined>(undefined)

	const change = useCallback(
		async (type: NoteType) => {
			if (!selectedNote || type === selectedNote.type) {
				return
			}

			showFullScreenLoadingModal()

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

				const contentRes = await fetchNoteContent(selectedNote, true)
				const preview = createNotePreviewFromContentText(contentRes.content, selectedNote.type)
				const contentEncrypted = await encryptNoteContent(contentRes.content, noteKey)
				const previewEncrypted = await encryptNotePreview(preview, noteKey)

				await noteChangeType({ uuid: selectedNote.uuid, type, content: contentEncrypted, preview: previewEncrypted })

				const notesAndTags = await fetchNotesAndTags(true)

				eventListener.emit("notesUpdate", notesAndTags.notes)
				eventListener.emit("refreshNotes")
			} catch (e) {
				console.error(e)

				showToast({ message: e.toString() })
			} finally {
				hideFullScreenLoadingModal()
				hideAllActionSheets()
			}
		},
		[selectedNote]
	)

	useEffect(() => {
		const openNoteChangeTypeActionSheetListener = eventListener.on("openNoteChangeTypeActionSheet", (note: Note) => {
			setSelectedNote(note)

			SheetManager.show("NoteChangeTypeActionSheet")
		})

		return () => {
			openNoteChangeTypeActionSheetListener.remove()
		}
	}, [])

	return (
		<ActionSheet
			id="NoteChangeTypeActionSheet"
			gestureEnabled={true}
			containerStyle={{
				backgroundColor: getColor(darkMode, "backgroundSecondary"),
				borderTopLeftRadius: 15,
				borderTopRightRadius: 15
			}}
			indicatorStyle={{
				display: "none"
			}}
		>
			<View
				style={{
					paddingBottom: insets.bottom + (Platform.OS === "android" ? 25 : 5)
				}}
			>
				<View
					style={{
						height: 5
					}}
				/>
				<ActionButton
					onPress={() => change("text")}
					icon={
						<Ionicon
							name="reorder-four-outline"
							size={24}
							color={getColor(darkMode, "blue")}
						/>
					}
					text={i18n(lang, "noteTypeText")}
				/>
				<ActionButton
					onPress={() => change("rich")}
					icon={
						<MaterialCommunityIcons
							name="file-image-outline"
							size={24}
							color={getColor(darkMode, "cyan")}
						/>
					}
					text={i18n(lang, "noteTypeRichText")}
				/>
				<ActionButton
					onPress={() => change("checklist")}
					icon={
						<MaterialCommunityIcons
							name="format-list-checks"
							size={24}
							color={getColor(darkMode, "purple")}
						/>
					}
					text={i18n(lang, "noteTypeChecklist")}
				/>
				<ActionButton
					onPress={() => change("md")}
					icon={
						<MaterialCommunityIcons
							name="language-markdown-outline"
							size={26}
							color={getColor(darkMode, "indigo")}
						/>
					}
					text={i18n(lang, "noteTypeMarkdown")}
				/>
				<ActionButton
					onPress={() => change("code")}
					icon={
						<View
							style={{
								paddingLeft: 5
							}}
						>
							<Ionicon
								name="code-slash"
								size={22}
								color={getColor(darkMode, "red")}
							/>
						</View>
					}
					text={i18n(lang, "noteTypeCode")}
				/>
			</View>
		</ActionSheet>
	)
})

export default NoteChangeTypeActionSheet
