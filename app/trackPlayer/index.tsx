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
import ListEmpty from "@/components/listEmpty"
import { useTranslation } from "react-i18next"
import alerts from "@/lib/alerts"

const contentContainerStyle = {
	paddingTop: 8
}

export const TrackPlayer = memo(() => {
	const [trackPlayerToolbarHeight] = useMMKVNumber("trackPlayerToolbarHeight", mmkvInstance)
	const [refreshing, setRefreshing] = useState<boolean>(false)
	const playlistsSearchTerm = useTrackPlayerStore(useShallow(state => state.playlistsSearchTerm))
	const { screen } = useDimensions()
	const { t } = useTranslation()

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
				subTitle: t("trackPlayer.item.subTitle", {
					count: playlist.files.length,
					updated: formatMessageDate(playlist.updated)
				}),
				playlist
			})) satisfies ListItemInfo[]
	}, [playlistsQuery.data, playlistsQuery.status, playlistsSearchTerm, t])

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

	const listEmpty = useMemo(() => {
		return (
			<ListEmpty
				queryStatus={playlistsQuery.status}
				itemCount={playlists.length}
				texts={{
					error: t("trackPlayer.list.error"),
					empty: t("trackPlayer.list.empty"),
					emptySearch: t("trackPlayer.list.emptySearch")
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
	}, [playlistsQuery.status, playlists.length, t])

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
		return (
			<RefreshControl
				refreshing={refreshing}
				onRefresh={onRefresh}
			/>
		)
	}, [refreshing, onRefresh])

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
					ListEmptyComponent={listEmpty}
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
