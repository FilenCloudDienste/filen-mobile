import { memo, useMemo, useCallback } from "react"
import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import { type ChatMessage } from "@filen/sdk/dist/types/api/v3/chat/messages"
import useHeaderHeight from "@/hooks/useHeaderHeight"
import { Button } from "@/components/nativewindui/Button"
import { Text } from "@/components/nativewindui/Text"
import nodeWorker from "@/lib/nodeWorker"
import queryUtils from "@/queries/utils"
import useSDKConfig from "@/hooks/useSDKConfig"
import Container from "@/components/Container"

export const Top = memo(({ chat, messages, lastFocus }: { chat: ChatConversation; messages: ChatMessage[]; lastFocus: number | null }) => {
	const headerHeight = useHeaderHeight()
	const [{ userId }] = useSDKConfig()

	const lastMessagesSince = useMemo(() => {
		if (!lastFocus || messages.length === 0) {
			return 0
		}

		return messages.filter(m => m.senderId !== userId && m.sentTimestamp > lastFocus).length
	}, [messages, lastFocus, userId])

	const markAsRead = useCallback(async () => {
		try {
			queryUtils.useChatUnreadCountQuerySet({
				uuid: chat.uuid,
				updater: count => {
					queryUtils.useChatUnreadQuerySet({
						updater: prev => (prev - count >= 0 ? prev - count : 0)
					})

					return 0
				}
			})

			const lastFocusTimestamp = Date.now()

			queryUtils.useChatsLastFocusQuerySet({
				updater: prev =>
					prev.map(v =>
						v.uuid === chat.uuid
							? {
									...v,
									lastFocus: lastFocusTimestamp
							  }
							: v
					)
			})

			await Promise.all([
				nodeWorker.proxy("sendChatTyping", {
					conversation: chat.uuid,
					type: "up"
				}),
				nodeWorker.proxy("chatMarkAsRead", {
					conversation: chat.uuid
				}),
				(async () => {
					const lastFocusValues = await nodeWorker.proxy("fetchChatsLastFocus", undefined)

					await nodeWorker.proxy("updateChatsLastFocus", {
						values: lastFocusValues.map(v =>
							v.uuid === chat.uuid
								? {
										...v,
										lastFocus: lastFocusTimestamp
								  }
								: v
						)
					})
				})()
			])
		} catch (e) {
			console.error(e)
		}
	}, [chat.uuid])

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
					{lastMessagesSince} new messages
				</Text>
			</Container>
		</Button>
	)
})

Top.displayName = "Top"

export default Top
