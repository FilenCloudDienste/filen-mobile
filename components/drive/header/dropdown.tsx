import { Icon } from "@roninoss/icons"
import { Button } from "@/components/nativewindui/Button"
import { useColorScheme } from "@/lib/useColorScheme"
import { memo, useCallback, useMemo } from "react"
import { DropdownMenu } from "@/components/nativewindui/DropdownMenu"
import { createDropdownItem, createDropdownSubMenu } from "@/components/nativewindui/DropdownMenu/utils"
import { useDriveStore } from "@/stores/drive.store"
import { type DropdownItem, type DropdownSubMenu } from "@/components/nativewindui/DropdownMenu/types"
import { useTranslation } from "react-i18next"
import { useRouter } from "expo-router"
import { useMMKVBoolean, useMMKVString } from "react-native-mmkv"
import mmkvInstance from "@/lib/mmkv"
import { type OrderByType } from "@/lib/utils"
import { useShallow } from "zustand/shallow"
import { Platform } from "react-native"

export const Dropdown = memo(() => {
	const { colors } = useColorScheme()
	const [orderBy, setOrderBy] = useMMKVString("orderBy", mmkvInstance) as [OrderByType | undefined, (value: OrderByType) => void]
	const { t } = useTranslation()
	const { push: routerPush } = useRouter()
	const [gridModeEnabled, setGridModeEnabled] = useMMKVBoolean("gridModeEnabled", mmkvInstance)
	const selectedItemsCount = useDriveStore(useShallow(state => state.selectedItems.length))

	const items = useMemo(() => {
		return [
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
			}),
			...(gridModeEnabled
				? [
						createDropdownItem({
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
				  ]
				: [
						createDropdownItem({
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
				  ]),
			createDropdownSubMenu(
				{
					title: t("drive.header.rightView.dropdown.sortBy.sortBy"),
					iOSItemSize: "large",
					iOSType: "dropdown"
				},
				[
					createDropdownSubMenu(
						{
							title: t("drive.header.rightView.dropdown.sortBy.ascending"),
							iOSItemSize: "large",
							iOSType: "dropdown"
						},
						[
							createDropdownItem({
								actionKey: "sortByNameAsc",
								title: t("drive.header.rightView.dropdown.sortBy.name"),
								state: {
									checked: orderBy === "nameAsc"
								},
								icon:
									Platform.OS === "ios"
										? {
												namingScheme: "sfSymbol",
												name: "arrow.up"
										  }
										: {
												namingScheme: "material",
												name: "arrow-up"
										  }
							}),
							createDropdownItem({
								actionKey: "sortBySizeAsc",
								title: t("drive.header.rightView.dropdown.sortBy.size"),
								state: {
									checked: orderBy === "sizeAsc"
								},
								icon:
									Platform.OS === "ios"
										? {
												namingScheme: "sfSymbol",
												name: "arrow.up"
										  }
										: {
												namingScheme: "material",
												name: "arrow-up"
										  }
							}),
							createDropdownItem({
								actionKey: "sortByUploadDateAsc",
								title: t("drive.header.rightView.dropdown.sortBy.uploadDate"),
								state: {
									checked: orderBy === "uploadDateAsc"
								},
								icon:
									Platform.OS === "ios"
										? {
												namingScheme: "sfSymbol",
												name: "arrow.up"
										  }
										: {
												namingScheme: "material",
												name: "arrow-up"
										  }
							}),
							createDropdownItem({
								actionKey: "sortByLastModifiedAsc",
								title: t("drive.header.rightView.dropdown.sortBy.lastModified"),
								state: {
									checked: orderBy === "lastModifiedAsc"
								},
								icon:
									Platform.OS === "ios"
										? {
												namingScheme: "sfSymbol",
												name: "arrow.up"
										  }
										: {
												namingScheme: "material",
												name: "arrow-up"
										  }
							}),
							createDropdownItem({
								actionKey: "sortByTypeAsc",
								title: t("drive.header.rightView.dropdown.sortBy.type"),
								state: {
									checked: orderBy === "typeAsc"
								},
								icon:
									Platform.OS === "ios"
										? {
												namingScheme: "sfSymbol",
												name: "arrow.up"
										  }
										: {
												namingScheme: "material",
												name: "arrow-up"
										  }
							})
						]
					),
					createDropdownSubMenu(
						{
							title: t("drive.header.rightView.dropdown.sortBy.descending"),
							iOSItemSize: "large",
							iOSType: "dropdown"
						},
						[
							createDropdownItem({
								actionKey: "sortByNameDesc",
								title: t("drive.header.rightView.dropdown.sortBy.name"),
								state: {
									checked: orderBy === "nameDesc"
								},
								icon:
									Platform.OS === "ios"
										? {
												namingScheme: "sfSymbol",
												name: "arrow.down"
										  }
										: {
												namingScheme: "material",
												name: "arrow-down"
										  }
							}),
							createDropdownItem({
								actionKey: "sortBySizeDesc",
								title: t("drive.header.rightView.dropdown.sortBy.size"),
								state: {
									checked: orderBy === "sizeDesc"
								},
								icon:
									Platform.OS === "ios"
										? {
												namingScheme: "sfSymbol",
												name: "arrow.down"
										  }
										: {
												namingScheme: "material",
												name: "arrow-down"
										  }
							}),
							createDropdownItem({
								actionKey: "sortByUploadDateDesc",
								title: t("drive.header.rightView.dropdown.sortBy.uploadDate"),
								state: {
									checked: orderBy === "uploadDateDesc"
								},
								icon:
									Platform.OS === "ios"
										? {
												namingScheme: "sfSymbol",
												name: "arrow.down"
										  }
										: {
												namingScheme: "material",
												name: "arrow-down"
										  }
							}),
							createDropdownItem({
								actionKey: "sortByLastModifiedDesc",
								title: t("drive.header.rightView.dropdown.sortBy.lastModified"),
								state: {
									checked: orderBy === "lastModifiedDesc"
								},
								icon:
									Platform.OS === "ios"
										? {
												namingScheme: "sfSymbol",
												name: "arrow.down"
										  }
										: {
												namingScheme: "material",
												name: "arrow-down"
										  }
							}),
							createDropdownItem({
								actionKey: "sortByTypeDesc",
								title: t("drive.header.rightView.dropdown.sortBy.type"),
								state: {
									checked: orderBy === "typeDesc"
								},
								icon:
									Platform.OS === "ios"
										? {
												namingScheme: "sfSymbol",
												name: "arrow.down"
										  }
										: {
												namingScheme: "material",
												name: "arrow-down"
										  }
							})
						]
					)
				]
			),
			...(selectedItemsCount > 0
				? [
						createDropdownSubMenu(
							{
								title: t("drive.header.rightView.dropdown.bulkActions"),
								iOSItemSize: "large",
								iOSType: "dropdown"
							},
							[
								createDropdownItem({
									actionKey: "bulkShare",
									title: "share",
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
								}),
								createDropdownItem({
									actionKey: "bulkMove",
									title: "move",
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
								}),
								createDropdownItem({
									actionKey: "bulkFavorite",
									title: "favorite",
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
								}),
								createDropdownItem({
									actionKey: "bulkTrash",
									title: "trash",
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
							]
						)
				  ]
				: [])
		] satisfies (DropdownItem | DropdownSubMenu)[]
	}, [t, orderBy, gridModeEnabled, selectedItemsCount, colors.destructive])

	const onItemPress = useCallback(
		(item: Omit<DropdownItem, "icon">, _?: boolean) => {
			if (item.actionKey.startsWith("sortBy")) {
				if (item.actionKey === "sortByNameAsc") {
					setOrderBy("nameAsc")
				} else if (item.actionKey === "sortBySizeAsc") {
					setOrderBy("sizeAsc")
				} else if (item.actionKey === "sortByUploadDateAsc") {
					setOrderBy("dateAsc")
				} else if (item.actionKey === "sortByLastModifiedAsc") {
					setOrderBy("dateAsc")
				} else if (item.actionKey === "sortByTypeAsc") {
					setOrderBy("typeAsc")
				} else if (item.actionKey === "sortByNameDesc") {
					setOrderBy("nameDesc")
				} else if (item.actionKey === "sortBySizeDesc") {
					setOrderBy("sizeDesc")
				} else if (item.actionKey === "sortByUploadDateDesc") {
					setOrderBy("dateDesc")
				} else if (item.actionKey === "sortByLastModifiedDesc") {
					setOrderBy("dateDesc")
				} else if (item.actionKey === "sortByTypeDesc") {
					setOrderBy("typeDesc")
				}
			} else if (item.actionKey === "transfers") {
				routerPush({
					pathname: "/transfers"
				})
			} else if (item.actionKey === "gridMode") {
				setGridModeEnabled(true)
			} else if (item.actionKey === "listMode") {
				setGridModeEnabled(false)
			}
		},
		[setOrderBy, routerPush, setGridModeEnabled]
	)

	return (
		<DropdownMenu
			items={items}
			onItemPress={onItemPress}
		>
			<Button
				variant="plain"
				size="icon"
			>
				<Icon
					size={24}
					namingScheme="sfSymbol"
					name="ellipsis.circle"
					color={colors.primary}
				/>
			</Button>
		</DropdownMenu>
	)
})

Dropdown.displayName = "Dropdown"

export default Dropdown
