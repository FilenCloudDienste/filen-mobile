import { useLocalSearchParams, Redirect } from "expo-router"
import { useMemo, useCallback, useState, memo } from "react"
import { View, Platform, RefreshControl } from "react-native"
import { type ChatConversation, type ChatConversationParticipant } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import { ListItem, List, type ListDataItem, type ListRenderItemInfo } from "@/components/nativewindui/List"
import Container from "@/components/Container"
import { contactName } from "@/lib/utils"
import Avatar from "@/components/avatar"
import { Text } from "@/components/nativewindui/Text"
import { Button } from "@/components/nativewindui/Button"
import { Icon } from "@roninoss/icons"
import { useColorScheme } from "@/lib/useColorScheme"
import contactsService from "@/services/contacts.service"
import useSDKConfig from "@/hooks/useSDKConfig"
import Menu from "@/components/chats/chat/participants/menu"
import useChatsQuery from "@/queries/useChatsQuery"
import { validate as validateUUID } from "uuid"
import nodeWorker from "@/lib/nodeWorker"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import alerts from "@/lib/alerts"
import queryUtils from "@/queries/utils"
import useDimensions from "@/hooks/useDimensions"
import RequireInternet from "@/components/requireInternet"
import { useTranslation } from "react-i18next"
import useNetInfo from "@/hooks/useNetInfo"

export const LIST_ITEM_HEIGHT = Platform.select({
	ios: 61,
	default: 60
})

export type ListItemInfo = {
	title: string
	subTitle: string
	id: string
	participant: ChatConversationParticipant
	name: string
}

export const Participant = memo(({ info, chat }: { info: ListRenderItemInfo<ListItemInfo>; chat: ChatConversation }) => {
	const { colors } = useColorScheme()

	const avatarSource = useMemo(() => {
		return {
			uri: info.item.participant.avatar?.startsWith("https") ? info.item.participant.avatar : "avatar_fallback"
		}
	}, [info.item.participant.avatar])

	const leftView = useMemo(() => {
		return (
			<View className="flex-1 flex-row items-center justify-center px-4">
				<Avatar
					source={avatarSource}
					style={{
						width: 36,
						height: 36
					}}
				/>
			</View>
		)
	}, [avatarSource])

	const rightView = useMemo(() => {
		return Platform.OS === "android" ? (
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
							namingScheme="sfSymbol"
							name="ellipsis"
							size={24}
							color={colors.foreground}
						/>
					</Button>
				</Menu>
			</View>
		) : undefined
	}, [chat, colors.foreground, info.item.participant])

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
				leftView={leftView}
				rightView={rightView}
				{...info}
			/>
		</Menu>
	)
})

Participant.displayName = "Participant"

export default function Participants() {
	const { uuid } = useLocalSearchParams()
	const { colors } = useColorScheme()
	const [{ userId }] = useSDKConfig()
	const [refreshing, setRefreshing] = useState<boolean>(false)
	const { screen } = useDimensions()
	const { t } = useTranslation()
	const { hasInternet } = useNetInfo()

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

			return (
				<Participant
					info={info}
					chat={chat}
				/>
			)
		},
		[chat]
	)

	const addParticipant = useCallback(async () => {
		if (!chat) {
			return
		}

		const selectContactsResponse = await contactsService.selectContacts({
			type: "all",
			max: 9999
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

	const headerRightView = useCallback(() => {
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
	}, [addParticipant, colors.primary])

	const listFooter = useMemo(() => {
		return (
			<View className="h-16 flex-row items-center justify-center">
				<Text className="text-sm">
					{participants.length}{" "}
					{participants.length === 1 ? t("chats.participants.participant") : t("chats.participants.participants")}
				</Text>
			</View>
		)
	}, [participants.length, t])

	const onRefresh = useCallback(async () => {
		setRefreshing(true)

		try {
			await chatsQuery.refetch()
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			setRefreshing(false)
		}
	}, [chatsQuery])

	const refreshControl = useMemo(() => {
		if (!hasInternet) {
			return undefined
		}

		return (
			<RefreshControl
				refreshing={refreshing}
				onRefresh={onRefresh}
			/>
		)
	}, [refreshing, onRefresh, hasInternet])

	const { initialNumToRender, maxToRenderPerBatch } = useMemo(() => {
		return {
			initialNumToRender: Math.round(screen.height / LIST_ITEM_HEIGHT),
			maxToRenderPerBatch: Math.round(screen.height / LIST_ITEM_HEIGHT / 2)
		}
	}, [screen.height])

	const getItemLayout = useCallback((_: ArrayLike<ListItemInfo> | null | undefined, index: number) => {
		return {
			length: LIST_ITEM_HEIGHT,
			offset: LIST_ITEM_HEIGHT * index,
			index
		}
	}, [])

	if (!chat) {
		return <Redirect href="/chats" />
	}

	return (
		<RequireInternet>
			<LargeTitleHeader
				title={t("chats.participants.participants")}
				iosBlurEffect="systemChromeMaterial"
				rightView={headerRightView}
			/>
			<Container>
				<List
					contentContainerClassName="pb-20"
					contentInsetAdjustmentBehavior="automatic"
					variant="full-width"
					data={participants}
					renderItem={renderItem}
					keyExtractor={keyExtractor}
					ListFooterComponent={listFooter}
					refreshControl={refreshControl}
					removeClippedSubviews={true}
					initialNumToRender={initialNumToRender}
					maxToRenderPerBatch={maxToRenderPerBatch}
					updateCellsBatchingPeriod={100}
					windowSize={3}
					getItemLayout={getItemLayout}
				/>
			</Container>
		</RequireInternet>
	)
}
