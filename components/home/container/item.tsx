import { memo, useCallback, useMemo } from "react"
import { useColorScheme } from "@/lib/useColorScheme"
import { View, Platform } from "react-native"
import { formatBytes, getPreviewType, normalizeFilePathForExpo } from "@/lib/utils"
import { Icon } from "@roninoss/icons"
import { Button } from "@/components/nativewindui/Button"
import { useDirectorySizeQuery } from "@/queries/useDirectorySize.query"
import { useRouter } from "expo-router"
import { viewDocument } from "@react-native-documents/viewer"
import useFileOfflineStatusQuery from "@/queries/useFileOfflineStatus.query"
import useNetInfo from "@/hooks/useNetInfo"
import alerts from "@/lib/alerts"
import { useGalleryStore } from "@/stores/gallery.store"
import Thumbnail from "@/components/thumbnail/item"
import Menu from "@/components/drive/list/listItem/menu"
import { ListItem } from "@/components/nativewindui/List"
import type { TextEditorItem } from "@/components/textEditor/editor"
import type { PDFPreviewItem } from "@/app/pdfPreview"
import type { DOCXPreviewItem } from "@/app/docxPreview"
import { translateMemoized } from "@/lib/i18n"
import { driveItemsQueryGet } from "@/queries/useDriveItems.query"
import { simpleDate } from "@/lib/time"

export const ICON_HEIGHT: number = 44

export const Item = memo(
	({
		item,
		type,
		items,
		index
	}: {
		item: DriveCloudItem
		type: "recents" | "favorites" | "links" | "sharedIn" | "sharedOut" | "offline" | "trash"
		items: DriveCloudItem[]
		index: number
	}) => {
		const { colors } = useColorScheme()
		const { push: routerPush } = useRouter()
		const { hasInternet } = useNetInfo()

		const queryParams = useMemo(() => {
			return {
				of: type,
				parent: type,
				receiverId: item.isShared ? item.receiverId : 0
			} satisfies FetchCloudItemsParams
		}, [type, item])

		const directorySize = useDirectorySizeQuery(
			{
				uuid: item.uuid,
				sharerId: type === "sharedIn" && item.isShared ? item.sharerId : undefined,
				receiverId: type === "sharedOut" && item.isShared ? item.receiverId : undefined,
				trash: type === "trash" ? true : undefined
			},
			{
				enabled: item.type === "directory"
			}
		)

		const fileOfflineStatus = useFileOfflineStatusQuery(
			{
				uuid: item.uuid
			},
			{
				enabled: item.type === "file"
			}
		)

		const offlineStatus = useMemo(() => {
			return item.type === "file" && fileOfflineStatus.status === "success" ? fileOfflineStatus.data : null
		}, [item.type, fileOfflineStatus.status, fileOfflineStatus.data])

		const onPress = useCallback(() => {
			if (item.type === "directory") {
				if (!hasInternet) {
					const cachedContent = driveItemsQueryGet(
						type === "links"
							? {
									of: "links",
									parent: item.uuid,
									receiverId: item.isShared ? item.receiverId : 0
							  }
							: type === "sharedOut"
							? {
									of: "sharedOut",
									parent: item.uuid,
									receiverId: item.isShared ? item.receiverId : 0
							  }
							: type === "sharedIn"
							? {
									of: "sharedIn",
									parent: item.uuid,
									receiverId: item.isShared ? item.receiverId : 0
							  }
							: type === "offline"
							? {
									of: "offline",
									parent: item.uuid,
									receiverId: item.isShared ? item.receiverId : 0
							  }
							: {
									of: "drive",
									parent: item.uuid,
									receiverId: item.isShared ? item.receiverId : 0
							  }
					)

					if (!cachedContent) {
						alerts.error(translateMemoized("errors.youAreOffline"))

						return
					}
				}

				if (type === "links") {
					routerPush({
						pathname: "/(app)/home/links/[uuid]",
						params: {
							uuid: item.uuid
						}
					})

					return
				}

				if (type === "favorites") {
					routerPush({
						pathname: "/(app)/home/favorites/[uuid]",
						params: {
							uuid: item.uuid
						}
					})

					return
				}

				if (type === "sharedIn") {
					routerPush({
						pathname: "/(app)/home/sharedIn/[uuid]",
						params: {
							uuid: item.uuid
						}
					})

					return
				}

				if (type === "sharedOut" && item.isShared) {
					routerPush({
						pathname: "/(app)/home/sharedOut/[uuid]",
						params: {
							uuid: item.uuid,
							receiverId: item.receiverId
						}
					})

					return
				}

				if (type === "offline") {
					routerPush({
						pathname: "/(app)/home/offline/[uuid]",
						params: {
							uuid: item.uuid
						}
					})

					return
				}

				return
			}

			const previewType = getPreviewType(item.name)

			if (!hasInternet || offlineStatus?.exists) {
				if (!offlineStatus || !offlineStatus.exists) {
					alerts.error(translateMemoized("errors.youAreOffline"))

					return
				}

				viewDocument({
					uri: normalizeFilePathForExpo(offlineStatus.path),
					grantPermissions: "read",
					headerTitle: item.name,
					mimeType: item.mime,
					presentationStyle: "pageSheet"
				}).catch(err => {
					console.error(err)

					if (err instanceof Error) {
						alerts.error(err.message)
					}
				})

				return
			}

			if ((previewType === "image" || previewType === "video" || previewType === "audio") && item.size > 0) {
				useGalleryStore.getState().open({
					items: items
						.map(item => {
							const previewType = getPreviewType(item.name)

							return previewType === "image" || previewType === "video" || previewType === "audio"
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
					initialUUIDOrURI: item.uuid
				})

				return
			}

			if (previewType === "text" || previewType === "code") {
				routerPush({
					pathname: "/textEditor",
					params: {
						item: JSON.stringify({
							type: "cloud",
							driveItem: item
						} satisfies TextEditorItem)
					}
				})

				return
			}

			if (previewType === "pdf" && item.size > 0) {
				routerPush({
					pathname: "/pdfPreview",
					params: {
						item: JSON.stringify({
							type: "cloud",
							driveItem: item
						} satisfies PDFPreviewItem)
					}
				})

				return
			}

			if (previewType === "docx" && item.size > 0) {
				routerPush({
					pathname: "/docxPreview",
					params: {
						item: JSON.stringify({
							type: "cloud",
							driveItem: item
						} satisfies DOCXPreviewItem)
					}
				})

				return
			}
		}, [routerPush, item, hasInternet, offlineStatus, items, type, queryParams])

		const itemInfo = useMemo(() => {
			return {
				title: item.name,
				subTitle: `${simpleDate(item.lastModified)} - ${formatBytes(
					item.type === "directory" ? directorySize.data?.size ?? 0 : item.size
				)}`
			}
		}, [item, directorySize.data?.size])

		const leftView = useMemo(() => {
			return (
				<View className="flex-1 flex-row items-center gap-4 justify-center px-4">
					<View className="flex-row items-center">
						{offlineStatus?.exists && (
							<View className="w-[16px] h-[16px] absolute -bottom-[1px] -left-[1px] bg-green-500 rounded-full z-50 flex-row items-center justify-center border-white border-[1px]">
								<Icon
									name="arrow-down"
									size={10}
									color="white"
								/>
							</View>
						)}
						{item.favorited && type !== "favorites" && type !== "trash" && (
							<View className="w-[16px] h-[16px] absolute -bottom-[1px] -right-[1px] bg-red-500 rounded-full z-50 flex-row items-center justify-center border-white border-[1px]">
								<Icon
									name="heart"
									size={10}
									color="white"
								/>
							</View>
						)}
						<Thumbnail
							item={item}
							size={ICON_HEIGHT}
							imageResizeMode="contain"
							imageCachePolicy="dataCache"
							imageStyle={{
								width: ICON_HEIGHT,
								height: ICON_HEIGHT,
								backgroundColor: colors.background,
								borderRadius: 6
							}}
						/>
					</View>
				</View>
			)
		}, [item, colors.background, offlineStatus?.exists, type])

		const rightView = useMemo(() => {
			return (
				<View className="flex-1 justify-center px-4">
					<Menu
						type="dropdown"
						item={item}
						queryParams={{
							of: type,
							parent: type,
							receiverId: item.isShared ? item.receiverId : 0
						}}
						fromHome={true}
					>
						<Button
							variant="plain"
							size="icon"
						>
							<Icon
								namingScheme="sfSymbol"
								name="ellipsis"
								color={colors.foreground}
								size={24}
							/>
						</Button>
					</Menu>
				</View>
			)
		}, [item, type, colors.foreground])

		return (
			<Menu
				type="context"
				item={item}
				queryParams={queryParams}
				fromHome={true}
			>
				<ListItem
					target="Cell"
					item={itemInfo}
					index={index}
					className="overflow-hidden bg-background"
					leftView={leftView}
					rightView={rightView}
					subTitleClassName="text-xs pt-1"
					variant="full-width"
					textNumberOfLines={1}
					subTitleNumberOfLines={1}
					isFirstInSection={false}
					isLastInSection={false}
					onPress={onPress}
					removeSeparator={Platform.OS === "android"}
					innerClassName="ios:py-3 py-3 android:py-3"
				/>
			</Menu>
		)
	}
)

Item.displayName = "Item"

export default Item
