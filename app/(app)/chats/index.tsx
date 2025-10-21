import { memo, useMemo, useState, Fragment, useRef, useCallback } from "react"
import useChatsQuery from "@/queries/useChats.query"
import Header from "@/components/chats/header"
import Container from "@/components/Container"
import type { ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import { View, RefreshControl } from "react-native"
import { Text } from "@/components/nativewindui/Text"
import { contactName } from "@/lib/utils"
import alerts from "@/lib/alerts"
import Item from "@/components/chats/item"
import useNetInfo from "@/hooks/useNetInfo"
import OfflineListHeader from "@/components/offlineListHeader"
import { translateMemoized } from "@/lib/i18n"
import ListEmpty from "@/components/listEmpty"
import { FlashList, type ListRenderItemInfo, type FlashListRef } from "@shopify/flash-list"
import useDimensions from "@/hooks/useDimensions"

const contentContainerStyle = {
	paddingBottom: 100
}

export const Chats = memo(() => {
	const [searchTerm, setSearchTerm] = useState<string>("")
	const listRef = useRef<FlashListRef<ChatConversation>>(null)
	const [refreshing, setRefreshing] = useState<boolean>(false)
	const { hasInternet } = useNetInfo()
	const { screen } = useDimensions()

	const chatsQuery = useChatsQuery()

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

		await chatsQuery
			.refetch()
			.catch(e => {
				console.error(e)

				if (e instanceof Error) {
					alerts.error(e.message)
				}
			})
			.finally(() => {
				setRefreshing(false)
			})
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

	const ListFooterComponent = useCallback(() => {
		return chats.length > 0 ? (
			<View className="flex-row items-center justify-center h-16">
				<Text className="text-sm">
					{chats.length} {chats.length === 1 ? translateMemoized("chats.chat") : translateMemoized("chats.chats")}
				</Text>
			</View>
		) : undefined
	}, [chats.length])

	const ListEmptyComponent = useCallback(() => {
		return (
			<ListEmpty
				queryStatus={chatsQuery.status}
				itemCount={chats.length}
				searchTermLength={searchTerm.length}
				texts={{
					error: translateMemoized("chats.list.error"),
					empty: translateMemoized("chats.list.empty"),
					emptySearch: translateMemoized("chats.list.emptySearch")
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
	}, [chatsQuery.status, chats.length, searchTerm])

	const renderItem = useCallback((info: ListRenderItemInfo<ChatConversation>) => {
		return <Item info={info} />
	}, [])

	const ListHeaderComponent = useCallback(() => {
		return !hasInternet ? <OfflineListHeader /> : undefined
	}, [hasInternet])

	return (
		<Fragment>
			<Header setSearchTerm={setSearchTerm} />
			<Container>
				<FlashList
					ref={listRef}
					data={chats}
					contentInsetAdjustmentBehavior="automatic"
					keyExtractor={keyExtractor}
					renderItem={renderItem}
					refreshing={refreshing}
					contentContainerStyle={contentContainerStyle}
					ListEmptyComponent={ListEmptyComponent}
					ListFooterComponent={ListFooterComponent}
					refreshControl={refreshControl}
					ListHeaderComponent={ListHeaderComponent}
					maxItemsInRecyclePool={0}
					drawDistance={Math.floor(screen.height / 4)}
				/>
			</Container>
		</Fragment>
	)
})

Chats.displayName = "Chats"

export default Chats
