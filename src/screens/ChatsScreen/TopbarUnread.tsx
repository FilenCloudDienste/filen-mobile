import { memo, useMemo } from "react"
import { View, Text, TouchableOpacity } from "react-native"
import { getColor } from "../../style"
import { ChatMessage, ChatConversation } from "../../lib/api"
import { i18n } from "../../i18n"
import { Ionicons } from "@expo/vector-icons"

const TopbarUnread = memo(
	({
		darkMode,
		conversation,
		lastFocusTimestamp,
		userId,
		messages,
		setLastFocusTimestamp,
		lang
	}: {
		darkMode: boolean
		conversation: ChatConversation
		messages: ChatMessage[]
		lastFocusTimestamp: Record<string, number> | undefined
		setLastFocusTimestamp: React.Dispatch<React.SetStateAction<Record<string, number> | undefined>>
		lang: string
		userId: number
	}) => {
		const unreadMessages = useMemo(() => {
			if (!lastFocusTimestamp || messages.length === 0 || typeof lastFocusTimestamp[conversation.uuid] !== "number") {
				return 0
			}

			return messages.filter(message => message.sentTimestamp > lastFocusTimestamp[conversation.uuid] && message.senderId !== userId)
				.length
		}, [conversation, lastFocusTimestamp, messages, userId])

		if (unreadMessages <= 0) {
			return null
		}

		return (
			<TouchableOpacity
				style={{
					backgroundColor: getColor(darkMode, "indigo"),
					flexDirection: "row",
					width: "100%",
					height: 30,
					zIndex: 10001,
					justifyContent: "space-between",
					marginTop: 50,
					paddingLeft: 15,
					paddingRight: 15
				}}
				onPress={() =>
					setLastFocusTimestamp(prev => ({
						...prev,
						[conversation.uuid]: Date.now()
					}))
				}
			>
				<View
					style={{
						flexDirection: "row",
						alignItems: "center",
						gap: 5
					}}
				>
					<Text
						style={{
							fontSize: 12,
							color: "white",
							fontWeight: "bold"
						}}
						numberOfLines={1}
					>
						{unreadMessages >= 9 ? "9+" : unreadMessages}
					</Text>
					<Text
						style={{
							fontSize: 12,
							color: "white"
						}}
						numberOfLines={1}
					>
						{i18n(
							lang,
							"chatUnreadMessagesSince",
							false,
							["__DATE__"],
							[new Date((lastFocusTimestamp || {})[conversation.uuid]).toDateString()]
						)}
					</Text>
				</View>
				<View
					style={{
						flexDirection: "row",
						alignItems: "center",
						gap: 5
					}}
				>
					<Text
						style={{
							fontSize: 12,
							color: "white"
						}}
						numberOfLines={1}
					>
						{i18n(lang, "chatMarkAsRead")}
					</Text>
					<Ionicons
						name="checkmark-outline"
						size={14}
						color="white"
						style={{ flexShrink: 0 }}
					/>
				</View>
			</TouchableOpacity>
		)
	}
)

export default TopbarUnread
