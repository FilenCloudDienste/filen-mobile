import { Icon } from "@roninoss/icons"
import { Button } from "@/components/nativewindui/Button"
import { useColorScheme } from "@/lib/useColorScheme"
import { memo, useCallback, useMemo } from "react"
import { DropdownMenu } from "@/components/nativewindui/DropdownMenu"
import { createDropdownItem, createDropdownSubMenu } from "@/components/nativewindui/DropdownMenu/utils"
import { useDriveStore } from "@/stores/drive.store"
import { type DropdownItem, type DropdownSubMenu } from "@/components/nativewindui/DropdownMenu/types"
import { useTranslation } from "react-i18next"
import { useRouter, usePathname } from "expo-router"
import { useMMKVBoolean, useMMKVString } from "react-native-mmkv"
import mmkvInstance from "@/lib/mmkv"
import { type OrderByType, getPreviewType } from "@/lib/utils"
import { useShallow } from "zustand/shallow"
import { Platform } from "react-native"
import useCloudItemsQuery from "@/queries/useCloudItemsQuery"
import useNetInfo from "@/hooks/useNetInfo"
import driveBulkService from "@/services/driveBulk.service"
import alerts from "@/lib/alerts"

type UISortOption = {
	title: string
	ascTitle: string
	descTitle: string
	// Below actual OrderByType used in the business logic
	asc: OrderByType
	desc: OrderByType
}

const UI_SORT_OPTIONS: Record<string, UISortOption> = {
	sortByName: {
		title: "drive.header.rightView.dropdown.sortBy.name.title",
		ascTitle: "drive.header.rightView.dropdown.sortBy.name.ascendingTitle",
		descTitle: "drive.header.rightView.dropdown.sortBy.name.descendingTitle",
		asc: "nameAsc",
		desc: "nameDesc"
	},
	sortBySize: {
		title: "drive.header.rightView.dropdown.sortBy.size.title",
		ascTitle: "drive.header.rightView.dropdown.sortBy.size.ascendingTitle",
		descTitle: "drive.header.rightView.dropdown.sortBy.size.descendingTitle",
		asc: "sizeAsc",
		desc: "sizeDesc"
	},
	sortByUploadDate: {
		title: "drive.header.rightView.dropdown.sortBy.uploadDate.title",
		ascTitle: "drive.header.rightView.dropdown.sortBy.uploadDate.ascendingTitle",
		descTitle: "drive.header.rightView.dropdown.sortBy.uploadDate.descendingTitle",
		asc: "uploadDateAsc",
		desc: "uploadDateDesc"
	},
	sortByLastModified: {
		title: "drive.header.rightView.dropdown.sortBy.lastModified.title",
		ascTitle: "drive.header.rightView.dropdown.sortBy.lastModified.ascendingTitle",
		descTitle: "drive.header.rightView.dropdown.sortBy.lastModified.descendingTitle",
		asc: "lastModifiedAsc",
		desc: "lastModifiedDesc"
	},
	sortByType: {
		title: "drive.header.rightView.dropdown.sortBy.type.title",
		ascTitle: "drive.header.rightView.dropdown.sortBy.type.ascendingTitle",
		descTitle: "drive.header.rightView.dropdown.sortBy.type.descendingTitle",
		asc: "typeAsc",
		desc: "typeDesc"
	}
} as const

const DEFAULT_UI_SORT = UI_SORT_OPTIONS.sortByName as UISortOption

function getUISortOption(orderBy?: OrderByType): UISortOption | undefined {
	// Remove "Asc" or "Desc" from the end of OrderByType
	const key = orderBy?.endsWith("Asc") ? orderBy.slice(0, -3) : orderBy?.endsWith("Desc") ? orderBy.slice(0, -4) : undefined
	switch (key) {
		case "name":
			return UI_SORT_OPTIONS.sortByName
		case "size":
			return UI_SORT_OPTIONS.sortBySize
		case "uploadDate":
			return UI_SORT_OPTIONS.sortByUploadDate
		case "lastModified":
			return UI_SORT_OPTIONS.sortByLastModified
		case "type":
			return UI_SORT_OPTIONS.sortByType
		default:
			console.warn(`Unknown order key: ${orderBy}`)
			return undefined
	}
}

export const Dropdown = memo(({ queryParams }: { queryParams: FetchCloudItemsParams }) => {
	const { colors } = useColorScheme()
	const [orderBy, setOrderBy] = useMMKVString("orderBy", mmkvInstance) as [OrderByType | undefined, (value: OrderByType) => void]
	const { t } = useTranslation()
	const { push: routerPush } = useRouter()
	const [gridModeEnabled, setGridModeEnabled] = useMMKVBoolean("gridModeEnabled", mmkvInstance)
	const selectedItemsCount = useDriveStore(useShallow(state => state.selectedItems.length))
	const searchTerm = useDriveStore(useShallow(state => state.searchTerm))
	const { hasInternet } = useNetInfo()
	const everySelectedItemIsDirectory = useDriveStore(useShallow(state => state.selectedItems.every(item => item.type === "directory")))
	const selectedItemsIncludesFavoritedItem = useDriveStore(useShallow(state => state.selectedItems.some(item => item.favorited)))
	const pathname = usePathname()
	const selectedItemsIncludesDirectory = useDriveStore(useShallow(state => state.selectedItems.some(item => item.type === "directory")))
	const everySelectedItemIsFileAndImageOrVideo = useDriveStore(
		useShallow(state =>
			state.selectedItems.every(item => item.type === "file" && ["image", "video"].includes(getPreviewType(item.name)))
		)
	)
	const everySelectedItemIsNotEmpty = useDriveStore(useShallow(state => state.selectedItems.every(item => item.size > 0)))

	const cloudItemsQuery = useCloudItemsQuery({
		...queryParams,
		enabled: false
	})

	const driveItems = useMemo((): DriveCloudItem[] => {
		if (cloudItemsQuery.status !== "success") {
			return []
		}

		const searchTermLowerCase = searchTerm.toLowerCase().trim()

		return searchTerm.length > 0
			? cloudItemsQuery.data.filter(item => item.name.toLowerCase().includes(searchTermLowerCase))
			: cloudItemsQuery.data
	}, [cloudItemsQuery.status, cloudItemsQuery.data, searchTerm])

	const currentUISortOption = useMemo(() => {
		console.log("uisort:", getUISortOption(orderBy))
		return getUISortOption(orderBy)
	}, [orderBy])

	const dropdownViewModeItem = useMemo(() => {
		if (gridModeEnabled) {
			return createDropdownItem({
				actionKey: "listMode",
				title: t("drive.header.rightView.dropdown.listMode"),
				icon:
					Platform.OS === "ios"
						? {
								namingScheme: "sfSymbol",
								name: "list.bullet"
							}
						: {
								namingScheme: "material",
								name: "format-list-bulleted"
							}
			})
		} else {
			return createDropdownItem({
				actionKey: "gridMode",
				title: t("drive.header.rightView.dropdown.gridMode"),
				icon:
					Platform.OS === "ios"
						? {
								namingScheme: "sfSymbol",
								name: "grid"
							}
						: {
								namingScheme: "material",
								name: "grid"
							}
			})
		}
	}, [gridModeEnabled, t])

	const dropdownSortSubMenu = useMemo(
		() =>
			createDropdownSubMenu(
				{
					title: t("drive.header.rightView.dropdown.sortBy.sortBy"),
					subTitle: t(currentUISortOption?.title),
					iOSItemSize: "large",
					iOSType: "dropdown"
				},
				[
					...Object.entries(UI_SORT_OPTIONS).map(([actionKey, uiSortOption]) =>
						createDropdownItem({
							actionKey: actionKey,
							title: t(uiSortOption.title),
							keepOpenOnPress: true,
							state: {
								checked: orderBy !== undefined && [uiSortOption.asc, uiSortOption.desc].includes(orderBy)
							}
						})
					),

					createDropdownSubMenu(
						{
							title: "",
							iOSItemSize: "large",
							iOSType: "inline"
						},
						[
							createDropdownItem({
								actionKey: "sortAscending",
								title: t([currentUISortOption?.ascTitle, "drive.header.rightView.dropdown.sortBy.ascending"]),
								state: {
									checked: orderBy === currentUISortOption?.asc
								}
							}),
							createDropdownItem({
								actionKey: "sortDescending",
								title: t([currentUISortOption?.descTitle, "drive.header.rightView.dropdown.sortBy.descending"]),
								state: {
									checked: orderBy === currentUISortOption?.desc
								}
							})
						]
					)
				]
			),
		[currentUISortOption, orderBy, t]
	)

	const dropdownSelectAllAndNoneItems = useMemo(() => {
		let items: (DropdownItem | DropdownSubMenu)[] = []

		if (selectedItemsCount < driveItems.length) {
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

		if (selectedItemsCount > 0) {
			items.push(
				createDropdownItem({
					actionKey: "deselectAll",
					title: t("drive.list.item.menu.deselectAll"),
					icon: {
						name: "check-circle-outline"
					}
				})
			)
		}

		if (Platform.OS === "ios") {
			items = [
				createDropdownSubMenu(
					{
						title: "",
						iOSType: "inline"
					},
					items
				)
			]
		}
		return items
	}, [driveItems.length, selectedItemsCount, t])

	const dropdownSelectionItems = useMemo(() => {
		const items: (DropdownItem | DropdownSubMenu)[] = []

		if (Platform.OS === "ios" ? !selectedItemsIncludesDirectory : true) {
			const subMenuItems: DropdownSubMenu["items"] = []

			if (Platform.OS === "android" && queryParams.of !== "offline" && hasInternet && everySelectedItemIsNotEmpty) {
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

			if (everySelectedItemIsFileAndImageOrVideo && queryParams.of !== "offline" && hasInternet && everySelectedItemIsNotEmpty) {
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

			if (queryParams.of !== "offline" && hasInternet && everySelectedItemIsNotEmpty) {
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
		}

		if (queryParams.of !== "sharedIn" && queryParams.of !== "offline" && queryParams.of !== "trash" && hasInternet) {
			items.push(
				createDropdownItem({
					actionKey: "bulkShare",
					title: t("drive.list.item.menu.share", { count: selectedItemsCount }),
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
		}

		if (queryParams.of !== "sharedIn" && queryParams.of !== "offline" && queryParams.of !== "trash" && hasInternet) {
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
						title: t("drive.list.item.menu.favorite", { count: selectedItemsCount }),
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
		}

		if (
			queryParams.of !== "sharedIn" &&
			queryParams.of !== "offline" &&
			queryParams.of !== "trash" &&
			hasInternet &&
			everySelectedItemIsDirectory
		) {
			items.push(
				createDropdownItem({
					actionKey: "bulkColor",
					title: t("drive.list.item.menu.color"),
					icon:
						Platform.OS === "ios"
							? {
									namingScheme: "sfSymbol",
									name: "paintpalette"
								}
							: {
									namingScheme: "material",
									name: "palette-outline"
								}
				})
			)
		}

		if (queryParams.of !== "sharedIn" && queryParams.of !== "offline" && queryParams.of !== "trash" && hasInternet) {
			items.push(
				createDropdownItem({
					actionKey: "bulkMove",
					title: t("drive.list.item.menu.move", { count: selectedItemsCount }),
					icon:
						Platform.OS === "ios"
							? {
									namingScheme: "sfSymbol",
									name: "folder"
								}
							: {
									namingScheme: "material",
									name: "folder-cog-outline"
								}
				})
			)
		}

		if (queryParams.of === "sharedOut" && hasInternet) {
			items.push(
				createDropdownItem({
					actionKey: "bulkRemoveSharedOut",
					title: t("drive.list.item.menu.removeSharedOut"),
					destructive: true,
					icon:
						Platform.OS === "ios"
							? {
									namingScheme: "sfSymbol",
									name: "delete.left",
									color: colors.destructive
								}
							: {
									namingScheme: "material",
									name: "delete-off-outline",
									color: colors.destructive
								}
				})
			)
		}

		if (queryParams.of === "links" && hasInternet) {
			items.push(
				createDropdownItem({
					actionKey: "bulkDisablePublicLink",
					title: t("drive.list.item.menu.disablePublicLink"),
					destructive: true,
					icon:
						Platform.OS === "ios"
							? {
									namingScheme: "sfSymbol",
									name: "link",
									color: colors.destructive
								}
							: {
									namingScheme: "material",
									name: "link",
									color: colors.destructive
								}
				})
			)
		}

		if (queryParams.of !== "offline" && queryParams.of !== "trash" && hasInternet) {
			if (queryParams.of !== "sharedIn") {
				items.push(
					createDropdownItem({
						actionKey: "bulkTrash",
						title: t("drive.list.item.menu.trash", { count: selectedItemsCount }),
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
			} else {
				items.push(
					createDropdownItem({
						actionKey: "bulkRemoveSharedIn",
						title: t("drive.list.item.menu.removeSharedIn"),
						destructive: true,
						icon:
							Platform.OS === "ios"
								? {
										namingScheme: "sfSymbol",
										name: "delete.left",
										color: colors.destructive
									}
								: {
										namingScheme: "material",
										name: "delete-off-outline",
										color: colors.destructive
									}
					})
				)
			}
		}

		if (queryParams.of === "offline") {
			items.push(
				createDropdownItem({
					actionKey: "bulkRemoveOffline",
					title: t("drive.list.item.menu.removeOffline"),
					destructive: true,
					icon:
						Platform.OS === "ios"
							? {
									namingScheme: "sfSymbol",
									name: "delete.left",
									color: colors.destructive
								}
							: {
									namingScheme: "material",
									name: "delete-off-outline",
									color: colors.destructive
								}
				})
			)
		}

		if (queryParams.of === "trash" && hasInternet) {
			items.push(
				createDropdownItem({
					actionKey: "bulkRestore",
					title: t("drive.list.item.menu.restore"),
					icon:
						Platform.OS === "ios"
							? {
									namingScheme: "sfSymbol",
									name: "repeat"
								}
							: {
									namingScheme: "material",
									name: "repeat"
								}
				})
			)

			items.push(
				createDropdownItem({
					actionKey: "bulkDeletePermanently",
					title: t("drive.list.item.menu.deletePermanently"),
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
		colors.destructive,
		everySelectedItemIsDirectory,
		everySelectedItemIsFileAndImageOrVideo,
		everySelectedItemIsNotEmpty,
		hasInternet,
		queryParams.of,
		selectedItemsCount,
		selectedItemsIncludesDirectory,
		selectedItemsIncludesFavoritedItem,
		t
	])

	const dropdownItems = useMemo(() => {
		const items: (DropdownItem | DropdownSubMenu)[] = []

		if (selectedItemsCount === 0) {
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
		}

		items.push(...dropdownSelectAllAndNoneItems)

		items.push(dropdownViewModeItem)

		if (selectedItemsCount === 0) {
			items.push(dropdownSortSubMenu)
		}

		if (selectedItemsCount > 0) {
			if (Platform.OS === "ios") {
				items.push(
					createDropdownSubMenu(
						{
							title: "",
							iOSType: "inline"
						},
						dropdownSelectionItems
					)
				)
			} else {
				items.push(...dropdownSelectionItems)
			}
		}

		return items
	}, [selectedItemsCount, dropdownSelectAllAndNoneItems, dropdownViewModeItem, t, dropdownSortSubMenu, dropdownSelectionItems])

	const handleSortAction = useCallback(
		(actionKey: string) => {
			const selectedUISortOption = UI_SORT_OPTIONS[actionKey]

			if (selectedUISortOption) {
				// User selected a new sort option, default to ascending
				setOrderBy(selectedUISortOption.asc)
			} else if (actionKey === "sortAscending") {
				setOrderBy(currentUISortOption?.asc ?? DEFAULT_UI_SORT.asc)
			} else if (actionKey === "sortDescending") {
				setOrderBy(currentUISortOption?.desc ?? DEFAULT_UI_SORT.desc)
			} else {
				console.warn(`Unhandled sort actionKey: ${actionKey}`)
			}
		},
		[currentUISortOption, setOrderBy]
	)

	const onItemPress = useCallback(
		async (item: Omit<DropdownItem, "icon">, _?: boolean) => {
			try {
				switch (item.actionKey) {
					case "transfers": {
						routerPush({
							pathname: "/transfers"
						})

						return
					}

					case "gridMode": {
						setGridModeEnabled(true)

						return
					}

					case "listMode": {
						setGridModeEnabled(false)

						return
					}

					case "selectAll": {
						useDriveStore.getState().setSelectedItems(driveItems)

						return
					}

					case "deselectAll": {
						useDriveStore.getState().setSelectedItems([])

						return
					}

					default: {
						if (item.actionKey.startsWith("bulk")) {
							const selectedItems = useDriveStore.getState().selectedItems

							if (selectedItems.length === 0) {
								return
							}

							useDriveStore.getState().setSelectedItems([])

							if (item.actionKey === "bulkShare") {
								await driveBulkService.shareItems({
									items: selectedItems
								})
							} else if (item.actionKey === "bulkFavorite") {
								await driveBulkService.toggleItemsFavorite({
									items: selectedItems,
									favorite: true,
									queryParams
								})
							} else if (item.actionKey === "bulkUnfavorite") {
								await driveBulkService.toggleItemsFavorite({
									items: selectedItems,
									favorite: false,
									queryParams
								})
							} else if (item.actionKey === "bulkColor") {
								await driveBulkService.changeDirectoryColors({
									items: selectedItems,
									queryParams
								})
							} else if (item.actionKey === "bulkMove") {
								await driveBulkService.moveItems({
									items: selectedItems,
									queryParams,
									dismissHref: pathname
								})
							} else if (item.actionKey === "bulkRemoveSharedOut") {
								await driveBulkService.removeSharedOutItems({
									items: selectedItems,
									queryParams
								})
							} else if (item.actionKey === "bulkDisablePublicLink") {
								await driveBulkService.disablePublicLinks({
									items: selectedItems,
									queryParams
								})
							} else if (item.actionKey === "bulkTrash") {
								await driveBulkService.trashItems({
									items: selectedItems,
									queryParams
								})
							} else if (item.actionKey === "bulkRemoveSharedIn") {
								await driveBulkService.removeSharedInItems({
									items: selectedItems,
									queryParams
								})
							} else if (item.actionKey === "bulkRemoveOffline") {
								await driveBulkService.toggleItemsOffline({
									items: selectedItems,
									offline: false
								})
							} else if (item.actionKey === "bulkRestore") {
								await driveBulkService.restoreItems({
									items: selectedItems,
									queryParams
								})
							} else if (item.actionKey === "bulkDeletePermanently") {
								await driveBulkService.deleteItemsPermanently({
									items: selectedItems,
									queryParams
								})
							} else if (item.actionKey === "bulkDownload") {
								await driveBulkService.downloadItems({
									items: selectedItems,
									disableLoader: true
								})
							} else if (item.actionKey === "bulkSaveToGallery") {
								await driveBulkService.saveItemsToGallery({
									items: selectedItems,
									disableLoader: true
								})
							} else if (item.actionKey === "bulkMakeAvailableOffline") {
								await driveBulkService.toggleItemsOffline({
									items: selectedItems,
									offline: true,
									disableLoader: true
								})
							}

							return
						}

						if (item.actionKey.startsWith("sort")) {
							handleSortAction(item.actionKey)
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
		[routerPush, setGridModeEnabled, driveItems, queryParams, pathname, handleSortAction]
	)

	return (
		<DropdownMenu
			items={dropdownItems}
			onItemPress={onItemPress}
		>
			<Button
				variant="plain"
				size="icon"
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
