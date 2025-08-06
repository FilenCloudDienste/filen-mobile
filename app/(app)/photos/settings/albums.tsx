import { memo, useCallback, useMemo } from "react"
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import { List, type ListDataItem, ListItem, type ListRenderItemInfo } from "@/components/nativewindui/List"
import useLocalAlbumsQuery from "@/queries/useLocalAlbumsQuery"
import * as MediaLibrary from "expo-media-library"
import Container from "@/components/Container"
import { View, Platform } from "react-native"
import { Toggle } from "@/components/nativewindui/Toggle"
import { cn } from "@/lib/cn"
import useCameraUpload from "@/hooks/useCameraUpload"
import TurboImage from "react-native-turbo-image"
import RequireInternet from "@/components/requireInternet"
import { useTranslation } from "react-i18next"
import ListEmpty from "@/components/listEmpty"
import { useColorScheme } from "@/lib/useColorScheme"
import assets from "@/lib/assets"

export type ListItemInfo = {
	title: string
	subTitle: string
	id: string
	album: {
		album: MediaLibrary.Album
		lastAssetURI?: string
	}
}

const contentContainerStyle = {
	paddingBottom: 100
}

export const Item = memo(({ info }: { info: ListRenderItemInfo<ListItemInfo> }) => {
	const [cameraUpload, setCameraUpload] = useCameraUpload()
	const { colors, isDarkColorScheme } = useColorScheme()

	const enabled = useMemo(() => {
		return cameraUpload.albums.some(album => album.id === info.item.id)
	}, [cameraUpload.albums, info.item.id])

	const leftView = useMemo(() => {
		return (
			<View className="flex-row items-center px-4">
				{info.item.album.lastAssetURI ? (
					<TurboImage
						source={{
							uri: info.item.album.lastAssetURI
						}}
						cachePolicy="dataCache"
						resizeMode="cover"
						style={{
							borderRadius: 6,
							width: 38,
							height: 38
						}}
						placeholder={{
							blurhash: assets.blurhash.images.fallback
						}}
					/>
				) : (
					<View className="bg-background/80 rounded-md w-[38px] h-[38px]" />
				)}
			</View>
		)
	}, [info.item.album.lastAssetURI])

	const rightView = useMemo(() => {
		return (
			<View className="flex-1 flex-row items-center px-4">
				<Toggle
					value={enabled}
					onValueChange={() => {
						setCameraUpload(prev => ({
							...prev,
							albums: [
								...prev.albums.filter(album => album.id !== info.item.album.album.id),
								...(!prev.albums.some(album => album.id === info.item.album.album.id) ? [info.item.album.album] : [])
							]
						}))
					}}
				/>
			</View>
		)
	}, [enabled, info.item.album.album, setCameraUpload])

	return (
		<ListItem
			className={cn(
				"ios:pl-0 pl-2",
				info.index === 0 && "ios:border-t-0 border-border/25 dark:border-border/80 border-t",
				Platform.OS === "android" && "bg-transparent border-none border-0"
			)}
			style={Platform.select({
				android: {
					backgroundColor: "transparent"
				},
				default: !isDarkColorScheme
					? {
							backgroundColor: colors.grey5
					  }
					: undefined
			})}
			titleClassName="text-lg"
			innerClassName={cn("py-3 ios:py-3 android:py-3", Platform.OS === "android" && "bg-transparent")}
			textNumberOfLines={1}
			subTitleNumberOfLines={1}
			leftView={leftView}
			rightView={rightView}
			{...info}
		/>
	)
})

Item.displayName = "Item"

export const Albums = memo(() => {
	const { t } = useTranslation()

	const localAlbumsQuery = useLocalAlbumsQuery({})

	const items = useMemo((): ListItemInfo[] => {
		if (localAlbumsQuery.status !== "success") {
			return []
		}

		return localAlbumsQuery.data
			.sort((a, b) => b.album.assetCount - a.album.assetCount)
			.map(album => ({
				id: album.album.id,
				title: album.album.title,
				subTitle: t("photos.settings.albums.item.subTitle", {
					count: album.album.assetCount
				}),
				album
			}))
	}, [localAlbumsQuery.data, localAlbumsQuery.status, t])

	const keyExtractor = useCallback((item: (Omit<ListDataItem, string> & { id: string }) | string) => {
		return typeof item === "string" ? item : item.id
	}, [])

	const renderItem = useCallback((info: ListRenderItemInfo<ListItemInfo>) => {
		return <Item info={info} />
	}, [])

	const listEmpty = useMemo(() => {
		return (
			<ListEmpty
				queryStatus={localAlbumsQuery.status}
				itemCount={items.length}
				texts={{
					error: t("photos.settings.albums.list.error"),
					empty: t("photos.settings.albums.list.empty"),
					emptySearch: t("photos.settings.albums.list.emptySearch")
				}}
				icons={{
					error: {
						name: "wifi-alert"
					},
					empty: {
						name: "image-multiple-outline"
					},
					emptySearch: {
						name: "magnify"
					}
				}}
			/>
		)
	}, [localAlbumsQuery.status, items.length, t])

	return (
		<RequireInternet>
			<LargeTitleHeader title={t("photos.settings.albums.title")} />
			<Container>
				<List
					contentContainerClassName="pt-4 pb-20"
					contentInsetAdjustmentBehavior="automatic"
					variant="insets"
					data={items}
					renderItem={renderItem}
					keyExtractor={keyExtractor}
					sectionHeaderAsGap={true}
					ListEmptyComponent={listEmpty}
					contentContainerStyle={contentContainerStyle}
				/>
			</Container>
		</RequireInternet>
	)
})

Albums.displayName = "Albums"

export default Albums
