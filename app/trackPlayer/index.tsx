import RequireInternet from "@/components/requireInternet"
import { usePlaylistsQuery } from "@/queries/usePlaylists.query"
import { useMemo, memo, useCallback, useState } from "react"
import Header from "@/components/trackPlayer/header"
import { useMMKVNumber } from "react-native-mmkv"
import mmkvInstance from "@/lib/mmkv"
import { RefreshControl, View } from "react-native"
import { useShallow } from "zustand/shallow"
import { useTrackPlayerStore } from "@/stores/trackPlayer.store"
import { List, type ListDataItem, type ListRenderItemInfo } from "@/components/nativewindui/List"
import Container from "@/components/Container"
import Item, { type ListItemInfo } from "@/components/trackPlayer/item"
import { formatMessageDate } from "@/lib/utils"
import ListEmpty from "@/components/listEmpty"
import { translateMemoized, t } from "@/lib/i18n"
import alerts from "@/lib/alerts"
import useNetInfo from "@/hooks/useNetInfo"

const contentContainerStyle = {
	paddingTop: 8
}

export const TrackPlayer = memo(() => {
	const [trackPlayerToolbarHeight] = useMMKVNumber("trackPlayerToolbarHeight", mmkvInstance)
	const [refreshing, setRefreshing] = useState<boolean>(false)
	const playlistsSearchTerm = useTrackPlayerStore(useShallow(state => state.playlistsSearchTerm))
	const { hasInternet } = useNetInfo()

	const playlistsQuery = usePlaylistsQuery()

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
				subTitle: t("trackPlayer.item.subTitle", {
					count: playlist.files.length,
					date: formatMessageDate(playlist.updated)
				}),
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

	const ListFooterComponent = useCallback(() => {
		return (
			<View
				style={{
					flex: 1,
					height: (trackPlayerToolbarHeight ?? 0) + 100
				}}
			/>
		)
	}, [trackPlayerToolbarHeight])

	const ListEmptyComponent = useCallback(() => {
		return (
			<ListEmpty
				queryStatus={playlistsQuery.status}
				itemCount={playlists.length}
				texts={{
					error: translateMemoized("trackPlayer.list.error"),
					empty: translateMemoized("trackPlayer.list.empty"),
					emptySearch: translateMemoized("trackPlayer.list.emptySearch")
				}}
				icons={{
					error: {
						name: "wifi-alert"
					},
					empty: {
						name: "playlist-music"
					},
					emptySearch: {
						name: "magnify"
					}
				}}
			/>
		)
	}, [playlistsQuery.status, playlists.length])

	const onRefresh = useCallback(async () => {
		setRefreshing(true)

		try {
			await playlistsQuery.refetch()
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			setRefreshing(false)
		}
	}, [playlistsQuery])

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
					ListFooterComponent={ListFooterComponent}
					ListEmptyComponent={ListEmptyComponent}
					refreshing={refreshing}
					refreshControl={refreshControl}
				/>
			</Container>
		</RequireInternet>
	)
})

TrackPlayer.displayName = "TrackPlayer"

export default TrackPlayer
