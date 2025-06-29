import { memo, useCallback, useMemo } from "react"
import { Text } from "@/components/nativewindui/Text"
import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import { contactName } from "@/lib/utils"
import { useColorScheme } from "@/lib/useColorScheme"
import { Button } from "@/components/nativewindui/Button"
import Animated, { SlideInDown, SlideOutDown, type AnimatedStyle } from "react-native-reanimated"
import { useChatsStore } from "@/stores/chats.store"
import { Icon } from "@roninoss/icons"
import { View, type StyleProp, type ViewStyle } from "react-native"
import { useKeyboardState, KeyboardController } from "react-native-keyboard-controller"
import { useShallow } from "zustand/shallow"
import { useMMKVString } from "react-native-mmkv"
import mmkvInstance from "@/lib/mmkv"
import { useTranslation } from "react-i18next"

export const ReplyTo = memo(({ chat }: { chat: ChatConversation }) => {
	const { colors } = useColorScheme()
	const replyToMessage = useChatsStore(useShallow(state => state.replyToMessage[chat.uuid] ?? null))
	const setReplyToMessage = useChatsStore(useShallow(state => state.setReplyToMessage))
	const showEmojis = useChatsStore(useShallow(state => state.showEmojis[chat.uuid] ?? false))
	const emojisSuggestions = useChatsStore(useShallow(state => state.emojisSuggestions[chat.uuid] ?? []))
	const emojisText = useChatsStore(useShallow(state => state.emojisText[chat.uuid] ?? ""))
	const showMention = useChatsStore(useShallow(state => state.showMention[chat.uuid] ?? false))
	const mentionSuggestions = useChatsStore(useShallow(state => state.mentionSuggestions[chat.uuid] ?? []))
	const mentionText = useChatsStore(useShallow(state => state.mentionText[chat.uuid] ?? ""))
	const { isVisible: isKeyboardVisible } = useKeyboardState()
	const [value] = useMMKVString(`chatInputValue:${chat.uuid}`, mmkvInstance)
	const { t } = useTranslation()

	const suggestionsVisible = useMemo(() => {
		return (
			(showEmojis && emojisSuggestions.length > 0 && emojisText.length > 0) ||
			(showMention && mentionSuggestions.length > 0 && mentionText.length > 0)
		)
	}, [showEmojis, emojisText, emojisSuggestions, showMention, mentionText, mentionSuggestions])

	const reset = useCallback(() => {
		setReplyToMessage(prev => ({
			...prev,
			[chat.uuid]: null
		}))

		if (!value || value.length === 0) {
			KeyboardController.dismiss().catch(console.error)
		}
	}, [chat.uuid, setReplyToMessage, value])

	const viewStyle = useMemo(() => {
		return {
			borderTopLeftRadius: suggestionsVisible ? 0 : 6,
			borderTopRightRadius: suggestionsVisible ? 0 : 6,
			flexDirection: "column",
			justifyContent: "flex-start",
			alignItems: "flex-start",
			backgroundColor: colors.card,
			zIndex: 50,
			flex: 1
		} satisfies StyleProp<AnimatedStyle<StyleProp<ViewStyle>>>
	}, [colors.card, suggestionsVisible])

	if (!isKeyboardVisible || !replyToMessage) {
		return null
	}

	return (
		<Animated.View
			entering={SlideInDown}
			exiting={SlideOutDown}
			style={viewStyle}
		>
			<View className="flex-1 flex-row items-center justify-between px-4 w-full">
				<Text
					className="text-sm font-normal text-muted-foreground"
					numberOfLines={1}
				>
					{t("chats.input.suggestions.replyTo.replyingTo", {
						name: contactName(replyToMessage.senderEmail, replyToMessage.senderNickName)
					})}
				</Text>
				<Button
					variant="plain"
					size="icon"
					onPress={reset}
				>
					<Icon
						name="close"
						size={16}
						color={colors.foreground}
					/>
				</Button>
			</View>
		</Animated.View>
	)
})

ReplyTo.displayName = "ReplyTo"

export default ReplyTo
