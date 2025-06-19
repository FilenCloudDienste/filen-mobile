import { useCallback, useState, useMemo, Fragment, useEffect, memo } from "react"
import events from "@/lib/events"
import { RefreshControl, Platform } from "react-native"
import { Text } from "@/components/nativewindui/Text"
import { useColorScheme } from "@/lib/useColorScheme"
import { useLocalSearchParams, useRouter } from "expo-router"
import Container from "@/components/Container"
import { useSelectTrackPlayerPlaylistsStore } from "@/stores/selectTrackPlayerPlaylists.store"
import { AdaptiveSearchHeader } from "../nativewindui/AdaptiveSearchHeader"
import { LargeTitleHeader } from "../nativewindui/LargeTitleHeader"
import Item, { type ListItemInfo, LIST_ITEM_HEIGHT } from "../trackPlayer/item"
import { formatMessageDate } from "@/lib/utils"
import { Button } from "../nativewindui/Button"
import { useShallow } from "zustand/shallow"
import usePlaylistsQuery from "@/queries/usePlaylistsQuery"
import { List, type ListDataItem, type ListRenderItemInfo } from "../nativewindui/List"
import useDimensions from "@/hooks/useDimensions"

export const SelectTrackPlayerPlaylists = memo(() => {
	const { colors } = useColorScheme()
	const { id, max, dismissHref } = useLocalSearchParams()
	const [refreshing, setRefreshing] = useState<boolean>(false)
	const [searchTerm, setSearchTerm] = useState<string>("")
	const { canGoBack: routerCanGoBack, dismissTo: routerDismissTo } = useRouter()
	const setSelectedPlaylists = useSelectTrackPlayerPlaylistsStore(useShallow(state => state.setSelectedPlaylists))
	const { screen } = useDimensions()

	const playlistsQuery = usePlaylistsQuery({})

	const maxParsed = useMemo(() => {
		return typeof max === "string" ? parseInt(max) : 1
	}, [max])

	const playlists = useMemo(() => {
		if (playlistsQuery.status !== "success") {
			return []
		}

		const playlistsSearchTermNormalized = searchTerm.toLowerCase().trim()

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
	}, [playlistsQuery.data, playlistsQuery.status, searchTerm])

	const renderItem = useCallback(
		(info: ListRenderItemInfo<ListItemInfo>) => {
			return (
				<Item
					info={info}
					fromSelect={{
						max: maxParsed
					}}
				/>
			)
		},
		[maxParsed]
	)

	const keyExtractor = useCallback((item: (Omit<ListDataItem, string> & { id: string }) | string): string => {
		return typeof item === "string" ? item : item.id
	}, [])

	const cancel = useCallback(() => {
		if (!routerCanGoBack()) {
			return
		}

		events.emit("selectTrackPlayerPlaylists", {
			type: "response",
			data: {
				id: typeof id === "string" ? id : "none",
				cancelled: true
			}
		})

		routerDismissTo(typeof dismissHref === "string" ? dismissHref : "/drive")
	}, [id, routerCanGoBack, routerDismissTo, dismissHref])

	useEffect(() => {
		setSelectedPlaylists([])

		return () => {
			events.emit("selectDriveItems", {
				type: "response",
				data: {
					id: typeof id === "string" ? id : "none",
					cancelled: true
				}
			})
		}
	}, [id, setSelectedPlaylists])

	return (
		<Fragment>
			{Platform.OS === "ios" ? (
				<AdaptiveSearchHeader
					iosTitle={maxParsed === 1 ? "Select playlist" : "Select playlists"}
					iosIsLargeTitle={false}
					iosBackButtonMenuEnabled={true}
					backgroundColor={colors.card}
					rightView={() => {
						return (
							<Button
								variant="plain"
								onPress={cancel}
							>
								<Text className="text-blue-500">Cancel</Text>
							</Button>
						)
					}}
					searchBar={{
						iosHideWhenScrolling: false,
						onChangeText: text => setSearchTerm(text),
						contentTransparent: true,
						persistBlur: true
					}}
				/>
			) : (
				<LargeTitleHeader
					title={maxParsed === 1 ? "Select playlist" : "Select playlists"}
					materialPreset="inline"
					backVisible={false}
					backgroundColor={colors.card}
					rightView={() => {
						return (
							<Button
								variant="plain"
								onPress={cancel}
							>
								<Text className="text-blue-500">Cancel</Text>
							</Button>
						)
					}}
					searchBar={{
						onChangeText: text => setSearchTerm(text),
						contentTransparent: true,
						persistBlur: true
					}}
				/>
			)}
			<Container>
				<List
					data={playlists}
					renderItem={renderItem}
					keyExtractor={keyExtractor}
					showsVerticalScrollIndicator={true}
					showsHorizontalScrollIndicator={false}
					contentInsetAdjustmentBehavior="automatic"
					contentContainerStyle={{
						paddingTop: 8
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
					removeClippedSubviews={true}
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
			</Container>
		</Fragment>
	)
})

SelectTrackPlayerPlaylists.displayName = "SelectTrackPlayerPlaylists"

export default SelectTrackPlayerPlaylists
