import { useRouter } from "expo-router"
import { memo, useCallback, useMemo } from "react"
import { ListItem as ListItemComponent } from "@/components/nativewindui/List"
import { type ListRenderItemInfo } from "@shopify/flash-list"
import { useSelectDriveItemsStore } from "@/stores/selectDriveItems.store"
import { useDirectorySizeQueryNoFocusRefetch } from "@/queries/useDirectorySizeQuery"
import { formatBytes } from "@/lib/utils"
import LeftView from "./leftView"
import { useShallow } from "zustand/shallow"

export type ListItemInfo = {
	title: string
	subTitle: string
	id: string
	item: DriveCloudItem
}

export const Item = memo(
	({
		info,
		max,
		type,
		toMove,
		queryParams
	}: {
		info: ListRenderItemInfo<ListItemInfo>
		max: number
		type: "file" | "directory"
		toMove: string[]
		queryParams: FetchCloudItemsParams
	}) => {
		const { push: routerPush } = useRouter()
		const setSelectedItems = useSelectDriveItemsStore(useShallow(state => state.setSelectedItems))
		const isSelected = useSelectDriveItemsStore(useShallow(state => state.selectedItems.some(i => i.uuid === info.item.item.uuid)))
		const selectedItemsCount = useSelectDriveItemsStore(useShallow(state => state.selectedItems.length))
		const directorySize = useDirectorySizeQueryNoFocusRefetch({
			uuid: info.item.item.uuid,
			enabled: info.item.item.type === "directory"
		})

		const canSelect = useMemo(() => {
			if (isSelected) {
				return true
			}

			if (selectedItemsCount >= max || info.item.item.type !== type || toMove.includes(info.item.item.uuid)) {
				return false
			}

			return true
		}, [selectedItemsCount, info.item.item.type, max, type, isSelected, info.item.item.uuid, toMove])

		const item = useMemo(() => {
			if (info.item.item.type !== "directory" || !directorySize.isSuccess) {
				return info.item
			}

			return {
				...info.item,
				subTitle: `${info.item.subTitle}  -  ${formatBytes(directorySize.data.size)}`
			}
		}, [info.item, directorySize.isSuccess, directorySize.data])

		const select = useCallback(() => {
			if (!canSelect) {
				return
			}

			setSelectedItems(prev =>
				isSelected
					? prev.filter(i => i.uuid !== info.item.item.uuid)
					: [...prev.filter(i => i.uuid !== info.item.item.uuid), info.item.item]
			)
		}, [info.item.item, setSelectedItems, isSelected, canSelect])

		const leftView = useMemo(() => {
			return (
				<LeftView
					item={info.item.item}
					select={select}
					isSelected={isSelected}
					canSelect={canSelect}
					queryParams={queryParams}
				/>
			)
		}, [info.item.item, select, isSelected, canSelect, queryParams])

		const onPress = useCallback(() => {
			if (toMove.includes(info.item.item.uuid)) {
				return
			}

			if (info.item.item.type === "directory") {
				routerPush({
					pathname: "/selectDriveItems/[parent]",
					params: {
						parent: info.item.item.uuid
					}
				})

				return
			}

			select()
		}, [info.item.item.type, info.item.item.uuid, routerPush, select, toMove])

		return (
			<ListItemComponent
				{...info}
				item={item}
				className="overflow-hidden"
				leftView={leftView}
				subTitleClassName="text-xs"
				variant="full-width"
				textNumberOfLines={1}
				subTitleNumberOfLines={1}
				isFirstInSection={false}
				isLastInSection={false}
				onPress={onPress}
				disabled={!canSelect}
			/>
		)
	}
)

Item.displayName = "Item"

export default Item
