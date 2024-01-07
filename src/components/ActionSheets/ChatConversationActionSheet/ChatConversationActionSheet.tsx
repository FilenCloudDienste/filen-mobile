import React, { memo, useCallback, useEffect, useState } from "react"
import { View, Clipboard } from "react-native"
import ActionSheet from "react-native-actions-sheet"
import useLang from "../../../lib/hooks/useLang"
import { i18n } from "../../../i18n"
import { getColor } from "../../../style/colors"
import { ActionButton, hideAllActionSheets } from "../ActionSheets"
import useDarkMode from "../../../lib/hooks/useDarkMode"
import Ionicon from "@expo/vector-icons/Ionicons"
import { ChatConversation, chatDelete, chatConversationsLeave } from "../../../lib/api"
import storage from "../../../lib/storage"
import {
	showFullScreenLoadingModal,
	hideFullScreenLoadingModal
} from "../../../components/Modals/FullscreenLoadingModal/FullscreenLoadingModal"
import eventListener from "../../../lib/eventListener"
import { useMMKVNumber } from "react-native-mmkv"
import { SheetManager } from "react-native-actions-sheet"
import useDimensions from "../../../lib/hooks/useDimensions"

const ChatConversationActionSheet = memo(() => {
	const darkMode = useDarkMode()
	const dimensions = useDimensions()
	const lang = useLang()
	const [userId] = useMMKVNumber("userId", storage)
	const [selectedConversation, setSelectedConversation] = useState<ChatConversation | undefined>(undefined)

	const del = useCallback(async () => {
		if (!selectedConversation || selectedConversation.ownerId !== userId) {
			return
		}

		showFullScreenLoadingModal()

		await hideAllActionSheets()

		try {
			await chatDelete(selectedConversation.uuid)

			eventListener.emit("chatConversationDeleted", selectedConversation.uuid)
		} catch (e) {
			console.error(e)
		} finally {
			hideFullScreenLoadingModal()
		}
	}, [selectedConversation, userId])

	const leave = useCallback(async () => {
		if (!selectedConversation || selectedConversation.ownerId === userId) {
			return
		}

		showFullScreenLoadingModal()

		await hideAllActionSheets()

		try {
			await chatConversationsLeave(selectedConversation.uuid)

			eventListener.emit("chatConversationLeft", selectedConversation.uuid)
		} catch (e) {
			console.error(e)
		} finally {
			hideFullScreenLoadingModal()
		}
	}, [selectedConversation, userId])

	useEffect(() => {
		const openChatConversationActionSheetListener = eventListener.on(
			"openChatConversationActionSheet",
			(conversation: ChatConversation) => {
				setSelectedConversation(conversation)

				SheetManager.show("ChatConversationActionSheet")
			}
		)

		return () => {
			openChatConversationActionSheetListener.remove()
		}
	}, [])

	return (
		<ActionSheet
			id="ChatConversationActionSheet"
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
				{selectedConversation && (
					<>
						{selectedConversation.ownerId === userId && (
							<>
								<ActionButton
									onPress={async () => {
										await hideAllActionSheets()

										eventListener.emit("openChatConversationNameDialog", selectedConversation)
									}}
									icon="create-outline"
									text={i18n(lang, "editName")}
								/>
								<ActionButton
									onPress={() => del()}
									textColor={getColor(darkMode, "red")}
									icon={
										<Ionicon
											name="close-circle-outline"
											size={22}
											color={getColor(darkMode, "red")}
										/>
									}
									text={i18n(lang, "delete")}
								/>
							</>
						)}
						{selectedConversation.ownerId !== userId && (
							<>
								<ActionButton
									onPress={() => leave()}
									textColor={getColor(darkMode, "red")}
									icon={
										<Ionicon
											name="remove-circle-outline"
											size={22}
											color={getColor(darkMode, "red")}
										/>
									}
									text={i18n(lang, "leave")}
								/>
							</>
						)}
						<ActionButton
							onPress={async () => {
								await hideAllActionSheets()

								Clipboard.setString(selectedConversation.uuid)
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

export default ChatConversationActionSheet
