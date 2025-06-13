import { memo, useMemo, useState, Fragment, useRef, useCallback } from "react"
import useChatsQuery from "@/queries/useChatsQuery"
import Header from "./header"
import Container from "../Container"
import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import useBottomListContainerPadding from "@/hooks/useBottomListContainerPadding"
import { View, RefreshControl, ActivityIndicator } from "react-native"
import { Text } from "@/components/nativewindui/Text"
import { contactName } from "@/lib/utils"
import { useColorScheme } from "@/lib/useColorScheme"
import alerts from "@/lib/alerts"
import Item from "./item"
import { FlashList, type ListRenderItemInfo } from "@shopify/flash-list"
import useViewLayout from "@/hooks/useViewLayout"

export const Chats = memo(() => {
	const [searchTerm, setSearchTerm] = useState<string>("")
	const listRef = useRef<FlashList<ChatConversation>>(null)
	const [refreshing, setRefreshing] = useState<boolean>(false)
	const bottomListContainerPadding = useBottomListContainerPadding()
	const { colors } = useColorScheme()
	const viewRef = useRef<View>(null)
	const { layout: listLayout, onLayout } = useViewLayout(viewRef)

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
		return (
			<RefreshControl
				refreshing={refreshing}
				onRefresh={onRefresh}
			/>
		)
	}, [refreshing, onRefresh])

	const ListFooter = useMemo(() => {
		return chats.length > 0 ? (
			<View className="flex-row items-center justify-center h-16">
				<Text className="text-sm">{chats.length} chats</Text>
			</View>
		) : undefined
	}, [chats.length])

	const ListEmpty = useMemo(() => {
		if (chatsQuery.status === "pending") {
			return (
				<View className="flex-row items-center justify-center h-16">
					<ActivityIndicator
						size="small"
						color={colors.foreground}
					/>
				</View>
			)
		}

		if (chatsQuery.status === "error") {
			return (
				<View className="flex-row items-center justify-center h-16">
					<Text className="text-sm">Error loading chats</Text>
				</View>
			)
		}

		if (chats.length === 0) {
			if (searchTerm.length > 0) {
				return (
					<View className="flex-row items-center justify-center h-16">
						<Text className="text-sm">No chats found for this search</Text>
					</View>
				)
			}

			return (
				<View className="flex-row items-center justify-center h-16">
					<Text className="text-sm">No chats found</Text>
				</View>
			)
		}

		return (
			<View className="flex-row items-center justify-center h-16">
				<Text className="text-sm">No chats found</Text>
			</View>
		)
	}, [chatsQuery.status, chats.length, searchTerm, colors.foreground])

	const renderItem = useCallback((info: ListRenderItemInfo<ChatConversation>) => {
		return <Item info={info} />
	}, [])

	return (
		<Fragment>
			<Header setSearchTerm={setSearchTerm} />
			<Container>
				<View
					ref={viewRef}
					onLayout={onLayout}
					className="flex-1"
				>
					<FlashList
						ref={listRef}
						data={chats}
						contentInsetAdjustmentBehavior="automatic"
						keyExtractor={keyExtractor}
						renderItem={renderItem}
						refreshing={refreshing || chatsQuery.status === "pending"}
						contentContainerStyle={{
							paddingBottom: bottomListContainerPadding + 100
						}}
						ListEmptyComponent={ListEmpty}
						ListFooterComponent={ListFooter}
						refreshControl={refreshControl}
						estimatedListSize={
							listLayout.width > 0 && listLayout.height > 0
								? {
										width: listLayout.width,
										height: listLayout.height
								  }
								: undefined
						}
						estimatedItemSize={78}
						drawDistance={0}
						removeClippedSubviews={true}
						disableAutoLayout={true}
					/>
				</View>
			</Container>
		</Fragment>
	)
})

Chats.displayName = "Chats"

export default Chats
