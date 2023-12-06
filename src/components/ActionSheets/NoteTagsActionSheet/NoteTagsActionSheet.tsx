import React, { memo, useCallback, useEffect, useState } from "react"
import { View, Platform, Text, TouchableOpacity } from "react-native"
import ActionSheet, { SheetManager } from "react-native-actions-sheet"
import useLang from "../../../lib/hooks/useLang"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { i18n } from "../../../i18n"
import { getColor } from "../../../style/colors"
import { ActionButton, hideAllActionSheets } from "../ActionSheets"
import useDarkMode from "../../../lib/hooks/useDarkMode"
import { Note, NoteTag, notesTag, notesUntag, notesTagsFavorite } from "../../../lib/api"
import { showToast } from "../../../components/Toasts"
import {
	showFullScreenLoadingModal,
	hideFullScreenLoadingModal
} from "../../../components/Modals/FullscreenLoadingModal/FullscreenLoadingModal"
import { fetchNotesAndTags } from "../../../screens/NotesScreen/utils"
import eventListener from "../../../lib/eventListener"
import useNetworkInfo from "../../../lib/services/isOnline/useNetworkInfo"
import Ionicon from "@expo/vector-icons/Ionicons"

const NoteTagsActionSheet = memo(() => {
	const darkMode = useDarkMode()
	const insets = useSafeAreaInsets()
	const lang = useLang()
	const [selectedNote, setSelectedNote] = useState<Note | undefined>(undefined)
	const networkInfo = useNetworkInfo()
	const [tags, setTags] = useState<NoteTag[]>([])

	const refresh = useCallback(async () => {
		const notesAndTags = await fetchNotesAndTags(true)

		eventListener.emit("notesUpdate", notesAndTags.notes)
		eventListener.emit("notesTagsUpdate", notesAndTags.tags)
		eventListener.emit("refreshNotes")
	}, [])

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

				setSelectedNote(prev => ({
					...prev,
					tags: prev.tags.map(t => t.uuid).includes(tag.uuid)
						? prev.tags.filter(t => t.uuid !== tag.uuid)
						: [
								...prev.tags,
								...[
									{
										uuid: tag.uuid,
										name: tag.name,
										favorite: tag.favorite,
										editedTimestamp: tag.editedTimestamp,
										createdTimestamp: tag.createdTimestamp
									}
								]
						  ]
				}))
			} catch (e) {
				console.error(e)

				showToast({ message: e.toString() })
			} finally {
				hideFullScreenLoadingModal()
			}
		},
		[selectedNote]
	)

	const favoriteTag = useCallback(
		async (tag: NoteTag, fav: boolean) => {
			showFullScreenLoadingModal()

			try {
				await notesTagsFavorite(tag.uuid, fav)
				await refresh()

				setTags(prev => prev.map(t => (t.uuid === tag.uuid ? { ...t, favorite: fav } : t)))
			} catch (e) {
				console.error(e)

				showToast({ message: e.toString() })
			} finally {
				hideFullScreenLoadingModal()
			}
		},
		[selectedNote]
	)

	useEffect(() => {
		const openNoteTagsActionSheetListener = eventListener.on(
			"openNoteTagsActionSheet",
			({ note, tags }: { note: Note | undefined; tags: NoteTag[] }) => {
				setSelectedNote(note)
				setTags(tags)

				SheetManager.show("NoteTagsActionSheet")
			}
		)

		return () => {
			openNoteTagsActionSheetListener.remove()
		}
	}, [])

	return (
		<ActionSheet
			id="NoteTagsActionSheet"
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
						height: 15
					}}
				/>
				{networkInfo.online ? (
					<View
						style={{
							width: "100%",
							height: "auto",
							flexDirection: "row",
							flexWrap: "wrap",
							paddingLeft: 15,
							paddingRight: 15
						}}
					>
						{tags.map(tag => {
							const selected = !selectedNote ? false : selectedNote.tags.map(t => t.uuid).includes(tag.uuid)

							return (
								<TouchableOpacity
									key={tag.uuid}
									style={{
										backgroundColor: getColor(darkMode, "backgroundTertiary"),
										paddingLeft: 6,
										paddingRight: 6,
										paddingTop: 3,
										paddingBottom: 3,
										justifyContent: "center",
										alignItems: "center",
										flexDirection: "row",
										borderRadius: 5,
										marginRight: 5,
										marginTop: 5,
										height: 28
									}}
									onPress={async () => {
										if (!networkInfo.online) {
											return
										}

										if (!selectedNote) {
											await hideAllActionSheets()

											eventListener.emit("openNoteTagDialog", tag)

											return
										}

										tagNote(tag)
									}}
									onLongPress={() => {
										if (selectedNote || !networkInfo.online) {
											return
										}

										favoriteTag(tag, !tag.favorite).catch(console.error)
									}}
								>
									{!selectedNote && tag.favorite && (
										<Ionicon
											name={darkMode ? "heart" : "heart-outline"}
											size={15}
											color={getColor(darkMode, "textPrimary")}
											style={{
												flexShrink: 0,
												marginRight: 5
											}}
										/>
									)}
									<Text
										style={{
											color: getColor(darkMode, "purple"),
											fontSize: 16,
											fontWeight: selected ? "bold" : "normal"
										}}
									>
										#
									</Text>
									<Text
										style={{
											color: !selectedNote
												? getColor(darkMode, "textPrimary")
												: selected
												? getColor(darkMode, "textPrimary")
												: getColor(darkMode, "textSecondary"),
											marginLeft: 5,
											fontSize: 16,
											fontWeight: selected ? "bold" : "normal"
										}}
									>
										{tag.name}
									</Text>
								</TouchableOpacity>
							)
						})}
					</View>
				) : (
					<ActionButton
						onPress={() => hideAllActionSheets()}
						icon="cloud-offline-outline"
						text={i18n(lang, "deviceOffline")}
					/>
				)}
			</View>
			<View
				style={{
					height: 15
				}}
			/>
		</ActionSheet>
	)
})

export default NoteTagsActionSheet
