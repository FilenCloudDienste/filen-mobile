import { memo, useMemo, useCallback } from "react"
import { ContextMenu } from "@/components/nativewindui/ContextMenu"
import { createContextItem } from "@/components/nativewindui/ContextMenu/utils"
import type { ContextItem, ContextSubMenu } from "@/components/nativewindui/ContextMenu/types"
import { DropdownMenu } from "@/components/nativewindui/DropdownMenu"
import { translateMemoized } from "@/lib/i18n"
import { View, Platform } from "react-native"
import useDimensions from "@/hooks/useDimensions"
import alerts from "@/lib/alerts"
import type { ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import Messages from "../chat/messages"
import useSDKConfig from "@/hooks/useSDKConfig"
import { useRouter } from "expo-router"
import useChatUnreadCountQuery from "@/queries/useChatUnreadCount.query"
import { useColorScheme } from "@/lib/useColorScheme"
import useNetInfo from "@/hooks/useNetInfo"
import chatsService from "@/services/chats.service"

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
		const { screen, isPortrait, isTablet } = useDimensions()
		const [{ userId }] = useSDKConfig()
		const router = useRouter()
		const { colors } = useColorScheme()
		const { hasInternet } = useNetInfo()

		const chatUnreadCountQuery = useChatUnreadCountQuery(
			{
				conversation: chat.uuid
			},
			{
				enabled: false
			}
		)

		const unreadCount = useMemo(() => {
			if (chatUnreadCountQuery.status !== "success") {
				return 0
			}

			return chatUnreadCountQuery.data
		}, [chatUnreadCountQuery.data, chatUnreadCountQuery.status])

		const isUndecryptable = useMemo(() => {
			const nameNormalized = chat.name?.toLowerCase().trim() ?? ""
			const lastMessageNormalized = chat.lastMessage?.toLowerCase().trim() ?? ""

			return (
				(nameNormalized.startsWith("cannot_decrypt_") && nameNormalized.endsWith(`_${chat.uuid}`)) ||
				(lastMessageNormalized.startsWith("cannot_decrypt_") && lastMessageNormalized.endsWith(`_${chat.lastMessageUUID}`))
			)
		}, [chat.name, chat.uuid, chat.lastMessage, chat.lastMessageUUID])

		const menuItems = useMemo(() => {
			if (!hasInternet) {
				return []
			}

			const items: (ContextItem | ContextSubMenu)[] = []

			if (unreadCount > 0 && !insideChat && !isUndecryptable) {
				items.push(
					createContextItem({
						actionKey: "markAsRead",
						title: translateMemoized("chats.menu.markAsRead"),
						icon:
							Platform.OS === "ios"
								? {
										namingScheme: "sfSymbol",
										name: "envelope"
								  }
								: {
										namingScheme: "material",
										name: "message-processing-outline"
								  }
					})
				)
			}

			if (!insideChat && !isUndecryptable) {
				items.push(
					createContextItem({
						actionKey: "participants",
						title: translateMemoized("chats.menu.participants"),
						icon:
							Platform.OS === "ios"
								? {
										namingScheme: "sfSymbol",
										name: "person.2"
								  }
								: {
										namingScheme: "material",
										name: "account-multiple-outline"
								  }
					})
				)
			}

			if (!isUndecryptable) {
				items.push(
					createContextItem({
						actionKey: "mute",
						title: translateMemoized("chats.menu.muted"),
						state: {
							checked: chat.muted
						},
						icon:
							Platform.OS === "ios"
								? {
										namingScheme: "sfSymbol",
										name: "bell"
								  }
								: {
										namingScheme: "material",
										name: "bell-outline"
								  }
					})
				)
			}

			if (chat.ownerId === userId) {
				if (!isUndecryptable) {
					items.push(
						createContextItem({
							actionKey: "rename",
							title: translateMemoized("chats.menu.rename"),
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
				}

				items.push(
					createContextItem({
						actionKey: "delete",
						title: translateMemoized("chats.menu.delete"),
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
			} else {
				items.push(
					createContextItem({
						actionKey: "leave",
						title: translateMemoized("chats.menu.leave"),
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
		}, [chat.ownerId, userId, unreadCount, insideChat, colors.destructive, chat.muted, hasInternet, isUndecryptable])

		const onItemPress = useCallback(
			async (item: Omit<ContextItem, "icon">, _?: boolean) => {
				try {
					switch (item.actionKey) {
						case "rename": {
							await chatsService.renameChat({
								chat
							})

							break
						}

						case "leave": {
							await chatsService.leaveChat({
								chat,
								insideChat
							})

							break
						}

						case "delete": {
							await chatsService.deleteChat({
								chat,
								insideChat
							})

							break
						}

						case "markAsRead": {
							await chatsService.markChatAsRead({
								chat
							})

							break
						}

						case "mute": {
							await chatsService.toggleChatMute({
								chat,
								mute: !chat.muted
							})

							break
						}

						case "participants": {
							router.push({
								pathname: "/chats/[uuid]/participants",
								params: {
									uuid: chat.uuid
								}
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
			[chat, router, insideChat]
		)

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
						inputHeight={0}
					/>
				</View>
			)
		}, [chat, screen.width, screen.height])

		const renderPreview = useMemo(() => {
			return hasInternet && (isPortrait || isTablet) ? iosRenderPreview : undefined
		}, [iosRenderPreview, hasInternet, isPortrait, isTablet])

		const contextKey = useMemo(() => {
			return !hasInternet ? undefined : `${isPortrait}:${isTablet}`
		}, [hasInternet, isPortrait, isTablet])

		if (menuItems.length === 0) {
			return children
		}

		if (type === "context") {
			return (
				<ContextMenu
					items={menuItems}
					onItemPress={onItemPress}
					key={contextKey}
					iosRenderPreview={renderPreview}
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
