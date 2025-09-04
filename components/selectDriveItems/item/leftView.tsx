import { View } from "react-native"
import { memo } from "react"
import { Checkbox } from "@/components/nativewindui/Checkbox"
import { useColorScheme } from "@/lib/useColorScheme"
import Thumbnail from "@/components/thumbnail/item"

export const ICON_HEIGHT: number = 42

export const LeftView = memo(
	({
		item,
		select,
		isSelected,
		canSelect,
		queryParams
	}: {
		item: DriveCloudItem
		select: () => void
		isSelected: boolean
		canSelect: boolean
		queryParams: FetchCloudItemsParams
	}) => {
		const { colors } = useColorScheme()

		return (
			<View className="flex-1 flex-row items-center gap-4 justify-center px-4">
				<Checkbox
					testID={`selectDriveItems.item.leftView.${item.name}`}
					checked={isSelected}
					onPress={select}
					disabled={!canSelect}
					hitSlop={{
						bottom: 25,
						top: 25,
						left: 25,
						right: 25
					}}
				/>
				<Thumbnail
					item={item}
					size={ICON_HEIGHT}
					imageResizeMode="contain"
					imageCachePolicy="dataCache"
					imageStyle={{
						width: ICON_HEIGHT,
						height: ICON_HEIGHT,
						backgroundColor: colors.background,
						borderRadius: 6
					}}
					queryParams={queryParams}
				/>
			</View>
		)
	}
)

LeftView.displayName = "LeftView"

export default LeftView
