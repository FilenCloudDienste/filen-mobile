import React, { memo, useCallback, useEffect, useState } from "react"
import { View, Platform } from "react-native"
import ActionSheet from "react-native-actions-sheet"
import useLang from "../../../lib/hooks/useLang"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { i18n } from "../../../i18n"
import { getColor } from "../../../style/colors"
import { ActionButton, hideAllActionSheets } from "../ActionSheets"
import useDarkMode from "../../../lib/hooks/useDarkMode"
import Ionicon from "@expo/vector-icons/Ionicons"
import { chatConversationsParticipantsRemove, ChatConversation, ChatConversationParticipant } from "../../../lib/api"
import storage from "../../../lib/storage"
import {
	showFullScreenLoadingModal,
	hideFullScreenLoadingModal
} from "../../../components/Modals/FullscreenLoadingModal/FullscreenLoadingModal"
import eventListener from "../../../lib/eventListener"
import { useMMKVNumber } from "react-native-mmkv"
import { SheetManager } from "react-native-actions-sheet"

const ChatParticipantActionSheet = memo(() => {
	const darkMode = useDarkMode()
	const insets = useSafeAreaInsets()
	const lang = useLang()
	const [userId] = useMMKVNumber("userId", storage)
	const [selectedConversation, setSelectedConversation] = useState<ChatConversation | undefined>(undefined)
	const [selectedParticipant, setSelectedParticipant] = useState<ChatConversationParticipant | undefined>(undefined)

	const remove = useCallback(async () => {
		if (!selectedConversation || !selectedParticipant) {
			return
		}

		showFullScreenLoadingModal()

		await hideAllActionSheets()

		try {
			await chatConversationsParticipantsRemove(selectedConversation.uuid, selectedParticipant.userId)

			eventListener.emit("chatConversationParticipantRemoved", {
				uuid: selectedConversation.uuid,
				userId: selectedParticipant.userId
			})
		} catch (e) {
			console.error(e)
		} finally {
			hideFullScreenLoadingModal()
		}
	}, [selectedConversation, selectedParticipant])

	useEffect(() => {
		const openChatParticipantActionSheetListener = eventListener.on(
			"openChatParticipantActionSheet",
			({ conversation, participant }: { conversation: ChatConversation; participant: ChatConversationParticipant }) => {
				setSelectedParticipant(participant)
				setSelectedConversation(conversation)

				SheetManager.show("ChatParticipantActionSheet")
			}
		)

		return () => {
			openChatParticipantActionSheetListener.remove()
		}
	}, [])

	return (
		<ActionSheet
			id="ChatParticipantActionSheet"
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
				{selectedConversation && selectedParticipant && userId === selectedConversation.ownerId && (
					<>
						<ActionButton
							onPress={() => remove()}
							textColor={getColor(darkMode, "red")}
							icon={
								<Ionicon
									name="remove-circle-outline"
									size={22}
									color={getColor(darkMode, "red")}
								/>
							}
							text={i18n(lang, "remove")}
						/>
					</>
				)}
			</View>
		</ActionSheet>
	)
})

export default ChatParticipantActionSheet
