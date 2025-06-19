import { type ListRenderItemInfo, RefreshControl, View, Platform } from "react-native"
import { usePlaylistsQuery, updatePlaylist, type Playlist as PlaylistType } from "@/queries/usePlaylistsQuery"
import { useMemo, Fragment, memo, useCallback, useRef, useState } from "react"
import Header from "@/components/trackPlayer/header"
import { useLocalSearchParams } from "expo-router"
import { useMMKVNumber } from "react-native-mmkv"
import mmkvInstance from "@/lib/mmkv"
import ReorderableList, { type ReorderableListReorderEvent, reorderItems } from "react-native-reorderable-list"
import queryUtils from "@/queries/utils"
import Semaphore from "@/lib/semaphore"
import alerts from "@/lib/alerts"
import { useShallow } from "zustand/shallow"
import { useTrackPlayerStore } from "@/stores/trackPlayer.store"
import Container from "@/components/Container"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import Item, { type ListItemInfo, LIST_ITEM_HEIGHT } from "./item"
import { type ListDataItem } from "@/components/nativewindui/List"
import useDimensions from "@/hooks/useDimensions"

export const Playlist = memo(() => {
	const { playlist: passedPlaylist } = useLocalSearchParams()
	const [trackPlayerToolbarHeight] = useMMKVNumber("trackPlayerToolbarHeight", mmkvInstance)
	const updatePlaylistRemoteMutex = useRef<Semaphore>(new Semaphore(1))
	const [refreshing, setRefreshing] = useState<boolean>(false)
	const playlistSearchTerm = useTrackPlayerStore(useShallow(state => state.playlistSearchTerm))
	const { screen } = useDimensions()

	const playlistsQuery = usePlaylistsQuery({
		enabled: false
	})

	const playlist = useMemo(() => {
		if (playlistsQuery.status !== "success") {
			return null
		}

		return playlistsQuery.data.find(p => p.uuid === passedPlaylist) ?? null
	}, [playlistsQuery.data, playlistsQuery.status, passedPlaylist])

	const files = useMemo(() => {
		if (!playlist) {
			return []
		}

		const playlistSearchTermNormalized = playlistSearchTerm.toLowerCase().trim()

		return (
			playlistSearchTermNormalized.length > 0
				? playlist.files.filter(file => file.name.toLowerCase().trim().includes(playlistSearchTermNormalized))
				: playlist.files
		).map(file => ({
			id: file.uuid,
			title: file.name,
			subTitle: file.name,
			playlist,
			file
		})) satisfies ListItemInfo[]
	}, [playlist, playlistSearchTerm])

	const handleReorder = useCallback(
		async (e: ReorderableListReorderEvent) => {
			if (!playlist) {
				return
			}

			fullScreenLoadingModal.show()

			await updatePlaylistRemoteMutex.current.acquire()

			try {
				const newPlaylist = {
					...playlist,
					files: reorderItems(playlist.files, e.from, e.to)
				} satisfies PlaylistType

				await updatePlaylist({
					...newPlaylist,
					updated: Date.now()
				})

				queryUtils.usePlaylistsQuerySet({
					updater: prev => prev.map(p => (p.uuid === playlist.uuid ? newPlaylist : p))
				})
			} catch (e) {
				console.error(e)

				if (e instanceof Error) {
					alerts.error(e.message)
				}
			} finally {
				fullScreenLoadingModal.hide()

				updatePlaylistRemoteMutex.current.release()
			}
		},
		[playlist]
	)

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
				<View className="flex-1">
					<ReorderableList
						data={files}
						onReorder={handleReorder}
						renderItem={renderItem}
						keyExtractor={keyExtractor}
						contentContainerStyle={{
							paddingTop: 8
						}}
						showsVerticalScrollIndicator={true}
						showsHorizontalScrollIndicator={false}
						contentInsetAdjustmentBehavior="automatic"
						scrollIndicatorInsets={{
							top: 0,
							left: 0,
							bottom: trackPlayerToolbarHeight ?? 0,
							right: 0
						}}
						ListFooterComponent={
							<View
								style={{
									flex: 1,
									height: (trackPlayerToolbarHeight ?? 0) + 100
								}}
							/>
						}
						refreshing={Platform.OS === "ios" ? refreshing : false}
						refreshControl={
							Platform.OS === "ios" ? (
								<RefreshControl
									refreshing={refreshing}
									onRefresh={async () => {
										setRefreshing(true)

										await playlistsQuery.refetch().catch(console.error)

										setRefreshing(false)
									}}
								/>
							) : undefined
						}
						initialNumToRender={Math.round(screen.height / LIST_ITEM_HEIGHT)}
						maxToRenderPerBatch={Math.round(screen.height / LIST_ITEM_HEIGHT / 2)}
						updateCellsBatchingPeriod={100}
						windowSize={3}
						getItemLayout={(_, index) => {
							return {
								length: LIST_ITEM_HEIGHT,
								offset: LIST_ITEM_HEIGHT * index,
								index
							}
						}}
					/>
				</View>
			</Container>
		</Fragment>
	)
})

Playlist.displayName = "Playlist"

export default Playlist
