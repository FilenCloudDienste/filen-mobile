import { useEffect, createElement, memo, useRef, Fragment } from "react"
import { ChatMessage, ChatConversationParticipant, chatConversations, ChatConversation, chatMessages, UserGetAccount } from "../../lib/api"
import { dbFs } from "../../lib/db"
import { decryptChatMessage, decryptChatConversationName } from "../../lib/crypto"
import { validate } from "uuid"
import eventListener from "../../lib/eventListener"
import storage from "../../lib/storage"
import regexifyString from "regexify-string"
import EMOJI_REGEX from "emojibase-regex"
import { View, Text } from "react-native"
import { getColor } from "../../style"

export type MessageDisplayType = "image" | "ogEmbed" | "youtubeEmbed" | "twitterEmbed" | "filenEmbed" | "async" | "none" | "invalid"
export type DisplayMessageAs = Record<string, MessageDisplayType>

export const MENTION_REGEX = /(@[\w.-]+@[\w.-]+\.\w+|@everyone)/g

export const getUserNameFromMessage = (message: ChatMessage): string => {
	return message.senderNickName.length > 0 ? message.senderNickName : message.senderEmail
}

export const getUserNameFromReplyTo = (message: ChatMessage): string => {
	return message.replyTo.senderNickName.length > 0 ? message.replyTo.senderNickName : message.replyTo.senderEmail
}

export const getUserNameFromParticipant = (participant: ChatConversationParticipant): string => {
	return participant.nickName.length > 0 ? participant.nickName : participant.email
}

export const getUserNameFromAccount = (account: UserGetAccount): string => {
	return account.nickName.length > 0 ? account.nickName : account.email
}

export const formatDate = (date: Date): string => {
	return date.toLocaleDateString(window.navigator.language, { year: "numeric", month: "2-digit", day: "2-digit" })
}

export const formatTime = (date: Date): string => {
	return date.toLocaleTimeString(window.navigator.language, { hour: "2-digit", minute: "2-digit" })
}

export const formatMessageDate = (timestamp: number, lang: string = "en"): string => {
	const now = Date.now()
	const nowDate = new Date()
	const thenDate = new Date(timestamp)
	const diff = now - timestamp
	const seconds = Math.floor(diff / 1000)
	const nowDay = nowDate.getDate()
	const thenDay = thenDate.getDate()

	if (seconds <= 0) {
		return "now"
	}

	if (seconds < 60) {
		return `${seconds} seconds ago`
	}

	if (seconds < 3600) {
		const minutes = Math.floor(seconds / 60)

		return `${minutes} minute${minutes > 1 ? "s" : ""} ago`
	}

	if (seconds < 3600 * 4) {
		const hours = Math.floor(seconds / 3600)

		return `${hours} hour${hours > 1 ? "s" : ""} ago`
	}

	if (nowDay === thenDay) {
		const date = new Date(timestamp)

		return `Today at ${formatTime(date)}`
	}

	if (nowDay - 1 === thenDay) {
		const date = new Date(timestamp)

		return `Yesterday at ${formatTime(date)}`
	}

	return `${formatDate(thenDate)} ${formatTime(thenDate)}`
}

export const isTimestampSameDay = (timestamp1: number, timestamp2: number) => {
	const date1 = new Date(timestamp1)
	const date2 = new Date(timestamp2)

	return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth() && date1.getDate() === date2.getDate()
}

export const isTimestampSameMinute = (timestamp1: number, timestamp2: number) => {
	const date1 = new Date(timestamp1)
	const date2 = new Date(timestamp2)
	const date1Year = date1.getFullYear()
	const date1Month = date1.getMonth()
	const date1Date = date1.getDate()
	const date1Minutes = date1.getMinutes()
	const date2Year = date2.getFullYear()
	const date2Month = date2.getMonth()
	const date2Date = date2.getDate()
	const date2Minutes = date2.getMinutes()
	const date1Hours = date1.getHours()
	const date2Hours = date2.getHours()

	return (
		date1Year === date2Year &&
		date1Month === date2Month &&
		date1Date === date2Date &&
		date1Hours === date2Hours &&
		(date1Minutes === date2Minutes ||
			date1Minutes - 1 === date2Minutes ||
			date1Minutes === date2Minutes - 1 ||
			date1Minutes + 1 === date2Minutes ||
			date1Minutes === date2Minutes + 1 ||
			date1Minutes - 2 === date2Minutes ||
			date1Minutes === date2Minutes - 2 ||
			date1Minutes + 2 === date2Minutes ||
			date1Minutes === date2Minutes + 2)
	)
}

export interface FetchChatConversationsResult {
	cache: boolean
	conversations: ChatConversation[]
}

export const fetchChatConversations = async (skipCache: boolean = false): Promise<FetchChatConversationsResult> => {
	const refresh = async (): Promise<FetchChatConversationsResult> => {
		const conversationsDecrypted: ChatConversation[] = []
		const privateKey = storage.getString("privateKey")
		const userId = storage.getNumber("userId")
		const result = await chatConversations()
		const promises: Promise<void>[] = []

		for (const conversation of result) {
			promises.push(
				new Promise(async (resolve, reject) => {
					try {
						const metadata = conversation.participants.filter(p => p.userId === userId)

						if (metadata.length !== 1) {
							resolve()

							return
						}

						const nameDecrypted =
							typeof conversation.name === "string" && conversation.name.length > 0
								? await decryptChatConversationName(conversation.name, metadata[0].metadata, privateKey)
								: ""
						const messageDecrypted =
							typeof conversation.lastMessage === "string" && conversation.lastMessage.length > 0
								? await decryptChatMessage(conversation.lastMessage, metadata[0].metadata, privateKey)
								: ""

						conversationsDecrypted.push({
							...conversation,
							name: nameDecrypted,
							lastMessage: messageDecrypted
						})
					} catch (e) {
						reject(e)

						return
					}

					resolve()
				})
			)
		}

		await Promise.all(promises)

		await dbFs.set("chatConversations", conversationsDecrypted).catch(console.error)

		cleanupLocalDb(conversationsDecrypted).catch(console.error)

		return {
			conversations: conversationsDecrypted,
			cache: false
		}
	}

	if (skipCache) {
		return await refresh()
	}

	const cache = await dbFs.get<ChatConversation[]>("chatConversations")

	if (cache) {
		return {
			cache: true,
			conversations: cache
		}
	}

	return await refresh()
}

export interface FetchChatMessagesResult {
	cache: boolean
	messages: ChatMessage[]
}

export const fetchChatMessages = async (
	conversationUUID: string,
	metadata: string,
	timestamp: number = Date.now() + 3600000,
	skipCache: boolean = false,
	saveToLocalDb: boolean = true
): Promise<FetchChatMessagesResult> => {
	const refresh = async (): Promise<FetchChatMessagesResult> => {
		const messagesDecrypted: ChatMessage[] = []
		const privateKey = storage.getString("privateKey")
		const userId = storage.getNumber("userId")
		const result = await chatMessages(conversationUUID, timestamp)
		const promises: Promise<void>[] = []

		for (const message of result) {
			promises.push(
				new Promise(async (resolve, reject) => {
					try {
						const messageDecrypted = await decryptChatMessage(message.message, metadata, privateKey)
						const replyToMessageDecrypted =
							message.replyTo.uuid.length > 0 && message.replyTo.message.length > 0
								? await decryptChatMessage(message.replyTo.message, metadata, privateKey)
								: ""

						if (messageDecrypted.length === 0) {
							resolve()

							return
						}

						messagesDecrypted.push({
							...message,
							message: messageDecrypted,
							replyTo: {
								...message.replyTo,
								message: replyToMessageDecrypted
							}
						})
					} catch (e) {
						reject(e)

						return
					}

					resolve()
				})
			)
		}

		await Promise.all(promises)

		if (saveToLocalDb) {
			await dbFs.set("chatMessages:" + conversationUUID, messagesDecrypted.slice(-100)).catch(console.error)
		}

		return {
			messages: messagesDecrypted,
			cache: false
		}
	}

	if (skipCache) {
		return await refresh()
	}

	const cache = await dbFs.get<ChatMessage[]>("chatMessages:" + conversationUUID)

	if (cache) {
		return {
			cache: true,
			messages: cache
		}
	}

	return await refresh()
}

export const parseYouTubeVideoId = (url: string): string | null => {
	const regExp = /(?:\?v=|\/embed\/|\/watch\?v=|\/\w+\/\w+\/|youtu.be\/)([\w-]{11})/
	const match = url.match(regExp)

	if (match && match.length === 2) {
		return match[1]
	}

	return null
}

export const parseFilenPublicLink = (url: string) => {
	const ex = url.split("/")
	const uuid = ex.map(part => part.split("#")[0].trim()).filter(part => validate(part))
	const keyEx = url.split("#")

	return {
		uuid: uuid.length > 0 ? uuid[0] : "",
		key: url.indexOf("#") !== -1 ? keyEx[1].trim() : ""
	}
}

export const extractLinksFromString = (input: string): string[] => {
	const urlRegex =
		/(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi

	const matches = input.match(urlRegex)

	return matches || []
}

export const isMessageLink = (message: string) => {
	if (message.split(" ").length >= 2 || message.split("\n").length >= 2) {
		return false
	}

	const trimmed = message.trim()

	if (trimmed.indexOf("/localhost:") !== -1 && trimmed.startsWith("http://localhost:")) {
		return true
	}

	const urlRegex =
		/(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi

	return urlRegex.test(trimmed)
}

export const getMessageDisplayType = (message: string): MessageDisplayType => {
	const isLink = isMessageLink(message)

	if (!isLink) {
		return "none"
	}

	if (
		message.indexOf("/youtube.com/watch") !== -1 ||
		message.indexOf("/youtube.com/embed") !== -1 ||
		message.indexOf("/www.youtube.com/watch") !== -1 ||
		message.indexOf("/www.youtube.com/embed") !== -1 ||
		message.indexOf("/youtu.be/") !== -1 ||
		message.indexOf("/www.youtu.be/") !== -1
	) {
		return "youtubeEmbed"
	} else if (
		(message.indexOf("/localhost:") !== -1 ||
			message.indexOf("/filen.io/") !== -1 ||
			message.indexOf("/drive.filen.io/") !== -1 ||
			message.indexOf("/drive.filen.dev/") !== -1 ||
			message.indexOf("/www.filen.io/") !== -1) &&
		message.indexOf("/d/") !== -1
	) {
		return "filenEmbed"
	} else if (
		(message.indexOf("/www.twitter.com/") !== -1 || message.indexOf("/twitter.com/") !== -1) &&
		message.indexOf("/status/") !== -1
	) {
		return "twitterEmbed"
	}

	return "async"
}

export const parseTwitterStatusIdFromURL = (url: string) => {
	const ex = url.split("/")

	return ex[ex.length - 1].trim()
}

export const cleanupLocalDb = async (conversations: ChatConversation[]) => {
	// TODO
}

export const sortAndFilterConversations = (conversations: ChatConversation[], search: string, userId: number) => {
	return conversations
		.filter(convo => convo.participants.length >= 1 && (convo.lastMessageTimestamp > 0 || userId === convo.ownerId))
		.filter(convo => {
			if (search.length === 0) {
				return true
			}

			if (
				convo.participants
					.map(p => getUserNameFromParticipant(p))
					.join(", ")
					.toLowerCase()
					.trim()
					.indexOf(search.toLowerCase().trim()) !== -1
			) {
				return true
			}

			if (convo.lastMessage?.toLowerCase().trim().indexOf(search.toLowerCase().trim()) !== -1) {
				return true
			}

			return false
		})
		.sort((a, b) => {
			if (a.lastMessageTimestamp > 0 && b.lastMessageTimestamp > 0) {
				return b.lastMessageTimestamp - a.lastMessageTimestamp
			} else if (a.lastMessageTimestamp === 0 && b.lastMessageTimestamp === 0) {
				return b.createdTimestamp - a.createdTimestamp
			} else {
				return b.lastMessageTimestamp - a.lastMessageTimestamp
			}
		})
}
