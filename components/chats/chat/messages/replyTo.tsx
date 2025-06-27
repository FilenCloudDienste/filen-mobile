import { memo, useMemo, useCallback } from "react"
import { Text } from "@/components/nativewindui/Text"
import { type ChatMessage } from "@filen/sdk/dist/types/api/v3/chat/messages"
import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import { contactName } from "@/lib/utils"
import { View, ScrollView, type GestureResponderEvent } from "react-native"
import Avatar from "@/components/avatar"
import { ReplacedMessageContentInline } from "./replace"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useColorScheme } from "@/lib/useColorScheme"
import { Button } from "@/components/nativewindui/Button"

const avatarStyle = {
	width: 14,
	height: 14
}

export const ReplyTo = memo(({ message, chat }: { message: ChatMessage; chat: ChatConversation }) => {
	const { colors } = useColorScheme()

	const participant = useMemo(() => {
		if (!message.replyTo || !message.replyTo.uuid || message.replyTo.uuid.length === 0) {
			return null
		}

		return chat.participants.find(p => p.userId === message.replyTo.senderId) ?? null
	}, [message.replyTo, chat.participants])

	const onPress = useCallback((e: GestureResponderEvent) => {
		e.preventDefault()
		e.stopPropagation()
	}, [])

	const avatarSource = useMemo(() => {
		return participant?.avatar?.startsWith("https")
			? {
					uri: participant.avatar
			  }
			: {
					uri: "avatar_fallback"
			  }
	}, [participant?.avatar])

	const messageAdjusted = useMemo(() => {
		return {
			...message,
			message: message.replyTo.message
		}
	}, [message])

	if (!participant) {
		return null
	}

	return (
		<View className="flex-1 flex-row items-center shrink-0 h-[18px]">
			<Button
				variant="plain"
				size="none"
				className="gap-1 pl-4 active:opacity-70"
				android_ripple={null}
				onPress={onPress}
			>
				<Ionicons
					name="return-up-forward-outline"
					size={24}
					color={colors.grey}
					className="shrink-0 pr-1"
				/>
				<Avatar
					source={avatarSource}
					style={avatarStyle}
					className="shrink-0"
				/>
				<Text
					variant="caption1"
					className="text-muted-foreground pl-0.5 text-xs font-normal shrink-0"
				>
					@{contactName(participant.email, participant.nickName)}:
				</Text>
				<ScrollView
					horizontal={true}
					scrollEnabled={false}
					showsHorizontalScrollIndicator={false}
					showsVerticalScrollIndicator={false}
				>
					<ReplacedMessageContentInline
						chat={chat}
						message={messageAdjusted}
						textClassName="text-xs font-normal text-muted-foreground"
					/>
				</ScrollView>
			</Button>
		</View>
	)
})

ReplyTo.displayName = "ReplyTo"

export default ReplyTo
