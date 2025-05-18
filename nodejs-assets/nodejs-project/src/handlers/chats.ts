import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Chats from "@filen/sdk/dist/types/chats"

export async function createChat(this: NodeWorker, params: Parameters<Chats["create"]>[0]) {
	return await sdk.get().chats().create(params)
}

export async function addChatParticipant(this: NodeWorker, params: Parameters<Chats["addParticipant"]>[0]) {
	return await sdk.get().chats().addParticipant(params)
}

export async function removeChatParticipant(this: NodeWorker, params: Parameters<Chats["removeParticipant"]>[0]) {
	return await sdk.get().chats().removeParticipant(params)
}

export async function deleteChat(this: NodeWorker, params: Parameters<Chats["delete"]>[0]) {
	return await sdk.get().chats().delete(params)
}

export async function deleteChatMessage(this: NodeWorker, params: Parameters<Chats["deleteMessage"]>[0]) {
	return await sdk.get().chats().deleteMessage(params)
}

export async function disableChatMessageEmbeds(this: NodeWorker, params: Parameters<Chats["disableMessageEmbed"]>[0]) {
	return await sdk.get().chats().disableMessageEmbed(params)
}

export async function editChatMessage(this: NodeWorker, params: Parameters<Chats["editMessage"]>[0]) {
	return await sdk.get().chats().editMessage(params)
}

export async function editChatName(this: NodeWorker, params: Parameters<Chats["editConversationName"]>[0]) {
	return await sdk.get().chats().editConversationName(params)
}

export async function sendChatMessage(this: NodeWorker, params: Parameters<Chats["sendMessage"]>[0]) {
	return await sdk.get().chats().sendMessage(params)
}

export async function sendChatTyping(this: NodeWorker, params: Parameters<Chats["sendTyping"]>[0]) {
	return await sdk.get().chats().sendTyping(params)
}

export async function fetchChats(this: NodeWorker) {
	return await sdk.get().chats().conversations()
}

export async function leaveChat(this: NodeWorker, params: Parameters<Chats["leave"]>[0]) {
	return await sdk.get().chats().leave(params)
}

export async function chatUnreadCount(this: NodeWorker, params: Parameters<Chats["conversationUnreadCount"]>[0]) {
	return await sdk.get().chats().conversationUnreadCount(params)
}

export async function chatOnline(this: NodeWorker, params: Parameters<Chats["conversationOnline"]>[0]) {
	return await sdk.get().chats().conversationOnline(params)
}

export async function chatUnread(this: NodeWorker) {
	return await sdk.get().chats().unread()
}

export async function chatMarkAsRead(this: NodeWorker, params: Parameters<Chats["markConversationAsRead"]>[0]) {
	return await sdk.get().chats().markConversationAsRead(params)
}

export async function fetchChatMessages(this: NodeWorker, params: Parameters<Chats["messages"]>[0]) {
	return await sdk.get().chats().messages(params)
}

export async function updateChatsLastFocus(this: NodeWorker, params: Parameters<Chats["updateLastFocus"]>[0]) {
	return await sdk.get().chats().updateLastFocus(params)
}

export async function fetchChatsLastFocus(this: NodeWorker) {
	return await sdk.get().chats().lastFocus()
}
