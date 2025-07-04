import nodeWorker from "@/lib/nodeWorker"
import { router } from "expo-router"
import { alertPrompt } from "@/components/prompts/alertPrompt"
import { t } from "@/lib/i18n"
import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import { getSDKConfig } from "@/lib/auth"
import queryUtils from "@/queries/utils"
import { inputPrompt } from "@/components/prompts/inputPrompt"

export class ChatsService {
	public async leaveChat({
		chat,
		disableAlertPrompt,
		disableLoader,
		userId,
		insideChat
	}: {
		chat: ChatConversation
		disableAlertPrompt?: boolean
		disableLoader?: boolean
		userId?: number
		insideChat?: boolean
	}): Promise<void> {
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
			await nodeWorker.proxy("removeChatParticipant", {
				conversation: chat.uuid,
				userId: userId ?? getSDKConfig().userId
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
						values: lastFocusValues.map(v =>
							v.uuid === chat.uuid
								? {
										...v,
										lastFocus: lastFocusTimestamp ?? now
								  }
								: v
						)
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
}

export const chatsService = new ChatsService()

export default chatsService
