import { memo, useState, useCallback, useMemo, useRef, Fragment } from "react"
import { Button } from "@/components/nativewindui/Button"
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import { Icon } from "@roninoss/icons"
import { useColorScheme } from "@/lib/useColorScheme"
import { View, RefreshControl, TouchableHighlight, Platform, ActivityIndicator } from "react-native"
import Thumbnail from "@/components/thumbnail/item"
import { cn } from "@/lib/cn"
import { Container } from "@/components/Container"
import useCloudItemsQuery from "@/queries/useCloudItemsQuery"
import { getPreviewType, orderItemsByType } from "@/lib/utils"
import { useGalleryStore } from "@/stores/gallery.store"
import useNetInfo from "@/hooks/useNetInfo"
import { Text } from "@/components/nativewindui/Text"
import useViewLayout from "@/hooks/useViewLayout"
import { THUMBNAILS_SUPPORTED_FORMATS } from "@/lib/thumbnails"
import { Paths } from "expo-file-system/next"
import useCameraUpload from "@/hooks/useCameraUpload"
import { useCameraUploadStore } from "@/stores/cameraUpload.store"
import { useRouter, useFocusEffect } from "expo-router"
import { validate as validateUUID } from "uuid"
import { foregroundCameraUpload } from "@/lib/cameraUpload"
import { useShallow } from "zustand/shallow"
import Menu from "@/components/drive/list/listItem/menu"
import Transfers from "@/components/drive/header/transfers"
import OfflineListHeader from "@/components/offlineListHeader"
import useFileOfflineStatusQuery from "@/queries/useFileOfflineStatusQuery"
import { useTranslation } from "react-i18next"
import ListEmpty from "@/components/listEmpty"
import alerts from "@/lib/alerts"
import { usePhotosStore } from "@/stores/photos.store"
import Dropdown from "@/components/photos/header/rightView/dropdown"
import { Checkbox } from "@/components/nativewindui/Checkbox"
import Animated, { FadeIn, FadeOut } from "react-native-reanimated"
import { FlashList, type ListRenderItemInfo } from "@shopify/flash-list"

const contentContainerStyle = {
	paddingBottom: 100,
	paddingHorizontal: 0,
	paddingVertical: 0
}

export const Photo = memo(
	({
		info,
		queryParams,
		items,
		itemSize,
		spacing
	}: {
		info: ListRenderItemInfo<DriveCloudItem>
		queryParams: FetchCloudItemsParams
		items: DriveCloudItem[]
		itemSize: number
		spacing: number
	}) => {
		const { colors } = useColorScheme()
		const isSelected = usePhotosStore(useShallow(state => state.selectedItems.some(i => i.uuid === info.item.uuid)))
		const selectedItemsCount = usePhotosStore(useShallow(state => state.selectedItems.length))

		const fileOfflineStatus = useFileOfflineStatusQuery({
			uuid: info.item.uuid
		})

		const offlineStatus = useMemo(() => {
			return fileOfflineStatus.status === "success" ? fileOfflineStatus.data : null
		}, [fileOfflineStatus.status, fileOfflineStatus.data])

		const onPress = useCallback(() => {
			if (selectedItemsCount > 0) {
				usePhotosStore
					.getState()
					.setSelectedItems(prev =>
						isSelected
							? prev.filter(i => i.uuid !== info.item.uuid)
							: [...prev.filter(i => i.uuid !== info.item.uuid), info.item]
					)

				return
			}

			useGalleryStore.getState().open({
				items: items
					.map(item => {
						const previewType = getPreviewType(item.name)

						return item.size > 0
							? {
									itemType: "cloudItem" as const,
									previewType,
									data: {
										item,
										queryParams
									}
							  }
							: null
					})
					.filter(item => item !== null),
				initialUUIDOrURI: info.item.uuid
			})
		}, [items, info.item, queryParams, isSelected, selectedItemsCount])

		const imageStyle = useMemo(() => {
			return {
				width: itemSize,
				height: itemSize,
				marginRight: spacing,
				marginBottom: spacing,
				backgroundColor: colors.card
			}
		}, [colors.card, itemSize, spacing])

		return (
			<Menu
				item={info.item}
				queryParams={queryParams}
				type="context"
				fromPhotos={true}
			>
				<TouchableHighlight onPress={onPress}>
					<View>
						{offlineStatus?.exists && (
							<View className="w-[16px] h-[16px] absolute bottom-1 left-1 bg-green-500 rounded-full z-50 flex-row items-center justify-center border-white border-[1px]">
								<Icon
									name="arrow-down"
									size={10}
									color="white"
								/>
							</View>
						)}
						{info.item.favorited && (
							<View className="w-[16px] h-[16px] absolute bottom-1 right-1 bg-red-500 rounded-full z-50 flex-row items-center justify-center border-white border-[1px]">
								<Icon
									name="heart"
									size={10}
									color="white"
								/>
							</View>
						)}
						{selectedItemsCount > 0 && (
							<Animated.View
								entering={FadeIn}
								exiting={FadeOut}
								className="absolute top-1 left-1 z-50 flex-row items-center justify-center"
							>
								<Checkbox
									checked={isSelected}
									onPress={onPress}
								/>
							</Animated.View>
						)}
						<Thumbnail
							item={info.item}
							size={itemSize}
							imageClassName="bg-card"
							imageResizeMode="cover"
							imageCachePolicy="dataCache"
							imageStyle={imageStyle}
							spacing={spacing}
							type="photos"
							queryParams={queryParams}
						/>
					</View>
				</TouchableHighlight>
			</Menu>
		)
	}
)

Photo.displayName = "Photo"

export const Photos = memo(() => {
	const { colors } = useColorScheme()
	const [refreshing, setRefreshing] = useState<boolean>(false)
	const { hasInternet } = useNetInfo()
	const viewRef = useRef<View>(null)
	const { layout: listLayout, onLayout } = useViewLayout(viewRef)
	const [cameraUpload] = useCameraUpload()
	const router = useRouter()
	const syncState = useCameraUploadStore(useShallow(state => state.syncState))
	const running = useCameraUploadStore(useShallow(state => state.running))
	const { t } = useTranslation()
	const selectedItemsCount = usePhotosStore(useShallow(state => state.selectedItems.length))

	const queryParams = useMemo(
		(): FetchCloudItemsParams => ({
			parent: cameraUpload.remote && validateUUID(cameraUpload.remote?.uuid) ? cameraUpload.remote.uuid : "",
			of: "photos",
			receiverId: 0
		}),
		[cameraUpload.remote]
	)

	const cameraUploadRemoteSetup = useMemo(() => {
		return cameraUpload.remote && validateUUID(cameraUpload.remote.uuid) ? true : false
	}, [cameraUpload.remote])

	const query = useCloudItemsQuery({
		...queryParams,
		enabled: cameraUploadRemoteSetup
	})

	const items = useMemo((): DriveCloudItem[] => {
		if (query.status !== "success" || !cameraUpload.remote || !validateUUID(cameraUpload.remote.uuid)) {
			return []
		}

		return orderItemsByType({
			items: query.data.filter(item => {
				if (item.type !== "file") {
					return false
				}

				const nameNormalized = item.name.toLowerCase().trim()

				if (nameNormalized.startsWith("cannot_decrypt_") && nameNormalized.endsWith(`_${item.uuid}`)) {
					return false
				}

				const previewType = getPreviewType(nameNormalized)
				const extname = Paths.extname(nameNormalized).toLowerCase()

				if (
					(previewType === "image" || previewType === "video") &&
					item.size > 0 &&
					THUMBNAILS_SUPPORTED_FORMATS.includes(extname)
				) {
					return true
				}

				return false
			}),
			type: "creationDesc"
		})
	}, [query.status, query.data, cameraUpload.remote])

	const { itemSize, numColumns, spacing } = useMemo(() => {
		const numColumns = Platform.select({
			ios: 5,
			default: 4
		})

		const spacing = 2
		const totalSpacing = spacing * (numColumns - 1)

		return {
			itemSize: (listLayout.width - totalSpacing) / numColumns,
			numColumns,
			spacing
		}
	}, [listLayout.width])

	const keyExtractor = useCallback((item: DriveCloudItem): string => {
		return item.uuid
	}, [])

	const renderItem = useCallback(
		(info: ListRenderItemInfo<DriveCloudItem>) => {
			return (
				<Photo
					info={info}
					queryParams={queryParams}
					items={items}
					itemSize={itemSize}
					spacing={spacing}
				/>
			)
		},
		[itemSize, spacing, queryParams, items]
	)

	const headerLeftView = useCallback(() => {
		if (!hasInternet) {
			return undefined
		}

		return (
			<View className={cn("flex flex-row items-center pl-2", Platform.OS === "ios" && "pl-0")}>
				{selectedItemsCount > 0 ? (
					<Text className="text-primary">
						{t("photos.header.selected", {
							count: selectedItemsCount
						})}
					</Text>
				) : cameraUpload.enabled ? (
					<Fragment>
						{syncState.count > 0 ? (
							<View className="flex-row items-center gap-2">
								<ActivityIndicator
									size="small"
									color={colors.foreground}
								/>
								<Text>
									{t("photos.state.syncingProgress", {
										done: syncState.done,
										total: syncState.count
									})}
								</Text>
							</View>
						) : running ? (
							<View className="flex-row items-center gap-2">
								<ActivityIndicator
									size="small"
									color={colors.foreground}
								/>
							</View>
						) : (
							<View className="flex-row items-center gap-2">
								<Icon
									name="check-circle-outline"
									color={colors.primary}
									size={24}
								/>
								<Text>{t("photos.state.synced")}</Text>
							</View>
						)}
					</Fragment>
				) : (
					<Button
						variant="plain"
						size="icon"
						onPress={() => {
							router.push({
								pathname: "/photos/settings"
							})
						}}
					>
						<Icon
							name="cog-outline"
							color={colors.primary}
							size={24}
						/>
					</Button>
				)}
			</View>
		)
	}, [
		cameraUpload.enabled,
		colors.primary,
		t,
		colors.foreground,
		router,
		syncState.count,
		syncState.done,
		hasInternet,
		selectedItemsCount,
		running
	])

	const headerRightView = useCallback(() => {
		if (!hasInternet) {
			return undefined
		}

		return (
			<View className="flex-row items-center">
				<Transfers />
				<Dropdown
					photos={items}
					queryParams={queryParams}
				/>
			</View>
		)
	}, [hasInternet, items, queryParams])

	const onRefresh = useCallback(async () => {
		setRefreshing(true)

		try {
			foregroundCameraUpload.run().catch(console.error)

			await query.refetch()
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			setRefreshing(false)
		}
	}, [query])

	const refreshControl = useMemo(() => {
		if (!hasInternet) {
			return undefined
		}

		return (
			<RefreshControl
				refreshing={refreshing}
				onRefresh={onRefresh}
			/>
		)
	}, [refreshing, onRefresh, hasInternet])

	const listEmpty = useMemo(() => {
		return (
			<ListEmpty
				queryStatus={cameraUploadRemoteSetup ? query.status : "success"}
				itemCount={items.length}
				texts={{
					error: t("photos.list.error"),
					empty: t("photos.list.empty"),
					emptySearch: t("photos.list.emptySearch")
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
	}, [query.status, items.length, t, cameraUploadRemoteSetup])

	const listHeader = useMemo(() => {
		return !hasInternet ? <OfflineListHeader /> : undefined
	}, [hasInternet])

	useFocusEffect(
		useCallback(() => {
			usePhotosStore.getState().setSelectedItems([])
		}, [])
	)

	return (
		<Fragment>
			<LargeTitleHeader
				title={t("photos.title")}
				backVisible={false}
				materialPreset="stack"
				leftView={headerLeftView}
				rightView={headerRightView}
			/>
			<Container>
				<View
					ref={viewRef}
					onLayout={onLayout}
					className="flex-1"
				>
					<FlashList
						data={items}
						renderItem={renderItem}
						numColumns={numColumns}
						keyExtractor={keyExtractor}
						contentInsetAdjustmentBehavior="automatic"
						showsVerticalScrollIndicator={true}
						showsHorizontalScrollIndicator={false}
						ListHeaderComponent={listHeader}
						ListEmptyComponent={listEmpty}
						contentContainerStyle={contentContainerStyle}
						refreshControl={refreshControl}
					/>
				</View>
			</Container>
		</Fragment>
	)
})

Photos.displayName = "Photos"

export default Photos
