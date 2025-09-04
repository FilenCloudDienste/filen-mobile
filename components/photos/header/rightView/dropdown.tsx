import { memo, useMemo, useCallback } from "react"
import { Button } from "@/components/nativewindui/Button"
import { DropdownMenu } from "@/components/nativewindui/DropdownMenu"
import { createDropdownItem, createDropdownSubMenu } from "@/components/nativewindui/DropdownMenu/utils"
import { type DropdownItem, type DropdownSubMenu } from "@/components/nativewindui/DropdownMenu/types"
import { Icon } from "@roninoss/icons"
import { useColorScheme } from "@/lib/useColorScheme"
import { Platform } from "react-native"
import { useRouter } from "expo-router"
import { useTranslation } from "react-i18next"
import { usePhotosStore } from "@/stores/photos.store"
import alerts from "@/lib/alerts"
import { useShallow } from "zustand/shallow"
import driveBulkService from "@/services/driveBulk.service"
import useNetInfo from "@/hooks/useNetInfo"
import { getPreviewType } from "@/lib/utils"

export const Dropdown = memo(({ photos, queryParams }: { photos: DriveCloudItem[]; queryParams: FetchCloudItemsParams }) => {
	const { colors } = useColorScheme()
	const router = useRouter()
	const { t } = useTranslation()
	const selectedItemsCount = usePhotosStore(useShallow(state => state.selectedItems.length))
	const { hasInternet } = useNetInfo()
	const everySelectedItemIsFileAndImageOrVideo = usePhotosStore(
		useShallow(state =>
			state.selectedItems.every(item => item.type === "file" && ["image", "video"].includes(getPreviewType(item.name)))
		)
	)
	const everySelectedItemIsNotEmpty = usePhotosStore(useShallow(state => state.selectedItems.every(item => item.size > 0)))
	const selectedItemsIncludesFavoritedItem = usePhotosStore(useShallow(state => state.selectedItems.some(item => item.favorited)))

	const dropdownItems = useMemo(() => {
		const items: (DropdownItem | DropdownSubMenu)[] = []

		items.push(
			createDropdownItem({
				actionKey: "transfers",
				title: t("drive.header.rightView.dropdown.transfers"),
				icon:
					Platform.OS === "ios"
						? {
								namingScheme: "sfSymbol",
								name: "wifi"
						  }
						: {
								namingScheme: "material",
								name: "wifi"
						  }
			})
		)

		items.push(
			createDropdownItem({
				actionKey: "settings",
				title: t("photos.menu.settings"),
				icon:
					Platform.OS === "ios"
						? {
								name: "gearshape",
								namingScheme: "sfSymbol"
						  }
						: {
								namingScheme: "material",
								name: "cog-outline"
						  }
			})
		)

		if (selectedItemsCount < photos.length) {
			items.push(
				createDropdownItem({
					actionKey: "selectAll",
					title: t("drive.list.item.menu.selectAll"),
					icon: {
						name: "check-circle-outline"
					}
				})
			)
		}

		if (selectedItemsCount > 0 && hasInternet) {
			items.push(
				createDropdownItem({
					actionKey: "deselectAll",
					title: t("drive.list.item.menu.deselectAll"),
					icon: {
						name: "check-circle-outline"
					}
				})
			)

			const subMenuItems: DropdownSubMenu["items"] = []

			if (Platform.OS === "android" && everySelectedItemIsNotEmpty) {
				subMenuItems.push(
					createDropdownItem({
						actionKey: "bulkDownload",
						title: t("drive.list.item.menu.download"),
						icon: {
							namingScheme: "material",
							name: "file-download-outline"
						}
					})
				)
			}

			if (everySelectedItemIsFileAndImageOrVideo && everySelectedItemIsNotEmpty) {
				subMenuItems.push(
					createDropdownItem({
						actionKey: "bulkSaveToGallery",
						title: t("drive.list.item.menu.saveToGallery"),
						icon:
							Platform.OS === "ios"
								? {
										namingScheme: "sfSymbol",
										name: "photo"
								  }
								: {
										namingScheme: "material",
										name: "image-outline"
								  }
					})
				)
			}

			if (everySelectedItemIsNotEmpty) {
				subMenuItems.push(
					createDropdownItem({
						actionKey: "bulkMakeAvailableOffline",
						title: t("drive.list.item.menu.makeAvailableOffline"),
						icon:
							Platform.OS === "ios"
								? {
										namingScheme: "sfSymbol",
										name: "arrow.down.circle"
								  }
								: {
										namingScheme: "material",
										name: "arrow-down-circle-outline"
								  }
					})
				)
			}

			if (subMenuItems.length > 0) {
				items.push(
					createDropdownSubMenu(
						{
							title: t("drive.list.item.menu.download"),
							iOSItemSize: "large"
						},
						subMenuItems
					)
				)
			}

			items.push(
				createDropdownItem({
					actionKey: "bulkShare",
					title: t("drive.list.item.menu.share"),
					icon:
						Platform.OS === "ios"
							? {
									namingScheme: "sfSymbol",
									name: "square.and.arrow.up"
							  }
							: {
									namingScheme: "material",
									name: "send-outline"
							  }
				})
			)

			if (selectedItemsIncludesFavoritedItem) {
				items.push(
					createDropdownItem({
						actionKey: "bulkUnfavorite",
						title: t("drive.list.item.menu.unfavorite"),
						icon:
							Platform.OS === "ios"
								? {
										namingScheme: "sfSymbol",
										name: "heart"
								  }
								: {
										namingScheme: "material",
										name: "heart-outline"
								  }
					})
				)
			} else {
				items.push(
					createDropdownItem({
						actionKey: "bulkFavorite",
						title: t("drive.list.item.menu.favorite"),
						icon:
							Platform.OS === "ios"
								? {
										namingScheme: "sfSymbol",
										name: "heart"
								  }
								: {
										namingScheme: "material",
										name: "heart-outline"
								  }
					})
				)
			}

			items.push(
				createDropdownItem({
					actionKey: "bulkTrash",
					title: t("drive.list.item.menu.trash"),
					destructive: true,
					icon:
						Platform.OS === "ios"
							? {
									namingScheme: "sfSymbol",
									name: "trash",
									color: colors.destructive
							  }
							: {
									namingScheme: "material",
									name: "trash-can-outline",
									color: colors.destructive
							  }
				})
			)
		}

		return items
	}, [
		t,
		photos,
		selectedItemsCount,
		hasInternet,
		colors.destructive,
		everySelectedItemIsFileAndImageOrVideo,
		everySelectedItemIsNotEmpty,
		selectedItemsIncludesFavoritedItem
	])

	const onItemPress = useCallback(
		async (contextItem: Omit<DropdownItem, "icon">, _?: boolean) => {
			try {
				switch (contextItem.actionKey) {
					case "transfers": {
						router.push({
							pathname: "/transfers"
						})

						break
					}

					case "settings": {
						router.push({
							pathname: "/photos/settings"
						})

						break
					}

					case "selectAll": {
						usePhotosStore.getState().setSelectedItems(photos)

						return
					}

					case "deselectAll": {
						usePhotosStore.getState().setSelectedItems([])

						return
					}

					default: {
						if (contextItem.actionKey.startsWith("bulk")) {
							const selectedItems = usePhotosStore.getState().selectedItems

							if (selectedItems.length === 0) {
								return
							}

							usePhotosStore.getState().setSelectedItems([])

							if (contextItem.actionKey === "bulkShare") {
								await driveBulkService.shareItems({
									items: selectedItems
								})
							} else if (contextItem.actionKey === "bulkFavorite") {
								await driveBulkService.toggleItemsFavorite({
									items: selectedItems,
									favorite: true,
									queryParams
								})
							} else if (contextItem.actionKey === "bulkUnfavorite") {
								await driveBulkService.toggleItemsFavorite({
									items: selectedItems,
									favorite: false,
									queryParams
								})
							} else if (contextItem.actionKey === "bulkTrash") {
								await driveBulkService.trashItems({
									items: selectedItems,
									queryParams
								})
							} else if (contextItem.actionKey === "bulkDownload") {
								usePhotosStore.getState().setSelectedItems([])

								await driveBulkService.downloadItems({
									items: selectedItems,
									disableLoader: true
								})
							} else if (contextItem.actionKey === "bulkSaveToGallery") {
								usePhotosStore.getState().setSelectedItems([])

								await driveBulkService.saveItemsToGallery({
									items: selectedItems,
									disableLoader: true
								})
							} else if (contextItem.actionKey === "bulkMakeAvailableOffline") {
								usePhotosStore.getState().setSelectedItems([])

								await driveBulkService.toggleItemsOffline({
									items: selectedItems,
									offline: true,
									disableLoader: true
								})
							}

							return
						}
					}
				}
			} catch (e) {
				console.error(e)

				if (e instanceof Error) {
					alerts.error(e.message)
				}
			}
		},
		[router, photos, queryParams]
	)

	return (
		<DropdownMenu
			items={dropdownItems}
			onItemPress={onItemPress}
		>
			<Button
				testID="photos.header.rightView.dropdown"
				variant="plain"
				size="icon"
				hitSlop={10}
			>
				<Icon
					size={24}
					namingScheme="sfSymbol"
					name="ellipsis"
					ios={{
						name: "ellipsis.circle"
					}}
					color={colors.primary}
				/>
			</Button>
		</DropdownMenu>
	)
})

Dropdown.displayName = "Dropdown"

export default Dropdown
