import { alertPrompt } from "@/components/prompts/alertPrompt"
import { t } from "@/lib/i18n"
import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import chatsService from "./chats.service"
import { promiseAllChunked } from "@/lib/utils"

export class ChatsBulkService {
	public async leaveChats({
		chats,
		disableAlertPrompt,
		disableLoader,
		userId
	}: {
		chats: ChatConversation[]
		disableAlertPrompt?: boolean
		disableLoader?: boolean
		userId?: number
	}): Promise<void> {
		if (chats.length === 0) {
			return
		}

		if (!disableAlertPrompt) {
			const alertPromptResponse = await alertPrompt({
				title: t("chats.prompts.leaveChats.title"),
				message: t("chats.prompts.leaveChats.message")
			})

			if (alertPromptResponse.cancelled) {
				return
			}
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				chats.map(chat =>
					chatsService.leaveChat({
						chat,
						disableAlertPrompt: true,
						disableLoader: true,
						userId
					})
				)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async deleteChats({
		chats,
		disableAlertPrompt,
		disableLoader
	}: {
		chats: ChatConversation[]
		disableAlertPrompt?: boolean
		disableLoader?: boolean
	}): Promise<void> {
		if (chats.length === 0) {
			return
		}

		if (!disableAlertPrompt) {
			const alertPromptResponse = await alertPrompt({
				title: t("chats.prompts.deleteChats.title"),
				message: t("chats.prompts.deleteChats.message")
			})

			if (alertPromptResponse.cancelled) {
				return
			}
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				chats.map(chat =>
					chatsService.deleteChat({
						chat,
						disableAlertPrompt: true,
						disableLoader: true
					})
				)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async markChatsAsRead({
		chats,
		disableLoader,
		lastFocusTimestamp
	}: {
		chats: ChatConversation[]
		disableLoader?: boolean
		lastFocusTimestamp?: number
	}): Promise<void> {
		if (chats.length === 0) {
			return
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				chats.map(chat =>
					chatsService.markChatAsRead({
						chat,
						disableLoader: true,
						lastFocusTimestamp
					})
				)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async toggleChatsMute({
		chats,
		mute,
		disableLoader
	}: {
		chats: ChatConversation[]
		mute: boolean
		disableLoader?: boolean
	}): Promise<void> {
		if (chats.length === 0) {
			return
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				chats.map(chat =>
					chatsService.toggleChatMute({
						chat,
						mute,
						disableLoader: true
					})
				)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}
}

export const chatsBulkService = new ChatsBulkService()

export default chatsBulkService
