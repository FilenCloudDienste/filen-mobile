import React, { memo, useCallback, useEffect, useState, useMemo } from "react"
import { View, Platform } from "react-native"
import ActionSheet, { SheetManager } from "react-native-actions-sheet"
import useLang from "../../../lib/hooks/useLang"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { NavigationContainerRef, StackActions } from "@react-navigation/native"
import { i18n } from "../../../i18n"
import { getColor } from "../../../style/colors"
import { ActionButton, ActionSheetIndicator, hideAllActionSheets } from "../ActionSheets"
import useDarkMode from "../../../lib/hooks/useDarkMode"
import Ionicon from "@expo/vector-icons/Ionicons"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import {
	createNote,
	noteChangeType,
	noteParticipantsAdd,
	Note,
	deleteNote,
	trashNote,
	restoreNote,
	noteFavorite,
	archiveNote,
	notePinned,
	editNoteContent,
	NoteTag,
	notesTag,
	notesUntag
} from "../../../lib/api"
import { generateRandomString, getMasterKeys, getFileExt } from "../../../lib/helpers"
import storage from "../../../lib/storage"
import { encryptMetadata, encryptMetadataPublicKey, encryptNoteTitle, encryptNoteContent, encryptNotePreview } from "../../../lib/crypto"
import { showToast } from "../../../components/Toasts"
import {
	showFullScreenLoadingModal,
	hideFullScreenLoadingModal
} from "../../../components/Modals/FullscreenLoadingModal/FullscreenLoadingModal"
import { createNotePreviewFromContentText, fetchNotesAndTags, fetchNoteContent } from "../../../screens/NotesScreen/utils"
import eventListener from "../../../lib/eventListener"
import { navigationAnimation } from "../../../lib/state"
import striptags from "striptags"
import { useMMKVNumber } from "react-native-mmkv"

const NoteActionSheet = memo(({ navigation }: { navigation: NavigationContainerRef<ReactNavigation.RootParamList> }) => {
	const darkMode = useDarkMode()
	const insets = useSafeAreaInsets()
	const lang = useLang()
	const [selectedNote, setSelectedNote] = useState<Note | undefined>(undefined)
	const [userId] = useMMKVNumber("userId", storage)

	const userHasWritePermissions = useMemo(() => {
		if (!selectedNote) {
			return false
		}

		return selectedNote.participants.filter(participant => participant.userId === userId && participant.permissionsWrite).length > 0
	}, [selectedNote, userId])

	const refresh = useCallback(async () => {
		const notesAndTags = await fetchNotesAndTags(true)

		eventListener.emit("notesUpdate", notesAndTags.notes)
		eventListener.emit("refreshNotes")
	}, [])

	const trash = useCallback(async () => {
		if (!selectedNote) {
			return
		}

		showFullScreenLoadingModal()

		try {
			await trashNote(selectedNote.uuid)
			await refresh()
		} catch (e) {
			console.error(e)

			showToast({ message: e.toString() })
		} finally {
			hideFullScreenLoadingModal()
			hideAllActionSheets()
		}
	}, [selectedNote])

	const restore = useCallback(async () => {
		if (!selectedNote) {
			return
		}

		showFullScreenLoadingModal()

		try {
			await restoreNote(selectedNote.uuid)
			await refresh()
		} catch (e) {
			console.error(e)

			showToast({ message: e.toString() })
		} finally {
			hideFullScreenLoadingModal()
			hideAllActionSheets()
		}
	}, [selectedNote])

	const deletePermanently = useCallback(async () => {
		if (!selectedNote) {
			return
		}

		showFullScreenLoadingModal()

		try {
			await deleteNote(selectedNote.uuid)
			await refresh()
		} catch (e) {
			console.error(e)

			showToast({ message: e.toString() })
		} finally {
			hideFullScreenLoadingModal()
			hideAllActionSheets()
		}
	}, [selectedNote])

	const archive = useCallback(async () => {
		if (!selectedNote) {
			return
		}

		showFullScreenLoadingModal()

		try {
			await archiveNote(selectedNote.uuid)
			await refresh()
		} catch (e) {
			console.error(e)

			showToast({ message: e.toString() })
		} finally {
			hideFullScreenLoadingModal()
			hideAllActionSheets()
		}
	}, [selectedNote])

	const favorite = useCallback(
		async (fav: boolean) => {
			if (!selectedNote) {
				return
			}

			showFullScreenLoadingModal()

			try {
				await noteFavorite(selectedNote.uuid, fav)
				await refresh()
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

	const pin = useCallback(
		async (p: boolean) => {
			if (!selectedNote) {
				return
			}

			showFullScreenLoadingModal()

			try {
				await notePinned(selectedNote.uuid, p)
				await refresh()
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

	const duplicate = useCallback(async () => {
		if (!selectedNote) {
			return
		}

		showFullScreenLoadingModal()

		try {
			const key = await generateRandomString(32)
			const publicKey = storage.getString("publicKey")
			const masterKeys = getMasterKeys()
			const metadata = await encryptMetadata(JSON.stringify({ key }), masterKeys[masterKeys.length - 1])
			const ownerMetadata = await encryptMetadataPublicKey(JSON.stringify({ key }), publicKey)
			const title = await encryptNoteTitle(selectedNote.title, key)
			const uuid = await global.nodeThread.uuidv4()

			await createNote({ uuid, metadata, title })
			await noteParticipantsAdd({ uuid, metadata: ownerMetadata, contactUUID: "owner", permissionsWrite: true })

			const contentRes = await fetchNoteContent(selectedNote, true)
			const preview = createNotePreviewFromContentText(contentRes.content, selectedNote.type)
			const contentEncrypted = await encryptNoteContent(contentRes.content, key)
			const previewEncrypted = await encryptNotePreview(preview, key)

			await noteChangeType({ uuid, type: selectedNote.type, content: contentEncrypted, preview: previewEncrypted })
			await editNoteContent({
				uuid,
				preview: previewEncrypted,
				content: contentEncrypted,
				type: selectedNote.type
			})

			const notesAndTags = await fetchNotesAndTags(true)

			eventListener.emit("notesUpdate", notesAndTags.notes)
			eventListener.emit("refreshNotes")

			const note = notesAndTags.notes.filter(note => note.uuid === uuid)

			if (note.length > 0) {
				await navigationAnimation({ enable: true })

				navigation.dispatch(
					StackActions.push("NoteScreen", {
						note: note[0]
					})
				)
			}
		} catch (e) {
			console.error(e)

			showToast({ message: e.toString() })
		} finally {
			hideFullScreenLoadingModal()
			hideAllActionSheets()
		}
	}, [selectedNote])

	const exportNote = useCallback(async () => {
		if (!selectedNote) {
			return
		}

		showFullScreenLoadingModal()

		try {
			const contentRes = await fetchNoteContent(selectedNote, true)
			let content = contentRes.content

			if (content.length === 0) {
				return
			}

			const ext = getFileExt(selectedNote.title)

			if (selectedNote.type === "rich") {
				content = striptags(content.split("<p><br></p>").join("\n"))
			}

			if (selectedNote.type === "checklist") {
				let list: string[] = []
				const ex = content
					.split('<ul data-checked="false">')
					.join("")
					.split('<ul data-checked="true">')
					.join("")
					.split("\n")
					.join("")
					.split("<li>")

				for (const listPoint of ex) {
					const listPointEx = listPoint.split("</li>")

					if (listPointEx[0].trim().length > 0) {
						list.push(listPointEx[0].trim())
					}
				}

				content = list.join("\n")
			}

			if (ext.length === 0) {
				//downloadObjectAsTextWithExt(content, selectedNote.title.slice(0, 64), ext.length === 0 ? ".txt" : ext)
			} else {
				//downloadObjectAsTextWithoutExt(content, selectedNote.title.slice(0, 64))
			}

			// @TODO show file share prompt
		} catch (e) {
			console.error(e)

			showToast({ message: e.toString() })
		} finally {
			hideFullScreenLoadingModal()
			hideAllActionSheets()
		}
	}, [selectedNote])

	const tagNote = useCallback(
		async (tag: NoteTag) => {
			if (!selectedNote) {
				return
			}

			showFullScreenLoadingModal()

			try {
				const included = selectedNote.tags.map(t => t.uuid).includes(tag.uuid)

				await (included ? notesUntag(selectedNote.uuid, tag.uuid) : notesTag(selectedNote.uuid, tag.uuid))
				await refresh()
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
		const openNoteActionSheetListener = eventListener.on("openNoteActionSheet", (note: Note) => {
			setSelectedNote(note)

			SheetManager.show("NoteActionSheet")
		})

		return () => {
			openNoteActionSheetListener.remove()
		}
	}, [])

	return (
		<ActionSheet
			id="NoteActionSheet"
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
				<ActionSheetIndicator />
				<View
					style={{
						height: 15
					}}
				/>
				{selectedNote && (
					<>
						{userHasWritePermissions && (
							<ActionButton
								onPress={() => favorite(false)}
								icon="time-outline"
								text={i18n(lang, "history")}
							/>
						)}
						{selectedNote.ownerId === userId && (
							<ActionButton
								onPress={async () => {
									await hideAllActionSheets()

									eventListener.emit("openNoteParticipantsActionSheet", selectedNote)
								}}
								icon="people-outline"
								text={i18n(lang, "participants")}
							/>
						)}
						{userHasWritePermissions && (
							<ActionButton
								onPress={async () => {
									await hideAllActionSheets()

									eventListener.emit("openNoteChangeTypeActionSheet", selectedNote)
								}}
								icon="build-outline"
								text={i18n(lang, "changeType")}
							/>
						)}
						{selectedNote.pinned ? (
							<ActionButton
								onPress={() => pin(false)}
								icon={
									<MaterialCommunityIcons
										name="pin-outline"
										size={24}
										color={getColor(darkMode, "textSecondary")}
									/>
								}
								text={i18n(lang, "unpin")}
							/>
						) : (
							<ActionButton
								onPress={() => pin(true)}
								icon={
									<MaterialCommunityIcons
										name="pin-outline"
										size={24}
										color={getColor(darkMode, "textSecondary")}
									/>
								}
								text={i18n(lang, "pin")}
							/>
						)}
						{selectedNote.favorite ? (
							<ActionButton
								onPress={() => favorite(false)}
								icon="heart-outline"
								text={i18n(lang, "unfavorite")}
							/>
						) : (
							<ActionButton
								onPress={() => favorite(true)}
								icon="heart-outline"
								text={i18n(lang, "favorite")}
							/>
						)}
						<ActionButton
							onPress={duplicate}
							icon="copy-outline"
							text={i18n(lang, "duplicate")}
						/>
						{userId === selectedNote.ownerId && (
							<>
								{!selectedNote.archive && !selectedNote.trash && (
									<ActionButton
										onPress={archive}
										icon="archive-outline"
										text={i18n(lang, "archive")}
									/>
								)}
								{(selectedNote.trash || selectedNote.archive) && (
									<ActionButton
										onPress={restore}
										icon="refresh-outline"
										text={selectedNote.trash ? i18n(lang, "restore") : i18n(lang, "archiveRestore")}
									/>
								)}
								{!selectedNote.trash && (
									<ActionButton
										onPress={trash}
										icon={
											<Ionicon
												name="trash-outline"
												size={22}
												color={getColor(darkMode, "red")}
											/>
										}
										text={i18n(lang, "trash")}
										textColor={getColor(darkMode, "red")}
									/>
								)}
								{selectedNote.trash && (
									<>
										<ActionButton
											onPress={deletePermanently}
											icon={
												<Ionicon
													name="trash-outline"
													size={22}
													color={getColor(darkMode, "red")}
												/>
											}
											text={i18n(lang, "deletePermanently")}
											textColor={getColor(darkMode, "red")}
										/>
									</>
								)}
							</>
						)}
					</>
				)}
			</View>
		</ActionSheet>
	)
})

export default NoteActionSheet
