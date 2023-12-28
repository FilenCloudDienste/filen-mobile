import { memo, useState, useRef, useEffect } from "react"
import { getColor } from "../../style"
import { i18n } from "../../i18n"
import { ChatConversationParticipant, ChatConversation } from "../../lib/api"
import eventListener from "../../lib/eventListener"
import { SocketEvent } from "../../lib/services/socket"
import Ionicon from "@expo/vector-icons/Ionicons"
import { getUserNameFromParticipant } from "./utils"
import { View, Text } from "react-native"

export const TYPING_TIMEOUT = 2000
export const TYPING_TIMEOUT_LAG = 30000

const Typing = memo(({ darkMode, lang, conversation }: { darkMode: boolean; lang: string; conversation: ChatConversation }) => {
	const [usersTyping, setUsersTyping] = useState<ChatConversationParticipant[]>([])
	const usersTypingTimeout = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

	useEffect(() => {
		const chatTypingListener = eventListener.on("socketEvent", (event: SocketEvent) => {
			if (event.type === "chatTyping" && conversation.uuid === event.data.conversation) {
				clearTimeout(usersTypingTimeout.current[event.data.senderId])

				if (event.data.type === "down") {
					setUsersTyping(prev =>
						[
							...prev.filter(user => user.userId !== event.data.senderId),
							{
								userId: event.data.senderId,
								email: event.data.senderEmail,
								avatar: event.data.senderAvatar,
								nickName: event.data.senderNickName,
								metadata: "",
								permissionsAdd: false,
								addedTimestamp: 0
							}
						].sort((a, b) => a.email.localeCompare(b.email))
					)

					usersTypingTimeout.current[event.data.senderId] = setTimeout(() => {
						setUsersTyping(prev => prev.filter(user => user.userId !== event.data.senderId))
					}, TYPING_TIMEOUT_LAG)
				} else {
					setUsersTyping(prev => prev.filter(user => user.userId !== event.data.senderId))
				}
			}

			if (event.type === "chatMessageNew" && conversation.uuid === event.data.conversation) {
				clearTimeout(usersTypingTimeout.current[event.data.senderId])

				setUsersTyping(prev => prev.filter(user => user.userId !== event.data.senderId))
			}
		})

		return () => {
			setUsersTyping([])

			for (const key in usersTypingTimeout.current) {
				clearTimeout(usersTypingTimeout.current[key])
			}

			chatTypingListener.remove()
		}
	}, [])

	return (
		<View
			style={{
				flexDirection: "row",
				overflow: "hidden",
				height: 25,
				width: "200%",
				alignItems: "center",
				position: "absolute",
				top: 0,
				marginTop: -20,
				paddingLeft: 15,
				paddingRight: 30,
				opacity: usersTyping.length === 0 ? 0 : 1,
				backgroundColor: usersTyping.length === 0 ? "transparent" : getColor(darkMode, "backgroundSecondary"),
				borderBottomColor: getColor(darkMode, "primaryBorder"),
				borderBottomWidth: usersTyping.length === 0 ? 0 : 0.5
			}}
		>
			{usersTyping.length === 0 ? (
				<Text
					style={{
						fontSize: 11,
						color: "transparent"
					}}
				>
					&nsbp;
				</Text>
			) : (
				<>
					<Ionicon
						color={getColor(darkMode, "textPrimary")}
						size={14}
						name="ellipsis-horizontal-outline"
					/>
					<Text
						style={{
							marginLeft: 5
						}}
						numberOfLines={1}
					>
						<Text
							style={{
								color: getColor(darkMode, "textPrimary"),
								fontSize: 11
							}}
						>
							{usersTyping.map(user => getUserNameFromParticipant(user)).join(", ")}
						</Text>
						<Text
							style={{
								color: getColor(darkMode, "textSecondary"),
								fontSize: 11,
								marginLeft: 3
							}}
						>
							{" " + i18n(lang, "chatIsTyping").toLowerCase() + "..."}
						</Text>
					</Text>
				</>
			)}
		</View>
	)
})

export default Typing
