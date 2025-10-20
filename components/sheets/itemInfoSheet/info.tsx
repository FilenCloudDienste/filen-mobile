import { memo, Fragment, useMemo } from "react"
import { Text } from "@/components/nativewindui/Text"
import { formatBytes, simpleDate } from "@/lib/utils"
import { View } from "react-native"
import { useColorScheme } from "@/lib/useColorScheme"
import { translateMemoized } from "@/lib/i18n"
import { useDirectorySizeQuery } from "@/queries/useDirectorySize.query"
import useItemPathQuery from "@/queries/useItemPath.query"
import Thumbnail from "@/components/thumbnail/item"
import useSDKConfig from "@/hooks/useSDKConfig"

const ICON_HEIGHT: number = 70

export const Info = memo(({ item }: { item: DriveCloudItem }) => {
	const { colors } = useColorScheme()
	const [{ userId }] = useSDKConfig()

	const isOwner = useMemo(() => {
		if (!item.isShared) {
			return true
		}

		return item.sharerId === userId
	}, [userId, item])

	const directorySize = useDirectorySizeQuery(
		{
			uuid: item.uuid
		},
		{
			enabled: item.type === "directory"
		}
	)

	const itemPath = useItemPathQuery(
		{
			item
		},
		{
			enabled: isOwner
		}
	)

	return (
		<View className="flex-col gap-4">
			<View className="flex-row items-center justify-center pt-4">
				<Thumbnail
					item={item}
					size={ICON_HEIGHT}
					imageResizeMode="contain"
					imageCachePolicy="dataCache"
					imageStyle={{
						width: ICON_HEIGHT,
						height: ICON_HEIGHT,
						backgroundColor: colors.card,
						borderRadius: 10
					}}
				/>
			</View>
			<Text
				className="text-center text-lg font-bold px-8"
				numberOfLines={1}
				ellipsizeMode="middle"
			>
				{item.name}
			</Text>
			<View className="px-4">
				<View
					style={{
						backgroundColor: colors.grey4,
						width: "100%",
						height: 1
					}}
				/>
			</View>
			<View className="px-4 pb-8 w-full">
				<View className="flex-row gap-4 justify-between w-full px-4">
					<View className="flex-col w-1/2">
						<Text
							className="text-muted-foreground text-sm"
							numberOfLines={1}
							ellipsizeMode="middle"
						>
							{translateMemoized("sheets.itemInfo.name")}
						</Text>
						<Text numberOfLines={1}>{item.name}</Text>
						{item.type === "directory" && (
							<Fragment>
								<Text
									className="text-muted-foreground pt-3 text-sm"
									numberOfLines={1}
									ellipsizeMode="middle"
								>
									{translateMemoized("sheets.itemInfo.directories")}
								</Text>
								{directorySize.status === "success" ? (
									<Text numberOfLines={1}>{directorySize.data.folders}</Text>
								) : (
									<Text numberOfLines={1}>...</Text>
								)}
							</Fragment>
						)}
						<Text
							className="text-muted-foreground pt-3 text-sm"
							numberOfLines={1}
							ellipsizeMode="middle"
						>
							{translateMemoized("sheets.itemInfo.type")}
						</Text>
						<Text numberOfLines={1}>
							{item.type === "directory" ? translateMemoized("sheets.itemInfo.directory") : item.mime}
						</Text>
						<Text
							className="text-muted-foreground pt-3 text-sm"
							numberOfLines={1}
							ellipsizeMode="middle"
						>
							{translateMemoized("sheets.itemInfo.modified")}
						</Text>
						<Text numberOfLines={1}>{simpleDate(item.lastModified)}</Text>
						{item.type === "file" && item.creation && (
							<Fragment>
								<Text
									className="text-muted-foreground pt-3 text-sm"
									numberOfLines={1}
									ellipsizeMode="middle"
								>
									{translateMemoized("sheets.itemInfo.creation")}
								</Text>
								<Text numberOfLines={1}>{simpleDate(item.creation)}</Text>
							</Fragment>
						)}
					</View>
					<View className="flex-col w-1/2">
						<Text
							className="text-muted-foreground text-sm"
							numberOfLines={1}
							ellipsizeMode="middle"
						>
							{translateMemoized("sheets.itemInfo.size")}
						</Text>
						{item.type === "directory" ? (
							<Fragment>
								{directorySize.status === "success" ? (
									<Text numberOfLines={1}>{formatBytes(directorySize.data.size)}</Text>
								) : (
									<Text numberOfLines={1}>...</Text>
								)}
							</Fragment>
						) : (
							<Text numberOfLines={1}>{formatBytes(item.size)}</Text>
						)}
						{item.type === "directory" && (
							<Fragment>
								<Text
									className="text-muted-foreground pt-3 text-sm"
									numberOfLines={1}
									ellipsizeMode="middle"
								>
									{translateMemoized("sheets.itemInfo.files")}
								</Text>
								{directorySize.status === "success" ? (
									<Text numberOfLines={1}>{directorySize.data.files}</Text>
								) : (
									<Text numberOfLines={1}>...</Text>
								)}
							</Fragment>
						)}
						<Text
							className="text-muted-foreground pt-3 text-sm"
							numberOfLines={1}
							ellipsizeMode="middle"
						>
							{translateMemoized("sheets.itemInfo.location")}
						</Text>
						{isOwner ? (
							itemPath.status === "success" ? (
								<Text numberOfLines={1}>{itemPath.data}</Text>
							) : (
								<Text numberOfLines={1}>...</Text>
							)
						) : (
							<Text numberOfLines={1}>{translateMemoized("sheets.itemInfo.notAvailable")}</Text>
						)}
						<Text
							className="text-muted-foreground pt-3 text-sm"
							numberOfLines={1}
							ellipsizeMode="middle"
						>
							{translateMemoized("sheets.itemInfo.uploaded")}
						</Text>
						<Text numberOfLines={1}>{simpleDate(item.timestamp)}</Text>
					</View>
				</View>
			</View>
		</View>
	)
})

Info.displayName = "Info"

export default Info
