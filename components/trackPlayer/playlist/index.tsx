import { type ListRenderItemInfo, RefreshControl } from "react-native"
import { usePlaylistsQuery, type PlaylistFile, updatePlaylist, type Playlist as PlaylistType } from "@/queries/usePlaylistsQuery"
import { useMemo, Fragment, memo, useCallback, useRef, useState } from "react"
import Header from "@/components/trackPlayer/header"
import { useLocalSearchParams } from "expo-router"
import { useMMKVNumber } from "react-native-mmkv"
import mmkvInstance from "@/lib/mmkv"
import Item from "./item"
import ReorderableList, { type ReorderableListReorderEvent, reorderItems } from "react-native-reorderable-list"
import queryUtils from "@/queries/utils"
import Semaphore from "@/lib/semaphore"
import alerts from "@/lib/alerts"
import { useShallow } from "zustand/shallow"
import { useTrackPlayerStore } from "@/stores/trackPlayer.store"

export const Playlist = memo(() => {
	const { playlist: passedPlaylist } = useLocalSearchParams()
	const [trackPlayerToolbarHeight] = useMMKVNumber("trackPlayerToolbarHeight", mmkvInstance)
	const updatePlaylistRemoteMutex = useRef<Semaphore>(new Semaphore(1))
	const [refreshing, setRefreshing] = useState<boolean>(false)
	const playlistSearchTerm = useTrackPlayerStore(useShallow(state => state.playlistSearchTerm))

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

		if (playlistSearchTermNormalized.length > 0) {
			return playlist.files.filter(file => file.name.toLowerCase().trim().includes(playlistSearchTermNormalized))
		}

		return playlist.files
	}, [playlist, playlistSearchTerm])

	const handleReorder = useCallback(
		async (e: ReorderableListReorderEvent) => {
			if (!playlist) {
				return
			}

			const oldPlaylist = JSON.parse(JSON.stringify(playlist)) as PlaylistType
			const newPlaylist = {
				...playlist,
				files: reorderItems(playlist.files, e.from, e.to)
			} satisfies PlaylistType

			queryUtils.usePlaylistsQuerySet({
				updater: prev => prev.map(p => (p.uuid === playlist.uuid ? newPlaylist : p))
			})

			await updatePlaylistRemoteMutex.current.acquire()

			try {
				await updatePlaylist({
					...newPlaylist,
					updated: Date.now()
				})
			} catch (e) {
				console.error(e)

				if (e instanceof Error) {
					alerts.error(e.message)
				}

				queryUtils.usePlaylistsQuerySet({
					updater: prev => prev.map(p => (p.uuid === playlist.uuid ? oldPlaylist : p))
				})
			} finally {
				updatePlaylistRemoteMutex.current.release()
			}
		},
		[playlist]
	)

	const renderItem = useCallback(
		(info: ListRenderItemInfo<PlaylistFile>) => {
			if (!playlist) {
				return null
			}

			return (
				<Item
					file={info.item}
					index={info.index}
					playlist={playlist}
				/>
			)
		},
		[playlist]
	)

	const keyExtractor = useCallback((item: PlaylistFile) => {
		return item.uuid
	}, [])

	return (
		<Fragment>
			<Header />
			<ReorderableList
				data={files}
				onReorder={handleReorder}
				renderItem={renderItem}
				keyExtractor={keyExtractor}
				style={{
					flex: 1,
					paddingHorizontal: 16,
					paddingTop: 16
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
				contentContainerStyle={{
					paddingBottom: (trackPlayerToolbarHeight ?? 0) + 16
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

Playlist.displayName = "Playlist"

export default Playlist
