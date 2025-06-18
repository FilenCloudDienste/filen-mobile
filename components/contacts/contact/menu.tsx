import { memo, useMemo, useCallback } from "react"
import { ContextMenu } from "@/components/nativewindui/ContextMenu"
import { createContextItem } from "@/components/nativewindui/ContextMenu/utils"
import { type ContextItem, type ContextSubMenu } from "@/components/nativewindui/ContextMenu/types"
import { DropdownMenu } from "@/components/nativewindui/DropdownMenu"
import { Platform } from "react-native"
import alerts from "@/lib/alerts"
import { useColorScheme } from "@/lib/useColorScheme"
import { type ListRenderItemInfo } from "@shopify/flash-list"
import { type ListItemInfo } from "."
import contactsService from "@/services/contacts.service"

export const Menu = memo(
	({ info, type, children }: { info: ListRenderItemInfo<ListItemInfo>; type: "context" | "dropdown"; children: React.ReactNode }) => {
		const { colors } = useColorScheme()

		const menuItems = useMemo(() => {
			const items: (ContextItem | ContextSubMenu)[] = []

			switch (info.item.type) {
				case "contact": {
					items.push(
						createContextItem({
							actionKey: "remove",
							title: "Remove",
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

					items.push(
						createContextItem({
							actionKey: "block",
							title: "Block",
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

					break
				}

				case "blocked": {
					items.push(
						createContextItem({
							actionKey: "unblock",
							title: "Unblock",
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

					break
				}

				case "outgoingRequest": {
					items.push(
						createContextItem({
							actionKey: "deleteRequest",
							title: "Remove",
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

					break
				}

				case "incomingRequest": {
					items.push(
						createContextItem({
							actionKey: "acceptRequest",
							title: "Accept",
							icon:
								Platform.OS === "ios"
									? {
											namingScheme: "sfSymbol",
											name: "checkmark.circle"
									  }
									: {
											namingScheme: "material",
											name: "check-circle-outline"
									  }
						})
					)

					items.push(
						createContextItem({
							actionKey: "denyRequest",
							title: "Decline",
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

					break
				}
			}

			return items
		}, [info.item.type, colors.destructive])

		const onItemPress = useCallback(
			async (item: Omit<ContextItem, "icon">, _?: boolean) => {
				try {
					switch (item.actionKey) {
						case "remove": {
							if (info.item.type !== "contact") {
								return
							}

							await contactsService.remove({
								uuid: info.item.contact.uuid
							})

							break
						}

						case "block": {
							if (info.item.type !== "contact") {
								return
							}

							await contactsService.block({
								email: info.item.contact.email
							})

							break
						}

						case "unblock": {
							if (info.item.type !== "blocked") {
								return
							}

							await contactsService.unblock({
								uuid: info.item.contact.uuid
							})

							break
						}

						case "deleteRequest": {
							if (info.item.type !== "outgoingRequest") {
								return
							}

							await contactsService.deleteRequest({
								uuid: info.item.request.uuid
							})

							break
						}

						case "denyRequest": {
							if (info.item.type !== "incomingRequest") {
								return
							}

							await contactsService.denyRequest({
								uuid: info.item.request.uuid
							})

							break
						}

						case "acceptRequest": {
							if (info.item.type !== "incomingRequest") {
								return
							}

							await contactsService.acceptRequest({
								uuid: info.item.request.uuid
							})

							break
						}
					}
				} catch (e) {
					console.error(e)

					if (e instanceof Error) {
						alerts.error(e.message)
					}
				}
			},
			[info.item]
		)

		if (menuItems.length === 0) {
			return children
		}

		if (type === "context") {
			return (
				<ContextMenu
					items={menuItems}
					onItemPress={onItemPress}
				>
					{children}
				</ContextMenu>
			)
		}

		return (
			<DropdownMenu
				items={menuItems}
				onItemPress={onItemPress}
			>
				{children}
			</DropdownMenu>
		)
	}
)

Menu.displayName = "Menu"

export default Menu
