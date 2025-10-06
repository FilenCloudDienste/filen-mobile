import { View, RefreshControl } from "react-native"
import { Text } from "@/components/nativewindui/Text"
import { memo, useState, useMemo, useCallback, useRef, useLayoutEffect } from "react"
import { List, ListDataItem } from "@/components/nativewindui/List"
import useDriveItemsQuery from "@/queries/useDriveItems.query"
import { simpleDate, formatBytes, orderItemsByType, type OrderByType } from "@/lib/utils"
import { Container } from "@/components/Container"
import ListItem, { type ListItemInfo } from "./listItem"
import { useFocusEffect } from "expo-router"
import { useDriveStore } from "@/stores/drive.store"
import useNetInfo from "@/hooks/useNetInfo"
import { useMMKVBoolean, useMMKVString } from "react-native-mmkv"
import mmkvInstance from "@/lib/mmkv"
import useViewLayout from "@/hooks/useViewLayout"
import useDimensions from "@/hooks/useDimensions"
import { useShallow } from "zustand/shallow"
import OfflineListHeader from "@/components/offlineListHeader"
import { useKeyboardState } from "react-native-keyboard-controller"
import ListEmpty from "@/components/listEmpty"
import { useTranslation } from "react-i18next"
import alerts from "@/lib/alerts"
import { FlashList, type ListRenderItemInfo, type FlashListRef } from "@shopify/flash-list"

const contentContainerStyle = {
	paddingBottom: 100
}

export const DriveList = memo(({ queryParams, scrollToUUID }: { queryParams: FetchCloudItemsParams; scrollToUUID?: string }) => {
	const [refreshing, setRefreshing] = useState<boolean>(false)
	const searchTerm = useDriveStore(useShallow(state => state.searchTerm))
	const { hasInternet } = useNetInfo()
	const [orderBy] = useMMKVString("orderBy", mmkvInstance) as [OrderByType | undefined, (value: OrderByType) => void]
	const listRef = useRef<FlashListRef<ListItemInfo>>(null)
	const [gridModeEnabled] = useMMKVBoolean("gridModeEnabled", mmkvInstance)
	const viewRef = useRef<View>(null)
	const { layout: listLayout, onLayout } = useViewLayout(viewRef)
	const { isTablet, isPortrait, screen } = useDimensions()
	const keyboardState = useKeyboardState()
	const { t } = useTranslation()

	const cloudItemsQuery = useDriveItemsQuery(queryParams)

	const items = useMemo((): ListItemInfo[] => {
		if (cloudItemsQuery.status !== "success") {
			return []
		}

		const searchTermLowerCase = searchTerm.toLowerCase().trim()

		return orderItemsByType({
			items:
				searchTerm.length > 0
					? cloudItemsQuery.data.filter(item => item.name.toLowerCase().trim().includes(searchTermLowerCase))
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
	}, [cloudItemsQuery.status, cloudItemsQuery.data, searchTerm, orderBy, queryParams.of])

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
					items={items}
					itemSize={itemSize}
					spacing={spacing}
					highlight={scrollToUUID === info.item.item.uuid}
				/>
			)
		},
		[queryParams, items, itemSize, spacing, scrollToUUID]
	)

	const onRefresh = useCallback(async () => {
		setRefreshing(true)

		try {
			await cloudItemsQuery.refetch()
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			setRefreshing(false)
		}
	}, [cloudItemsQuery])

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

	const initialScrollIndex = useMemo(() => {
		if (!scrollToUUID || items.length === 0) {
			return undefined
		}

		const index = items.findIndex(item => item.id === scrollToUUID)

		if (index === -1) {
			return undefined
		}

		return index
	}, [scrollToUUID, items])

	const ListHeaderComponent = useCallback(() => {
		if (hasInternet) {
			return undefined
		}

		return <OfflineListHeader />
	}, [hasInternet])

	const ListEmptyComponent = useCallback(() => {
		return (
			<ListEmpty
				queryStatus={cloudItemsQuery.status}
				itemCount={items.length}
				searchTermLength={searchTerm.length}
				texts={{
					error: t("drive.list.error"),
					empty: t("drive.list.empty"),
					emptySearch: t("drive.list.emptySearch")
				}}
				icons={{
					error: {
						name: "wifi-alert"
					},
					empty: {
						name: "cloud-outline"
					},
					emptySearch: {
						name: "magnify"
					}
				}}
			/>
		)
	}, [cloudItemsQuery.status, searchTerm.length, items.length, t])

	const ListFooterComponent = useCallback(() => {
		return items.length > 0 ? (
			<View className="flex-row items-center justify-center h-16">
				<Text className="text-sm">
					{t("drive.list.footer", {
						count: items.length
					})}
				</Text>
			</View>
		) : undefined
	}, [items.length, t])

	const viewStyle = useMemo(() => {
		return {
			paddingBottom: keyboardState.isVisible && queryParams.of !== "drive" ? keyboardState.height : 0
		}
	}, [keyboardState.isVisible, keyboardState.height, queryParams.of])

	useLayoutEffect(() => {
		onLayout()
	}, [onLayout])

	useFocusEffect(
		useCallback(() => {
			useDriveStore.getState().setSelectedItems([])
		}, [])
	)

	return (
		<Container>
			<View
				ref={viewRef}
				onLayout={onLayout}
				className="flex-1"
				style={viewStyle}
			>
				{gridModeEnabled ? (
					<FlashList
						ref={listRef}
						data={items}
						numColumns={numColumns}
						renderItem={renderItem}
						keyExtractor={keyExtractor}
						refreshing={refreshing}
						contentInsetAdjustmentBehavior="automatic"
						initialScrollIndex={initialScrollIndex}
						contentContainerStyle={contentContainerStyle}
						ListHeaderComponent={ListHeaderComponent}
						ListEmptyComponent={ListEmptyComponent}
						ListFooterComponent={ListFooterComponent}
						refreshControl={refreshControl}
						maxItemsInRecyclePool={0}
						drawDistance={Math.floor(screen.height / 4)}
					/>
				) : (
					<List
						ref={listRef}
						variant="full-width"
						data={items}
						renderItem={renderItem}
						keyExtractor={keyExtractor}
						refreshing={refreshing}
						contentInsetAdjustmentBehavior="automatic"
						initialScrollIndex={initialScrollIndex}
						contentContainerStyle={contentContainerStyle}
						ListHeaderComponent={ListHeaderComponent}
						ListEmptyComponent={ListEmptyComponent}
						ListFooterComponent={ListFooterComponent}
						refreshControl={refreshControl}
					/>
				)}
			</View>
		</Container>
	)
})

DriveList.displayName = "DriveList"

export default DriveList
