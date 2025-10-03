import { useRouter, usePathname } from "expo-router"
import { memo, useCallback, useMemo } from "react"
import { ListItem as ListItemComponent } from "@/components/nativewindui/List"
import Menu from "./menu"
import RightView from "./rightView"
import LeftView from "./leftView"
import { useDriveStore } from "@/stores/drive.store"
import { Platform } from "react-native"
import { useDirectorySizeQuery } from "@/queries/useDirectorySize.query"
import { formatBytes, getPreviewType, normalizeFilePathForExpo } from "@/lib/utils"
import useFileOfflineStatusQuery from "@/queries/useFileOfflineStatus.query"
import useNetInfo from "@/hooks/useNetInfo"
import { viewDocument } from "@react-native-documents/viewer"
import alerts from "@/lib/alerts"
import events from "@/lib/events"
import { useGalleryStore } from "@/stores/gallery.store"
import { useMMKVBoolean } from "react-native-mmkv"
import mmkvInstance from "@/lib/mmkv"
import Grid from "./grid"
import { useShallow } from "zustand/shallow"
import type { TextEditorItem } from "@/components/textEditor/editor"
import type { PDFPreviewItem } from "@/app/pdfPreview"
import type { DOCXPreviewItem } from "@/app/docxPreview"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import nodeWorker from "@/lib/nodeWorker"
import cache from "@/lib/cache"
import { useTranslation } from "react-i18next"
import type { ListRenderItemInfo } from "@shopify/flash-list"
import { driveItemsQueryGet } from "@/queries/useDriveItems.query"

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
		fromSearch,
		highlight,
		fromHome
	}: {
		info: ListRenderItemInfo<ListItemInfo>
		queryParams: FetchCloudItemsParams
		items: ListItemInfo[]
		itemSize: number
		spacing: number
		fromSearch?: boolean
		highlight?: boolean
		fromHome?: boolean
	}) => {
		const { push: routerPush } = useRouter()
		const selectedItemsCount = useDriveStore(useShallow(state => state.selectedItems.length))
		const setSelectedItems = useDriveStore(useShallow(state => state.setSelectedItems))
		const isSelected = useDriveStore(useShallow(state => state.selectedItems.some(i => i.uuid === info.item.item.uuid)))
		const { hasInternet } = useNetInfo()
		const pathname = usePathname()
		const [gridModeEnabled] = useMMKVBoolean("gridModeEnabled", mmkvInstance)
		const { t } = useTranslation()

		const directorySize = useDirectorySizeQuery(
			{
				uuid: info.item.item.uuid,
				sharerId: queryParams.of === "sharedIn" && info.item.item.isShared ? info.item.item.sharerId : undefined,
				receiverId: queryParams.of === "sharedOut" && info.item.item.isShared ? info.item.item.receiverId : undefined,
				trash: queryParams.of === "trash" ? true : undefined
			},
			{
				enabled: info.item.item.type === "directory"
			}
		)

		const fileOfflineStatus = useFileOfflineStatusQuery(
			{
				uuid: info.item.item.uuid
			},
			{
				enabled: info.item.item.type === "file"
			}
		)

		const item = useMemo(() => {
			if (info.item.item.type !== "directory" || directorySize.status !== "success") {
				return info.item
			}

			return {
				...info.item,
				subTitle: `${info.item.subTitle}  -  ${formatBytes(directorySize.data.size)}`
			}
		}, [info.item, directorySize.status, directorySize.data])

		const offlineStatus = useMemo(() => {
			return info.item.item.type === "file" && fileOfflineStatus.status === "success" ? fileOfflineStatus.data : null
		}, [info.item.item.type, fileOfflineStatus.status, fileOfflineStatus.data])

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
					isAvailableOffline={offlineStatus?.exists ?? false}
					queryParams={queryParams}
				/>
			)
		}, [info.item.item, select, selectedItemsCount, isSelected, offlineStatus, queryParams])

		const rightView = useMemo(() => {
			if (Platform.OS === "ios" || fromSearch) {
				return undefined
			}

			return (
				<RightView
					item={info.item.item}
					queryParams={queryParams}
				/>
			)
		}, [info.item.item, queryParams, fromSearch])

		const onPressFromSearch = useCallback(async () => {
			if (info.item.item.type === "directory") {
				events.emit("hideSearchBar", {
					clearText: true
				})

				routerPush({
					pathname: "/drive/[uuid]",
					params: {
						uuid: info.item.item.uuid
					}
				})

				return
			}

			fullScreenLoadingModal.show()

			try {
				const parent = await nodeWorker.proxy("getDirectory", {
					uuid: info.item.item.parent
				})

				cache.directoryUUIDToName.set(info.item.item.parent, parent.metadataDecrypted.name)

				events.emit("hideSearchBar", {
					clearText: true
				})

				routerPush({
					pathname: "/drive/[uuid]",
					params: {
						uuid: parent.uuid,
						scrollToUUID: info.item.item.uuid
					}
				})
			} catch (e) {
				console.error(e)

				if (e instanceof Error) {
					alerts.error(e.message)
				}
			} finally {
				fullScreenLoadingModal.hide()
			}
		}, [info.item.item, routerPush])

		const onPress = useCallback(() => {
			if (fromSearch) {
				onPressFromSearch()

				return
			}

			if (selectedItemsCount > 0) {
				select()

				return
			}

			if (info.item.item.type === "directory") {
				if (pathname.startsWith("/home/trash")) {
					return
				}

				if (!hasInternet) {
					const cachedContent = driveItemsQueryGet(
						pathname.startsWith("/home/links")
							? {
									of: "links",
									parent: info.item.item.uuid,
									receiverId: info.item.item.isShared ? info.item.item.receiverId : 0
							  }
							: pathname.startsWith("/home/sharedOut")
							? {
									of: "sharedOut",
									parent: info.item.item.uuid,
									receiverId: info.item.item.isShared ? info.item.item.receiverId : 0
							  }
							: pathname.startsWith("/home/sharedIn")
							? {
									of: "sharedIn",
									parent: info.item.item.uuid,
									receiverId: info.item.item.isShared ? info.item.item.receiverId : 0
							  }
							: pathname.startsWith("/home/offline")
							? {
									of: "offline",
									parent: info.item.item.uuid,
									receiverId: info.item.item.isShared ? info.item.item.receiverId : 0
							  }
							: {
									of: "drive",
									parent: info.item.item.uuid,
									receiverId: info.item.item.isShared ? info.item.item.receiverId : 0
							  }
					)

					if (!cachedContent) {
						alerts.error(t("errors.youAreOffline"))

						return
					}
				}

				events.emit("hideSearchBar", {
					clearText: true
				})

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

			if (!hasInternet || offlineStatus?.exists) {
				if (!offlineStatus || !offlineStatus.exists) {
					alerts.error(t("errors.youAreOffline"))

					return
				}

				viewDocument({
					uri: normalizeFilePathForExpo(offlineStatus.path),
					grantPermissions: "read",
					headerTitle: info.item.item.name,
					mimeType: info.item.item.mime,
					presentationStyle: "pageSheet"
				}).catch(err => {
					console.error(err)

					if (err instanceof Error) {
						alerts.error(err.message)
					}
				})

				return
			}

			if ((previewType === "image" || previewType === "video" || previewType === "audio") && info.item.item.size > 0) {
				useGalleryStore.getState().open({
					items: items
						.map(item => item.item)
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
						.filter(item => item !== null),
					initialUUIDOrURI: info.item.item.uuid
				})
			}

			if (previewType === "text" || previewType === "code") {
				events.emit("hideSearchBar", {
					clearText: true
				})

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

			if (previewType === "pdf" && info.item.item.size > 0) {
				events.emit("hideSearchBar", {
					clearText: true
				})

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

			if (previewType === "docx" && info.item.item.size > 0) {
				events.emit("hideSearchBar", {
					clearText: true
				})

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
			offlineStatus,
			pathname,
			items,
			queryParams,
			fromSearch,
			onPressFromSearch,
			t
		])

		if (gridModeEnabled && !fromSearch) {
			return (
				<Grid
					item={info.item.item}
					itemSize={itemSize}
					spacing={spacing}
					pathname={pathname}
					isAvailableOffline={offlineStatus && offlineStatus.exists ? true : false}
					queryParams={queryParams}
					onPress={onPress}
					directorySize={info.item.item.type === "directory" ? directorySize.data : undefined}
					select={select}
					selectedItemsCount={selectedItemsCount}
					isSelected={isSelected}
					highlight={highlight}
				/>
			)
		}

		if (fromSearch) {
			return (
				<ListItemComponent
					{...info}
					item={item}
					leftView={leftView}
					subTitleClassName="text-xs pt-1 font-normal"
					variant="full-width"
					textNumberOfLines={1}
					subTitleNumberOfLines={1}
					isFirstInSection={false}
					isLastInSection={false}
					onPress={onPress}
					removeSeparator={Platform.OS === "android"}
					innerClassName="ios:py-3 py-3 android:py-3"
				/>
			)
		}

		return (
			<Menu
				type="context"
				item={info.item.item}
				queryParams={queryParams}
				fromHome={fromHome}
				fromPreview={false}
				fromPhotos={false}
				fromSearch={fromSearch}
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
					innerClassName="ios:py-3 py-3 android:py-3"
					className={highlight ? "border-l-4 border-primary/80" : ""}
				/>
			</Menu>
		)
	}
)

ListItem.displayName = "ListItem"

export default ListItem
