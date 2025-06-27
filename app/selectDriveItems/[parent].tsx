import { randomUUID } from "expo-crypto"
import { useCallback, useState, useMemo, useEffect } from "react"
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
import { AdaptiveSearchHeader } from "@/components/nativewindui/AdaptiveSearchHeader"
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import cache from "@/lib/cache"
import Item, { LIST_ITEM_HEIGHT } from "@/components/selectDriveItems/item"
import { Button } from "@/components/nativewindui/Button"
import { useShallow } from "zustand/shallow"
import { type PreviewType } from "@/stores/gallery.store"
import useDimensions from "@/hooks/useDimensions"
import RequireInternet from "@/components/requireInternet"

export type ListItemInfo = {
	title: string
	subTitle: string
	id: string
	item: DriveCloudItem
}

export type SelectDriveItemsResponse =
	| {
			cancelled: false
			items: DriveCloudItem[]
	  }
	| {
			cancelled: true
	  }

export type SelectDriveItemsParams = {
	type: "file" | "directory"
	max: number
	dismissHref: string
	toMove?: string[]
	extensions?: string[]
	previewTypes?: PreviewType[]
	multiScreen?: boolean
}

export type SelectDriveItemsEvent =
	| {
			type: "request"
			data: {
				id: string
			} & SelectDriveItemsParams
	  }
	| {
			type: "response"
			data: {
				id: string
			} & SelectDriveItemsResponse
	  }

export function selectDriveItems(params: SelectDriveItemsParams): Promise<SelectDriveItemsResponse> {
	return new Promise<SelectDriveItemsResponse>(resolve => {
		const id = randomUUID()

		const sub = events.subscribe("selectDriveItems", e => {
			if (e.type === "response" && e.data.id === id) {
				sub.remove()

				resolve(e.data)
			}
		})

		events.emit("selectDriveItems", {
			type: "request",
			data: {
				...params,
				id
			}
		})
	})
}

export default function SelectDriveItems() {
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

	const header = useMemo(() => {
		return Platform.OS === "ios" ? (
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
		)
	}, [baseFolderUUID, colors.card, headerTitle, parent, cancel])

	const listEmpty = useMemo(() => {
		return (
			<View className="flex-1 items-center justify-center">
				{query.status === "success" ? (
					searchTerm.length > 0 ? (
						<Text>Nothing found</Text>
					) : (
						<Text>No items</Text>
					)
				) : (
					<ActivityIndicator color={colors.foreground} />
				)}
			</View>
		)
	}, [query.status, searchTerm, colors.foreground])

	const listFooter = useMemo(() => {
		return (
			<View className="flex flex-row items-center justify-center h-16 p-4">
				<Text className="text-sm">{items.length} items</Text>
			</View>
		)
	}, [items.length])

	const refreshControl = useMemo(() => {
		return (
			<RefreshControl
				refreshing={refreshing}
				onRefresh={async () => {
					setRefreshing(true)

					await query.refetch().catch(() => {})

					setRefreshing(false)
				}}
			/>
		)
	}, [refreshing, query])

	const getItemLayout = useCallback((_: ArrayLike<ListItemInfo> | null | undefined, index: number) => {
		return {
			length: LIST_ITEM_HEIGHT,
			offset: LIST_ITEM_HEIGHT * index,
			index
		}
	}, [])

	const { initialNumToRender, maxToRenderPerBatch } = useMemo(() => {
		return {
			initialNumToRender: Math.round(screen.height / LIST_ITEM_HEIGHT),
			maxToRenderPerBatch: Math.round(screen.height / LIST_ITEM_HEIGHT / 2)
		}
	}, [screen.height])

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
		<RequireInternet>
			{header}
			<Container>
				<List
					variant="full-width"
					data={items}
					renderItem={renderItem}
					keyExtractor={keyExtractor}
					refreshing={refreshing}
					contentInsetAdjustmentBehavior="automatic"
					contentContainerClassName="pb-16"
					ListEmptyComponent={listEmpty}
					ListFooterComponent={listFooter}
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
