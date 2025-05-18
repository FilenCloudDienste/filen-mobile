import { memo, useMemo, useCallback } from "react"
import { DropdownMenu as DropdownMenuComponent } from "@/components/nativewindui/DropdownMenu"
import { createDropdownOrContextMenuItems, onDropdownOrContextMenuItemPress } from "./utils"
import alerts from "@/lib/alerts"
import { useRouter } from "expo-router"
import { type DropdownItem } from "@/components/nativewindui/DropdownMenu/types"
import useIsProUser from "@/hooks/useIsProUser"

export const DropdownMenu = memo(
	({
		item,
		children,
		queryParams,
		isAvailableOffline
	}: {
		item: DriveCloudItem
		children: React.ReactNode
		queryParams: FetchCloudItemsParams
		isAvailableOffline: boolean
	}) => {
		const { push: routerPush } = useRouter()
		const isProUser = useIsProUser()

		const dropdownMenuItems = useMemo(() => {
			return createDropdownOrContextMenuItems({
				item,
				isAvailableOffline,
				of: queryParams.of,
				parent: queryParams.parent,
				isProUser
			})
		}, [item, isAvailableOffline, queryParams, isProUser])

		const onItemPress = useCallback(
			async (contextItem: Omit<DropdownItem, "icon">) => {
				try {
					onDropdownOrContextMenuItemPress({
						item,
						routerPush,
						contextItem,
						queryParams
					})
				} catch (e) {
					console.error(e)

					if (e instanceof Error) {
						alerts.error(e.message)
					}
				}
			},
			[item, routerPush, queryParams]
		)

		return (
			<DropdownMenuComponent
				items={dropdownMenuItems}
				onItemPress={onItemPress}
			>
				{children}
			</DropdownMenuComponent>
		)
	}
)

DropdownMenu.displayName = "DropdownMenu"

export default DropdownMenu
