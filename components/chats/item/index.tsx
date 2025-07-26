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
import LastMessage from "./lastMessage"
import Date from "../chat/messages/date"
import events from "@/lib/events"
import { cn } from "@/lib/cn"
import { Icon } from "@roninoss/icons"
import { useColorScheme } from "@/lib/useColorScheme"
import useNetInfo from "@/hooks/useNetInfo"
import alerts from "@/lib/alerts"
import { useTranslation } from "react-i18next"

export const LIST_ITEM_HEIGHT = Platform.select({
	ios: 71,
	default: 71
})

export const Item = memo(({ info }: { info: ListRenderItemInfo<ChatConversation> }) => {
	const [{ userId }] = useSDKConfig()
	const { push: routerPush } = useRouter()
	const { colors } = useColorScheme()
	const { hasInternet } = useNetInfo()
	const { t } = useTranslation()

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

	const onPress = useCallback(() => {
		events.emit("hideSearchBar", {
			clearText: true
		})

		if (!hasInternet) {
			const cachedChat = queryUtils.useChatMessagesQueryGet({
				uuid: info.item.uuid
			})

			if (!cachedChat) {
				alerts.error(t("errors.youAreOffline"))

				return
			}
		}

		routerPush({
			pathname: "/chat/[uuid]",
			params: {
				uuid: info.item.uuid
			}
		})
	}, [info.item.uuid, routerPush, hasInternet, t])

	return (
		<Menu
			type="context"
			chat={info.item}
			insideChat={false}
		>
			<Button
				className="bg-background"
				variant="plain"
				size="none"
				onPress={onPress}
			>
				<View className="flex-row gap-4 flex-1 pt-3 pl-4">
					<Avatar
						source={avatarSource}
						style={{
							width: 36,
							height: 36
						}}
					/>
					<View className={cn("flex-col flex-1 pb-3", Platform.OS === "ios" && "border-b border-border/80")}>
						<View className="flex-1 flex-row items-center justify-between pr-4 gap-4">
							<View className="flex-1 flex-row items-center gap-2">
								{info.item.muted && (
									<Icon
										name="volume-variant-off"
										ios={{
											name: "bell.slash"
										}}
										size={17}
										color={colors.grey}
									/>
								)}
								<Text
									variant="heading"
									numberOfLines={1}
									className="flex-1"
									ellipsizeMode="middle"
								>
									{name}
								</Text>
							</View>
							<Text className="text-muted-foreground font-normal text-xs">
								{info.item.lastMessageTimestamp && info.item.lastMessageTimestamp > 0 ? (
									<Date timestamp={info.item.lastMessageTimestamp} />
								) : (
									""
								)}
							</Text>
						</View>
						<View className="flex-row flex-1 items-center pt-0.5 gap-4 pr-4">
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
