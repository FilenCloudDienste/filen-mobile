import { usePlaylistsQuery } from "@/queries/usePlaylistsQuery"
import { useMemo, Fragment, memo, useCallback, useState } from "react"
import Header from "@/components/trackPlayer/header"
import { useMMKVNumber } from "react-native-mmkv"
import mmkvInstance from "@/lib/mmkv"
import { RefreshControl, View } from "react-native"
import { useShallow } from "zustand/shallow"
import { useTrackPlayerStore } from "@/stores/trackPlayer.store"
import { List, type ListDataItem, type ListRenderItemInfo } from "../nativewindui/List"
import Container from "../Container"
import Item, { type ListItemInfo } from "./item"
import { formatMessageDate } from "@/lib/utils"

export const TrackPlayer = memo(() => {
	const [trackPlayerToolbarHeight] = useMMKVNumber("trackPlayerToolbarHeight", mmkvInstance)
	const [refreshing, setRefreshing] = useState<boolean>(false)
	const playlistsSearchTerm = useTrackPlayerStore(useShallow(state => state.playlistsSearchTerm))

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

	return (
		<Fragment>
			<Header />
			<Container>
				<List
					data={playlists}
					renderItem={renderItem}
					keyExtractor={keyExtractor}
					showsVerticalScrollIndicator={true}
					showsHorizontalScrollIndicator={false}
					contentInsetAdjustmentBehavior="automatic"
					scrollIndicatorInsets={{
						top: 0,
						left: 0,
						bottom: trackPlayerToolbarHeight ?? 0,
						right: 0
					}}
					contentContainerStyle={{
						paddingTop: 8
					}}
					ListFooterComponent={
						<View
							style={{
								flex: 1,
								height: (trackPlayerToolbarHeight ?? 0) + 100
							}}
						/>
					}
					refreshing={refreshing}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={async () => {
								setRefreshing(true)

								await playlistsQuery.refetch().catch(console.error)

								setRefreshing(false)
							}}
						/>
					}
				/>
			</Container>
		</Fragment>
	)
})

TrackPlayer.displayName = "TrackPlayer"

export default TrackPlayer
