import { memo, useMemo, useState, Fragment, useRef, useCallback } from "react"
import useChatsQuery from "@/queries/useChatsQuery"
import Header from "@/components/chats/header"
import Container from "@/components/Container"
import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import { View, RefreshControl, type ListRenderItemInfo, FlatList } from "react-native"
import { Text } from "@/components/nativewindui/Text"
import { contactName } from "@/lib/utils"
import alerts from "@/lib/alerts"
import Item, { LIST_ITEM_HEIGHT } from "@/components/chats/item"
import useDimensions from "@/hooks/useDimensions"
import useNetInfo from "@/hooks/useNetInfo"
import OfflineListHeader from "@/components/offlineListHeader"
import { useTranslation } from "react-i18next"
import ListEmpty from "@/components/listEmpty"

const contentContainerStyle = {
	paddingBottom: 100
}

export const Chats = memo(() => {
	const [searchTerm, setSearchTerm] = useState<string>("")
	const listRef = useRef<FlatList<ChatConversation>>(null)
	const [refreshing, setRefreshing] = useState<boolean>(false)
	const { screen } = useDimensions()
	const { hasInternet } = useNetInfo()
	const { t } = useTranslation()

	const chatsQuery = useChatsQuery({})

	const chats = useMemo(() => {
		if (chatsQuery.status !== "success") {
			return []
		}

		const searchTermLowercased = searchTerm.toLowerCase().trim()

		return (
			searchTermLowercased.length > 0
				? chatsQuery.data.filter(
						chat =>
							(chat.name ?? "").toLowerCase().trim().includes(searchTermLowercased) ||
							(chat.lastMessage ?? "").toLowerCase().trim().includes(searchTermLowercased) ||
							chat.participants.some(participant =>
								contactName(participant.email, participant.nickName).toLowerCase().trim().includes(searchTermLowercased)
							)
				  )
				: chatsQuery.data
		).sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp)
	}, [chatsQuery.data, chatsQuery.status, searchTerm])

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

	const keyExtractor = useCallback((item: ChatConversation) => {
		return item.uuid
	}, [])

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

	const listFooter = useMemo(() => {
		return chats.length > 0 ? (
			<View className="flex-row items-center justify-center h-16">
				<Text className="text-sm">
					{chats.length} {chats.length === 1 ? t("chats.chat") : t("chats.chats")}
				</Text>
			</View>
		) : undefined
	}, [chats.length, t])

	const listEmpty = useMemo(() => {
		return (
			<ListEmpty
				queryStatus={chatsQuery.status}
				itemCount={chats.length}
				searchTermLength={searchTerm.length}
				texts={{
					error: t("chats.list.error"),
					empty: t("chats.list.empty"),
					emptySearch: t("chats.list.emptySearch")
				}}
				icons={{
					error: {
						name: "wifi-alert"
					},
					empty: {
						name: "message-outline"
					},
					emptySearch: {
						name: "magnify"
					}
				}}
			/>
		)
	}, [chatsQuery.status, chats.length, searchTerm, t])

	const renderItem = useCallback((info: ListRenderItemInfo<ChatConversation>) => {
		return <Item info={info} />
	}, [])

	const listHeader = useMemo(() => {
		return !hasInternet ? <OfflineListHeader /> : undefined
	}, [hasInternet])

	const { initialNumToRender, maxToRenderPerBatch } = useMemo(() => {
		return {
			initialNumToRender: Math.round(screen.height / LIST_ITEM_HEIGHT),
			maxToRenderPerBatch: Math.round(screen.height / LIST_ITEM_HEIGHT / 2)
		}
	}, [screen.height])

	const getItemLayout = useCallback((_: ArrayLike<ChatConversation> | null | undefined, index: number) => {
		return {
			length: LIST_ITEM_HEIGHT,
			offset: LIST_ITEM_HEIGHT * index,
			index
		}
	}, [])

	return (
		<Fragment>
			<Header setSearchTerm={setSearchTerm} />
			<Container>
				<FlatList
					ref={listRef}
					data={chats}
					contentInsetAdjustmentBehavior="automatic"
					keyExtractor={keyExtractor}
					renderItem={renderItem}
					refreshing={refreshing || chatsQuery.status === "pending"}
					contentContainerStyle={contentContainerStyle}
					ListEmptyComponent={listEmpty}
					ListFooterComponent={listFooter}
					refreshControl={refreshControl}
					ListHeaderComponent={listHeader}
					removeClippedSubviews={true}
					initialNumToRender={initialNumToRender}
					maxToRenderPerBatch={maxToRenderPerBatch}
					updateCellsBatchingPeriod={100}
					windowSize={3}
					getItemLayout={getItemLayout}
				/>
			</Container>
		</Fragment>
	)
})

Chats.displayName = "Chats"

export default Chats
