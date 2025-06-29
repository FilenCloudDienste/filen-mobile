import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import { contactName } from "@/lib/utils"
import { t } from "@/lib/i18n"

export function getChatName(chat: ChatConversation, userId: number): string {
	if (chat.name && chat.name.length > 0) {
		return chat.name
	}

	const participants = chat.participants
		.filter(participant => participant.userId !== userId)
		.sort((a, b) => contactName(a.email, a.nickName).localeCompare(contactName(b.email, b.nickName)))

	if (participants.length === 0) {
		return t("chats.chat")
	}

	return participants.map(participant => contactName(participant.email, participant.nickName)).join(", ")
}
