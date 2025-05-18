import { memo, useMemo, useCallback } from "react"
import { ContextMenu } from "@/components/nativewindui/ContextMenu"
import { createContextItem } from "@/components/nativewindui/ContextMenu/utils"
import { type ContextItem, type ContextSubMenu } from "@/components/nativewindui/ContextMenu/types"
import { DropdownMenu } from "@/components/nativewindui/DropdownMenu"
import { useTranslation } from "react-i18next"
import { View } from "react-native"
import useDimensions from "@/hooks/useDimensions"
import alerts from "@/lib/alerts"
import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import Messages from "../chat/messages"
import useSDKConfig from "@/hooks/useSDKConfig"
import nodeWorker from "@/lib/nodeWorker"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import queryUtils from "@/queries/utils"
import { alertPrompt } from "@/components/prompts/alertPrompt"
import { useRouter } from "expo-router"
import { inputPrompt } from "@/components/prompts/inputPrompt"
import useChatUnreadCountQuery from "@/queries/useChatUnreadCountQuery"

export const Menu = memo(
	({
		chat,
		type,
		children,
		insideChat
	}: {
		chat: ChatConversation
		type: "context" | "dropdown"
		children: React.ReactNode
		insideChat: boolean
	}) => {
		const { t } = useTranslation()
		const { screen, isPortrait, isTablet } = useDimensions()
		const [{ userId }] = useSDKConfig()
		const router = useRouter()

		const chatUnreadCountQuery = useChatUnreadCountQuery({
			uuid: chat.uuid,
			enabled: false
		})

		const unreadCount = useMemo(() => {
			if (chatUnreadCountQuery.status !== "success") {
				return 0
			}

			return chatUnreadCountQuery.data
		}, [chatUnreadCountQuery.data, chatUnreadCountQuery.status])

		const menuItems = useMemo(() => {
			const items: (ContextItem | ContextSubMenu)[] = []

			if (unreadCount > 0 && !insideChat) {
				items.push(
					createContextItem({
						actionKey: "markAsRead",
						title: t("chats.menu.markAsRead")
					})
				)
			}

			if (!insideChat) {
				items.push(
					createContextItem({
						actionKey: "participants",
						title: t("chats.menu.participants")
					})
				)
			}

			if (chat.ownerId === userId) {
				items.push(
					createContextItem({
						actionKey: "rename",
						title: t("chats.menu.rename")
					})
				)

				items.push(
					createContextItem({
						actionKey: "delete",
						title: t("chats.menu.delete"),
						destructive: true
					})
				)
			} else {
				items.push(
					createContextItem({
						actionKey: "leave",
						title: t("chats.menu.leave"),
						destructive: true
					})
				)
			}

			return items
		}, [t, chat.ownerId, userId, unreadCount, insideChat])

		const leave = useCallback(async () => {
			const alertPromptResponse = await alertPrompt({
				title: "leave",
				message: "Are u sure"
			})

			if (alertPromptResponse.cancelled) {
				return
			}

			fullScreenLoadingModal.show()

			try {
				await nodeWorker.proxy("removeChatParticipant", {
					conversation: chat.uuid,
					userId
				})

				queryUtils.useChatsQuerySet({
					updater: prev => prev.filter(c => c.uuid !== chat.uuid)
				})
			} catch (e) {
				console.error(e)

				if (e instanceof Error) {
					alerts.error(e.message)
				}
			} finally {
				fullScreenLoadingModal.hide()

				if (insideChat && router.canGoBack()) {
					router.back()
				}
			}
		}, [chat.uuid, insideChat, router, userId])

		const deleteChat = useCallback(async () => {
			const alertPromptResponse = await alertPrompt({
				title: "delete",
				message: "Are u sure"
			})

			if (alertPromptResponse.cancelled) {
				return
			}

			fullScreenLoadingModal.show()

			try {
				await nodeWorker.proxy("deleteChat", {
					conversation: chat.uuid
				})

				queryUtils.useChatsQuerySet({
					updater: prev => prev.filter(c => c.uuid !== chat.uuid)
				})
			} catch (e) {
				console.error(e)

				if (e instanceof Error) {
					alerts.error(e.message)
				}
			} finally {
				fullScreenLoadingModal.hide()

				if (insideChat && router.canGoBack()) {
					router.back()
				}
			}
		}, [chat.uuid, insideChat, router])

		const rename = useCallback(async () => {
			const inputPromptResponse = await inputPrompt({
				title: t("drive.header.rightView.actionSheet.create.directory"),
				materialIcon: {
					name: "folder-plus-outline"
				},
				prompt: {
					type: "plain-text",
					keyboardType: "default",
					defaultValue: "",
					placeholder: t("drive.header.rightView.actionSheet.directoryNamePlaceholder")
				}
			})

			if (inputPromptResponse.cancelled || inputPromptResponse.type !== "text") {
				return
			}

			const name = inputPromptResponse.text.trim()

			if (name.length === 0) {
				return
			}

			fullScreenLoadingModal.show()

			try {
				await nodeWorker.proxy("editChatName", {
					conversation: chat.uuid,
					name
				})

				queryUtils.useChatsQuerySet({
					updater: prev =>
						prev.map(c =>
							c.uuid === chat.uuid
								? {
										...c,
										name
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
		}, [chat.uuid, t])

		const markAsRead = useCallback(async () => {
			fullScreenLoadingModal.show()

			try {
				queryUtils.useChatUnreadCountQuerySet({
					uuid: chat.uuid,
					updater: count => {
						queryUtils.useChatUnreadQuerySet({
							updater: prev => (prev - count >= 0 ? prev - count : 0)
						})

						return 0
					}
				})

				const lastFocusTimestamp = Date.now()

				queryUtils.useChatsLastFocusQuerySet({
					updater: prev =>
						prev.map(v =>
							v.uuid === chat.uuid
								? {
										...v,
										lastFocus: lastFocusTimestamp
									}
								: v
						)
				})

				await Promise.all([
					nodeWorker.proxy("chatMarkAsRead", {
						conversation: chat.uuid
					}),
					(async () => {
						const lastFocusValues = await nodeWorker.proxy("fetchChatsLastFocus", undefined)

						await nodeWorker.proxy("updateChatsLastFocus", {
							values: lastFocusValues.map(v =>
								v.uuid === chat.uuid
									? {
											...v,
											lastFocus: lastFocusTimestamp
										}
									: v
							)
						})
					})()
				])
			} catch (e) {
				console.error(e)

				if (e instanceof Error) {
					alerts.error(e.message)
				}
			} finally {
				fullScreenLoadingModal.hide()
			}
		}, [chat.uuid])

		const onItemPress = useCallback(
			async (item: Omit<ContextItem, "icon">, _?: boolean) => {
				try {
					switch (item.actionKey) {
						case "rename":
							await rename()

							break

						case "leave":
							await leave()

							break

						case "delete":
							await deleteChat()

							break

						case "markAsRead":
							await markAsRead()

							break

						case "participants":
							router.push({
								pathname: "/chats/[uuid]/participants",
								params: {
									uuid: chat.uuid
								}
							})

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
			[rename, leave, deleteChat, markAsRead, chat.uuid, router]
		)

		const noop = useCallback(() => {}, [])

		const iosRenderPreview = useCallback(() => {
			return (
				<View
					className="flex-row items-center justify-center bg-background"
					style={{
						width: Math.floor(screen.width - 32),
						height: Math.floor(screen.height / 2.5)
					}}
				>
					<Messages
						chat={chat}
						isPreview={true}
						replyToMessage={null}
						setReplyToMessage={noop}
						inputHeight={0}
					/>
				</View>
			)
		}, [chat, screen.width, screen.height, noop])

		if (type === "context") {
			return (
				<ContextMenu
					items={menuItems}
					onItemPress={onItemPress}
					iosRenderPreview={isPortrait || isTablet ? iosRenderPreview : undefined}
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
