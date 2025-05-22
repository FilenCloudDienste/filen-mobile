import { usePlaylistsQuery, type Playlist } from "@/queries/usePlaylistsQuery"
import { useMemo, Fragment, memo, useCallback, useState } from "react"
import Header from "@/components/trackPlayer/header"
import Item from "./item"
import { useMMKVNumber } from "react-native-mmkv"
import mmkvInstance from "@/lib/mmkv"
import { RefreshControl, type ListRenderItemInfo, FlatList } from "react-native"
import { useShallow } from "zustand/shallow"
import { useTrackPlayerStore } from "@/stores/trackPlayer.store"
import { FLATLIST_BASE_PROPS } from "@/lib/constants"

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
		).sort((a, b) => b.updated - a.updated)
	}, [playlistsQuery.data, playlistsQuery.status, playlistsSearchTerm])

	const renderItem = useCallback((info: ListRenderItemInfo<Playlist>) => {
		return <Item playlist={info.item} />
	}, [])

	const keyExtractor = useCallback((item: Playlist) => {
		return item.uuid
	}, [])

	return (
		<Fragment>
			<Header />
			<FlatList
				{...FLATLIST_BASE_PROPS}
				data={playlists}
				renderItem={renderItem}
				keyExtractor={keyExtractor}
				showsVerticalScrollIndicator={true}
				showsHorizontalScrollIndicator={false}
				directionalLockEnabled={true}
				scrollEnabled={true}
				contentInsetAdjustmentBehavior="automatic"
				scrollIndicatorInsets={{
					top: 0,
					left: 0,
					bottom: trackPlayerToolbarHeight ?? 0,
					right: 0
				}}
				contentContainerStyle={{
					paddingBottom: (trackPlayerToolbarHeight ?? 0) + 16,
					paddingHorizontal: 16,
					paddingTop: 16
				}}
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
		</Fragment>
	)
})

TrackPlayer.displayName = "TrackPlayer"

export default TrackPlayer
