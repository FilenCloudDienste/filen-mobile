import { memo, useCallback, useMemo } from "react"
import type { ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import { View, ScrollView, type ViewStyle, type StyleProp } from "react-native"
import { Text } from "@/components/nativewindui/Text"
import { Button } from "@/components/nativewindui/Button"
import { Icon } from "@roninoss/icons"
import { useColorScheme } from "@/lib/useColorScheme"
import Animated, { SlideInDown, SlideOutDown, type AnimatedStyle } from "react-native-reanimated"
import { useChatsStore } from "@/stores/chats.store"
import User from "./user"
import { useKeyboardState } from "react-native-keyboard-controller"
import { useShallow } from "zustand/shallow"
import { useTranslation } from "react-i18next"

export const Mention = memo(({ chat }: { chat: ChatConversation }) => {
	const { colors } = useColorScheme()
	const showMention = useChatsStore(useShallow(state => state.showMention[chat.uuid] ?? false))
	const mentionSuggestions = useChatsStore(useShallow(state => state.mentionSuggestions[chat.uuid] ?? []))
	const mentionText = useChatsStore(useShallow(state => state.mentionText[chat.uuid] ?? ""))
	const { isVisible: isKeyboardVisible } = useKeyboardState()
	const { t } = useTranslation()

	const resetSuggestions = useCallback(() => {
		useChatsStore.getState().resetSuggestions(chat.uuid)
	}, [chat.uuid])

	const viewStyle = useMemo(() => {
		return {
			borderTopLeftRadius: 6,
			borderTopRightRadius: 6,
			flexDirection: "column",
			justifyContent: "flex-start",
			alignItems: "flex-start",
			backgroundColor: colors.card,
			zIndex: 50,
			flex: 1
		} satisfies StyleProp<AnimatedStyle<StyleProp<ViewStyle>>>
	}, [colors.card])

	if (!isKeyboardVisible || !showMention || mentionSuggestions.length === 0 || mentionText.length === 0) {
		return null
	}

	return (
		<Animated.View
			entering={SlideInDown}
			exiting={SlideOutDown}
			style={viewStyle}
		>
			<View className="flex-1 flex-row items-center justify-between px-4">
				<Text
					className="text-sm font-normal text-muted-foreground flex-1"
					numberOfLines={1}
				>
					{t("chats.input.suggestions.mention.matching", {
						query: mentionText
					})}
				</Text>
				<Button
					variant="plain"
					size="icon"
					onPress={resetSuggestions}
				>
					<Icon
						name="close"
						size={16}
						color={colors.foreground}
					/>
				</Button>
			</View>
			<ScrollView
				className="max-h-[150px]"
				showsHorizontalScrollIndicator={false}
				showsVerticalScrollIndicator={true}
				horizontal={false}
				directionalLockEnabled={true}
				keyboardDismissMode="none"
				keyboardShouldPersistTaps="always"
			>
				{mentionSuggestions.map(user => {
					return (
						<User
							key={user.userId.toString()}
							user={user}
							chat={chat}
						/>
					)
				})}
			</ScrollView>
		</Animated.View>
	)
})

Mention.displayName = "Mention"

export default Mention
