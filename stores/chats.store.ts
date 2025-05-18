import { create } from "zustand"
import { type CustomEmoji } from "@/components/chats/chat/messages/customEmojis"
import { type ChatConversationParticipant } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import { type ChatMessage } from "@filen/sdk/dist/types/api/v3/chat/messages"

export type PendingMessageStatus = "pending" | "sent" | "failed"
export type PendingMessage = {
	uuid: string
	status: PendingMessageStatus
}

export type ChatsStore = {
	pendingMessages: Record<string, PendingMessage>
	showEmojis: Record<string, boolean>
	showMention: Record<string, boolean>
	emojisText: Record<string, string>
	mentionText: Record<string, string>
	emojisSuggestions: Record<string, CustomEmoji[]>
	mentionSuggestions: Record<string, ChatConversationParticipant[]>
	replyToMessage: Record<string, ChatMessage | null>
	setReplyToMessage: (
		fn: Record<string, ChatMessage | null> | ((prev: Record<string, ChatMessage | null>) => Record<string, ChatMessage | null>)
	) => void
	setEmojisSuggestions: (
		fn: Record<string, CustomEmoji[]> | ((prev: Record<string, CustomEmoji[]>) => Record<string, CustomEmoji[]>)
	) => void
	setMentionSuggestions: (
		fn:
			| Record<string, ChatConversationParticipant[]>
			| ((prev: Record<string, ChatConversationParticipant[]>) => Record<string, ChatConversationParticipant[]>)
	) => void
	setEmojisText: (fn: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void
	setMentionText: (fn: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void
	setShowEmojis: (fn: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void
	setShowMention: (fn: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void
	setPendingMessages: (
		fn: Record<string, PendingMessage> | ((prev: Record<string, PendingMessage>) => Record<string, PendingMessage>)
	) => void
	resetSuggestions: (chatUUID: string) => void
}

export const useChatsStore = create<ChatsStore>(set => ({
	pendingMessages: {},
	showEmojis: {},
	showMention: {},
	emojisText: {},
	mentionText: {},
	emojisSuggestions: {},
	mentionSuggestions: {},
	replyToMessage: {},
	setReplyToMessage(fn) {
		set(state => ({
			replyToMessage: typeof fn === "function" ? fn(state.replyToMessage) : fn
		}))
	},
	setEmojisSuggestions(fn) {
		set(state => ({
			emojisSuggestions: typeof fn === "function" ? fn(state.emojisSuggestions) : fn
		}))
	},
	setMentionSuggestions(fn) {
		set(state => ({
			mentionSuggestions: typeof fn === "function" ? fn(state.mentionSuggestions) : fn
		}))
	},
	setEmojisText(fn) {
		set(state => ({
			emojisText: typeof fn === "function" ? fn(state.emojisText) : fn
		}))
	},
	setMentionText(fn) {
		set(state => ({
			mentionText: typeof fn === "function" ? fn(state.mentionText) : fn
		}))
	},
	setShowMention(fn) {
		set(state => ({
			showMention: typeof fn === "function" ? fn(state.showMention) : fn
		}))
	},
	setShowEmojis(fn) {
		set(state => ({
			showEmojis: typeof fn === "function" ? fn(state.showEmojis) : fn
		}))
	},
	setPendingMessages(fn) {
		set(state => ({
			pendingMessages: typeof fn === "function" ? fn(state.pendingMessages) : fn
		}))
	},
	resetSuggestions(chatUUID) {
		set(state => ({
			emojiSuggestions: {
				...state.emojisSuggestions,
				[chatUUID]: []
			},
			mentionSuggestions: {
				...state.mentionSuggestions,
				[chatUUID]: []
			},
			showEmojis: {
				...state.showEmojis,
				[chatUUID]: false
			},
			showMention: {
				...state.showMention,
				[chatUUID]: false
			},
			mentionText: {
				...state.mentionText,
				[chatUUID]: ""
			},
			emojiText: {
				...state.emojisText,
				[chatUUID]: ""
			}
		}))
	}
}))
