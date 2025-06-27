import RequireInternet from "@/components/requireInternet"
import { usePlaylistsQuery } from "@/queries/usePlaylistsQuery"
import { useMemo, memo, useCallback, useState } from "react"
import Header from "@/components/trackPlayer/header"
import { useMMKVNumber } from "react-native-mmkv"
import mmkvInstance from "@/lib/mmkv"
import { RefreshControl, View } from "react-native"
import { useShallow } from "zustand/shallow"
import { useTrackPlayerStore } from "@/stores/trackPlayer.store"
import { List, type ListDataItem, type ListRenderItemInfo } from "@/components/nativewindui/List"
import Container from "@/components/Container"
import Item, { type ListItemInfo, LIST_ITEM_HEIGHT } from "@/components/trackPlayer/item"
import { formatMessageDate } from "@/lib/utils"
import useDimensions from "@/hooks/useDimensions"

const contentContainerStyle = {
	paddingTop: 8
}

export const TrackPlayer = memo(() => {
	const [trackPlayerToolbarHeight] = useMMKVNumber("trackPlayerToolbarHeight", mmkvInstance)
	const [refreshing, setRefreshing] = useState<boolean>(false)
	const playlistsSearchTerm = useTrackPlayerStore(useShallow(state => state.playlistsSearchTerm))
	const { screen } = useDimensions()

	const playlistsQuery = usePlaylistsQuery({})

	const playlists = useMemo(() => {
		if (playlistsQuery.status !== "success") {
			return []
		}

		const playlistsSearchTermNormalized = playlistsSearchTerm.toLowerCase().trim()

		return (
			playlistsSearchTermNormalized.length > 0
				? playlistsQuery.data.filter(playlist => playlist.name.toLowerCase().trim().includes(playlistsSearchTermNormalized))
				: playlistsQuery.data
		)
			.sort((a, b) => b.updated - a.updated)
			.map(playlist => ({
				id: playlist.uuid,
				title: playlist.name,
				subTitle: `${playlist.files.length} files, updated ${formatMessageDate(playlist.updated)}`,
				playlist
			})) satisfies ListItemInfo[]
	}, [playlistsQuery.data, playlistsQuery.status, playlistsSearchTerm])

	const renderItem = useCallback((info: ListRenderItemInfo<ListItemInfo>) => {
		return <Item info={info} />
	}, [])

	const keyExtractor = useCallback((item: (Omit<ListDataItem, string> & { id: string }) | string): string => {
		return typeof item === "string" ? item : item.id
	}, [])

	const scrollIndicatorInsets = useMemo(() => {
		return {
			top: 0,
			left: 0,
			bottom: trackPlayerToolbarHeight ?? 0,
			right: 0
		}
	}, [trackPlayerToolbarHeight])

	const listFooter = useMemo(() => {
		return (
			<View
				style={{
					flex: 1,
					height: (trackPlayerToolbarHeight ?? 0) + 100
				}}
			/>
		)
	}, [trackPlayerToolbarHeight])

	const refreshControl = useMemo(() => {
		return (
			<RefreshControl
				refreshing={refreshing}
				onRefresh={async () => {
					setRefreshing(true)

					await playlistsQuery.refetch().catch(console.error)

					setRefreshing(false)
				}}
			/>
		)
	}, [refreshing, playlistsQuery])

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

	return (
		<RequireInternet>
			<Header />
			<Container>
				<List
					data={playlists}
					renderItem={renderItem}
					keyExtractor={keyExtractor}
					showsVerticalScrollIndicator={true}
					showsHorizontalScrollIndicator={false}
					contentInsetAdjustmentBehavior="automatic"
					scrollIndicatorInsets={scrollIndicatorInsets}
					contentContainerStyle={contentContainerStyle}
					ListFooterComponent={listFooter}
					refreshing={refreshing}
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
})

TrackPlayer.displayName = "TrackPlayer"

export default TrackPlayer
