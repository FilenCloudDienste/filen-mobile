import { useCallback, useState, useMemo, useEffect, useRef } from "react"
import events from "@/lib/events"
import useDriveItemsQuery from "@/queries/useDriveItems.query"
import { List, type ListDataItem, type ListRenderItemInfo } from "@/components/nativewindui/List"
import { RefreshControl, View, Platform } from "react-native"
import { Text } from "@/components/nativewindui/Text"
import { useColorScheme } from "@/lib/useColorScheme"
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router"
import Container from "@/components/Container"
import { useSelectDriveItemsStore } from "@/stores/selectDriveItems.store"
import { simpleDate, formatBytes } from "@/lib/utils"
import { orderItemsByType } from "@/lib/itemSorter"
import useSDKConfig from "@/hooks/useSDKConfig"
import { AdaptiveSearchHeader } from "@/components/nativewindui/AdaptiveSearchHeader"
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import cache from "@/lib/cache"
import Item from "@/components/selectDriveItems/item"
import { Button } from "@/components/nativewindui/Button"
import type { PreviewType } from "@/stores/gallery.store"
import RequireInternet from "@/components/requireInternet"
import { translateMemoized, t } from "@/lib/i18n"
import ListEmpty from "@/components/listEmpty"
import alerts from "@/lib/alerts"
import useNetInfo from "@/hooks/useNetInfo"
import type { FlashListRef } from "@shopify/flash-list"

export type ListItemInfo = {
	title: string
	subTitle: string
	id: string
	item: DriveCloudItem
}

export default function SelectDriveItems() {
	const { colors } = useColorScheme()
	const { id, type, max, parent, dismissHref, toMove, previewTypes, extensions, multiScreen } = useLocalSearchParams()
	const [refreshing, setRefreshing] = useState<boolean>(false)
	const [searchTerm, setSearchTerm] = useState<string>("")
	const { canGoBack: routerCanGoBack, dismissTo: routerDismissTo, back: routerBack } = useRouter()
	const [{ baseFolderUUID }] = useSDKConfig()
	const { hasInternet } = useNetInfo()
	const listRef = useRef<FlashListRef<ListItemInfo>>(null)

	const maxParsed = useMemo(() => {
		return typeof max === "string" ? parseInt(max) : 1
	}, [max])

	const typeParsed = useMemo(() => {
		return typeof type === "string" ? (type as "file" | "directory") : "directory"
	}, [type])

	const toMoveParsed = useMemo(() => {
		return typeof toMove === "string" ? (JSON.parse(toMove) as string[]) : []
	}, [toMove])

	const previewTypesParsed = useMemo(() => {
		return typeof previewTypes === "string" ? (JSON.parse(previewTypes) as PreviewType[]) : []
	}, [previewTypes])

	const extensionsParsed = useMemo(() => {
		return typeof extensions === "string" ? (JSON.parse(extensions) as string[]) : []
	}, [extensions])

	const multiScreenParsed = useMemo(() => {
		return typeof multiScreen === "string" ? parseInt(multiScreen) === 1 : false
	}, [multiScreen])

	const idParsed = useMemo(() => {
		return typeof id === "string" ? id : "none"
	}, [id])

	const dismissHrefParsed = useMemo(() => {
		return typeof dismissHref === "string" ? dismissHref : undefined
	}, [dismissHref])

	const queryParams = useMemo(
		(): FetchCloudItemsParams => ({
			parent: typeof parent === "string" ? parent : baseFolderUUID,
			of: "drive",
			receiverId: 0
		}),
		[parent, baseFolderUUID]
	)

	const query = useDriveItemsQuery(queryParams)

	const items = useMemo((): ListItemInfo[] => {
		if (query.status !== "success") {
			return []
		}

		let queryItems = orderItemsByType({
			items: query.data,
			type: "nameAsc"
		}).map(item => ({
			id: item.uuid,
			title: item.name,
			subTitle:
				item.type === "directory"
					? simpleDate(item.lastModified)
					: `${simpleDate(item.lastModified)}  -  ${formatBytes(item.size)}`,
			item
		}))

		if (searchTerm.length > 0) {
			const searchTermLowerCase = searchTerm.toLowerCase()

			queryItems = queryItems.filter(
				item => item.title.toLowerCase().includes(searchTermLowerCase) || item.subTitle.toLowerCase().includes(searchTermLowerCase)
			)
		}

		return queryItems
	}, [query.status, query.data, searchTerm])

	const keyExtractor = useCallback((item: (Omit<ListDataItem, string> & { id: string }) | string): string => {
		return typeof item === "string" ? item : item.id
	}, [])

	const renderItem = useCallback(
		(info: ListRenderItemInfo<ListItemInfo>) => {
			return (
				<Item
					info={info}
					max={maxParsed}
					type={typeParsed}
					toMove={toMoveParsed}
					queryParams={queryParams}
					previewTypes={previewTypesParsed}
					extensions={extensionsParsed}
					id={idParsed}
					dismissHref={dismissHrefParsed}
					multiScreen={multiScreenParsed}
					key={info.item.id}
				/>
			)
		},
		[
			maxParsed,
			typeParsed,
			toMoveParsed,
			queryParams,
			previewTypesParsed,
			extensionsParsed,
			multiScreenParsed,
			idParsed,
			dismissHrefParsed
		]
	)

	const headerTitle = useMemo(() => {
		return typeof parent !== "string" || !cache.directoryUUIDToName.has(parent)
			? typeParsed === "file"
				? maxParsed === 1
					? translateMemoized("selectDriveItems.header.selectFile")
					: translateMemoized("selectDriveItems.header.selectFiles")
				: maxParsed === 1
				? translateMemoized("selectDriveItems.header.selectDirectory")
				: translateMemoized("selectDriveItems.header.selectDirectories")
			: cache.directoryUUIDToName.get(parent) ?? translateMemoized("selectDriveItems.header.drive")
	}, [parent, typeParsed, maxParsed])

	const cancel = useCallback(() => {
		if (!routerCanGoBack()) {
			return
		}

		events.emit("selectDriveItems", {
			type: "response",
			data: {
				id: typeof id === "string" ? id : "none",
				cancelled: true
			}
		})

		if (typeof dismissHref === "string") {
			routerDismissTo(dismissHref)
		} else {
			routerBack()
		}
	}, [id, routerCanGoBack, routerDismissTo, dismissHref, routerBack])

	const header = useMemo(() => {
		return Platform.OS === "ios" ? (
			<AdaptiveSearchHeader
				iosTitle={headerTitle}
				iosIsLargeTitle={false}
				iosBackButtonMenuEnabled={true}
				backgroundColor={colors.card}
				rightView={() => {
					return (
						<Button
							variant="plain"
							onPress={cancel}
						>
							<Text className="text-blue-500">{translateMemoized("selectDriveItems.header.cancel")}</Text>
						</Button>
					)
				}}
				searchBar={{
					iosHideWhenScrolling: false,
					onChangeText: setSearchTerm,
					contentTransparent: true,
					persistBlur: true
				}}
			/>
		) : (
			<LargeTitleHeader
				title={headerTitle}
				materialPreset="inline"
				backVisible={parent !== baseFolderUUID}
				backgroundColor={colors.card}
				rightView={() => {
					return (
						<Button
							variant="plain"
							onPress={cancel}
						>
							<Text className="text-blue-500">{translateMemoized("selectDriveItems.header.cancel")}</Text>
						</Button>
					)
				}}
				searchBar={{
					onChangeText: setSearchTerm,
					contentTransparent: true,
					persistBlur: true
				}}
			/>
		)
	}, [baseFolderUUID, colors.card, headerTitle, parent, cancel])

	const ListEmptyComponent = useCallback(() => {
		return (
			<ListEmpty
				queryStatus={query.status}
				itemCount={items.length}
				texts={{
					error: translateMemoized("selectDriveItems.list.error"),
					empty: translateMemoized("selectDriveItems.list.empty"),
					emptySearch: translateMemoized("selectDriveItems.list.emptySearch")
				}}
				icons={{
					error: {
						name: "wifi-alert"
					},
					empty: {
						name: "file-document-outline"
					},
					emptySearch: {
						name: "magnify"
					}
				}}
			/>
		)
	}, [query.status, items.length])

	const ListFooterComponent = useCallback(() => {
		if (items.length === 0) {
			return undefined
		}

		return (
			<View className="flex flex-row items-center justify-center h-16 p-4">
				<Text className="text-sm">
					{t("selectDriveItems.list.footer", {
						count: items.length
					})}
				</Text>
			</View>
		)
	}, [items.length])

	const onRefresh = useCallback(async () => {
		setRefreshing(true)

		await query
			.refetch()
			.catch(e => {
				console.error(e)

				if (e instanceof Error) {
					alerts.error(e.message)
				}
			})
			.finally(() => {
				setRefreshing(false)
			})
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

	useFocusEffect(
		useCallback(() => {
			useSelectDriveItemsStore.getState().setSelectedItems([])

			return () => {
				useSelectDriveItemsStore.getState().setSelectedItems([])
			}
		}, [])
	)

	useEffect(() => {
		if (!multiScreenParsed) {
			useSelectDriveItemsStore.getState().setSelectedItems([])
		}

		return () => {
			if (typeof parent === "string" && parent === baseFolderUUID) {
				events.emit("selectDriveItems", {
					type: "response",
					data: {
						id: typeof id === "string" ? id : "none",
						cancelled: true
					}
				})
			}
		}
	}, [id, parent, baseFolderUUID, multiScreenParsed])

	return (
		<RequireInternet>
			{header}
			<Container>
				<List
					ref={listRef}
					variant="full-width"
					data={items}
					renderItem={renderItem}
					keyExtractor={keyExtractor}
					refreshing={refreshing}
					contentInsetAdjustmentBehavior="automatic"
					contentContainerClassName="pb-16"
					ListEmptyComponent={ListEmptyComponent}
					ListFooterComponent={ListFooterComponent}
					refreshControl={refreshControl}
				/>
			</Container>
		</RequireInternet>
	)
}
