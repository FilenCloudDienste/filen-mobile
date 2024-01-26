import React, { memo, useEffect, useState, useCallback } from "react"
import { View } from "react-native"
import ActionSheet from "react-native-actions-sheet"
import useLang from "../../../lib/hooks/useLang"
import { i18n } from "../../../i18n"
import { getColor } from "../../../style/colors"
import { ActionButton, hideAllActionSheets } from "../ActionSheets"
import useDarkMode from "../../../lib/hooks/useDarkMode"
import Ionicon from "@expo/vector-icons/Ionicons"
import { ChatConversation, chatMute } from "../../../lib/api"
import storage from "../../../lib/storage"
import eventListener from "../../../lib/eventListener"
import { useMMKVNumber } from "react-native-mmkv"
import { SheetManager } from "react-native-actions-sheet"
import useDimensions from "../../../lib/hooks/useDimensions"
import * as Clipboard from "expo-clipboard"
import {
	showFullScreenLoadingModal,
	hideFullScreenLoadingModal
} from "../../../components/Modals/FullscreenLoadingModal/FullscreenLoadingModal"
import { showToast } from "../../../components/Toasts"

const ChatConversationActionSheet = memo(() => {
	const darkMode = useDarkMode()
	const dimensions = useDimensions()
	const lang = useLang()
	const [userId] = useMMKVNumber("userId", storage)
	const [selectedConversation, setSelectedConversation] = useState<ChatConversation | undefined>(undefined)

	const muteConvo = useCallback(
		async (mute: boolean) => {
			if (!selectedConversation) {
				return
			}

			await hideAllActionSheets()

			showFullScreenLoadingModal()

			try {
				await chatMute(selectedConversation.uuid, mute)

				setSelectedConversation(prev => ({ ...prev, muted: mute }))

				eventListener.emit("updateChatConversations")
			} catch (e) {
				console.error(e)

				showToast({ message: e.toString() })
			} finally {
				hideFullScreenLoadingModal()
			}
		},
		[selectedConversation]
	)

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
									onPress={async () => {
										await hideAllActionSheets()

										eventListener.emit("openConfirmDeleteChatDialog", selectedConversation)
									}}
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
									onPress={async () => {
										await hideAllActionSheets()

										eventListener.emit("openConfirmLeaveChatDialog", selectedConversation)
									}}
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
							onPress={() => muteConvo(!selectedConversation.muted)}
							icon={selectedConversation.muted ? "volume-high-outline" : "volume-mute-outline"}
							text={selectedConversation.muted ? i18n(lang, "unmute") : i18n(lang, "mute")}
						/>
						<ActionButton
							onPress={async () => {
								await hideAllActionSheets()

								Clipboard.setStringAsync(selectedConversation.uuid).catch(console.error)
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
