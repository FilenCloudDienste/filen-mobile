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

export const Menu = memo(({ chat, message, children }: { chat: ChatConversation; message: ChatMessage; children: React.ReactNode }) => {
	const [{ userId }] = useSDKConfig()
	const { t } = useTranslation()
	const setReplyToMessage = useChatsStore(useShallow(state => state.setReplyToMessage))
	const setEditMessage = useChatsStore(useShallow(state => state.setEditMessage))
	const [, setChatInputValue] = useMMKVString(`chatInputValue:${chat.uuid}`, mmkvInstance)

	const menuItems = useMemo(() => {
		const items: (ContextItem | ContextSubMenu)[] = []

		items.push(
			createContextItem({
				actionKey: "reply",
				title: t("chats.messages.menu.reply")
			})
		)

		items.push(
			createContextItem({
				actionKey: "copyText",
				title: t("chats.messages.menu.copyText")
			})
		)

		if (message.senderId === userId) {
			items.push(
				createContextItem({
					actionKey: "disableEmbeds",
					title: t("chats.messages.menu.disableEmbeds")
				})
			)

			items.push(
				createContextItem({
					actionKey: "edit",
					title: t("chats.messages.menu.edit")
				})
			)

			items.push(
				createContextItem({
					actionKey: "delete",
					title: t("chats.messages.menu.delete"),
					destructive: true
				})
			)
		}

		return items
	}, [t, message.senderId, userId])

	const deleteMessage = useCallback(async () => {
		const alertPromptResponse = await alertPrompt({
			title: "deleteMessage",
			message: "Are u sure"
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
	}, [chat.uuid, message.uuid])

	const disableEmbeds = useCallback(async () => {
		const alertPromptResponse = await alertPrompt({
			title: "disableEmbeds",
			message: "Are u sure"
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
	}, [chat.uuid, message.uuid])

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
					case "reply":
						reply()

						break

					case "copyText":
						await copyText()

						break

					case "delete":
						await deleteMessage()

						break

					case "disableEmbeds":
						await disableEmbeds()

						break

					case "edit":
						edit()

						break

					default:
						break
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
