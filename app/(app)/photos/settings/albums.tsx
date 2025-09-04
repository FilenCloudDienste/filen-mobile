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
import RequireInternet from "@/components/requireInternet"
import { useTranslation } from "react-i18next"
import ListEmpty from "@/components/listEmpty"
import { useColorScheme } from "@/lib/useColorScheme"
import { foregroundCameraUpload } from "@/lib/cameraUpload"
import { useFocusEffect } from "expo-router"

export type ListItemInfo = {
	title: string
	subTitle: string
	id: string
	album: MediaLibrary.Album
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

	const rightView = useMemo(() => {
		return (
			<View className="flex-1 flex-row items-center px-4">
				<Toggle
					testID={`photos.settings.albums.toggle.${info.item.album.title}`}
					value={enabled}
					onValueChange={() => {
						setCameraUpload(prev => ({
							...prev,
							// We do not need to increase the version here, local album changes do not require aborting uploads
							// version: (prev.version ?? 0) + 1,
							albums: [
								...prev.albums.filter(album => album.id !== info.item.album.id),
								...(!prev.albums.some(album => album.id === info.item.album.id) ? [info.item.album] : [])
							]
						}))

						setTimeout(() => {
							foregroundCameraUpload.run().catch(console.error)
						}, 1000)
					}}
				/>
			</View>
		)
	}, [enabled, info.item.album, setCameraUpload])

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
			.sort((a, b) => b.assetCount - a.assetCount)
			.map(album => ({
				id: album.id,
				title: album.title,
				subTitle: t("photos.settings.albums.item.subTitle", {
					count: album.assetCount
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

	const ListEmptyComponent = useCallback(() => {
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

	useFocusEffect(
		useCallback(() => {
			setTimeout(() => {
				foregroundCameraUpload.run().catch(console.error)
			}, 1000)
		}, [])
	)

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
					ListEmptyComponent={ListEmptyComponent}
					contentContainerStyle={contentContainerStyle}
				/>
			</Container>
		</RequireInternet>
	)
})

Albums.displayName = "Albums"

export default Albums
