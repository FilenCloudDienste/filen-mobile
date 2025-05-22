import { View, RefreshControl, FlatList, type ListRenderItemInfo } from "react-native"
import { Text } from "@/components/nativewindui/Text"
import { useColorScheme } from "@/lib/useColorScheme"
import { memo, useState, useMemo, useCallback, useRef, useLayoutEffect } from "react"
import { List, ListDataItem } from "@/components/nativewindui/List"
import useCloudItemsQuery from "@/queries/useCloudItemsQuery"
import { simpleDate, formatBytes, orderItemsByType, type OrderByType } from "@/lib/utils"
import { ActivityIndicator } from "@/components/nativewindui/ActivityIndicator"
import { Container } from "@/components/Container"
import useBottomListContainerPadding from "@/hooks/useBottomListContainerPadding"
import ListItem, { type ListItemInfo } from "./listItem"
import { useFocusEffect } from "expo-router"
import { useDriveStore } from "@/stores/drive.store"
import useNetInfo from "@/hooks/useNetInfo"
import { useMMKVBoolean, useMMKVString } from "react-native-mmkv"
import mmkvInstance from "@/lib/mmkv"
import useViewLayout from "@/hooks/useViewLayout"
import useDimensions from "@/hooks/useDimensions"
import { useShallow } from "zustand/shallow"
import { FLATLIST_BASE_PROPS } from "@/lib/constants"

export const DriveList = memo(({ queryParams }: { queryParams: FetchCloudItemsParams }) => {
	const { colors } = useColorScheme()
	const [refreshing, setRefreshing] = useState<boolean>(false)
	const bottomListContainerPadding = useBottomListContainerPadding()
	const searchTerm = useDriveStore(useShallow(state => state.searchTerm))
	const setSelectedItems = useDriveStore(useShallow(state => state.setSelectedItems))
	const { hasInternet } = useNetInfo()
	const [orderBy] = useMMKVString("orderBy", mmkvInstance) as [OrderByType | undefined, (value: OrderByType) => void]
	const listRef = useRef<FlatList<ListItemInfo>>(null)
	const [gridModeEnabled] = useMMKVBoolean("gridModeEnabled", mmkvInstance)
	const viewRef = useRef<View>(null)
	const { layout: listLayout, onLayout } = useViewLayout(viewRef)
	const { isTablet, isPortrait } = useDimensions()
	const setDriveItems = useDriveStore(useShallow(state => state.setItems))

	const cloudItemsQuery = useCloudItemsQuery(queryParams)

	const items = useMemo((): ListItemInfo[] => {
		if (!cloudItemsQuery.isSuccess) {
			return []
		}

		const searchTermLowerCase = searchTerm.toLowerCase().trim()

		return orderItemsByType({
			items:
				searchTerm.length > 0
					? cloudItemsQuery.data.filter(item => item.name.toLowerCase().includes(searchTermLowerCase))
					: cloudItemsQuery.data,
			type: queryParams.of === "recents" ? "uploadDateDesc" : orderBy ?? "nameAsc"
		}).map(item => ({
			id: item.uuid,
			title: item.name,
			subTitle:
				item.type === "directory"
					? simpleDate(item.lastModified)
					: `${simpleDate(item.lastModified)}  -  ${formatBytes(item.size)}`,
			item
		}))
	}, [cloudItemsQuery.isSuccess, cloudItemsQuery.data, searchTerm, orderBy, queryParams.of])

	const driveItems = useMemo(() => {
		return items.map(item => item.item)
	}, [items])

	const keyExtractor = useCallback((item: (Omit<ListDataItem, string> & { id: string }) | string): string => {
		return typeof item === "string" ? item : item.id
	}, [])

	const { itemSize, spacing, numColumns } = useMemo(() => {
		const numColumns = isTablet ? (isPortrait ? 6 : 8) : isPortrait ? 3 : 4
		const spacing = 0
		const totalSpacing = spacing * (numColumns - 1)

		return {
			itemSize: (listLayout.width - totalSpacing) / numColumns,
			spacing,
			numColumns
		}
	}, [listLayout.width, isTablet, isPortrait])

	const renderItem = useCallback(
		(info: ListRenderItemInfo<ListItemInfo>) => {
			return (
				<ListItem
					info={info}
					queryParams={queryParams}
					items={driveItems}
					itemSize={itemSize}
					spacing={spacing}
				/>
			)
		},
		[queryParams, driveItems, itemSize, spacing]
	)

	const ListHeaderComponent = useMemo(() => {
		if (hasInternet) {
			return undefined
		}

		return (
			<View className="flex-row items-center justify-center bg-red-500 p-2">
				<Text>Offline mode</Text>
			</View>
		)
	}, [hasInternet])

	const ListEmptyComponent = useMemo(() => {
		return (
			<View className="flex-1 flex-row items-center justify-center">
				{cloudItemsQuery.isSuccess ? (
					searchTerm.length > 0 ? (
						<Text>Nothing found</Text>
					) : (
						<Text>Directory is empty</Text>
					)
				) : (
					<ActivityIndicator color={colors.foreground} />
				)}
			</View>
		)
	}, [searchTerm.length, cloudItemsQuery.isSuccess, colors.foreground])

	const ListFooterComponent = useMemo(() => {
		if (items.length === 0) {
			return undefined
		}

		return (
			<View className="h-16 flex-1 flex-row items-center justify-center">
				<Text className="text-sm">{items.length} items</Text>
			</View>
		)
	}, [items.length])

	const refreshControl = useMemo(() => {
		return (
			<RefreshControl
				refreshing={refreshing}
				onRefresh={async () => {
					setRefreshing(true)

					await cloudItemsQuery.refetch().catch(() => {})

					setRefreshing(false)
				}}
			/>
		)
	}, [refreshing, cloudItemsQuery])

	const list = useMemo(() => {
		if (gridModeEnabled) {
			return (
				<FlatList
					{...FLATLIST_BASE_PROPS}
					ref={listRef}
					data={items}
					numColumns={numColumns}
					renderItem={renderItem}
					keyExtractor={keyExtractor}
					refreshing={refreshing || cloudItemsQuery.status === "pending"}
					contentInsetAdjustmentBehavior="automatic"
					contentContainerStyle={{
						paddingBottom: bottomListContainerPadding
					}}
					ListHeaderComponent={ListHeaderComponent}
					ListEmptyComponent={ListEmptyComponent}
					ListFooterComponent={ListFooterComponent}
					refreshControl={refreshControl}
					windowSize={3}
					removeClippedSubviews={true}
				/>
			)
		}

		return (
			<List
				{...FLATLIST_BASE_PROPS}
				ref={listRef}
				variant="full-width"
				data={items}
				renderItem={renderItem}
				keyExtractor={keyExtractor}
				refreshing={refreshing || cloudItemsQuery.status === "pending"}
				contentInsetAdjustmentBehavior="automatic"
				contentContainerStyle={{
					paddingBottom: bottomListContainerPadding
				}}
				ListHeaderComponent={ListHeaderComponent}
				ListEmptyComponent={ListEmptyComponent}
				ListFooterComponent={ListFooterComponent}
				refreshControl={refreshControl}
				windowSize={3}
				removeClippedSubviews={true}
			/>
		)
	}, [
		bottomListContainerPadding,
		items,
		keyExtractor,
		renderItem,
		refreshing,
		cloudItemsQuery.status,
		gridModeEnabled,
		ListHeaderComponent,
		ListEmptyComponent,
		ListFooterComponent,
		refreshControl,
		numColumns
	])

	useLayoutEffect(() => {
		onLayout()
	}, [onLayout])

	useFocusEffect(
		useCallback(() => {
			setDriveItems(driveItems)
			setSelectedItems([])
		}, [setSelectedItems, driveItems, setDriveItems])
	)

	return (
		<Container>
			<View
				ref={viewRef}
				onLayout={onLayout}
				className="flex-1"
			>
				{list}
			</View>
		</Container>
	)
})

DriveList.displayName = "DriveList"

export default DriveList
