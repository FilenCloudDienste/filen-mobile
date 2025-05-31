import { memo, useCallback, useMemo } from "react"
import { useColorScheme } from "@/lib/useColorScheme"
import { View, Platform } from "react-native"
import { simpleDate, formatBytes, getPreviewType } from "@/lib/utils"
import { Icon } from "@roninoss/icons"
import { Button } from "@/components/nativewindui/Button"
import { useDirectorySizeQuery } from "@/queries/useDirectorySizeQuery"
import { useRouter } from "expo-router"
import { viewDocument } from "@react-native-documents/viewer"
import useFileOfflineStatusQuery from "@/queries/useFileOfflineStatusQuery"
import useNetInfo from "@/hooks/useNetInfo"
import alerts from "@/lib/alerts"
import { useGalleryStore } from "@/stores/gallery.store"
import Thumbnail from "@/components/thumbnail/item"
import Menu from "@/components/drive/list/listItem/menu"
import { ListItem } from "@/components/nativewindui/List"
import { type TextEditorItem } from "@/components/textEditor/editor"
import { type PDFPreviewItem } from "@/components/pdfPreview"
import { type DOCXPreviewItem } from "@/components/docxPreview"

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

		const directorySize = useDirectorySizeQuery({
			uuid: item.uuid,
			enabled: item.type === "directory",
			sharerId: type === "sharedIn" && item.isShared ? item.sharerId : undefined,
			receiverId: type === "sharedOut" && item.isShared ? item.receiverId : undefined,
			trash: type === "trash" ? true : undefined
		})

		const fileOfflineStatus = useFileOfflineStatusQuery({
			uuid: item.uuid,
			enabled: item.type === "file"
		})

		const isAvailableOffline = useMemo(() => {
			return item.type === "file" && fileOfflineStatus.isSuccess ? fileOfflineStatus.data.exists : false
		}, [item.type, fileOfflineStatus.isSuccess, fileOfflineStatus.data?.exists])

		const onPress = useCallback(() => {
			if (item.type === "directory") {
				if (type === "links") {
					routerPush({
						pathname: "/(app)/home/links/[uuid]",
						params: {
							uuid: item.uuid
						}
					})
				}

				if (type === "sharedIn") {
					routerPush({
						pathname: "/(app)/home/sharedIn/[uuid]",
						params: {
							uuid: item.uuid
						}
					})
				}

				if (type === "sharedOut") {
					routerPush({
						pathname: "/(app)/home/sharedOut/[uuid]",
						params: {
							uuid: item.uuid
						}
					})
				}

				if (type === "offline") {
					routerPush({
						pathname: "/(app)/home/offline/[uuid]",
						params: {
							uuid: item.uuid
						}
					})
				}

				return
			}

			const previewType = getPreviewType(item.name)

			if (
				((!["image", "video"].includes(previewType) && isAvailableOffline && fileOfflineStatus.data?.exists) ||
					(!hasInternet && isAvailableOffline && fileOfflineStatus.data?.exists)) &&
				item.size > 0
			) {
				viewDocument({
					uri: fileOfflineStatus.data.path,
					mimeType: item.mime
				}).catch(err => {
					console.error(err)

					alerts.error("Failed to view file")
				})

				return
			}

			if ((previewType === "image" || previewType === "video" || previewType === "audio") && hasInternet && item.size > 0) {
				useGalleryStore.getState().setItems(
					items
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
						.filter(item => item !== null)
				)

				useGalleryStore.getState().setInitialUUID(item.uuid)
				useGalleryStore.getState().setVisible(true)
			}

			if ((previewType === "text" || previewType === "code") && hasInternet) {
				routerPush({
					pathname: "/textEditor",
					params: {
						item: JSON.stringify({
							type: "cloud",
							driveItem: item
						} satisfies TextEditorItem)
					}
				})
			}

			if (previewType === "pdf" && hasInternet && item.size > 0) {
				routerPush({
					pathname: "/pdfPreview",
					params: {
						item: JSON.stringify({
							type: "cloud",
							driveItem: item
						} satisfies PDFPreviewItem)
					}
				})
			}

			if (previewType === "docx" && hasInternet && item.size > 0) {
				routerPush({
					pathname: "/docxPreview",
					params: {
						item: JSON.stringify({
							type: "cloud",
							driveItem: item
						} satisfies DOCXPreviewItem)
					}
				})
			}
		}, [routerPush, item, hasInternet, isAvailableOffline, fileOfflineStatus.data, items, type, queryParams])

		return (
			<Menu
				type="context"
				insidePreview={false}
				item={item}
				queryParams={queryParams}
				isAvailableOffline={isAvailableOffline}
			>
				<ListItem
					target="Cell"
					item={{
						title: item.name,
						subTitle: `${simpleDate(item.lastModified)} - ${formatBytes(
							item.type === "directory" ? directorySize.data?.size ?? 0 : item.size
						)}`
					}}
					index={index}
					className="overflow-hidden bg-background"
					leftView={
						<View className="flex-1 flex-row items-center gap-4 justify-center px-4">
							<View className="flex-row items-center">
								{isAvailableOffline && (
									<View className="w-[16px] h-[16px] absolute -bottom-[1px] -left-[1px] bg-green-500 rounded-full z-50 flex-row items-center justify-center border-white border-[1px]">
										<Icon
											name="arrow-down"
											size={10}
											color="white"
										/>
									</View>
								)}
								{item.favorited && type !== "favorites" && (
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
									imageContentFit="contain"
									imageCachePolicy="none"
									imageStyle={{
										width: ICON_HEIGHT,
										height: ICON_HEIGHT,
										backgroundColor: colors.background,
										borderRadius: 6
									}}
								/>
							</View>
						</View>
					}
					rightView={
						Platform.OS === "android" ? (
							<View className="flex-1 justify-center px-4">
								<Menu
									type="dropdown"
									insidePreview={false}
									item={item}
									queryParams={{
										of: type,
										parent: type,
										receiverId: item.isShared ? item.receiverId : 0
									}}
									isAvailableOffline={isAvailableOffline}
								>
									<Button
										variant="plain"
										size="icon"
									>
										<Icon
											namingScheme="sfSymbol"
											name="ellipsis"
											color={colors.foreground}
										/>
									</Button>
								</Menu>
							</View>
						) : undefined
					}
					subTitleClassName="text-xs pt-1"
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

Item.displayName = "Item"

export default Item
