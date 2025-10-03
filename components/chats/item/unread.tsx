import { memo, useMemo } from "react"
import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import { View } from "react-native"
import { Text } from "@/components/nativewindui/Text"
import useChatUnreadCountQuery from "@/queries/useChatUnreadCount.query"

export const Unread = memo(({ chat }: { chat: ChatConversation }) => {
	const chatUnreadCountQuery = useChatUnreadCountQuery({
		conversation: chat.uuid
	})

	const unreadCount = useMemo(() => {
		if (chatUnreadCountQuery.status !== "success") {
			return 0
		}

		return chatUnreadCountQuery.data
	}, [chatUnreadCountQuery.data, chatUnreadCountQuery.status])

	if (unreadCount === 0 || chat.muted) {
		return null
	}

	return (
		<View className="bg-primary rounded-full w-[20px] h-[20px] items-center flex-row justify-center">
			<Text className="font-normal text-xs">{unreadCount}</Text>
		</View>
	)
})

Unread.displayName = "Unread"

export default Unread
