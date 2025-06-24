import { memo, useCallback, useMemo } from "react"
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import { List, type ListDataItem, ListItem, ListSectionHeader, type ListRenderItemInfo } from "@/components/nativewindui/List"
import useLocalAlbumsQuery from "@/queries/useLocalAlbumsQuery"
import * as MediaLibrary from "expo-media-library"
import Container from "@/components/Container"
import { useColorScheme } from "@/lib/useColorScheme"
import { ActivityIndicator, View, Platform } from "react-native"
import { Toggle } from "@/components/nativewindui/Toggle"
import { cn } from "@/lib/cn"
import useCameraUpload from "@/hooks/useCameraUpload"
import { Image } from "expo-image"
import useDimensions from "@/hooks/useDimensions"
import RequireInternet from "@/components/requireInternet"

export type ListItemInfo = {
	title: string
	subTitle: string
	id: string
	album: {
		album: MediaLibrary.Album
		lastAssetURI?: string
	}
}

export const LIST_ITEM_HEIGHT = Platform.select({
	ios: 61,
	default: 61
})

export const Albums = memo(() => {
	const { colors } = useColorScheme()
	const [cameraUpload, setCameraUpload] = useCameraUpload()
	const { screen } = useDimensions()

	const localAlbumsQuery = useLocalAlbumsQuery({})

	const items = useMemo((): ListItemInfo[] => {
		if (!localAlbumsQuery.isSuccess) {
			return []
		}

		return localAlbumsQuery.data
			.sort((a, b) => b.album.assetCount - a.album.assetCount)
			.map(album => ({
				id: album.album.id,
				title: album.album.title,
				subTitle: `${album.album.assetCount} items`,
				album
			}))
	}, [localAlbumsQuery.data, localAlbumsQuery.isSuccess])

	const keyExtractor = useCallback((item: (Omit<ListDataItem, string> & { id: string }) | string) => {
		return typeof item === "string" ? item : item.id
	}, [])

	const renderItem = useCallback(
		(info: ListRenderItemInfo<ListItemInfo>) => {
			if (typeof info.item === "string") {
				return <ListSectionHeader {...info} />
			}

			const enabled = cameraUpload.albums.some(album => album.id === info.item.id)

			return (
				<ListItem
					className={cn("ios:pl-0 pl-2", info.index === 0 && "ios:border-t-0 border-border/25 dark:border-border/80 border-t")}
					titleClassName="text-lg"
					innerClassName="py-1.5 ios:py-1.5 android:py-1.5"
					textNumberOfLines={1}
					subTitleNumberOfLines={1}
					leftView={
						<View className="flex-row items-center px-4">
							{info.item.album.lastAssetURI ? (
								<Image
									source={{
										uri: info.item.album.lastAssetURI
									}}
									contentFit="cover"
									style={{
										borderRadius: 6,
										width: 38,
										height: 38
									}}
								/>
							) : (
								<View className="bg-background rounded-md w-[38px] h-[38px]" />
							)}
						</View>
					}
					rightView={
						<View className="flex-1 flex-row items-center px-4">
							<Toggle
								value={enabled}
								onValueChange={() => {
									setCameraUpload(prev => ({
										...prev,
										albums: [
											...prev.albums.filter(album => album.id !== info.item.album.album.id),
											...(!prev.albums.some(album => album.id === info.item.album.album.id)
												? [info.item.album.album]
												: [])
										]
									}))
								}}
							/>
						</View>
					}
					{...info}
				/>
			)
		},
		[cameraUpload.albums, setCameraUpload]
	)

	return (
		<RequireInternet>
			<LargeTitleHeader title="Albums" />
			<Container>
				<List
					contentContainerClassName="pt-4 pb-20"
					contentInsetAdjustmentBehavior="automatic"
					variant="insets"
					data={items}
					renderItem={renderItem}
					keyExtractor={keyExtractor}
					sectionHeaderAsGap={true}
					ListEmptyComponent={<ActivityIndicator color={colors.foreground} />}
					extraData={cameraUpload.albums}
					contentContainerStyle={{
						paddingBottom: 100
					}}
					removeClippedSubviews={true}
					initialNumToRender={Math.round(screen.height / LIST_ITEM_HEIGHT)}
					maxToRenderPerBatch={Math.round(screen.height / LIST_ITEM_HEIGHT / 2)}
					updateCellsBatchingPeriod={100}
					windowSize={3}
					getItemLayout={(_, index) => {
						return {
							length: LIST_ITEM_HEIGHT,
							offset: LIST_ITEM_HEIGHT * index,
							index
						}
					}}
				/>
			</Container>
		</RequireInternet>
	)
})

Albums.displayName = "Albums"

export default Albums
