import { memo, useMemo, useCallback } from "react"
import { ContextMenu as ContextMenuComponent } from "@/components/nativewindui/ContextMenu"
import { type ContextItem } from "@/components/nativewindui/ContextMenu/types"
import { useRouter } from "expo-router"
import { createDropdownOrContextMenuItems, onDropdownOrContextMenuItemPress } from "./utils"
import alerts from "@/lib/alerts"
import { Image } from "expo-image"
import { View } from "react-native"
import useDimensions from "@/hooks/useDimensions"
import useIsProUser from "@/hooks/useIsProUser"

export const ContextMenu = memo(
	({
		children,
		item,
		queryParams,
		isAvailableOffline
	}: {
		children: React.ReactNode
		item: DriveCloudItem
		queryParams: FetchCloudItemsParams
		isAvailableOffline: boolean
	}) => {
		const { push: routerPush } = useRouter()
		const { screen, isPortrait, isTablet } = useDimensions()
		const isProUser = useIsProUser()

		const contextMenuItems = useMemo(() => {
			return createDropdownOrContextMenuItems({
				item,
				isAvailableOffline,
				of: queryParams.of,
				parent: queryParams.parent,
				isProUser
			})
		}, [item, isAvailableOffline, queryParams, isProUser])

		const onItemPress = useCallback(
			async (contextItem: Omit<ContextItem, "icon">) => {
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

		const iosRenderPreview = useCallback(() => {
			return (
				<View
					className="flex-row items-center justify-center bg-background"
					style={{
						width: Math.floor(screen.width - 32),
						height: Math.floor(screen.height / 3)
					}}
				>
					<Image
						className="rounded-lg"
						source={{
							uri: item.thumbnail
						}}
						contentFit="contain"
						style={{
							width: "100%",
							height: "100%"
						}}
					/>
				</View>
			)
		}, [item.thumbnail, screen])

		return (
			<ContextMenuComponent
				className="overflow-hidden"
				items={contextMenuItems}
				onItemPress={onItemPress}
				iosRenderPreview={item.thumbnail && (isPortrait || isTablet) ? iosRenderPreview : undefined}
			>
				{children}
			</ContextMenuComponent>
		)
	}
)

ContextMenu.displayName = "ContextMenu"

export default ContextMenu
