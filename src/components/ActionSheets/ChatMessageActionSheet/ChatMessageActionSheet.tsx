import React, { memo, useEffect, useState } from "react"
import { View, Clipboard } from "react-native"
import ActionSheet from "react-native-actions-sheet"
import useLang from "../../../lib/hooks/useLang"
import { i18n } from "../../../i18n"
import { getColor } from "../../../style/colors"
import { ActionButton, hideAllActionSheets } from "../ActionSheets"
import useDarkMode from "../../../lib/hooks/useDarkMode"
import Ionicon from "@expo/vector-icons/Ionicons"
import { ChatMessage } from "../../../lib/api"
import storage from "../../../lib/storage"
import eventListener from "../../../lib/eventListener"
import { useMMKVNumber } from "react-native-mmkv"
import { SheetManager } from "react-native-actions-sheet"
import useDimensions from "../../../lib/hooks/useDimensions"

const ChatMessageActionSheet = memo(() => {
	const darkMode = useDarkMode()
	const dimensions = useDimensions()
	const lang = useLang()
	const [selectedMessage, setSelectedMessage] = useState<ChatMessage | undefined>(undefined)
	const [userId] = useMMKVNumber("userId", storage)

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
					paddingBottom: dimensions.insets.bottom + dimensions.navigationBarHeight
				}}
			>
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
									onPress={async () => {
										await hideAllActionSheets()

										eventListener.emit("openConfirmDeleteChatMessageDialog", selectedMessage)
									}}
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
