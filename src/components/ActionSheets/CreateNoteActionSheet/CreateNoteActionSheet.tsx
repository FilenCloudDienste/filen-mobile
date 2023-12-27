import React, { memo, useCallback } from "react"
import { View, Platform } from "react-native"
import ActionSheet from "react-native-actions-sheet"
import useLang from "../../../lib/hooks/useLang"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { NavigationContainerRef, StackActions } from "@react-navigation/native"
import { i18n } from "../../../i18n"
import { getColor } from "../../../style/colors"
import { ActionButton, ActionSheetIndicator, hideAllActionSheets } from "../ActionSheets"
import useDarkMode from "../../../lib/hooks/useDarkMode"
import Ionicon from "@expo/vector-icons/Ionicons"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { createNote, noteChangeType, noteParticipantsAdd, NoteType } from "../../../lib/api"
import { generateRandomString, simpleDate, getMasterKeys } from "../../../lib/helpers"
import storage from "../../../lib/storage"
import { encryptMetadata, encryptMetadataPublicKey, encryptNoteTitle, encryptNoteContent, encryptNotePreview } from "../../../lib/crypto"
import { showToast } from "../../../components/Toasts"
import {
	showFullScreenLoadingModal,
	hideFullScreenLoadingModal
} from "../../../components/Modals/FullscreenLoadingModal/FullscreenLoadingModal"
import { createNotePreviewFromContentText, fetchNotesAndTags } from "../../../screens/NotesScreen/utils"
import eventListener from "../../../lib/eventListener"
import { navigationAnimation } from "../../../lib/state"

const CreateNoteActionSheet = memo(({ navigation }: { navigation: NavigationContainerRef<ReactNavigation.RootParamList> }) => {
	const darkMode = useDarkMode()
	const insets = useSafeAreaInsets()
	const lang = useLang()

	const openTags = useCallback(async () => {
		showFullScreenLoadingModal()

		try {
			const notesAndTags = await fetchNotesAndTags()

			await hideAllActionSheets()

			eventListener.emit("openNoteTagsActionSheet", { note: undefined, tags: notesAndTags.tags })
		} catch (e) {
			console.error(e)

			showToast({ message: e.toString() })
		} finally {
			hideFullScreenLoadingModal()
		}
	}, [])

	const create = useCallback(async (type: NoteType) => {
		showFullScreenLoadingModal()

		try {
			const key = await generateRandomString(32)
			const publicKey = storage.getString("publicKey")
			const masterKeys = getMasterKeys()
			const metadata = await encryptMetadata(JSON.stringify({ key }), masterKeys[masterKeys.length - 1])
			const ownerMetadata = await encryptMetadataPublicKey(JSON.stringify({ key }), publicKey)
			const title = await encryptNoteTitle(simpleDate(Date.now()), key)
			const uuid = await global.nodeThread.uuidv4()

			await createNote({ uuid, title, metadata })
			await noteParticipantsAdd({ uuid, metadata: ownerMetadata, contactUUID: "owner", permissionsWrite: true })

			if (type !== "text") {
				const preview = createNotePreviewFromContentText("", type)
				const contentEncrypted = await encryptNoteContent("", key)
				const previewEncrypted = await encryptNotePreview(preview, key)

				await noteChangeType({ uuid, type, content: contentEncrypted, preview: previewEncrypted })
			}

			const notesAndTags = await fetchNotesAndTags(true)

			eventListener.emit("notesUpdate", notesAndTags.notes)
			eventListener.emit("refreshNotes")

			const note = notesAndTags.notes.filter(note => note.uuid === uuid)

			if (note.length > 0) {
				await navigationAnimation({ enable: true })

				navigation.dispatch(
					StackActions.push("NoteScreen", {
						note: note[0],
						tags: notesAndTags.tags,
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
			hideAllActionSheets()
		}
	}, [])

	return (
		<ActionSheet
			id="CreateNoteActionSheet"
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
					paddingBottom: insets.bottom + (Platform.OS === "android" ? 25 : 5)
				}}
			>
				<View
					style={{
						height: 5
					}}
				/>
				<ActionButton
					onPress={() => create("text")}
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
					onPress={() => create("rich")}
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
					onPress={() => create("checklist")}
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
					onPress={() => create("md")}
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
					onPress={() => create("code")}
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
				<ActionButton
					onPress={openTags}
					icon={
						<View
							style={{
								paddingLeft: 6
							}}
						>
							<Ionicon
								name="pricetags-outline"
								size={21}
								color={getColor(darkMode, "textSecondary")}
							/>
						</View>
					}
					text={i18n(lang, "noteTags")}
				/>
				<ActionButton
					onPress={async () => {
						await hideAllActionSheets()

						eventListener.emit("openNotesCreateTagDialog")
					}}
					icon={
						<View
							style={{
								paddingLeft: 6
							}}
						>
							<Ionicon
								name="pricetag-outline"
								size={21}
								color={getColor(darkMode, "textSecondary")}
							/>
						</View>
					}
					text={i18n(lang, "createTag")}
				/>
			</View>
		</ActionSheet>
	)
})

export default CreateNoteActionSheet
