import { memo, useCallback } from "react"
import { Button } from "@/components/nativewindui/Button"
import { Image } from "expo-image"
import { Text } from "@/components/nativewindui/Text"
import { type CustomEmoji } from "@/components/chats/chat/messages/customEmojis"
import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import { useMMKVString } from "react-native-mmkv"
import mmkvInstance from "@/lib/mmkv"
import { useChatsStore } from "@/stores/chats.store"
import { findClosestIndexString } from "@/lib/utils"
import { View } from "react-native"
import { useShallow } from "zustand/shallow"

export const Emoji = memo(({ emoji, chat }: { emoji: CustomEmoji; chat: ChatConversation }) => {
	const [value, setValue] = useMMKVString(`chatInputValue:${chat.uuid}`, mmkvInstance)
	const resetSuggestions = useChatsStore(useShallow(state => state.resetSuggestions))

	const reset = useCallback(() => {
		resetSuggestions(chat.uuid)
	}, [resetSuggestions, chat.uuid])

	const onPress = useCallback(() => {
		if (!value) {
			return
		}

		const closestIndex = findClosestIndexString(value, ":", value.length)

		if (closestIndex === -1) {
			return
		}

		const replacedMessage = value.slice(0, closestIndex) + `:${emoji.name.toLowerCase().trim()}: `

		if (replacedMessage.trim().length === 0) {
			return
		}

		setValue(replacedMessage)
		reset()
	}, [emoji.name, reset, setValue, value])

	return (
		<Button
			variant="plain"
			size="none"
			onPress={onPress}
			className="flex-1 flex-row items-center justify-start px-4 py-1.5"
		>
			<View className="flex-row items-center w-full gap-2">
				<Image
					source={{
						uri: emoji.skins.at(0)?.src
					}}
					style={{
						width: 20,
						height: 20
					}}
					priority="high"
					cachePolicy="disk"
					className="shrink-0"
				/>
				<Text
					className="text-foreground text-sm shrink"
					numberOfLines={1}
					ellipsizeMode="middle"
				>
					:{emoji.name.toLowerCase().trim()}:
				</Text>
			</View>
		</Button>
	)
})

Emoji.displayName = "Emoji"

export default Emoji
