import { memo, useMemo, useCallback } from "react"
import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import { type ChatMessage } from "@filen/sdk/dist/types/api/v3/chat/messages"
import useHeaderHeight from "@/hooks/useHeaderHeight"
import { Button } from "@/components/nativewindui/Button"
import { Text } from "@/components/nativewindui/Text"
import useSDKConfig from "@/hooks/useSDKConfig"
import Container from "@/components/Container"
import { useTranslation } from "react-i18next"
import chatsService from "@/services/chats.service"
import alerts from "@/lib/alerts"

export const Top = memo(({ chat, messages, lastFocus }: { chat: ChatConversation; messages: ChatMessage[]; lastFocus: number | null }) => {
	const headerHeight = useHeaderHeight()
	const [{ userId }] = useSDKConfig()
	const { t } = useTranslation()

	const lastMessagesSince = useMemo(() => {
		if (!lastFocus || messages.length === 0) {
			return 0
		}

		return messages.filter(m => m.senderId !== userId && m.sentTimestamp > lastFocus).length
	}, [messages, lastFocus, userId])

	const markAsRead = useCallback(async () => {
		try {
			await chatsService.markChatAsRead({
				chat
			})
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		}
	}, [chat])

	if (lastMessagesSince === 0) {
		return null
	}

	return (
		<Button
			variant="plain"
			size="none"
			className="absolute left-0 right-0 flex-1 flex-row items-center bg-blue-500 px-4 py-1 justify-start z-50"
			style={{
				top: headerHeight
			}}
			onPress={markAsRead}
			unstable_pressDelay={100}
		>
			<Container>
				<Text
					variant="callout"
					numberOfLines={1}
					className="flex-1 font-normal"
				>
					{t("chats.header.newMessages", {
						count: lastMessagesSince
					})}
				</Text>
			</Container>
		</Button>
	)
})

Top.displayName = "Top"

export default Top
