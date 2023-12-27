import React, { memo, useCallback, useEffect, useState } from "react"
import { View, Platform, Clipboard } from "react-native"
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
import { ChatMessage, chatDelete } from "../../../lib/api"
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
import { useMMKVNumber } from "react-native-mmkv"
import { SheetManager } from "react-native-actions-sheet"

const ChatMessageActionSheet = memo(() => {
	const darkMode = useDarkMode()
	const insets = useSafeAreaInsets()
	const lang = useLang()
	const [selectedMessage, setSelectedMessage] = useState<ChatMessage | undefined>(undefined)
	const [userId] = useMMKVNumber("userId", storage)

	const del = useCallback(async () => {
		if (!selectedMessage) {
			return
		}

		showFullScreenLoadingModal()

		await hideAllActionSheets()

		try {
			await chatDelete(selectedMessage.uuid)

			eventListener.emit("chatMessageDelete", selectedMessage.uuid)
		} catch (e) {
			console.error(e)
		} finally {
			hideFullScreenLoadingModal()
		}
	}, [selectedMessage])

	useEffect(() => {
		const openChatMessageActionSheetListener = eventListener.on("openChatMessageActionSheet", (message: ChatMessage) => {
			setSelectedMessage(message)

			SheetManager.show("ChatMessageActionSheet")
		})

		return () => {
			openChatMessageActionSheetListener.remove()
		}
	}, [])

	return (
		<ActionSheet
			id="ChatMessageActionSheet"
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
				{selectedMessage && (
					<>
						<ActionButton
							onPress={async () => {
								await hideAllActionSheets()

								eventListener.emit("replyToChatMessage", selectedMessage)
							}}
							icon="send-outline"
							text={i18n(lang, "reply")}
						/>
						<ActionButton
							onPress={async () => {
								await hideAllActionSheets()

								if (typeof selectedMessage.message === "string" && selectedMessage.message.length > 0) {
									Clipboard.setString(selectedMessage.message)
								}
							}}
							icon="copy-outline"
							text={i18n(lang, "copyText")}
						/>
						{selectedMessage.senderId === userId && (
							<>
								<ActionButton
									onPress={async () => {
										await hideAllActionSheets()

										eventListener.emit("editChatMessage", selectedMessage)
									}}
									icon="text-outline"
									text={i18n(lang, "edit")}
								/>
								<ActionButton
									onPress={() => del()}
									textColor={getColor(darkMode, "red")}
									icon={
										<Ionicon
											name="trash-bin-outline"
											size={22}
											color={getColor(darkMode, "red")}
										/>
									}
									text={i18n(lang, "delete")}
								/>
							</>
						)}
						<ActionButton
							onPress={async () => {
								await hideAllActionSheets()

								Clipboard.setString(selectedMessage.uuid)
							}}
							icon="copy-outline"
							text={i18n(lang, "copyId")}
						/>
					</>
				)}
			</View>
		</ActionSheet>
	)
})

export default ChatMessageActionSheet
