import { memo, useMemo, useCallback } from "react"
import { ContextMenu } from "@/components/nativewindui/ContextMenu"
import { createContextItem } from "@/components/nativewindui/ContextMenu/utils"
import type { ContextItem, ContextSubMenu } from "@/components/nativewindui/ContextMenu/types"
import { DropdownMenu } from "@/components/nativewindui/DropdownMenu"
import { type ChatConversation, ChatConversationParticipant } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import { translateMemoized } from "@/lib/i18n"
import alerts from "@/lib/alerts"
import chatsService from "@/services/chats.service"
import useSDKConfig from "@/hooks/useSDKConfig"
import { Platform } from "react-native"
import { useColorScheme } from "@/lib/useColorScheme"

export const Menu = memo(
	({
		chat,
		type,
		children,
		participant
	}: {
		chat: ChatConversation
		type: "context" | "dropdown"
		children: React.ReactNode
		participant: ChatConversationParticipant
	}) => {
		const [{ userId }] = useSDKConfig()
		const { colors } = useColorScheme()

		const menuItems = useMemo(() => {
			const items: (ContextItem | ContextSubMenu)[] = []

			if (chat.ownerId === userId && participant.userId !== userId) {
				items.push(
					createContextItem({
						actionKey: "remove",
						title: translateMemoized("chats.participants.menu.remove"),
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

			return items
		}, [chat.ownerId, userId, participant.userId, colors.destructive])

		const onItemPress = useCallback(
			async (item: Omit<ContextItem, "icon">, _?: boolean) => {
				try {
					switch (item.actionKey) {
						case "remove": {
							await chatsService.removeChatParticipant({
								chat,
								participant
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
			[chat, participant]
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
