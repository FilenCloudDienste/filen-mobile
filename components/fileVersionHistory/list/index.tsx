import { memo, useMemo, useCallback } from "react"
import { List as ListComponent, type ListDataItem, type ListRenderItemInfo } from "@/components/nativewindui/List"
import useFileVersionsQuery from "@/queries/useFileVersionsQuery"
import { simpleDate } from "@/lib/utils"
import Item, { type ListItemInfo, LIST_ITEM_HEIGHT } from "./item"
import Container from "@/components/Container"
import useDimensions from "@/hooks/useDimensions"

const contentContainerStyle = {
	paddingBottom: 100
}

export const List = memo(({ item }: { item: DriveCloudItem }) => {
	const { screen } = useDimensions()

	const query = useFileVersionsQuery({
		uuid: item.uuid
	})

	const versions = useMemo((): ListItemInfo[] => {
		if (query.status !== "success") {
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
	}, [query.status, query.data, item])

	const renderItem = useCallback((info: ListRenderItemInfo<ListItemInfo>) => {
		return <Item info={info} />
	}, [])

	const keyExtractor = useCallback((item: (Omit<ListDataItem, string> & { id: string }) | string): string => {
		return typeof item === "string" ? item : item.id
	}, [])

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
		<Container>
			<ListComponent
				variant="full-width"
				data={versions}
				renderItem={renderItem}
				keyExtractor={keyExtractor}
				contentInsetAdjustmentBehavior="automatic"
				refreshing={query.status === "pending"}
				contentContainerStyle={contentContainerStyle}
				removeClippedSubviews={true}
				initialNumToRender={initialNumToRender}
				maxToRenderPerBatch={maxToRenderPerBatch}
				updateCellsBatchingPeriod={100}
				windowSize={3}
				getItemLayout={getItemLayout}
			/>
		</Container>
	)
})

List.displayName = "List"

export default List
