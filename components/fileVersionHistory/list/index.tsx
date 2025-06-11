import { memo, useMemo, useCallback, useRef } from "react"
import { List as ListComponent, type ListDataItem, ESTIMATED_ITEM_HEIGHT } from "@/components/nativewindui/List"
import useFileVersionsQuery from "@/queries/useFileVersionsQuery"
import { simpleDate } from "@/lib/utils"
import { type ListRenderItemInfo } from "@shopify/flash-list"
import Item, { type ListItemInfo } from "./item"
import Container from "@/components/Container"
import useViewLayout from "@/hooks/useViewLayout"
import { View } from "react-native"

export const List = memo(({ item }: { item: DriveCloudItem }) => {
	const viewRef = useRef<View>(null)
	const { layout: listLayout, onLayout } = useViewLayout(viewRef)

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
		<Container>
			<View
				ref={viewRef}
				onLayout={onLayout}
				className="flex-1"
			>
				<ListComponent
					variant="full-width"
					data={versions}
					renderItem={renderItem}
					keyExtractor={keyExtractor}
					contentInsetAdjustmentBehavior="automatic"
					refreshing={query.status === "pending"}
					contentContainerStyle={{
						paddingBottom: 100
					}}
					estimatedListSize={
						listLayout.width > 0 && listLayout.height > 0
							? {
									width: listLayout.width,
									height: listLayout.height
							  }
							: undefined
					}
					estimatedItemSize={ESTIMATED_ITEM_HEIGHT.withSubTitle}
					drawDistance={0}
					removeClippedSubviews={true}
					disableAutoLayout={true}
				/>
			</View>
		</Container>
	)
})

List.displayName = "List"

export default List
