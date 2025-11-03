import { memo, useEffect, useMemo, useState, useRef } from "react"
import { Text } from "@/components/nativewindui/Text"
import type { ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import type { SocketChatTyping } from "@filen/sdk/dist/types/socket"
import { contactName, fastLocaleCompare } from "@/lib/utils"
import useSocket from "@/hooks/useSocket"
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated"
import { t } from "@/lib/i18n"

export const Typing = memo(({ chat }: { chat: ChatConversation }) => {
	const [usersTyping, setUsersTyping] = useState<SocketChatTyping[]>([])
	const timeoutUserEventRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({})
	const { events: socketEvents } = useSocket()

	const usersTypingSorted = useMemo(() => {
		return usersTyping.sort((a, b) =>
			fastLocaleCompare(contactName(a.senderEmail, a.senderNickName), contactName(b.senderEmail, b.senderNickName))
		)
	}, [usersTyping])

	const usersTypingText = useMemo(() => {
		return usersTypingSorted.map(user => contactName(user.senderEmail, user.senderNickName)).join(", ")
	}, [usersTypingSorted])

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

	if (usersTypingSorted.length === 0) {
		return null
	}

	return (
		<Animated.View
			entering={FadeInDown}
			exiting={FadeOutDown}
			className="flex-row items-start justify-start px-4 py-1 bg-background flex-1"
			style={{
				borderTopLeftRadius: 6,
				borderTopRightRadius: 6
			}}
		>
			<Text
				variant="footnote"
				className="flex-1"
				numberOfLines={1}
				ellipsizeMode="tail"
			>
				{usersTypingSorted.length > 0
					? t("chats.typing", {
							users: usersTypingText
					  })
					: ""}
			</Text>
		</Animated.View>
	)
})

Typing.displayName = "Typing"

export default Typing
