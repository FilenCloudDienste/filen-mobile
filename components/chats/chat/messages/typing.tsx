import { memo, useEffect, useMemo, useState, useRef } from "react"
import { Text } from "@/components/nativewindui/Text"
import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import { type SocketChatTyping } from "@filen/sdk/dist/types/socket"
import { contactName } from "@/lib/utils"
import useSocket from "@/hooks/useSocket"
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated"

export const Typing = memo(({ chat }: { chat: ChatConversation }) => {
	const [usersTyping, setUsersTyping] = useState<SocketChatTyping[]>([])
	const timeoutUserEventRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({})
	const { events: socketEvents } = useSocket()

	const usersTypingSorted = useMemo(() => {
		return usersTyping.sort((a, b) =>
			contactName(a.senderEmail, a.senderNickName).localeCompare(contactName(b.senderEmail, b.senderNickName))
		)
	}, [usersTyping])

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
					? `${usersTypingSorted.map(user => contactName(user.senderEmail, user.senderNickName)).join(", ")} typing...`
					: ""}
			</Text>
		</Animated.View>
	)
})

Typing.displayName = "Typing"

export default Typing
