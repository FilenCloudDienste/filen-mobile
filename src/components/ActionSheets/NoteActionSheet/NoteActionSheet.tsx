import React, { memo, useCallback, useEffect, useState, useMemo } from "react"
import { View } from "react-native"
import ActionSheet, { SheetManager } from "react-native-actions-sheet"
import useLang from "../../../lib/hooks/useLang"
import useDimensions from "../../../lib/hooks/useDimensions"
import { NavigationContainerRef, StackActions, NavigationContainerRefWithCurrent } from "@react-navigation/native"
import { i18n } from "../../../i18n"
import { getColor } from "../../../style/colors"
import { ActionButton, hideAllActionSheets } from "../ActionSheets"
import useDarkMode from "../../../lib/hooks/useDarkMode"
import Ionicon from "@expo/vector-icons/Ionicons"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import {
	createNote,
	noteChangeType,
	noteParticipantsAdd,
	Note,
	trashNote,
	restoreNote,
	noteFavorite,
	archiveNote,
	notePinned,
	editNoteContent,
	NoteTag,
	noteParticipantsRemove
} from "../../../lib/api"
import { generateRandomString, getMasterKeys, getFileExt, isRouteInStack, isNavReady } from "../../../lib/helpers"
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
import useNetworkInfo from "../../../lib/services/isOnline/useNetworkInfo"
import * as fs from "../../../lib/fs"
import Share from "react-native-share"

const NoteActionSheet = memo(({ navigation }: { navigation: NavigationContainerRef<ReactNavigation.RootParamList> }) => {
	const darkMode = useDarkMode()
	const dimensions = useDimensions()
	const lang = useLang()
	const [selectedNote, setSelectedNote] = useState<Note | undefined>(undefined)
	const [tags, setTags] = useState<NoteTag[]>([])
	const [userId] = useMMKVNumber("userId", storage)
	const networkInfo = useNetworkInfo()

	const isInsideNote = useMemo(() => {
		return (
			selectedNote &&
			isNavReady(navigation as NavigationContainerRefWithCurrent<ReactNavigation.RootParamList>) &&
			isRouteInStack(navigation as NavigationContainerRefWithCurrent<ReactNavigation.RootParamList>, ["NoteScreen"])
		)
	}, [navigation, selectedNote])

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

		await hideAllActionSheets()

		showFullScreenLoadingModal()

		try {
			await trashNote(selectedNote.uuid)
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

	const restore = useCallback(async () => {
		if (!selectedNote) {
			return
		}

		await hideAllActionSheets()

		showFullScreenLoadingModal()

		try {
			await restoreNote(selectedNote.uuid)
			await refresh()
		} catch (e) {
			console.error(e)

			showToast({ message: e.toString() })
		} finally {
			hideFullScreenLoadingModal()
		}
	}, [selectedNote])

	const archive = useCallback(async () => {
		if (!selectedNote) {
			return
		}

		await hideAllActionSheets()

		showFullScreenLoadingModal()

		try {
			await archiveNote(selectedNote.uuid)
			await refresh()
		} catch (e) {
			console.error(e)

			showToast({ message: e.toString() })
		} finally {
			hideFullScreenLoadingModal()
		}
	}, [selectedNote])

	const favorite = useCallback(
		async (fav: boolean) => {
			if (!selectedNote) {
				return
			}

			await hideAllActionSheets()

			showFullScreenLoadingModal()

			try {
				await noteFavorite(selectedNote.uuid, fav)
				await refresh()
			} catch (e) {
				console.error(e)

				showToast({ message: e.toString() })
			} finally {
				hideFullScreenLoadingModal()
			}
		},
		[selectedNote]
	)

	const pin = useCallback(
		async (p: boolean) => {
			if (!selectedNote) {
				return
			}

			await hideAllActionSheets()

			showFullScreenLoadingModal()

			try {
				await notePinned(selectedNote.uuid, p)
				await refresh()
			} catch (e) {
				console.error(e)

				showToast({ message: e.toString() })
			} finally {
				hideFullScreenLoadingModal()
			}
		},
		[selectedNote]
	)

	const duplicate = useCallback(async () => {
		if (!selectedNote) {
			return
		}

		await hideAllActionSheets()

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
						note: note[0],
						tags,
						readOnly: false,
						historyMode: false,
						historyId: ""
					})
				)
			}
		} catch (e) {
			console.error(e)

			showToast({ message: e.toString() })
		} finally {
			hideFullScreenLoadingModal()
		}
	}, [selectedNote])

	const exportNote = useCallback(async () => {
		if (!selectedNote) {
			return
		}

		await hideAllActionSheets()

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

			const fileName = selectedNote.title.slice(0, 64) + (ext.length === 0 ? ".txt" : ext)
			const path = (await fs.getDownloadPath({ type: "temp" })) + fileName
			const stat = await fs.stat(path)

			if (stat.exists) {
				await fs.unlink(path)
			}

			await fs.writeAsString(path, content, {
				encoding: "utf8"
			})

			Share.open({
				title: i18n(lang, "export"),
				url: path,
				failOnCancel: false,
				filename: fileName
			})
				.then(() => {
					fs.unlink(path).catch(console.error)
				})
				.catch(err => {
					console.error(err)

					fs.unlink(path).catch(console.error)
				})
		} catch (e) {
			console.error(e)

			showToast({ message: e.toString() })
		} finally {
			hideFullScreenLoadingModal()
		}
	}, [selectedNote, lang])

	useEffect(() => {
		const openNoteActionSheetListener = eventListener.on("openNoteActionSheet", ({ note, tags }: { note: Note; tags: NoteTag[] }) => {
			setSelectedNote(note)
			setTags(tags)

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
				backgroundColor: getColor(darkMode, "backgroundTertiary")
			}}
		>
			<View
				style={{
					paddingBottom: dimensions.insets.bottom + dimensions.navigationBarHeight
				}}
			>
				{selectedNote && (
					<>
						{networkInfo.online ? (
							<>
								{userHasWritePermissions && (
									<ActionButton
										onPress={async () => {
											await hideAllActionSheets()
											await navigationAnimation({ enable: true })

											navigation.dispatch(
												StackActions.push("NoteHistoryScreen", {
													note: selectedNote
												})
											)
										}}
										icon="time-outline"
										text={i18n(lang, "history")}
									/>
								)}
								{selectedNote.ownerId === userId && (
									<ActionButton
										onPress={async () => {
											await hideAllActionSheets()
											await navigationAnimation({ enable: true })

											navigation.dispatch(
												StackActions.push("NoteParticipantsScreen", {
													note: selectedNote
												})
											)
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
								<ActionButton
									onPress={async () => {
										await hideAllActionSheets()

										eventListener.emit("openNoteTagsActionSheet", {
											note: selectedNote,
											tags
										})
									}}
									icon="pricetags-outline"
									text={i18n(lang, "noteTags")}
								/>
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
								<ActionButton
									onPress={exportNote}
									icon="arrow-down-circle-outline"
									text={i18n(lang, "export")}
								/>
								{userId === selectedNote.ownerId ? (
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
													onPress={async () => {
														await hideAllActionSheets()

														eventListener.emit("openConfirmDeleteNotePermanentlyDialog", {
															note: selectedNote,
															isInsideNote
														})
													}}
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
								) : (
									<ActionButton
										onPress={async () => {
											await hideAllActionSheets()

											eventListener.emit("openConfirmLeaveNoteDialog", selectedNote)
										}}
										icon={
											<Ionicon
												name="exit-outline"
												size={22}
												color={getColor(darkMode, "red")}
												style={{
													marginLeft: 1
												}}
											/>
										}
										text={i18n(lang, "leave")}
										textColor={getColor(darkMode, "red")}
									/>
								)}
							</>
						) : (
							<ActionButton
								onPress={() => hideAllActionSheets()}
								icon="cloud-offline-outline"
								text={i18n(lang, "deviceOffline")}
							/>
						)}
					</>
				)}
			</View>
		</ActionSheet>
	)
})

export default NoteActionSheet
