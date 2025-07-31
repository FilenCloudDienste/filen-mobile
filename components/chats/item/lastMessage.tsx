import { memo, useEffect, useRef, useState, useMemo } from "react"
import { Text } from "@/components/nativewindui/Text"
import { View, ScrollView } from "react-native"
import useSocket from "@/hooks/useSocket"
import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import { type SocketChatTyping } from "@filen/sdk/dist/types/socket"
import { contactName } from "@/lib/utils"
import { ReplacedMessageContentInline } from "../chat/messages/replace"
import { type ChatMessage } from "@filen/sdk/dist/types/api/v3/chat/messages"
import { randomUUID } from "expo-crypto"
import useSDKConfig from "@/hooks/useSDKConfig"
import { useMMKVString } from "react-native-mmkv"
import mmkvInstance from "@/lib/mmkv"
import { useTranslation } from "react-i18next"

export const LastMessage = memo(({ chat }: { chat: ChatConversation }) => {
	const [usersTyping, setUsersTyping] = useState<SocketChatTyping[]>([])
	const timeoutUserEventRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({})
	const { events: socketEvents } = useSocket()
	const [{ userId }] = useSDKConfig()
	const [chatInputValue] = useMMKVString(`chatInputValue:${chat.uuid}`, mmkvInstance)
	const { t } = useTranslation()

	const usersTypingSorted = useMemo(() => {
		return usersTyping.sort((a, b) =>
			contactName(a.senderEmail, a.senderNickName).localeCompare(contactName(b.senderEmail, b.senderNickName))
		)
	}, [usersTyping])

	const usersTypingText = useMemo(() => {
		return usersTypingSorted.map(user => contactName(user.senderEmail, user.senderNickName)).join(", ")
	}, [usersTypingSorted])

	const lastMessageMocked = useMemo(() => {
		return {
			conversation: chat.uuid,
			uuid: chat.lastMessageUUID ?? randomUUID(),
			senderId: chat.lastMessageSender,
			senderEmail: "",
			senderAvatar: null,
			senderNickName: "",
			message: chat.lastMessage ?? "",
			replyTo: {
				uuid: "",
				senderId: 0,
				senderEmail: "",
				senderAvatar: "",
				senderNickName: "",
				message: ""
			},
			embedDisabled: false,
			edited: false,
			editedTimestamp: 0,
			sentTimestamp: 0
		} satisfies ChatMessage
	}, [chat.lastMessage, chat.lastMessageSender, chat.uuid, chat.lastMessageUUID])

	const draftMessageMocked = useMemo(() => {
		return {
			conversation: chat.uuid,
			uuid: chat.lastMessageUUID ?? randomUUID(),
			senderId: chat.lastMessageSender,
			senderEmail: "",
			senderAvatar: null,
			senderNickName: "",
			message: chatInputValue ?? "",
			replyTo: {
				uuid: "",
				senderId: 0,
				senderEmail: "",
				senderAvatar: "",
				senderNickName: "",
				message: ""
			},
			embedDisabled: false,
			edited: false,
			editedTimestamp: 0,
			sentTimestamp: 0
		} satisfies ChatMessage
	}, [chat.lastMessageSender, chat.uuid, chat.lastMessageUUID, chatInputValue])

	const lastMessageSenderName = useMemo(() => {
		if (!chat.lastMessage || chat.lastMessage.length === 0) {
			return null
		}

		const lastMessageUser = chat.participants.find(participant => participant.userId === chat.lastMessageSender)

		if (!lastMessageUser) {
			return null
		}

		return contactName(lastMessageUser.email, lastMessageUser.nickName)
	}, [chat.lastMessage, chat.lastMessageSender, chat.participants])

	const isUndecryptable = useMemo(() => {
		const nameNormalized = chat.name?.toLowerCase().trim() ?? ""
		const lastMessageNormalized = chat.lastMessage?.toLowerCase().trim() ?? ""

		return (
			(nameNormalized.startsWith("cannot_decrypt_") && nameNormalized.endsWith(`_${chat.uuid}`)) ||
			(lastMessageNormalized.startsWith("cannot_decrypt_") && lastMessageNormalized.endsWith(`_${chat.lastMessageUUID}`))
		)
	}, [chat.name, chat.uuid, chat.lastMessage, chat.lastMessageUUID])

	useEffect(() => {
		const socketEventListener = socketEvents.subscribe("socketEvent", e => {
			if (e.type === "chatTyping" && e.data.conversation === chat.uuid) {
				clearTimeout(timeoutUserEventRef.current[e.data.senderId])

				timeoutUserEventRef.current[e.data.senderId] = setTimeout(() => {
					setUsersTyping(prev => prev.filter(u => u.senderId !== e.data.senderId))
				}, 5000)

				if (e.data.type === "down") {
					setUsersTyping(prev => [...prev.filter(u => u.senderId !== e.data.senderId), e.data])
				} else {
					setUsersTyping(prev => prev.filter(u => u.senderId !== e.data.senderId))
				}
			} else if (e.type === "chatMessageNew" && e.data.conversation === chat.uuid) {
				clearTimeout(timeoutUserEventRef.current[e.data.senderId])

				setUsersTyping(prev => prev.filter(u => u.senderId !== e.data.senderId))
			}
		})

		return () => {
			socketEventListener.remove()
		}
	}, [chat.uuid, socketEvents])

	if (isUndecryptable) {
		return (
			<Text
				className="text-muted-foreground text-sm font-normal italic flex-1"
				numberOfLines={1}
				ellipsizeMode="middle"
			>
				{t("chats.item.noMessages")}
			</Text>
		)
	}

	if (chatInputValue && chatInputValue.length > 0 && chatInputValue.trim().length > 0) {
		return (
			<View className="flex-1 items-center flex-row">
				<ScrollView
					horizontal={true}
					scrollEnabled={false}
					showsHorizontalScrollIndicator={false}
					showsVerticalScrollIndicator={false}
				>
					<ReplacedMessageContentInline
						chat={chat}
						message={draftMessageMocked}
						textClassName="text-muted-foreground text-sm font-normal"
						linkClassName="text-muted-foreground text-sm font-normal"
						emojiSize={14}
						prepend={
							<Text
								className="text-sm font-normal shrink-0 pr-1 italic"
								numberOfLines={1}
								ellipsizeMode="middle"
							>
								{t("chats.item.draft")}:
							</Text>
						}
					/>
				</ScrollView>
			</View>
		)
	}

	if (usersTypingSorted.length > 0) {
		return (
			<Text
				className="text-muted-foreground text-sm font-normal italic flex-1"
				numberOfLines={1}
				ellipsizeMode="middle"
			>
				{t("chats.typing", {
					users: usersTypingText
				})}
			</Text>
		)
	}

	if (!lastMessageSenderName) {
		return (
			<Text
				className="text-muted-foreground text-sm font-normal italic flex-1"
				numberOfLines={1}
				ellipsizeMode="middle"
			>
				{t("chats.item.noMessages")}
			</Text>
		)
	}

	return (
		<View className="flex-1 items-center flex-row">
			<ScrollView
				horizontal={true}
				scrollEnabled={false}
				showsHorizontalScrollIndicator={false}
				showsVerticalScrollIndicator={false}
			>
				<ReplacedMessageContentInline
					chat={chat}
					message={lastMessageMocked}
					textClassName="text-muted-foreground text-sm font-normal"
					linkClassName="text-muted-foreground text-sm font-normal"
					emojiSize={14}
					prepend={
						<Text
							className="text-muted-foreground text-sm font-normal shrink-0 pr-1"
							numberOfLines={1}
							ellipsizeMode="middle"
						>
							{lastMessageMocked.senderId === userId ? t("chats.item.you") : lastMessageSenderName}:
						</Text>
					}
				/>
			</ScrollView>
		</View>
	)
})

LastMessage.displayName = "LastMessage"

export default LastMessage
