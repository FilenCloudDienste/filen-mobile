import { memo, useMemo, useCallback } from "react"
import { ContextMenu } from "@/components/nativewindui/ContextMenu"
import { createContextItem } from "@/components/nativewindui/ContextMenu/utils"
import { type ContextItem, type ContextSubMenu } from "@/components/nativewindui/ContextMenu/types"
import { DropdownMenu } from "@/components/nativewindui/DropdownMenu"
import { type ChatConversation, type ChatConversationParticipant } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import { useTranslation } from "react-i18next"
import alerts from "@/lib/alerts"
import nodeWorker from "@/lib/nodeWorker"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import { alertPrompt } from "@/components/prompts/alertPrompt"
import queryUtils from "@/queries/utils"
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
		const { t } = useTranslation()
		const [{ userId }] = useSDKConfig()
		const { colors } = useColorScheme()

		const menuItems = useMemo(() => {
			const items: (ContextItem | ContextSubMenu)[] = []

			if (chat.ownerId === userId && participant.userId !== userId) {
				items.push(
					createContextItem({
						actionKey: "remove",
						title: t("chats.participants.menu.remove"),
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
		}, [t, chat.ownerId, userId, participant.userId, colors.destructive])

		const remove = useCallback(async () => {
			const alertPromptResponse = await alertPrompt({
				title: t("chats.participants.prompts.remove.title"),
				message: t("chats.participants.prompts.remove.message")
			})

			if (alertPromptResponse.cancelled) {
				return
			}

			fullScreenLoadingModal.show()

			try {
				await nodeWorker.proxy("removeChatParticipant", {
					conversation: chat.uuid,
					userId: participant.userId
				})

				queryUtils.useChatsQuerySet({
					updater: prev =>
						prev.map(c =>
							c.uuid === chat.uuid
								? {
										...c,
										participants: c.participants.filter(p => p.userId !== participant.userId)
								  }
								: c
						)
				})
			} catch (e) {
				console.error(e)

				if (e instanceof Error) {
					alerts.error(e.message)
				}
			} finally {
				fullScreenLoadingModal.hide()
			}
		}, [chat.uuid, participant.userId, t])

		const onItemPress = useCallback(
			async (item: Omit<ContextItem, "icon">, _?: boolean) => {
				try {
					switch (item.actionKey) {
						case "remove": {
							await remove()

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
			[remove]
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
