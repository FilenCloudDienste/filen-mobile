import { usePlaylistsQuery, type Playlist } from "@/queries/usePlaylistsQuery"
import { useMemo, Fragment, memo, useCallback, useState, useRef } from "react"
import Header from "@/components/trackPlayer/header"
import Item from "./item"
import { useMMKVNumber } from "react-native-mmkv"
import mmkvInstance from "@/lib/mmkv"
import { RefreshControl, View } from "react-native"
import { useShallow } from "zustand/shallow"
import { useTrackPlayerStore } from "@/stores/trackPlayer.store"
import { FlashList, type ListRenderItemInfo } from "@shopify/flash-list"
import Container from "../Container"
import useViewLayout from "@/hooks/useViewLayout"

export const TrackPlayer = memo(() => {
	const [trackPlayerToolbarHeight] = useMMKVNumber("trackPlayerToolbarHeight", mmkvInstance)
	const [refreshing, setRefreshing] = useState<boolean>(false)
	const playlistsSearchTerm = useTrackPlayerStore(useShallow(state => state.playlistsSearchTerm))
	const viewRef = useRef<View>(null)
	const { layout: listLayout, onLayout } = useViewLayout(viewRef)

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
			<Container>
				<View
					className="flex-1"
					ref={viewRef}
					onLayout={onLayout}
				>
					<FlashList
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
							paddingHorizontal: 16,
							paddingTop: 16
						}}
						ListFooterComponent={
							<View
								style={{
									flex: 1,
									height: (trackPlayerToolbarHeight ?? 0) + 16
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
						estimatedListSize={
							listLayout.width > 0 && listLayout.height > 0
								? {
										width: listLayout.width,
										height: listLayout.height
								  }
								: undefined
						}
						estimatedItemSize={74}
						drawDistance={0}
						removeClippedSubviews={true}
						disableAutoLayout={true}
					/>
				</View>
			</Container>
		</Fragment>
	)
})

TrackPlayer.displayName = "TrackPlayer"

export default TrackPlayer
