import { usePlaylistsQuery } from "@/queries/usePlaylistsQuery"
import RequireInternet from "@/components/requireInternet"
import { useCallback, useState, useMemo, useEffect } from "react"
import events from "@/lib/events"
import { RefreshControl, Platform, View } from "react-native"
import { Text } from "@/components/nativewindui/Text"
import { useColorScheme } from "@/lib/useColorScheme"
import { useLocalSearchParams, useRouter } from "expo-router"
import Container from "@/components/Container"
import { useSelectTrackPlayerPlaylistsStore } from "@/stores/selectTrackPlayerPlaylists.store"
import { AdaptiveSearchHeader } from "@/components/nativewindui/AdaptiveSearchHeader"
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import Item, { type ListItemInfo, LIST_ITEM_HEIGHT } from "@/components/trackPlayer/item"
import { formatMessageDate } from "@/lib/utils"
import { Button } from "@/components/nativewindui/Button"
import { useShallow } from "zustand/shallow"
import { List, type ListDataItem, type ListRenderItemInfo } from "@/components/nativewindui/List"
import useDimensions from "@/hooks/useDimensions"
import alerts from "@/lib/alerts"
import { useTranslation } from "react-i18next"
import ListEmpty from "@/components/listEmpty"

const contentContainerStyle = {
	paddingTop: 8
}

export default function SelectTrackPlayerPlaylists() {
	const { colors } = useColorScheme()
	const { id, max, dismissHref } = useLocalSearchParams()
	const [refreshing, setRefreshing] = useState<boolean>(false)
	const [searchTerm, setSearchTerm] = useState<string>("")
	const { canGoBack: routerCanGoBack, dismissTo: routerDismissTo } = useRouter()
	const setSelectedPlaylists = useSelectTrackPlayerPlaylistsStore(useShallow(state => state.setSelectedPlaylists))
	const { screen } = useDimensions()
	const { t } = useTranslation()

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
				subTitle: t("selectTrackPlayerPlaylists.item.subTitle", {
					count: playlist.files.length,
					updated: formatMessageDate(playlist.updated)
				}),
				playlist
			})) satisfies ListItemInfo[]
	}, [playlistsQuery.data, playlistsQuery.status, searchTerm, t])

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

	const listEmpty = useMemo(() => {
		return (
			<ListEmpty
				queryStatus={playlistsQuery.status}
				itemCount={playlists.length}
				texts={{
					error: t("selectTrackPlayerPlaylists.list.error"),
					empty: t("selectTrackPlayerPlaylists.list.empty"),
					emptySearch: t("selectTrackPlayerPlaylists.list.emptySearch")
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

	const listFooter = useMemo(() => {
		if (playlists.length === 0) {
			return undefined
		}

		return (
			<View className="flex flex-row items-center justify-center h-16 p-4">
				<Text className="text-sm">
					{t("selectTrackPlayerPlaylists.list.footer", {
						count: playlists.length
					})}
				</Text>
			</View>
		)
	}, [playlists.length, t])

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

	const header = useMemo(() => {
		return Platform.OS === "ios" ? (
			<AdaptiveSearchHeader
				iosTitle={
					maxParsed === 1
						? t("selectTrackPlayerPlaylists.header.selectPlaylist")
						: t("selectTrackPlayerPlaylists.header.selectPlaylists")
				}
				iosIsLargeTitle={false}
				iosBackButtonMenuEnabled={true}
				backgroundColor={colors.card}
				rightView={() => {
					return (
						<Button
							variant="plain"
							onPress={cancel}
						>
							<Text className="text-blue-500">{t("selectTrackPlayerPlaylists.header.cancel")}</Text>
						</Button>
					)
				}}
				searchBar={{
					iosHideWhenScrolling: false,
					onChangeText: setSearchTerm,
					contentTransparent: true,
					persistBlur: true
				}}
			/>
		) : (
			<LargeTitleHeader
				title={
					maxParsed === 1
						? t("selectTrackPlayerPlaylists.header.selectPlaylist")
						: t("selectTrackPlayerPlaylists.header.selectPlaylists")
				}
				materialPreset="inline"
				backVisible={false}
				backgroundColor={colors.card}
				rightView={() => {
					return (
						<Button
							variant="plain"
							onPress={cancel}
						>
							<Text className="text-blue-500">{t("selectTrackPlayerPlaylists.header.cancel")}</Text>
						</Button>
					)
				}}
				searchBar={{
					onChangeText: setSearchTerm,
					contentTransparent: true,
					persistBlur: true
				}}
			/>
		)
	}, [cancel, colors.card, maxParsed, t])

	useEffect(() => {
		setSelectedPlaylists([])

		return () => {
			events.emit("selectTrackPlayerPlaylists", {
				type: "response",
				data: {
					id: typeof id === "string" ? id : "none",
					cancelled: true
				}
			})
		}
	}, [id, setSelectedPlaylists])

	return (
		<RequireInternet>
			{header}
			<Container>
				<List
					data={playlists}
					renderItem={renderItem}
					keyExtractor={keyExtractor}
					showsVerticalScrollIndicator={true}
					showsHorizontalScrollIndicator={false}
					contentInsetAdjustmentBehavior="automatic"
					contentContainerStyle={contentContainerStyle}
					ListEmptyComponent={listEmpty}
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
}
