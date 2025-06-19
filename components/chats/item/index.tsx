import { memo, useMemo, useCallback } from "react"
import { View, Platform, type ListRenderItemInfo } from "react-native"
import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import { Text } from "@/components/nativewindui/Text"
import { Button } from "@/components/nativewindui/Button"
import Avatar from "@/components/avatar"
import useSDKConfig from "@/hooks/useSDKConfig"
import { contactName } from "@/lib/utils"
import { getChatName } from "../utils"
import { useRouter } from "expo-router"
import Menu from "./menu"
import Unread from "./unread"
import queryUtils from "@/queries/utils"
import nodeWorker from "@/lib/nodeWorker"
import LastMessage from "./lastMessage"
import Date from "../chat/messages/date"
import events from "@/lib/events"
import { cn } from "@/lib/cn"

export const Item = memo(({ info }: { info: ListRenderItemInfo<ChatConversation> }) => {
	const [{ userId }] = useSDKConfig()
	const { push: routerPush } = useRouter()

	const avatarSource = useMemo(() => {
		const participants = info.item.participants
			.filter(participant => participant.userId !== userId && participant.avatar?.startsWith("https"))
			.sort((a, b) => contactName(a.email, a.nickName).localeCompare(contactName(b.email, b.nickName)))

		if (participants.length === 0 || participants.length >= 2) {
			return {
				uri: "avatar_fallback"
			}
		}

		const firstParticipant = participants.at(0)

		if (!firstParticipant || !firstParticipant.avatar || !firstParticipant.avatar.startsWith("https")) {
			return {
				uri: "avatar_fallback"
			}
		}

		return {
			uri: firstParticipant.avatar
		}
	}, [info.item.participants, userId])

	const name = useMemo(() => {
		return getChatName(info.item, userId)
	}, [info.item, userId])

	const markAsRead = useCallback(async () => {
		queryUtils.useChatUnreadCountQuerySet({
			uuid: info.item.uuid,
			updater: count => {
				queryUtils.useChatUnreadQuerySet({
					updater: prev => (prev - count >= 0 ? prev - count : 0)
				})

				return 0
			}
		})

		try {
			await nodeWorker.proxy("chatMarkAsRead", {
				conversation: info.item.uuid
			})
		} catch (e) {
			console.error(e)
		}
	}, [info.item.uuid])

	const onPress = useCallback(() => {
		markAsRead().catch(console.error)

		events.emit("hideSearchBar", {
			clearText: false
		})

		routerPush({
			pathname: "/chat",
			params: {
				uuid: info.item.uuid
			}
		})
	}, [info.item.uuid, routerPush, markAsRead])

	return (
		<Menu
			type="context"
			chat={info.item}
			insideChat={false}
		>
			<Button
				className="bg-background justify-start flex-1 px-4"
				variant="plain"
				size="none"
				onPress={onPress}
			>
				<View className="flex-row gap-4 flex-1 pt-3">
					<Avatar
						source={avatarSource}
						style={{
							width: 36,
							height: 36
						}}
					/>
					<View className={cn("flex-col flex-1 pb-3", Platform.OS === "ios" && "border-b border-border/80")}>
						<View className="flex-1 flex-row items-center justify-between">
							<Text
								variant="heading"
								numberOfLines={1}
								className="flex-1"
								ellipsizeMode="middle"
							>
								{name}
							</Text>
							<Text className="text-muted-foreground font-normal text-xs">
								{info.item.lastMessageTimestamp && info.item.lastMessageTimestamp > 0 ? (
									<Date timestamp={info.item.lastMessageTimestamp} />
								) : (
									""
								)}
							</Text>
						</View>
						<View className="flex-row flex-1 items-center pt-0.5 gap-4">
							<LastMessage chat={info.item} />
							<Unread chat={info.item} />
						</View>
					</View>
				</View>
			</Button>
		</Menu>
	)
})

Item.displayName = "Item"

export default Item
