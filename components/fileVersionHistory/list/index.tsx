import { memo, useMemo, useCallback } from "react"
import { List as ListComponent, type ListDataItem, ESTIMATED_ITEM_HEIGHT } from "@/components/nativewindui/List"
import useFileVersionsQuery from "@/queries/useFileVersionsQuery"
import { simpleDate } from "@/lib/utils"
import { type ListRenderItemInfo } from "@shopify/flash-list"
import Item, { type ListItemInfo } from "./item"
import { View } from "react-native"

export const List = memo(({ item }: { item: DriveCloudItem }) => {
	const query = useFileVersionsQuery({
		uuid: item.uuid
	})

	const versions = useMemo((): ListItemInfo[] => {
		if (!query.isSuccess) {
			return []
		}

		return query.data.versions
			.map(version => ({
				title: simpleDate(version.timestamp),
				subTitle: "...",
				id: version.uuid,
				item,
				version
			}))
			.sort((a, b) => b.version.timestamp - a.version.timestamp)
	}, [query.isSuccess, query.data, item])

	const renderItem = useCallback((info: ListRenderItemInfo<ListItemInfo>) => {
		return <Item info={info} />
	}, [])

	const keyExtractor = useCallback((item: (Omit<ListDataItem, string> & { id: string }) | string): string => {
		return typeof item === "string" ? item : item.id
	}, [])

	return (
		<View className="flex-1">
			<ListComponent
				variant="insets"
				data={versions}
				estimatedItemSize={ESTIMATED_ITEM_HEIGHT.withSubTitle}
				renderItem={renderItem}
				keyExtractor={keyExtractor}
				contentInsetAdjustmentBehavior="automatic"
				refreshing={query.status === "pending"}
			/>
		</View>
	)
})

List.displayName = "List"

export default List
