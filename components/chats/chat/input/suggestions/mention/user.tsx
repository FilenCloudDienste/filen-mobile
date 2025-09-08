import { memo, useCallback, useMemo } from "react"
import { Button } from "@/components/nativewindui/Button"
import { Text } from "@/components/nativewindui/Text"
import { type ChatConversation, type ChatConversationParticipant } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import { useMMKVString } from "react-native-mmkv"
import mmkvInstance from "@/lib/mmkv"
import { useChatsStore } from "@/stores/chats.store"
import { findClosestIndexString, contactName } from "@/lib/utils"
import Avatar from "@/components/avatar"
import { View } from "react-native"
import { useShallow } from "zustand/shallow"
import assets from "@/lib/assets"

export const User = memo(({ user, chat }: { user: ChatConversationParticipant; chat: ChatConversation }) => {
	const [value, setValue] = useMMKVString(`chatInputValue:${chat.uuid}`, mmkvInstance)
	const resetSuggestions = useChatsStore(useShallow(state => state.resetSuggestions))

	const reset = useCallback(() => {
		resetSuggestions(chat.uuid)
	}, [resetSuggestions, chat.uuid])

	const onPress = useCallback(() => {
		if (!value) {
			return
		}

		const closestIndex = findClosestIndexString(value, "@", value.length)

		if (closestIndex === -1) {
			return
		}

		const replacedMessage = value.slice(0, closestIndex) + `@${user.email} `

		if (replacedMessage.trim().length === 0) {
			return
		}

		setValue(replacedMessage)
		reset()
	}, [user.email, reset, setValue, value])

	const source = useMemo(() => {
		return user.avatar && user.avatar.startsWith("https://")
			? {
					uri: user.avatar
			  }
			: {
					uri: assets.uri.images.avatar_fallback()
			  }
	}, [user.avatar])

	const style = useMemo(() => {
		return {
			width: 20,
			height: 20
		}
	}, [])

	return (
		<Button
			variant="plain"
			size="none"
			onPress={onPress}
			className="flex-1 flex-row items-center justify-start px-4 py-1.5"
		>
			<View className="flex-row items-center justify-between w-full gap-4">
				<View className="flex-row items-center gap-2 shrink">
					<Avatar
						source={source}
						style={style}
						className="shrink-0"
					/>
					<Text
						className="text-foreground text-sm shrink"
						numberOfLines={1}
						ellipsizeMode="middle"
					>
						{contactName(user.email, user.nickName)}
					</Text>
				</View>
				<Text
					className="text-muted-foreground text-sm shrink"
					numberOfLines={1}
					ellipsizeMode="middle"
				>
					{user.email}
				</Text>
			</View>
		</Button>
	)
})

User.displayName = "User"

export default User
