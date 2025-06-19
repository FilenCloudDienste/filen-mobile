import { memo, useMemo } from "react"
import { ListItem } from "@/components/nativewindui/List"
import { type FileVersion } from "@filen/sdk/dist/types/api/v3/file/versions"
import { formatMessageDate } from "@/lib/utils"
import RightView from "./rightView"
import { Platform, type ListRenderItemInfo } from "react-native"

export type ListItemInfo = {
	title: string
	subTitle: string
	id: string
	item: DriveCloudItem
	version: FileVersion
}

export const Item = memo(({ info }: { info: ListRenderItemInfo<ListItemInfo> }) => {
	const infoAdjusted = useMemo((): ListRenderItemInfo<ListItemInfo> => {
		return {
			...info,
			item: {
				...info.item,
				subTitle: formatMessageDate(info.item.version.timestamp)
			}
		}
	}, [info])

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
			subTitleClassName="text-xs pt-1 font-normal"
			variant="full-width"
			textNumberOfLines={1}
			subTitleNumberOfLines={1}
			isFirstInSection={false}
			isLastInSection={false}
			removeSeparator={Platform.OS === "android"}
			innerClassName="ios:py-2.5 py-2.5 android:py-2.5"
			rightView={rightView}
		/>
	)
})

Item.displayName = "Item"

export default Item
