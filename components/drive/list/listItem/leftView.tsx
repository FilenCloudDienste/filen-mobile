import { View } from "react-native"
import { memo, useMemo } from "react"
import Thumbnail from "@/components/thumbnail/item"
import { Checkbox } from "@/components/nativewindui/Checkbox"
import Animated, { SlideInLeft, SlideOutLeft } from "react-native-reanimated"
import { useColorScheme } from "@/lib/useColorScheme"
import { Icon } from "@roninoss/icons"
import useAllowed from "@/hooks/useAllowed"

export const ICON_HEIGHT: number = 42

export const LeftView = memo(
	({
		item,
		select,
		selectedItemsCount,
		isSelected,
		isAvailableOffline,
		queryParams
	}: {
		item: DriveCloudItem
		select: () => void
		selectedItemsCount: number
		isSelected: boolean
		isAvailableOffline: boolean
		queryParams: FetchCloudItemsParams
	}) => {
		const { colors } = useColorScheme()
		const allowed = useAllowed()

		const imageStyle = useMemo(() => {
			return {
				width: ICON_HEIGHT,
				height: ICON_HEIGHT,
				backgroundColor: colors.background,
				borderRadius: 6
			}
		}, [colors.background])

		return (
			<View className="flex-1 flex-row items-center gap-4 justify-center px-4">
				{selectedItemsCount > 0 && (
					<Animated.View
						entering={SlideInLeft}
						exiting={SlideOutLeft}
					>
						<Checkbox
							checked={isSelected}
							onPress={select}
						/>
					</Animated.View>
				)}
				<View className="flex-row items-center">
					{isAvailableOffline && (
						<View className="w-[16px] h-[16px] absolute -bottom-[1px] -left-[1px] bg-green-500 rounded-full z-50 flex-row items-center justify-center border-white border-[1px]">
							<Icon
								name="arrow-down"
								size={10}
								color="white"
							/>
						</View>
					)}
					{item.favorited && allowed.upload && (
						<View className="w-[16px] h-[16px] absolute -bottom-[1px] -right-[1px] bg-red-500 rounded-full z-50 flex-row items-center justify-center border-white border-[1px]">
							<Icon
								name="heart"
								size={10}
								color="white"
							/>
						</View>
					)}
					<Thumbnail
						item={item}
						size={ICON_HEIGHT}
						imageResizeMode="contain"
						imageCachePolicy="dataCache"
						imageStyle={imageStyle}
						queryParams={queryParams}
					/>
				</View>
			</View>
		)
	}
)

LeftView.displayName = "LeftView"

export default LeftView
