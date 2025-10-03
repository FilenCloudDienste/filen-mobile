import { useRouter } from "expo-router"
import { memo, useCallback, useMemo } from "react"
import { ListItem as ListItemComponent, type ListRenderItemInfo } from "@/components/nativewindui/List"
import { useSelectDriveItemsStore } from "@/stores/selectDriveItems.store"
import { useDirectorySizeQuery } from "@/queries/useDirectorySize.query"
import { formatBytes, getPreviewType } from "@/lib/utils"
import LeftView from "./leftView"
import { useShallow } from "zustand/shallow"
import { type PreviewType } from "@/stores/gallery.store"
import pathModule from "path"
import { Platform } from "react-native"

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
		queryParams,
		previewTypes,
		extensions
	}: {
		info: ListRenderItemInfo<ListItemInfo>
		max: number
		type: "file" | "directory"
		toMove: string[]
		queryParams: FetchCloudItemsParams
		previewTypes: PreviewType[]
		extensions: string[]
	}) => {
		const { push: routerPush } = useRouter()
		const setSelectedItems = useSelectDriveItemsStore(useShallow(state => state.setSelectedItems))
		const isSelected = useSelectDriveItemsStore(useShallow(state => state.selectedItems.some(i => i.uuid === info.item.item.uuid)))
		const selectedItemsCount = useSelectDriveItemsStore(useShallow(state => state.selectedItems.length))

		const directorySize = useDirectorySizeQuery(
			{
				uuid: info.item.item.uuid,
				sharerId: queryParams.of === "sharedIn" && info.item.item.isShared ? info.item.item.sharerId : undefined,
				receiverId: queryParams.of === "sharedOut" && info.item.item.isShared ? info.item.item.receiverId : undefined,
				trash: queryParams.of === "trash" ? true : undefined
			},
			{
				enabled: info.item.item.type === "directory"
			}
		)

		const canSelect = useMemo(() => {
			if (isSelected) {
				return true
			}

			if (previewTypes.length > 0 && !previewTypes.includes(getPreviewType(info.item.item.name))) {
				return false
			}

			if (extensions.length > 0 && !extensions.includes(pathModule.posix.extname(info.item.item.name))) {
				return false
			}

			if (selectedItemsCount >= max || info.item.item.type !== type || toMove.includes(info.item.item.uuid)) {
				return false
			}

			return true
		}, [
			selectedItemsCount,
			info.item.item.type,
			max,
			type,
			isSelected,
			info.item.item.uuid,
			toMove,
			previewTypes,
			extensions,
			info.item.item.name
		])

		const item = useMemo(() => {
			if (info.item.item.type !== "directory" || directorySize.status !== "success") {
				return info.item
			}

			return {
				...info.item,
				subTitle: `${info.item.subTitle}  -  ${formatBytes(directorySize.data.size)}`
			}
		}, [info.item, directorySize.status, directorySize.data])

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

		const disabled = useMemo(() => {
			return type === "file" && info.item.item.type === "directory" ? false : !canSelect
		}, [type, info.item.item.type, canSelect])

		return (
			<ListItemComponent
				{...info}
				item={item}
				className="overflow-hidden"
				leftView={leftView}
				disabled={disabled}
				subTitleClassName="text-xs pt-1 font-normal"
				variant="full-width"
				textNumberOfLines={1}
				subTitleNumberOfLines={1}
				isFirstInSection={false}
				isLastInSection={false}
				onPress={onPress}
				removeSeparator={Platform.OS === "android"}
				innerClassName="ios:py-3 py-3 android:py-3"
			/>
		)
	}
)

Item.displayName = "Item"

export default Item
