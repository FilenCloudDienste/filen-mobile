import { memo, useMemo } from "react"
import { ListItem } from "@/components/nativewindui/List"
import { type FileVersion } from "@filen/sdk/dist/types/api/v3/file/versions"
import { type ListRenderItemInfo } from "@shopify/flash-list"
import useGetItemQuery from "@/queries/useGetItemQuery"
import { formatBytes } from "@/lib/utils"
import RightView from "./rightView"

export type ListItemInfo = {
	title: string
	subTitle: string
	id: string
	item: DriveCloudItem
	version: FileVersion
}

export const Item = memo(({ info }: { info: ListRenderItemInfo<ListItemInfo> }) => {
	const getItemQuery = useGetItemQuery({
		item: info.item.item
	})

	const infoAdjusted = useMemo((): ListRenderItemInfo<ListItemInfo> => {
		if (!getItemQuery.isSuccess || getItemQuery.data.type !== "file") {
			return info
		}

		return {
			...info,
			item: {
				...info.item,
				subTitle: formatBytes(getItemQuery.data.size)
			}
		}
	}, [info, getItemQuery.isSuccess, getItemQuery.data])

	const rightView = useMemo(() => {
		return (
			<RightView
				item={info.item.item}
				version={info.item.version}
			/>
		)
	}, [info.item.item, info.item.version])

	return (
		<ListItem
			{...infoAdjusted}
			className="overflow-hidden"
			subTitleClassName="text-xs"
			variant="full-width"
			textNumberOfLines={1}
			subTitleNumberOfLines={1}
			isFirstInSection={false}
			isLastInSection={false}
			rightView={rightView}
		/>
	)
})

Item.displayName = "Item"

export default Item
