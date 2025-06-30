import { memo, useCallback, useEffect, useState, useMemo } from "react"
import nodeWorker from "@/lib/nodeWorker"
import { View } from "react-native"
import { Text } from "@/components/nativewindui/Text"
import alerts from "@/lib/alerts"
import { List, type ListDataItem, type ListRenderItemInfo } from "@/components/nativewindui/List"
import useCloudItemsQuery from "@/queries/useCloudItemsQuery"
import ListItem, { type ListItemInfo, LIST_ITEM_HEIGHT } from "@/components/drive/list/listItem"
import { orderItemsByType, simpleDate, formatBytes } from "@/lib/utils"
import { useDebouncedCallback } from "use-debounce"
import cache from "@/lib/cache"
import { type SearchFindItemDecrypted } from "@filen/sdk/dist/types/api/v3/search/find"
import useDimensions from "@/hooks/useDimensions"
import { useTranslation } from "react-i18next"
import ListEmpty from "@/components/listEmpty"

export const Search = memo(({ searchTerm, queryParams }: { searchTerm: string; queryParams: FetchCloudItemsParams }) => {
	const [isLoading, setIsLoading] = useState<boolean>(false)
	const [result, setResults] = useState<SearchFindItemDecrypted[]>([])
	const { screen } = useDimensions()
	const { t } = useTranslation()

	const query = useCloudItemsQuery({
		...queryParams,
		enabled: false
	})

	const items = useMemo((): ListItemInfo[] => {
		if (isLoading) {
			return []
		}

		const searchTermLowerCase = searchTerm.toLowerCase().trim()

		if (searchTermLowerCase.length === 0) {
			return []
		}

		const queryItems: DriveCloudItem[] =
			query.status === "success"
				? query.data.filter(item => item.name.toLowerCase().includes(searchTermLowerCase))
				: ([] satisfies DriveCloudItem[])

		const searchItems = result
			.map(item => {
				let driveItem: DriveCloudItem | null = null

				if (item.type === "directory") {
					driveItem = {
						uuid: item.uuid,
						type: "directory",
						name: item.metadataDecrypted.name,
						lastModified: item.timestamp,
						size: 0,
						selected: false,
						isShared: false,
						favorited: item.favorited,
						timestamp: item.timestamp,
						parent: item.parent,
						color: item.color,
						path: `/${item.metadataPathDecrypted.slice(1).join("/")}`
					} satisfies DriveCloudItem
				} else {
					if (item.versioned || item.trash) {
						return null
					}

					driveItem = {
						uuid: item.uuid,
						type: "file",
						name: item.metadataDecrypted.name,
						size: item.metadataDecrypted.size,
						hash: item.metadataDecrypted.hash,
						mime: item.metadataDecrypted.mime,
						creation: item.metadataDecrypted.creation,
						lastModified: item.metadataDecrypted.lastModified,
						chunks: item.chunks,
						region: item.region,
						selected: false,
						favorited: item.favorited,
						isShared: false,
						timestamp: item.timestamp,
						parent: item.parent,
						rm: "",
						version: item.version,
						key: item.metadataDecrypted.key,
						bucket: item.bucket,
						path: `/${item.metadataPathDecrypted.slice(1).join("/")}`
					} satisfies DriveCloudItem
				}

				return driveItem as DriveCloudItem
			})
			.filter(item => item !== null)

		const combined = Array.from(new Map(queryItems.concat(searchItems).map(item => [item.uuid, item])).values()).map(item => ({
			...item,
			thumbnail: cache.availableThumbnails.get(item.uuid)
		}))

		const sorted = orderItemsByType({
			items: combined,
			type: "nameAsc"
		}).map(item => ({
			id: item.uuid,
			title: item.name,
			subTitle: `${item.path && item.path.length > 0 ? item.path + " - " : ""}${
				item.type === "directory" ? simpleDate(item.lastModified) : `${formatBytes(item.size)}  -  ${simpleDate(item.lastModified)}`
			}`,
			item
		}))

		for (const item of sorted) {
			if (item.item.type === "directory") {
				cache.directoryUUIDToName.set(item.item.uuid, item.item.name)
			}
		}

		return sorted
	}, [query.status, query.data, searchTerm, result, isLoading])

	const driveItems = useMemo(() => {
		return items.map(item => item.item)
	}, [items])

	const keyExtractor = useCallback((item: (Omit<ListDataItem, string> & { id: string }) | string): string => {
		return typeof item === "string" ? item : item.id
	}, [])

	const renderItem = useCallback(
		(info: ListRenderItemInfo<ListItemInfo>) => {
			return (
				<ListItem
					info={info}
					queryParams={queryParams}
					items={driveItems}
					itemSize={0}
					spacing={0}
					fromSearch={true}
				/>
			)
		},
		[queryParams, driveItems]
	)

	const debouncedSearch = useDebouncedCallback(async (searchValue: string) => {
		if (searchValue.trim().length === 0) {
			setResults([])

			return
		}

		setIsLoading(true)

		try {
			const result = await nodeWorker.proxy("queryGlobalSearch", searchValue)

			setResults(result)
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}

			setResults([])
		} finally {
			setIsLoading(false)
		}
	}, 1000)

	const listFooter = useMemo(() => {
		if (isLoading || items.length === 0) {
			return undefined
		}

		return (
			<View className="h-16 flex-row items-center justify-center">
				<Text className="text-sm">
					{t("drive.search.list.footer", {
						count: items.length
					})}
				</Text>
			</View>
		)
	}, [items.length, t, isLoading])

	const listEmpty = useMemo(() => {
		return (
			<ListEmpty
				queryStatus={isLoading ? "pending" : "success"}
				itemCount={items.length}
				texts={{
					error: t("drive.search.list.error"),
					empty: t("drive.search.list.empty"),
					emptySearch: t("drive.search.list.emptySearch")
				}}
				icons={{
					error: {
						name: "wifi-alert"
					},
					empty: {
						name: "file-document-multiple"
					},
					emptySearch: {
						name: "magnify"
					}
				}}
			/>
		)
	}, [t, items.length, isLoading])

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

	useEffect(() => {
		if (searchTerm.length === 0) {
			setResults([])
			setIsLoading(false)
		} else {
			setIsLoading(true)

			debouncedSearch(searchTerm)
		}
	}, [searchTerm, debouncedSearch])

	return (
		<List
			variant="full-width"
			data={items}
			renderItem={renderItem}
			keyExtractor={keyExtractor}
			contentInsetAdjustmentBehavior="automatic"
			keyboardDismissMode="none"
			keyboardShouldPersistTaps="never"
			refreshing={isLoading}
			ListEmptyComponent={listEmpty}
			ListFooterComponent={listFooter}
			removeClippedSubviews={true}
			initialNumToRender={initialNumToRender}
			maxToRenderPerBatch={maxToRenderPerBatch}
			updateCellsBatchingPeriod={100}
			windowSize={3}
			getItemLayout={getItemLayout}
		/>
	)
})

Search.displayName = "Search"

export default Search
