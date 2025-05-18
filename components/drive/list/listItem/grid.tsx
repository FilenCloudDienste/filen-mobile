import { memo, useMemo } from "react"
import { View, Pressable } from "react-native"
import Thumbnail from "@/components/thumbnail/item"
import { Text } from "@/components/nativewindui/Text"
import { Button } from "@/components/nativewindui/Button"
import { Icon } from "@roninoss/icons"
import { formatBytes, simpleDateNoTime } from "@/lib/utils"
import { cn } from "@/lib/cn"
import { Checkbox } from "@/components/nativewindui/Checkbox"
import ContextMenu from "./menus/contextMenu"

export const Grid = memo(
	({
		itemSize,
		spacing,
		isAvailableOffline,
		onPress,
		item,
		pathname,
		queryParams,
		directorySize,
		select,
		selectedItemsCount,
		isSelected
	}: {
		itemSize: number
		spacing: number
		isAvailableOffline: boolean
		onPress: () => void
		item: DriveCloudItem
		pathname: string
		queryParams: FetchCloudItemsParams
		directorySize?: FetchDirectorySizeResult
		select: () => void
		selectedItemsCount: number
		isSelected: boolean
	}) => {
		const thumbnailSize = useMemo(() => {
			return Math.floor(itemSize / 2.25)
		}, [itemSize])

		return (
			<View className="rounded-md overflow-hidden flex-1 bg-background">
				<ContextMenu
					item={item}
					queryParams={queryParams}
					isAvailableOffline={isAvailableOffline}
				>
					<Button
						className="flex-1 flex-col items-center justify-center p-2 gap-0 bg-background"
						androidRootClassName="rounded-md overflow-hidden"
						variant="plain"
						size="none"
						unstable_pressDelay={100}
						onPress={isSelected || selectedItemsCount > 0 ? select : onPress}
						style={{
							width: itemSize,
							height: itemSize,
							marginRight: spacing,
							marginBottom: spacing
						}}
					>
						<View className="flex-row items-center">
							{selectedItemsCount > 0 && (
								<Pressable
									className="absolute top-0 left-0 bottom-0 right-0 z-50 flex-row items-center justify-center"
									onPress={select}
								>
									{isSelected ? (
										<Checkbox
											checked={true}
											onPress={select}
										/>
									) : (
										<Checkbox
											checked={false}
											onPress={select}
										/>
									)}
								</Pressable>
							)}
							{isAvailableOffline && (
								<View className="w-[16px] h-[16px] absolute -bottom-[1px] -left-[1px] bg-green-500 rounded-full z-50 flex-row items-center justify-center border-white border-[1px]">
									<Icon
										name="arrow-down"
										size={10}
										color="white"
									/>
								</View>
							)}
							{item.favorited && !pathname.startsWith("/home/favorites") && (
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
								size={thumbnailSize}
								imageClassName="bg-transparent"
								imageContentFit="contain"
								imageCachePolicy="none"
								imageStyle={{
									width: thumbnailSize,
									height: thumbnailSize
								}}
								spacing={spacing}
								type="drive"
								queryParams={queryParams}
							/>
						</View>
						<Text
							numberOfLines={1}
							ellipsizeMode="middle"
							variant="subhead"
							className={cn("text-sm font-normal mt-1 rounded-md p-0.5 px-1.5", isSelected ? "bg-card" : "bg-transparent")}
						>
							{item.name}
						</Text>
						<Text
							numberOfLines={1}
							ellipsizeMode="middle"
							className="text-xs text-muted-foreground text-center font-normal"
						>
							{simpleDateNoTime(item.lastModified)}
						</Text>
						<Text
							numberOfLines={1}
							ellipsizeMode="middle"
							className="text-xs text-muted-foreground text-center font-normal"
						>
							{formatBytes(item.type === "directory" ? (directorySize ? directorySize.size : 0) : item.size)}
						</Text>
					</Button>
				</ContextMenu>
			</View>
		)
	}
)

Grid.displayName = "Grid"

export default Grid
