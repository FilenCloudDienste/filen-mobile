import { memo, useMemo, useCallback } from "react"
import { ContextMenu } from "@/components/nativewindui/ContextMenu"
import { createContextItem } from "@/components/nativewindui/ContextMenu/utils"
import { type ContextItem, type ContextSubMenu } from "@/components/nativewindui/ContextMenu/types"
import { useTranslation } from "react-i18next"
import alerts from "@/lib/alerts"
import useSDKConfig from "@/hooks/useSDKConfig"
import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import { type ChatMessage } from "@filen/sdk/dist/types/api/v3/chat/messages"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import nodeWorker from "@/lib/nodeWorker"
import queryUtils from "@/queries/utils"
import * as Clipboard from "expo-clipboard"
import { alertPrompt } from "@/components/prompts/alertPrompt"
import { useChatsStore } from "@/stores/chats.store"
import { useShallow } from "zustand/shallow"
import { useMMKVString } from "react-native-mmkv"
import mmkvInstance from "@/lib/mmkv"
import { useColorScheme } from "@/lib/useColorScheme"
import { Platform } from "react-native"
import useNetInfo from "@/hooks/useNetInfo"

export const Menu = memo(({ chat, message, children }: { chat: ChatConversation; message: ChatMessage; children: React.ReactNode }) => {
	const [{ userId }] = useSDKConfig()
	const { t } = useTranslation()
	const setReplyToMessage = useChatsStore(useShallow(state => state.setReplyToMessage))
	const setEditMessage = useChatsStore(useShallow(state => state.setEditMessage))
	const [, setChatInputValue] = useMMKVString(`chatInputValue:${chat.uuid}`, mmkvInstance)
	const { colors } = useColorScheme()
	const { hasInternet } = useNetInfo()

	const menuItems = useMemo(() => {
		if (!hasInternet) {
			return []
		}

		const items: (ContextItem | ContextSubMenu)[] = []

		items.push(
			createContextItem({
				actionKey: "reply",
				title: t("chats.messages.menu.reply"),
				icon:
					Platform.OS === "ios"
						? {
								namingScheme: "sfSymbol",
								name: "plus.message"
						  }
						: {
								namingScheme: "material",
								name: "message-plus-outline"
						  }
			})
		)

		items.push(
			createContextItem({
				actionKey: "copyText",
				title: t("chats.messages.menu.copyText"),
				icon:
					Platform.OS === "ios"
						? {
								namingScheme: "sfSymbol",
								name: "clipboard"
						  }
						: {
								namingScheme: "material",
								name: "clipboard-outline"
						  }
			})
		)

		if (message.senderId === userId) {
			items.push(
				createContextItem({
					actionKey: "disableEmbeds",
					title: t("chats.messages.menu.disableEmbeds"),
					icon:
						Platform.OS === "ios"
							? {
									namingScheme: "sfSymbol",
									name: "link"
							  }
							: {
									namingScheme: "material",
									name: "link"
							  }
				})
			)

			items.push(
				createContextItem({
					actionKey: "edit",
					title: t("chats.messages.menu.edit"),
					icon:
						Platform.OS === "ios"
							? {
									namingScheme: "sfSymbol",
									name: "pencil"
							  }
							: {
									namingScheme: "material",
									name: "pencil"
							  }
				})
			)

			items.push(
				createContextItem({
					actionKey: "delete",
					title: t("chats.messages.menu.delete"),
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
	}, [t, message.senderId, userId, colors.destructive, hasInternet])

	const deleteMessage = useCallback(async () => {
		const alertPromptResponse = await alertPrompt({
			title: t("chats.prompts.deleteMessage.title"),
			message: t("chats.prompts.deleteMessage.message")
		})

		if (alertPromptResponse.cancelled) {
			return
		}

		fullScreenLoadingModal.show()

		try {
			await nodeWorker.proxy("deleteChatMessage", {
				uuid: message.uuid
			})

			queryUtils.useChatMessagesQuerySet({
				uuid: chat.uuid,
				updater: prev => prev.filter(m => m.uuid !== message.uuid)
			})
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			fullScreenLoadingModal.hide()
		}
	}, [chat.uuid, message.uuid, t])

	const disableEmbeds = useCallback(async () => {
		const alertPromptResponse = await alertPrompt({
			title: t("chats.prompts.disableEmbeds.title"),
			message: t("chats.prompts.disableEmbeds.message")
		})

		if (alertPromptResponse.cancelled) {
			return
		}

		fullScreenLoadingModal.show()

		try {
			await nodeWorker.proxy("disableChatMessageEmbeds", {
				uuid: message.uuid
			})

			queryUtils.useChatMessagesQuerySet({
				uuid: chat.uuid,
				updater: prev =>
					prev.map(m =>
						m.uuid === message.uuid
							? ({
									...m,
									embedDisabled: true
							  } satisfies ChatMessage)
							: m
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
	}, [chat.uuid, message.uuid, t])

	const copyText = useCallback(async () => {
		try {
			await Clipboard.setStringAsync(message.message)
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		}
	}, [message.message])

	const reply = useCallback(() => {
		setReplyToMessage(prev => ({
			...prev,
			[chat.uuid]: message
		}))

		setEditMessage(prev => ({
			...prev,
			[chat.uuid]: null
		}))
	}, [message, setReplyToMessage, chat.uuid, setEditMessage])

	const edit = useCallback(() => {
		setChatInputValue(message.message)

		setEditMessage(prev => ({
			...prev,
			[chat.uuid]: message
		}))

		setReplyToMessage(prev => ({
			...prev,
			[chat.uuid]: null
		}))
	}, [message, setEditMessage, chat.uuid, setReplyToMessage, setChatInputValue])

	const onItemPress = useCallback(
		async (item: Omit<ContextItem, "icon">, _?: boolean) => {
			try {
				switch (item.actionKey) {
					case "reply": {
						reply()

						break
					}

					case "copyText": {
						await copyText()

						break
					}

					case "delete": {
						await deleteMessage()

						break
					}

					case "disableEmbeds": {
						await disableEmbeds()

						break
					}

					case "edit": {
						edit()

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
		[copyText, deleteMessage, reply, disableEmbeds, edit]
	)

	if (menuItems.length === 0) {
		return children
	}

	return (
		<ContextMenu
			items={menuItems}
			onItemPress={onItemPress}
		>
			{children}
		</ContextMenu>
	)
})

Menu.displayName = "Menu"

export default Menu
