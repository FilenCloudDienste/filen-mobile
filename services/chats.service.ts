import nodeWorker from "@/lib/nodeWorker"
import { router } from "expo-router"
import { alertPrompt } from "@/components/prompts/alertPrompt"
import { t } from "@/lib/i18n"
import { type ChatConversation, type ChatConversationParticipant } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import authService from "./auth.service"
import queryUtils from "@/queries/utils"
import { inputPrompt } from "@/components/prompts/inputPrompt"
import { type ChatMessage } from "@filen/sdk/dist/types/api/v3/chat/messages"
import contactsService from "./contacts.service"
import { randomUUID } from "expo-crypto"
import { type Contact } from "@filen/sdk/dist/types/api/v3/contacts"
import queryClient from "@/queries/client"
import * as ImagePicker from "expo-image-picker"
import * as DocumentPicker from "expo-document-picker"
import { promiseAllChunked } from "@/lib/utils"
import { fetchItemPublicLinkStatus } from "@/queries/useItemPublicLinkStatusQuery"
import { FILE_PUBLIC_LINK_BASE_URL, DIRECTORY_PUBLIC_LINK_BASE_URL } from "@/lib/constants"
import driveService from "./drive.service"

export class ChatsService {
	public async leaveChat({
		chat,
		disableAlertPrompt,
		disableLoader,
		insideChat
	}: {
		chat: ChatConversation
		disableAlertPrompt?: boolean
		disableLoader?: boolean
		insideChat?: boolean
	}): Promise<void> {
		if (chat.ownerId === authService.getSDKConfig().userId) {
			return
		}

		if (!disableAlertPrompt) {
			const alertPromptResponse = await alertPrompt({
				title: t("chats.prompts.leaveChat.title"),
				message: t("chats.prompts.leaveChat.message")
			})

			if (alertPromptResponse.cancelled) {
				return
			}
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await nodeWorker.proxy("leaveChat", {
				conversation: chat.uuid
			})

			queryUtils.useChatsQuerySet({
				updater: prev => prev.filter(c => c.uuid !== chat.uuid)
			})
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}

			if (insideChat && router.canGoBack()) {
				router.back()
			}
		}
	}

	public async removeChatParticipant({
		disableAlertPrompt,
		disableLoader,
		chat,
		participant
	}: {
		disableAlertPrompt?: boolean
		disableLoader?: boolean
		chat: ChatConversation
		participant: ChatConversationParticipant
	}): Promise<void> {
		if (!disableAlertPrompt) {
			const alertPromptResponse = await alertPrompt({
				title: t("chats.participants.prompts.remove.title"),
				message: t("chats.participants.prompts.remove.message")
			})

			if (alertPromptResponse.cancelled) {
				return
			}
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

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
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async createChat({
		disableLoader,
		contacts,
		disableNavigation
	}: {
		disableLoader?: boolean
		contacts?: Contact[]
		disableNavigation?: boolean
	}): Promise<void> {
		if (!contacts) {
			const selectContactsResponse = await contactsService.selectContacts({
				type: "all",
				max: 9999
			})

			if (selectContactsResponse.cancelled || selectContactsResponse.contacts.length === 0) {
				return
			}

			contacts = selectContactsResponse.contacts
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			const uuid = randomUUID()

			await nodeWorker.proxy("createChat", {
				uuid,
				contacts
			})

			await queryClient.invalidateQueries({
				queryKey: ["useChatsQuery"]
			})

			if (!disableNavigation) {
				router.push({
					pathname: "/chat/[uuid]",
					params: {
						uuid
					}
				})
			}
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async deleteChat({
		chat,
		disableAlertPrompt,
		disableLoader,
		insideChat
	}: {
		chat: ChatConversation
		disableAlertPrompt?: boolean
		disableLoader?: boolean
		insideChat?: boolean
	}): Promise<void> {
		if (!disableAlertPrompt) {
			const alertPromptResponse = await alertPrompt({
				title: t("chats.prompts.deleteChat.title"),
				message: t("chats.prompts.deleteChat.message")
			})

			if (alertPromptResponse.cancelled) {
				return
			}
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await nodeWorker.proxy("deleteChat", {
				conversation: chat.uuid
			})

			queryUtils.useChatsQuerySet({
				updater: prev => prev.filter(c => c.uuid !== chat.uuid)
			})
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}

			if (insideChat && router.canGoBack()) {
				router.back()
			}
		}
	}

	public async renameChat({
		chat,
		newName,
		disableLoader
	}: {
		chat: ChatConversation
		newName?: string
		disableLoader?: boolean
	}): Promise<void> {
		if (!newName) {
			const inputPromptResponse = await inputPrompt({
				title: t("chats.prompts.renameChat.title"),
				materialIcon: {
					name: "pencil"
				},
				prompt: {
					type: "plain-text",
					keyboardType: "default",
					defaultValue: "",
					placeholder: t("chats.prompts.renameChat.placeholder")
				}
			})

			if (inputPromptResponse.cancelled || inputPromptResponse.type !== "text") {
				return
			}

			newName = inputPromptResponse.text.trim()
		}

		if (newName.length === 0 || chat.name === newName) {
			return
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await nodeWorker.proxy("editChatName", {
				conversation: chat.uuid,
				name: newName
			})

			queryUtils.useChatsQuerySet({
				updater: prev =>
					prev.map(c =>
						c.uuid === chat.uuid
							? {
									...c,
									name: newName
							  }
							: c
					)
			})
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async markChatAsRead({
		chat,
		disableLoader,
		lastFocusTimestamp
	}: {
		chat: ChatConversation
		disableLoader?: boolean
		lastFocusTimestamp?: number
	}): Promise<void> {
		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

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

			const now = Date.now()

			queryUtils.useChatsLastFocusQuerySet({
				updater: prev =>
					prev.map(v =>
						v.uuid === chat.uuid
							? {
									...v,
									lastFocus: lastFocusTimestamp ?? now
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
						values: lastFocusValues.some(v => v.uuid === chat.uuid)
							? lastFocusValues.map(v =>
									v.uuid === chat.uuid
										? {
												...v,
												lastFocus: lastFocusTimestamp ?? now
										  }
										: v
							  )
							: [
									...lastFocusValues,
									{
										uuid: chat.uuid,
										lastFocus: lastFocusTimestamp ?? now
									}
							  ]
					})
				})()
			])
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async toggleChatMute({
		chat,
		mute,
		disableLoader
	}: {
		chat: ChatConversation
		mute: boolean
		disableLoader?: boolean
	}): Promise<void> {
		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await nodeWorker.proxy("muteChat", {
				uuid: chat.uuid,
				mute
			})

			queryUtils.useChatsQuerySet({
				updater: prev =>
					prev.map(c =>
						c.uuid === chat.uuid
							? {
									...c,
									muted: mute
							  }
							: c
					)
			})
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async disableEmbeds({
		chat,
		message,
		disableAlertPrompt,
		disableLoader
	}: {
		chat: ChatConversation
		message: ChatMessage
		disableAlertPrompt?: boolean
		disableLoader?: boolean
	}): Promise<void> {
		if (!disableAlertPrompt) {
			const alertPromptResponse = await alertPrompt({
				title: t("chats.prompts.disableEmbeds.title"),
				message: t("chats.prompts.disableEmbeds.message")
			})

			if (alertPromptResponse.cancelled) {
				return
			}
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

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
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async deleteMessage({
		chat,
		message,
		disableAlertPrompt,
		disableLoader
	}: {
		chat: ChatConversation
		message: ChatMessage
		disableAlertPrompt?: boolean
		disableLoader?: boolean
	}): Promise<void> {
		if (!disableAlertPrompt) {
			const alertPromptResponse = await alertPrompt({
				title: t("chats.prompts.deleteMessage.title"),
				message: t("chats.prompts.deleteMessage.message")
			})

			if (alertPromptResponse.cancelled) {
				return
			}
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await nodeWorker.proxy("deleteChatMessage", {
				uuid: message.uuid
			})

			queryUtils.useChatMessagesQuerySet({
				uuid: chat.uuid,
				updater: prev => prev.filter(m => m.uuid !== message.uuid)
			})
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	private async enablePublicLinksForAttachments(items: DriveCloudItem[]): Promise<{ item: DriveCloudItem; link: string }[]> {
		return (
			await promiseAllChunked(
				items.map(async item => {
					const linkStatusBefore = await fetchItemPublicLinkStatus(item)

					if (linkStatusBefore.enabled) {
						return {
							item,
							link: `${item.type === "file" ? FILE_PUBLIC_LINK_BASE_URL : DIRECTORY_PUBLIC_LINK_BASE_URL}${
								linkStatusBefore.uuid
							}${encodeURIComponent("#")}${Buffer.from(linkStatusBefore.key, "utf-8").toString("hex")}`
						}
					}

					await nodeWorker.proxy("toggleItemPublicLink", {
						item,
						enable: true,
						linkUUID: ""
					})

					const linkStatus = await fetchItemPublicLinkStatus(item)

					if (!linkStatus.enabled) {
						return null
					}

					return {
						item,
						link: `${item.type === "file" ? FILE_PUBLIC_LINK_BASE_URL : DIRECTORY_PUBLIC_LINK_BASE_URL}${
							linkStatus.uuid
						}${encodeURIComponent("#")}${Buffer.from(linkStatus.key, "utf-8").toString("hex")}`
					}
				})
			)
		).filter(link => link !== null)
	}

	private async getChatUploadsDirectoryUuid(): Promise<string> {
		const { baseFolderUUID } = authService.getSDKConfig()

		return await nodeWorker.proxy("createDirectory", {
			parent: baseFolderUUID,
			name: "Chat Uploads"
		})
	}

	public async uploadMediaForAttachment({
		imagePickerAssets,
		disableLoader
	}: {
		imagePickerAssets?: ImagePicker.ImagePickerAsset[]
		disableLoader?: boolean
	}): Promise<{ item: DriveCloudItem; link: string }[]> {
		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			const parent = await this.getChatUploadsDirectoryUuid()
			const uploadedItems = await driveService.uploadMedia({
				parent,
				disableAlert: true,
				disableLoader: true,
				imagePickerAssets
			})

			return await this.enablePublicLinksForAttachments(uploadedItems)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async createPhotosForAttachment({
		imagePickerAssets,
		disableLoader
	}: {
		imagePickerAssets?: ImagePicker.ImagePickerAsset[]
		disableLoader?: boolean
	}): Promise<{ item: DriveCloudItem; link: string }[]> {
		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			const parent = await this.getChatUploadsDirectoryUuid()
			const uploadedItems = await driveService.createPhotos({
				parent,
				disableAlert: true,
				disableLoader: true,
				imagePickerAssets
			})

			return await this.enablePublicLinksForAttachments(uploadedItems)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async uploadFilesForAttachment({
		documentPickerAssets,
		disableLoader
	}: {
		documentPickerAssets?: DocumentPicker.DocumentPickerAsset[]
		disableLoader?: boolean
	}): Promise<{ item: DriveCloudItem; link: string }[]> {
		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			const parent = await this.getChatUploadsDirectoryUuid()
			const uploadedItems = await driveService.uploadFiles({
				parent,
				disableAlert: true,
				disableLoader: true,
				documentPickerAssets
			})

			return await this.enablePublicLinksForAttachments(uploadedItems)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async selectDriveItemsForAttachment({
		disableLoader,
		items,
		chat
	}: {
		disableLoader?: boolean
		items?: DriveCloudItem[]
		chat?: ChatConversation
	}): Promise<{ item: DriveCloudItem; link: string }[]> {
		if (!items) {
			const selectedItems = await driveService.selectDriveItems({
				type: "file",
				max: 9999,
				dismissHref: chat ? `/chat/${chat.uuid}` : undefined
			})

			if (selectedItems.cancelled || selectedItems.items.length === 0) {
				return []
			}

			items = selectedItems.items
		}

		if (items.length === 0) {
			return []
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			return await this.enablePublicLinksForAttachments(items)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}
}

export const chatsService = new ChatsService()

export default chatsService
