import React, { memo, useCallback, useEffect, useState } from "react"
import { View } from "react-native"
import ActionSheet, { SheetManager } from "react-native-actions-sheet"
import useLang from "../../../lib/hooks/useLang"
import useDimensions from "../../../lib/hooks/useDimensions"
import { i18n } from "../../../i18n"
import { getColor } from "../../../style/colors"
import { ActionButton, hideAllActionSheets } from "../ActionSheets"
import useDarkMode from "../../../lib/hooks/useDarkMode"
import Ionicon from "@expo/vector-icons/Ionicons"
import { Note, NoteParticipant, noteParticipantsPermissions, noteParticipantsRemove } from "../../../lib/api"
import { showToast } from "../../../components/Toasts"
import {
	showFullScreenLoadingModal,
	hideFullScreenLoadingModal
} from "../../../components/Modals/FullscreenLoadingModal/FullscreenLoadingModal"
import eventListener from "../../../lib/eventListener"

const NoteParticipantsActionSheet = memo(() => {
	const darkMode = useDarkMode()
	const dimensions = useDimensions()
	const lang = useLang()
	const [selectedNote, setSelectedNote] = useState<Note | undefined>(undefined)
	const [selectedParticipant, setSelectedParticipant] = useState<NoteParticipant | undefined>(undefined)

	const remove = useCallback(async () => {
		if (!selectedNote || !selectedParticipant) {
			return
		}

		showFullScreenLoadingModal()

		try {
			await noteParticipantsRemove({ uuid: selectedNote.uuid, userId: selectedParticipant.userId })

			eventListener.emit("noteParticipantRemoved", { uuid: selectedNote.uuid, userId: selectedParticipant.userId })
			eventListener.emit("refreshNotes")
		} catch (e) {
			console.error(e)

			showToast({ message: e.toString() })
		} finally {
			hideFullScreenLoadingModal()
			hideAllActionSheets()
		}
	}, [selectedNote, selectedParticipant])

	const permissions = useCallback(
		async (write: boolean) => {
			if (!selectedNote || !selectedParticipant) {
				return
			}

			showFullScreenLoadingModal()

			try {
				await noteParticipantsPermissions({ uuid: selectedNote.uuid, userId: selectedParticipant.userId, permissionsWrite: write })

				eventListener.emit("noteParticipantPermissions", {
					uuid: selectedNote.uuid,
					userId: selectedParticipant.userId,
					permissionsWrite: write
				})
				eventListener.emit("refreshNotes")
			} catch (e) {
				console.error(e)

				showToast({ message: e.toString() })
			} finally {
				hideFullScreenLoadingModal()
				hideAllActionSheets()
			}
		},
		[selectedNote, selectedParticipant]
	)

	useEffect(() => {
		const openNoteParticipantsActionSheetListener = eventListener.on(
			"openNoteParticipantsActionSheet",
			({ note, participant }: { note: Note; participant: NoteParticipant }) => {
				setSelectedNote(note)
				setSelectedParticipant(participant)

				SheetManager.show("NoteParticipantsActionSheet")
			}
		)

		return () => {
			openNoteParticipantsActionSheetListener.remove()
		}
	}, [])

	return (
		<ActionSheet
			id="NoteParticipantsActionSheet"
			gestureEnabled={true}
			containerStyle={{
				backgroundColor: getColor(darkMode, "backgroundSecondary"),
				borderTopLeftRadius: 15,
				borderTopRightRadius: 15
			}}
			indicatorStyle={{
				backgroundColor: getColor(darkMode, "backgroundTertiary")
			}}
		>
			<View
				style={{
					paddingBottom: dimensions.insets.bottom + dimensions.navigationBarHeight
				}}
			>
				{selectedNote && selectedParticipant && (
					<>
						{selectedParticipant.permissionsWrite ? (
							<ActionButton
								onPress={() => permissions(false)}
								icon="eye-outline"
								text={i18n(lang, "toggleReadAccess")}
							/>
						) : (
							<ActionButton
								onPress={() => permissions(true)}
								icon="create-outline"
								text={i18n(lang, "toggleWriteAccess")}
							/>
						)}
						<ActionButton
							onPress={() => remove()}
							icon={
								<Ionicon
									name="close-circle-outline"
									color={getColor(darkMode, "red")}
									size={22}
								/>
							}
							textColor={getColor(darkMode, "red")}
							text={i18n(lang, "remove")}
						/>
					</>
				)}
			</View>
		</ActionSheet>
	)
})

export default NoteParticipantsActionSheet
