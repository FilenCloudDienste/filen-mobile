import { useRouter, usePathname } from "expo-router"
import { memo, useCallback, useMemo } from "react"
import { ListItem as ListItemComponent } from "@/components/nativewindui/List"
import Menu from "./menu"
import RightView from "./rightView"
import LeftView from "./leftView"
import { useDriveStore } from "@/stores/drive.store"
import { Platform } from "react-native"
import { useDirectorySizeQuery } from "@/queries/useDirectorySizeQuery"
import { formatBytes, getPreviewType } from "@/lib/utils"
import useFileOfflineStatusQuery from "@/queries/useFileOfflineStatusQuery"
import { viewDocument } from "@react-native-documents/viewer"
import useNetInfo from "@/hooks/useNetInfo"
import alerts from "@/lib/alerts"
import events from "@/lib/events"
import { useGalleryStore } from "@/stores/gallery.store"
import { useMMKVBoolean } from "react-native-mmkv"
import mmkvInstance from "@/lib/mmkv"
import Grid from "./grid"
import { useShallow } from "zustand/shallow"
import { type TextEditorItem } from "@/components/textEditor/editor"
import { type PDFPreviewItem } from "@/components/pdfPreview"
import { type DOCXPreviewItem } from "@/components/docxPreview"
import { type ListRenderItemInfo } from "@shopify/flash-list"

export type ListItemInfo = {
	title: string
	subTitle: string
	id: string
	item: DriveCloudItem
}

export const ListItem = memo(
	({
		info,
		queryParams,
		items,
		itemSize,
		spacing,
		fromSearch = false
	}: {
		info: ListRenderItemInfo<ListItemInfo>
		queryParams: FetchCloudItemsParams
		items: DriveCloudItem[]
		itemSize: number
		spacing: number
		fromSearch?: boolean
	}) => {
		const { push: routerPush } = useRouter()
		const selectedItemsCount = useDriveStore(useShallow(state => state.selectedItems.length))
		const setSelectedItems = useDriveStore(useShallow(state => state.setSelectedItems))
		const isSelected = useDriveStore(useShallow(state => state.selectedItems.some(i => i.uuid === info.item.item.uuid)))
		const { hasInternet } = useNetInfo()
		const pathname = usePathname()
		const [gridModeEnabled] = useMMKVBoolean("gridModeEnabled", mmkvInstance)

		const directorySize = useDirectorySizeQuery({
			uuid: info.item.item.uuid,
			enabled: info.item.item.type === "directory",
			sharerId: queryParams.of === "sharedIn" && info.item.item.isShared ? info.item.item.sharerId : undefined,
			receiverId: queryParams.of === "sharedOut" && info.item.item.isShared ? info.item.item.receiverId : undefined,
			trash: queryParams.of === "trash" ? true : undefined
		})

		const fileOfflineStatus = useFileOfflineStatusQuery({
			uuid: info.item.item.uuid,
			enabled: info.item.item.type === "file"
		})

		const item = useMemo(() => {
			if (info.item.item.type !== "directory" || !directorySize.isSuccess) {
				return info.item
			}

			return {
				...info.item,
				subTitle: `${info.item.subTitle}  -  ${formatBytes(directorySize.data.size)}`
			}
		}, [info.item, directorySize.isSuccess, directorySize.data])

		const isAvailableOffline = useMemo(() => {
			return info.item.item.type === "file" && fileOfflineStatus.isSuccess ? fileOfflineStatus.data.exists : false
		}, [info.item.item.type, fileOfflineStatus.isSuccess, fileOfflineStatus.data?.exists])

		const select = useCallback(() => {
			setSelectedItems(prev =>
				isSelected
					? prev.filter(i => i.uuid !== info.item.item.uuid)
					: [...prev.filter(i => i.uuid !== info.item.item.uuid), info.item.item]
			)
		}, [info.item.item, setSelectedItems, isSelected])

		const leftView = useMemo(() => {
			return (
				<LeftView
					item={info.item.item}
					select={select}
					selectedItemsCount={selectedItemsCount}
					isSelected={isSelected}
					isAvailableOffline={isAvailableOffline}
					queryParams={queryParams}
				/>
			)
		}, [info.item.item, select, selectedItemsCount, isSelected, isAvailableOffline, queryParams])

		const rightView = useMemo(() => {
			if (Platform.OS === "ios") {
				return undefined
			}

			return (
				<RightView
					item={info.item.item}
					queryParams={queryParams}
					isAvailableOffline={isAvailableOffline}
				/>
			)
		}, [info.item.item, queryParams, isAvailableOffline])

		const onPress = useCallback(() => {
			if (selectedItemsCount > 0) {
				select()

				return
			}

			if (info.item.item.type === "directory") {
				if (pathname.startsWith("/home/trash")) {
					return
				}

				events.emit("hideSearchBar", undefined)

				routerPush({
					pathname: pathname.startsWith("/home/links")
						? "/home/links/[uuid]"
						: pathname.startsWith("/home/sharedOut")
						? "/home/sharedOut/[uuid]"
						: pathname.startsWith("/home/sharedIn")
						? "/home/sharedIn/[uuid]"
						: pathname.startsWith("/home/offline")
						? "/home/offline/[uuid]"
						: "/drive/[uuid]",
					params: {
						uuid: info.item.item.uuid,
						...(info.item.item.isShared
							? {
									receiverId: info.item.item.receiverId,
									receiverEmail: info.item.item.receiverEmail,
									receivers: JSON.stringify(info.item.item.receivers),
									sharerId: info.item.item.sharerId,
									sharerEmail: info.item.item.sharerEmail
							  }
							: {})
					}
				})

				return
			}

			const previewType = getPreviewType(info.item.item.name)

			if (
				((!["image", "video"].includes(previewType) && isAvailableOffline && fileOfflineStatus.data?.exists) ||
					(!hasInternet && isAvailableOffline && fileOfflineStatus.data?.exists)) &&
				info.item.item.size > 0
			) {
				events.emit("hideSearchBar", undefined)

				viewDocument({
					uri: fileOfflineStatus.data.path,
					mimeType: info.item.item.mime
				}).catch(err => {
					console.error(err)

					alerts.error("Failed to view file")
				})

				return
			}

			if ((previewType === "image" || previewType === "video" || previewType === "audio") && hasInternet && info.item.item.size > 0) {
				useGalleryStore.getState().setItems(
					items
						.map(item => {
							const previewType = getPreviewType(item.name)

							return (previewType === "audio" || previewType === "image" || previewType === "video") && item.size > 0
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

				useGalleryStore.getState().setInitialUUID(info.item.item.uuid)
				useGalleryStore.getState().setVisible(true)
			}

			if ((previewType === "text" || previewType === "code") && hasInternet) {
				events.emit("hideSearchBar", undefined)

				routerPush({
					pathname: "/textEditor",
					params: {
						item: JSON.stringify({
							type: "cloud",
							driveItem: info.item.item
						} satisfies TextEditorItem)
					}
				})
			}

			if (previewType === "pdf" && hasInternet && info.item.item.size > 0) {
				events.emit("hideSearchBar", undefined)

				routerPush({
					pathname: "/pdfPreview",
					params: {
						item: JSON.stringify({
							type: "cloud",
							driveItem: info.item.item
						} satisfies PDFPreviewItem)
					}
				})
			}

			if (previewType === "docx" && hasInternet && info.item.item.size > 0) {
				events.emit("hideSearchBar", undefined)

				routerPush({
					pathname: "/docxPreview",
					params: {
						item: JSON.stringify({
							type: "cloud",
							driveItem: info.item.item
						} satisfies DOCXPreviewItem)
					}
				})
			}
		}, [
			routerPush,
			selectedItemsCount,
			select,
			info.item.item,
			hasInternet,
			isAvailableOffline,
			fileOfflineStatus.data,
			pathname,
			items,
			queryParams
		])

		if (gridModeEnabled && !fromSearch) {
			return (
				<Grid
					item={info.item.item}
					itemSize={itemSize}
					spacing={spacing}
					pathname={pathname}
					isAvailableOffline={isAvailableOffline}
					queryParams={queryParams}
					onPress={onPress}
					directorySize={info.item.item.type === "directory" ? directorySize.data : undefined}
					select={select}
					selectedItemsCount={selectedItemsCount}
					isSelected={isSelected}
				/>
			)
		}

		if (fromSearch) {
			return (
				<ListItemComponent
					{...info}
					item={item}
					leftView={leftView}
					rightView={rightView}
					subTitleClassName="text-xs pt-1 font-normal"
					variant="full-width"
					textNumberOfLines={1}
					subTitleNumberOfLines={1}
					isFirstInSection={false}
					isLastInSection={false}
					onPress={onPress}
					removeSeparator={Platform.OS === "android"}
					innerClassName="ios:py-2.5 py-2.5 android:py-2.5"
				/>
			)
		}

		return (
			<Menu
				type="context"
				item={info.item.item}
				queryParams={queryParams}
				isAvailableOffline={isAvailableOffline}
				insidePreview={false}
			>
				<ListItemComponent
					{...info}
					item={item}
					leftView={leftView}
					rightView={rightView}
					subTitleClassName="text-xs pt-1 font-normal"
					variant="full-width"
					textNumberOfLines={1}
					subTitleNumberOfLines={1}
					isFirstInSection={false}
					isLastInSection={false}
					onPress={onPress}
					removeSeparator={Platform.OS === "android"}
					innerClassName="ios:py-2.5 py-2.5 android:py-2.5"
				/>
			</Menu>
		)
	}
)

ListItem.displayName = "ListItem"

export default ListItem
