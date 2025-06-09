import { useLocalSearchParams, Redirect } from "expo-router"
import { useMemo, Fragment, useCallback, useState, useRef } from "react"
import { View, Platform, RefreshControl } from "react-native"
import { type ChatConversation, type ChatConversationParticipant } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import { ListItem, List, ESTIMATED_ITEM_HEIGHT, type ListDataItem } from "@/components/nativewindui/List"
import Container from "@/components/Container"
import { type ListRenderItemInfo } from "@shopify/flash-list"
import { contactName } from "@/lib/utils"
import Avatar from "@/components/avatar"
import { Text } from "@/components/nativewindui/Text"
import { Button } from "@/components/nativewindui/Button"
import { Icon } from "@roninoss/icons"
import { useColorScheme } from "@/lib/useColorScheme"
import { selectContacts } from "@/app/selectContacts"
import useSDKConfig from "@/hooks/useSDKConfig"
import Menu from "./menu"
import useChatsQuery from "@/queries/useChatsQuery"
import { validate as validateUUID } from "uuid"
import nodeWorker from "@/lib/nodeWorker"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import alerts from "@/lib/alerts"
import queryUtils from "@/queries/utils"
import useViewLayout from "@/hooks/useViewLayout"

export type ListItemInfo = {
	title: string
	subTitle: string
	id: string
	participant: ChatConversationParticipant
	name: string
}

export default function Participants() {
	const { uuid } = useLocalSearchParams()
	const { colors } = useColorScheme()
	const [{ userId }] = useSDKConfig()
	const [refreshing, setRefreshing] = useState<boolean>(false)
	const viewRef = useRef<View>(null)
	const { layout: listLayout, onLayout } = useViewLayout(viewRef)

	const chatUUIDParsed = useMemo((): string | null => {
		try {
			return typeof uuid === "string" && validateUUID(uuid) ? uuid : null
		} catch {
			return null
		}
	}, [uuid])

	const chatsQuery = useChatsQuery({
		enabled: false
	})

	const chat = useMemo((): ChatConversation | null => {
		if (!chatUUIDParsed || chatsQuery.status !== "success") {
			return null
		}

		const note = chatsQuery.data.find(n => n.uuid === chatUUIDParsed)

		if (!note) {
			return null
		}

		return note
	}, [chatsQuery.data, chatUUIDParsed, chatsQuery.status])

	const participants = useMemo((): ListItemInfo[] => {
		if (!chat) {
			return []
		}

		return chat.participants
			.filter(participant => participant.userId !== userId)
			.sort((a, b) =>
				contactName(a.email, a.nickName).localeCompare(contactName(b.email, b.nickName), "en", {
					numeric: true
				})
			)
			.map(participant => ({
				id: participant.userId.toString(),
				title: contactName(participant.email, participant.nickName),
				subTitle: participant.email,
				participant,
				name: contactName(participant.email, participant.nickName)
			}))
	}, [chat, userId])

	const keyExtractor = useCallback((item: (Omit<ListDataItem, string> & { id: string }) | string) => {
		return typeof item === "string" ? item : item.id
	}, [])

	const renderItem = useCallback(
		(info: ListRenderItemInfo<ListItemInfo>) => {
			if (!chat) {
				return null
			}

			const avatarSource = {
				uri: info.item.participant.avatar?.startsWith("https") ? info.item.participant.avatar : "avatar_fallback"
			}

			return (
				<Menu
					type="context"
					chat={chat}
					participant={info.item.participant}
				>
					<ListItem
						variant="full-width"
						removeSeparator={Platform.OS === "android"}
						isLastInSection={false}
						isFirstInSection={false}
						leftView={
							<View className="flex-1 flex-row items-center justify-center px-4">
								<Avatar
									source={avatarSource}
									style={{
										width: 36,
										height: 36
									}}
								/>
							</View>
						}
						rightView={
							Platform.OS === "android" ? (
								<View className="flex-1 flex-row items-center justify-center px-4">
									<Menu
										type="dropdown"
										chat={chat}
										participant={info.item.participant}
									>
										<Button
											variant="plain"
											size="icon"
										>
											<Icon
												name="dots-horizontal"
												size={24}
												color={colors.foreground}
											/>
										</Button>
									</Menu>
								</View>
							) : undefined
						}
						{...info}
					/>
				</Menu>
			)
		},
		[chat, colors.foreground]
	)

	const addParticipant = useCallback(async () => {
		if (!chat) {
			return
		}

		const selectContactsResponse = await selectContacts({
			type: "all",
			multiple: true,
			max: Infinity
		})

		if (selectContactsResponse.cancelled) {
			return
		}

		const filtered = selectContactsResponse.contacts.filter(c => !chat.participants.some(p => p.userId === c.userId))

		if (filtered.length === 0) {
			return
		}

		fullScreenLoadingModal.show()

		try {
			const addedParticipants = await Promise.all(
				filtered.map(async contact => {
					await nodeWorker.proxy("addChatParticipant", {
						conversation: chat.uuid,
						contact
					})

					return {
						userId: contact.userId,
						email: contact.email,
						avatar: contact.avatar,
						nickName: contact.nickName,
						metadata: "",
						permissionsAdd: true,
						addedTimestamp: Date.now()
					} satisfies ChatConversationParticipant as ChatConversationParticipant
				})
			)

			queryUtils.useChatsQuerySet({
				updater: prev =>
					prev.map(c =>
						c.uuid === chat.uuid
							? {
									...c,
									participants: [
										...c.participants.filter(p => !addedParticipants.some(ap => ap.userId === p.userId)),
										...addedParticipants
									]
							  }
							: c
					)
			})
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			fullScreenLoadingModal.hide()
		}
	}, [chat])

	if (!chat) {
		return <Redirect href="/chats" />
	}

	return (
		<Fragment>
			<LargeTitleHeader
				title="Participants"
				iosBlurEffect="systemChromeMaterial"
				rightView={() => {
					return (
						<Button
							variant="plain"
							size="icon"
							onPress={addParticipant}
						>
							<Icon
								name="plus"
								size={24}
								color={colors.primary}
							/>
						</Button>
					)
				}}
			/>
			<Container>
				<View
					className="flex-1"
					ref={viewRef}
					onLayout={onLayout}
				>
					<List
						contentContainerClassName="pb-20"
						contentInsetAdjustmentBehavior="automatic"
						variant="full-width"
						data={participants}
						renderItem={renderItem}
						keyExtractor={keyExtractor}
						ListFooterComponent={
							<View className="h-16 flex-row items-center justify-center">
								<Text className="text-sm">
									{participants.length} {participants.length === 1 ? "participant" : "participants"}
								</Text>
							</View>
						}
						refreshControl={
							<RefreshControl
								refreshing={refreshing}
								onRefresh={async () => {
									setRefreshing(true)

									await chatsQuery.refetch().catch(console.error)

									setRefreshing(false)
								}}
							/>
						}
						estimatedListSize={
							listLayout.width > 0 && listLayout.height > 0
								? {
										width: listLayout.width,
										height: listLayout.height
								  }
								: undefined
						}
						estimatedItemSize={ESTIMATED_ITEM_HEIGHT.withSubTitle}
						drawDistance={0}
						removeClippedSubviews={true}
						disableAutoLayout={true}
					/>
				</View>
			</Container>
		</Fragment>
	)
}
