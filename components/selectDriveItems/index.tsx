import { useCallback, useState, useMemo, Fragment, useEffect, memo } from "react"
import events from "@/lib/events"
import useCloudItemsQuery from "@/queries/useCloudItemsQuery"
import { List, type ListDataItem, type ListRenderItemInfo } from "@/components/nativewindui/List"
import { RefreshControl, View, Platform } from "react-native"
import { Text } from "@/components/nativewindui/Text"
import { ActivityIndicator } from "@/components/nativewindui/ActivityIndicator"
import { useColorScheme } from "@/lib/useColorScheme"
import { useLocalSearchParams, useRouter } from "expo-router"
import Container from "@/components/Container"
import { useSelectDriveItemsStore } from "@/stores/selectDriveItems.store"
import { simpleDate, formatBytes, orderItemsByType } from "@/lib/utils"
import useSDKConfig from "@/hooks/useSDKConfig"
import { AdaptiveSearchHeader } from "../nativewindui/AdaptiveSearchHeader"
import { LargeTitleHeader } from "../nativewindui/LargeTitleHeader"
import cache from "@/lib/cache"
import Item, { LIST_ITEM_HEIGHT } from "./item"
import { Button } from "../nativewindui/Button"
import { useShallow } from "zustand/shallow"
import { type PreviewType } from "@/stores/gallery.store"
import useDimensions from "@/hooks/useDimensions"

export type ListItemInfo = {
	title: string
	subTitle: string
	id: string
	item: DriveCloudItem
}

export const SelectDriveItems = memo(() => {
	const { colors } = useColorScheme()
	const { id, type, max, parent, dismissHref, toMove, previewTypes, extensions, multiScreen } = useLocalSearchParams()
	const [refreshing, setRefreshing] = useState<boolean>(false)
	const [searchTerm, setSearchTerm] = useState<string>("")
	const { canGoBack: routerCanGoBack, dismissTo: routerDismissTo } = useRouter()
	const setSelectedItems = useSelectDriveItemsStore(useShallow(state => state.setSelectedItems))
	const [{ baseFolderUUID }] = useSDKConfig()
	const { screen } = useDimensions()

	const maxParsed = useMemo(() => {
		return typeof max === "string" ? parseInt(max) : 1
	}, [max])

	const typeParsed = useMemo(() => {
		return typeof type === "string" ? (type as "file" | "directory") : "directory"
	}, [type])

	const toMoveParsed = useMemo(() => {
		return typeof toMove === "string" ? (JSON.parse(toMove) as string[]) : []
	}, [toMove])

	const previewTypesParsed = useMemo(() => {
		return typeof previewTypes === "string" ? (JSON.parse(previewTypes) as PreviewType[]) : []
	}, [previewTypes])

	const extensionsParsed = useMemo(() => {
		return typeof extensions === "string" ? (JSON.parse(extensions) as string[]) : []
	}, [extensions])

	const multiScreenParsed = useMemo(() => {
		return typeof multiScreen === "string" ? parseInt(multiScreen) === 1 : false
	}, [multiScreen])

	const queryParams = useMemo(
		(): FetchCloudItemsParams => ({
			parent: typeof parent === "string" ? parent : baseFolderUUID,
			of: "drive",
			receiverId: 0
		}),
		[parent, baseFolderUUID]
	)

	const query = useCloudItemsQuery(queryParams)

	const items = useMemo((): ListItemInfo[] => {
		if (!query.isSuccess) {
			return []
		}

		let queryItems = orderItemsByType({
			items: query.data,
			type: "nameAsc"
		}).map(item => ({
			id: item.uuid,
			title: `${item.favorited ? "(F) " : ""}${item.name}`,
			subTitle:
				item.type === "directory"
					? simpleDate(item.lastModified)
					: `${simpleDate(item.lastModified)}  -  ${formatBytes(item.size)}`,
			item
		}))

		if (searchTerm.length > 0) {
			const searchTermLowerCase = searchTerm.toLowerCase()

			queryItems = queryItems.filter(
				item => item.title.toLowerCase().includes(searchTermLowerCase) || item.subTitle.toLowerCase().includes(searchTermLowerCase)
			)
		}

		return queryItems
	}, [query.isSuccess, query.data, searchTerm])

	const keyExtractor = useCallback((item: (Omit<ListDataItem, string> & { id: string }) | string): string => {
		return typeof item === "string" ? item : item.id
	}, [])

	const renderItem = useCallback(
		(info: ListRenderItemInfo<ListItemInfo>) => {
			return (
				<Item
					info={info}
					max={maxParsed}
					type={typeParsed}
					toMove={toMoveParsed}
					queryParams={queryParams}
					previewTypes={previewTypesParsed}
					extensions={extensionsParsed}
				/>
			)
		},
		[maxParsed, typeParsed, toMoveParsed, queryParams, previewTypesParsed, extensionsParsed]
	)

	const headerTitle = useMemo(() => {
		return typeof parent !== "string" || !cache.directoryUUIDToName.has(parent)
			? typeParsed === "file"
				? maxParsed === 1
					? "Select file"
					: "Select files"
				: maxParsed === 1
				? "Select directory"
				: "Select directories"
			: cache.directoryUUIDToName.get(parent) ?? "Drive"
	}, [parent, typeParsed, maxParsed])

	const cancel = useCallback(() => {
		if (!routerCanGoBack()) {
			return
		}

		events.emit("selectDriveItems", {
			type: "response",
			data: {
				id: typeof id === "string" ? id : "none",
				cancelled: true
			}
		})

		routerDismissTo(typeof dismissHref === "string" ? dismissHref : "/drive")
	}, [id, routerCanGoBack, routerDismissTo, dismissHref])

	useEffect(() => {
		if (!multiScreenParsed) {
			setSelectedItems([])
		}

		return () => {
			if (typeof parent === "string" && parent === baseFolderUUID) {
				events.emit("selectDriveItems", {
					type: "response",
					data: {
						id: typeof id === "string" ? id : "none",
						cancelled: true
					}
				})
			}
		}
	}, [id, setSelectedItems, parent, baseFolderUUID, multiScreenParsed])

	return (
		<Fragment>
			{Platform.OS === "ios" ? (
				<AdaptiveSearchHeader
					iosTitle={headerTitle}
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
					title={headerTitle}
					materialPreset="inline"
					backVisible={parent !== baseFolderUUID}
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
					variant="full-width"
					data={items}
					renderItem={renderItem}
					keyExtractor={keyExtractor}
					refreshing={refreshing}
					contentInsetAdjustmentBehavior="automatic"
					contentContainerClassName="pb-16"
					ListEmptyComponent={
						<View className="flex-1 items-center justify-center">
							{query.isSuccess ? (
								searchTerm.length > 0 ? (
									<Text>Nothing found</Text>
								) : (
									<Text>No items</Text>
								)
							) : (
								<ActivityIndicator color={colors.foreground} />
							)}
						</View>
					}
					ListFooterComponent={
						<View className="flex flex-row items-center justify-center h-16 p-4">
							<Text className="text-sm">{items.length} items</Text>
						</View>
					}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={async () => {
								setRefreshing(true)

								await query.refetch().catch(() => {})

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

SelectDriveItems.displayName = "SelectDriveItems"

export default SelectDriveItems
