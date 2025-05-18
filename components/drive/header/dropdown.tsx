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
				title: "Transfers",
				icon: {
					namingScheme: "sfSymbol",
					name: "arrow.up"
				}
			}),
			...(gridModeEnabled
				? [
						createDropdownItem({
							actionKey: "listMode",
							title: "List mode",
							icon: {
								name: "list.bullet",
								namingScheme: "sfSymbol"
							}
						})
				  ]
				: [
						createDropdownItem({
							actionKey: "gridMode",
							title: "Grid mode",
							icon: {
								name: "grid",
								namingScheme: "sfSymbol"
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
								}
							}),
							createDropdownItem({
								actionKey: "sortBySizeAsc",
								title: t("drive.header.rightView.dropdown.sortBy.size"),
								state: {
									checked: orderBy === "sizeAsc"
								}
							}),
							createDropdownItem({
								actionKey: "sortByUploadDateAsc",
								title: t("drive.header.rightView.dropdown.sortBy.uploadDate"),
								state: {
									checked: orderBy === "uploadDateAsc"
								}
							}),
							createDropdownItem({
								actionKey: "sortByLastModifiedAsc",
								title: t("drive.header.rightView.dropdown.sortBy.lastModified"),
								state: {
									checked: orderBy === "lastModifiedAsc"
								}
							}),
							createDropdownItem({
								actionKey: "sortByTypeAsc",
								title: t("drive.header.rightView.dropdown.sortBy.type"),
								state: {
									checked: orderBy === "typeAsc"
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
								}
							}),
							createDropdownItem({
								actionKey: "sortBySizeDesc",
								title: t("drive.header.rightView.dropdown.sortBy.size"),
								state: {
									checked: orderBy === "sizeDesc"
								}
							}),
							createDropdownItem({
								actionKey: "sortByUploadDateDesc",
								title: t("drive.header.rightView.dropdown.sortBy.uploadDate"),
								state: {
									checked: orderBy === "uploadDateDesc"
								}
							}),
							createDropdownItem({
								actionKey: "sortByLastModifiedDesc",
								title: t("drive.header.rightView.dropdown.sortBy.lastModified"),
								state: {
									checked: orderBy === "lastModifiedDesc"
								}
							}),
							createDropdownItem({
								actionKey: "sortByTypeDesc",
								title: t("drive.header.rightView.dropdown.sortBy.type"),
								state: {
									checked: orderBy === "typeDesc"
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
								title: "bulk actions",
								iOSItemSize: "large",
								iOSType: "dropdown"
							},
							[
								createDropdownSubMenu(
									{
										title: "download",
										iOSItemSize: "large",
										iOSType: "dropdown"
									},
									[
										createDropdownItem({
											actionKey: "bulkDownload",
											title: "download",
											icon: {
												namingScheme: "sfSymbol",
												name: "moon.stars"
											}
										}),
										createDropdownItem({
											actionKey: "bulkOffline",
											title: "move",
											icon: {
												namingScheme: "sfSymbol",
												name: "moon.stars"
											}
										})
									]
								),
								createDropdownItem({
									actionKey: "bulkShare",
									title: "share",
									icon: {
										namingScheme: "sfSymbol",
										name: "moon.stars"
									}
								}),
								createDropdownItem({
									actionKey: "bulkMove",
									title: "move",
									icon: {
										namingScheme: "sfSymbol",
										name: "moon.stars"
									}
								}),
								createDropdownItem({
									actionKey: "bulkFavorite",
									title: "favorite",
									icon: {
										namingScheme: "sfSymbol",
										name: "moon.stars"
									}
								}),
								createDropdownItem({
									actionKey: "bulkTrash",
									title: "trash",
									destructive: true,
									icon: {
										namingScheme: "sfSymbol",
										name: "moon.stars"
									}
								})
							]
						)
				  ]
				: [])
		] satisfies (DropdownItem | DropdownSubMenu)[]
	}, [t, orderBy, gridModeEnabled, selectedItemsCount])

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
					color={colors.foreground}
				/>
			</Button>
		</DropdownMenu>
	)
})

Dropdown.displayName = "Dropdown"

export default Dropdown
