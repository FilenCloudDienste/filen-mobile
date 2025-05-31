import { memo, useState, useCallback, useMemo, useLayoutEffect, useRef, Fragment } from "react"
import { Button } from "@/components/nativewindui/Button"
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import { DropdownMenu } from "@/components/nativewindui/DropdownMenu"
import { createDropdownItem, createDropdownSubMenu } from "@/components/nativewindui/DropdownMenu/utils"
import { Icon } from "@roninoss/icons"
import { useColorScheme } from "@/lib/useColorScheme"
import { View, RefreshControl, TouchableHighlight, Platform, ActivityIndicator } from "react-native"
import Thumbnail from "@/components/thumbnail/item"
import { cn } from "@/lib/cn"
import { Container } from "@/components/Container"
import useBottomListContainerPadding from "@/hooks/useBottomListContainerPadding"
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
import { useRouter } from "expo-router"
import { validate as validateUUID } from "uuid"
import { foregroundCameraUpload } from "@/lib/cameraUpload"
import { useShallow } from "zustand/shallow"
import { FlashList, type ListRenderItemInfo } from "@shopify/flash-list"
import Menu from "@/components/drive/list/listItem/menu"

export const Photos = memo(() => {
	const { colors } = useColorScheme()
	const [refreshing, setRefreshing] = useState<boolean>(false)
	const bottomListContainerPadding = useBottomListContainerPadding()
	const { hasInternet } = useNetInfo()
	const viewRef = useRef<View>(null)
	const { layout: listLayout, onLayout } = useViewLayout(viewRef)
	const [cameraUpload] = useCameraUpload()
	const router = useRouter()
	const syncState = useCameraUploadStore(useShallow(state => state.syncState))

	const queryParams = useMemo(
		(): FetchCloudItemsParams => ({
			parent: cameraUpload.remote && validateUUID(cameraUpload.remote?.uuid) ? cameraUpload.remote.uuid : "",
			of: "photos",
			receiverId: 0
		}),
		[cameraUpload.remote]
	)

	const queryEnabled = useMemo(() => {
		return cameraUpload.remote && validateUUID(cameraUpload.remote.uuid) ? true : false
	}, [cameraUpload.remote])

	const query = useCloudItemsQuery({
		...queryParams,
		enabled: queryEnabled
	})

	const items = useMemo((): DriveCloudItem[] => {
		if (!query.isSuccess || !cameraUpload.remote || !validateUUID(cameraUpload.remote.uuid)) {
			return []
		}

		return orderItemsByType({
			items: query.data.filter(item => {
				if (item.type !== "file") {
					return false
				}

				const previewType = getPreviewType(item.name)
				const extname = Paths.extname(item.name).toLowerCase()

				if (
					(previewType === "image" || previewType === "video") &&
					item.size > 0 &&
					THUMBNAILS_SUPPORTED_FORMATS.includes(extname)
				) {
					return true
				}

				return false
			}),
			type: "uploadDateDesc"
		})
	}, [query.isSuccess, query.data, cameraUpload.remote])

	const { itemSize, numColumns, spacing } = useMemo(() => {
		const numColumns = 5
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
				<Menu
					item={info.item}
					queryParams={queryParams}
					type="context"
					isAvailableOffline={false}
					fromPhotos={true}
				>
					<TouchableHighlight
						onPress={() => {
							useGalleryStore.getState().setItems(
								items
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
									.filter(item => item !== null)
							)

							useGalleryStore.getState().setInitialUUID(info.item.uuid)
							useGalleryStore.getState().setVisible(true)
						}}
					>
						<Thumbnail
							item={info.item}
							size={itemSize}
							imageClassName="bg-card"
							imageContentFit="cover"
							imageCachePolicy="none"
							imageStyle={{
								width: itemSize,
								height: itemSize,
								marginRight: spacing,
								marginBottom: spacing,
								backgroundColor: colors.card
							}}
							spacing={spacing}
							type="photos"
							queryParams={queryParams}
						/>
					</TouchableHighlight>
				</Menu>
			)
		},
		[itemSize, spacing, colors.card, queryParams, items]
	)

	useLayoutEffect(() => {
		onLayout()
	}, [onLayout])

	return (
		<Fragment>
			<LargeTitleHeader
				title="Photos"
				backVisible={false}
				materialPreset="stack"
				leftView={() => {
					return (
						<View className={cn("flex flex-row items-center pl-2", Platform.OS === "ios" && "pl-0")}>
							{cameraUpload.enabled ? (
								<Fragment>
									{syncState.count === 0 ? (
										<View className="flex-row items-center gap-2">
											<Icon
												name="check-circle-outline"
												color={colors.primary}
												size={24}
											/>
											<Text>Synced</Text>
										</View>
									) : (
										<View className="flex-row items-center gap-2">
											<ActivityIndicator
												size="small"
												color={colors.foreground}
											/>
											<Text>
												{syncState.done} of {syncState.count} items synced
											</Text>
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
										name="stop-circle-outline"
										color={colors.destructive}
										size={24}
									/>
								</Button>
							)}
						</View>
					)
				}}
				rightView={() => (
					<DropdownMenu
						items={[
							createDropdownItem({
								actionKey: "settings",
								title: "Settings"
							}),
							createDropdownSubMenu(
								{
									title: "Submenu 1",
									iOSItemSize: "large"
								},
								[
									createDropdownItem({
										actionKey: "sub-first",
										title: "Sub Item 1"
									}),
									createDropdownItem({
										actionKey: "sub-second",
										title: "Sub Item 2"
									})
								]
							)
						]}
						onItemPress={item => {
							switch (item.actionKey) {
								case "settings":
									router.push({
										pathname: "/photos/settings"
									})

									break
							}
						}}
					>
						<Button
							variant="plain"
							size="icon"
						>
							<Icon
								size={24}
								namingScheme="sfSymbol"
								name="ellipsis.circle"
								color={colors.foreground}
							/>
						</Button>
					</DropdownMenu>
				)}
			/>
			<Container>
				<View
					ref={viewRef}
					onLayout={onLayout}
					className="flex-1"
				>
					<FlashList
						key={`list:${numColumns}:${itemSize}`}
						data={items}
						renderItem={renderItem}
						numColumns={numColumns}
						keyExtractor={keyExtractor}
						contentInsetAdjustmentBehavior="automatic"
						showsVerticalScrollIndicator={true}
						estimatedItemSize={itemSize}
						ListHeaderComponent={
							!hasInternet ? (
								<View className="flex-row items-center justify-center bg-red-500 p-2">
									<Text className="text-lg font-bold">Offline mode</Text>
								</View>
							) : undefined
						}
						ListEmptyComponent={
							<View className="flex-1 items-center justify-center">
								{query.status === "pending" && (
									<Fragment>
										{queryEnabled ? (
											<ActivityIndicator color={colors.foreground} />
										) : (
											<Text
												variant="title3"
												className="text-muted-foreground text-center"
											>
												Setup first
											</Text>
										)}
									</Fragment>
								)}
								{query.status === "error" && (
									<Text
										variant="title3"
										className="text-muted-foreground text-center"
									>
										{query.error.message}
									</Text>
								)}
								{query.status === "success" && (
									<Text
										variant="title3"
										className="text-muted-foreground text-center"
									>
										No items found
									</Text>
								)}
							</View>
						}
						contentContainerStyle={{
							paddingBottom: bottomListContainerPadding,
							paddingHorizontal: 0,
							paddingVertical: 0
						}}
						refreshControl={
							<RefreshControl
								refreshing={refreshing}
								onRefresh={async () => {
									setRefreshing(true)

									foregroundCameraUpload.run().catch(console.error)
									await query.refetch().catch(console.error)

									setRefreshing(false)
								}}
							/>
						}
					/>
				</View>
			</Container>
		</Fragment>
	)
})

Photos.displayName = "Photos"

export default Photos
