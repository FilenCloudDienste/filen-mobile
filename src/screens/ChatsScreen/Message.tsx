import React, { useState, memo, useCallback, useMemo, useEffect, useRef } from "react"
import { View, Text, TouchableOpacity, Pressable } from "react-native"
import { getColor } from "../../style"
import { ChatConversation, ChatMessage, BlockedContact } from "../../lib/api"
import { i18n } from "../../i18n"
import { generateAvatarColorCode } from "../../lib/helpers"
import eventListener from "../../lib/eventListener"
import Ionicon from "@expo/vector-icons/Ionicons"
import { Image } from "expo-image"
import {
	getUserNameFromMessage,
	getUserNameFromReplyTo,
	formatMessageDate,
	ReplaceMessageWithComponents,
	extractLinksFromString,
	isTimestampSameDay,
	isTimestampSameMinute,
	MENTION_REGEX,
	ReplaceInlineMessageWithComponents
} from "./utils"
import Embed from "./Embeds/Embed"
import { Octicons } from "@expo/vector-icons"

export const NewDivider = memo(
	({
		darkMode,
		paddingTop = 20,
		lang,
		setLastFocusTimestamp,
		conversationUUID
	}: {
		darkMode: boolean
		paddingTop?: number
		lang: string
		setLastFocusTimestamp: React.Dispatch<React.SetStateAction<Record<string, number> | undefined>>
		conversationUUID: string
	}) => {
		return (
			<View
				style={{
					width: "100%",
					height: 15,
					flexDirection: "row",
					justifyContent: "space-between",
					gap: 0,
					paddingLeft: 10,
					paddingRight: 10,
					alignItems: "center",
					paddingBottom: 15,
					paddingTop
				}}
			>
				<View
					style={{
						flex: 5,
						height: 1,
						backgroundColor: getColor(darkMode, "red")
					}}
				/>
				<Pressable
					style={{
						width: "auto",
						justifyContent: "center",
						paddingLeft: 8,
						paddingRight: 8,
						backgroundColor: getColor(darkMode, "red"),
						borderRadius: 5,
						height: 15
					}}
					onPress={() =>
						setLastFocusTimestamp(prev => ({
							...prev,
							[conversationUUID]: Date.now()
						}))
					}
				>
					<Text
						style={{
							color: getColor(darkMode, "textPrimary"),
							fontSize: 10,
							fontWeight: "bold"
						}}
					>
						{i18n(lang, "new")}
					</Text>
				</Pressable>
			</View>
		)
	}
)

export const ChatInfo = memo(({ darkMode, lang }: { darkMode: boolean; lang: string }) => {
	return (
		<>
			<View
				style={{
					flexDirection: "column",
					paddingLeft: 15,
					paddingBottom: 5,
					gap: 20,
					paddingRight: 15,
					width: "90%"
				}}
			>
				<View
					style={{
						flexDirection: "column",
						gap: 5
					}}
				>
					<Text
						style={{
							color: getColor(darkMode, "textPrimary"),
							fontSize: 20,
							paddingLeft: 8
						}}
					>
						{i18n(lang, "chatInfoTitle")}
					</Text>
					<Text
						style={{
							color: getColor(darkMode, "textSecondary"),
							fontSize: 13,
							paddingLeft: 8
						}}
					>
						{i18n(lang, "chatInfoSubtitle1")}
					</Text>
				</View>
				<View
					style={{
						flexDirection: "column",
						gap: 20,
						paddingLeft: 6
					}}
				>
					<View
						style={{
							flexDirection: "row",
							gap: 5,
							alignItems: "center"
						}}
					>
						<Ionicon
							name="lock-closed-outline"
							size={30}
							color={getColor(darkMode, "textPrimary")}
							style={{
								flexShrink: 0,
								alignSelf: "flex-start"
							}}
						/>
						<Text
							style={{
								color: getColor(darkMode, "textSecondary"),
								paddingLeft: 8,
								fontSize: 12
							}}
						>
							{i18n(lang, "chatInfoSubtitle2")}
						</Text>
					</View>
					<View
						style={{
							flexDirection: "row",
							gap: 5,
							alignItems: "center"
						}}
					>
						<Ionicon
							name="checkmark-circle-outline"
							size={30}
							color={getColor(darkMode, "textPrimary")}
							style={{
								flexShrink: 0,
								alignSelf: "flex-start"
							}}
						/>
						<Text
							style={{
								color: getColor(darkMode, "textSecondary"),
								paddingLeft: 8,
								fontSize: 12
							}}
						>
							{i18n(lang, "chatInfoSubtitle3")}
						</Text>
					</View>
				</View>
			</View>
		</>
	)
})

export const DateDivider = memo(({ timestamp, darkMode }: { timestamp: number; darkMode: boolean }) => {
	return (
		<View
			style={{
				width: "100%",
				height: "auto",
				flexDirection: "row",
				justifyContent: "space-between",
				gap: 1,
				paddingLeft: 15,
				paddingRight: 15,
				alignItems: "center",
				paddingBottom: 10,
				paddingTop: 15
			}}
		>
			<View
				style={{
					flex: 4,
					height: 1,
					backgroundColor: getColor(darkMode, "primaryBorder")
				}}
			/>
			<View
				style={{
					width: "auto",
					justifyContent: "center",
					paddingLeft: 8,
					paddingRight: 8
				}}
			>
				<Text
					style={{
						fontSize: 10,
						color: getColor(darkMode, "textSecondary")
					}}
				>
					{new Date(timestamp).toDateString()}
				</Text>
			</View>
			<View
				style={{
					flex: 4,
					height: 1,
					backgroundColor: getColor(darkMode, "primaryBorder")
				}}
			/>
		</View>
	)
})

export const ReplyTo = memo(
	({
		darkMode,
		message,
		hideArrow,
		conversation
	}: {
		darkMode: boolean
		message: ChatMessage
		hideArrow: boolean
		conversation: ChatConversation
	}) => {
		return (
			<View
				style={{
					flexDirection: "row",
					gap: 7,
					alignItems: "center",
					paddingBottom: 5,
					paddingLeft: hideArrow ? 0 : 23,
					paddingTop: hideArrow ? 2 : 0,
					height: 20,
					overflow: "hidden"
				}}
			>
				{!hideArrow && (
					<Octicons
						name="reply"
						size={13}
						color={getColor(darkMode, "textSecondary")}
						style={{
							flexShrink: 0,
							transform: [{ rotate: "180deg" }, { scaleY: -1 }]
						}}
					/>
				)}
				{typeof message.replyTo.senderAvatar === "string" && message.replyTo.senderAvatar.indexOf("https://") !== -1 ? (
					<Image
						source={{
							uri: message.replyTo.senderAvatar
						}}
						placeholder={require("../../assets/images/avatar_placeholder.jpg")}
						cachePolicy="memory-disk"
						placeholderContentFit="contain"
						contentFit="contain"
						style={{
							width: 13,
							height: 13,
							borderRadius: 13
						}}
					/>
				) : (
					<View
						style={{
							width: 13,
							height: 13,
							borderRadius: 13,
							backgroundColor: generateAvatarColorCode(message.replyTo.senderEmail, darkMode),
							flexDirection: "column",
							alignItems: "center",
							justifyContent: "center"
						}}
					>
						<Text
							style={{
								color: "white",
								fontWeight: "bold",
								fontSize: 10
							}}
						>
							{getUserNameFromReplyTo(message).slice(0, 1).toUpperCase()}
						</Text>
					</View>
				)}
				<Pressable onPress={() => eventListener.emit("openUserProfileModal", message.replyTo.senderId)}>
					<Text
						style={{
							fontSize: 11,
							color: getColor(darkMode, "textPrimary")
						}}
					>
						{getUserNameFromReplyTo(message)}
					</Text>
				</Pressable>
				<View
					style={{
						flexDirection: "row",
						overflow: "hidden",
						flexGrow: 0,
						gap: 4
					}}
				>
					<ReplaceInlineMessageWithComponents
						darkMode={darkMode}
						content={message.replyTo.message}
						participants={conversation.participants}
						fontSize={11}
						color={getColor(darkMode, "textSecondary")}
					/>
				</View>
			</View>
		)
	}
)

export const MessageContent = memo(
	({
		message,
		darkMode,
		conversation,
		lang,
		failedMessages,
		isBlocked
	}: {
		message: ChatMessage
		darkMode: boolean
		conversation: ChatConversation
		lang: string
		failedMessages: string[]
		isBlocked: boolean
	}) => {
		const isFailed = useMemo(() => {
			return failedMessages.includes(message.uuid)
		}, [failedMessages, message])

		if (isBlocked) {
			return (
				<View
					style={{
						width: "100%",
						flexDirection: "column"
					}}
				>
					<Text
						style={{
							color: getColor(darkMode, "textSecondary"),
							fontSize: 14,
							fontStyle: "italic",
							width: "auto",
							flexDirection: "row",
							flexShrink: 0,
							alignItems: "center",
							lineHeight: 26
						}}
					>
						{i18n(lang, "blockedUserMessageHidden")}
					</Text>
				</View>
			)
		}

		return (
			<>
				{extractLinksFromString(message.message).length > 0 && !message.embedDisabled ? (
					<View
						style={{
							width: "100%",
							flexDirection: "column"
						}}
					>
						<Embed
							darkMode={darkMode}
							conversation={conversation}
							message={message}
							failedMessages={failedMessages}
							lang={lang}
						/>
						{message.edited && (
							<Text
								style={{
									fontSize: 10,
									color: getColor(darkMode, "textSecondary")
								}}
							>
								{i18n(lang, "chatEdited").toLowerCase()}
							</Text>
						)}
					</View>
				) : (
					<View
						style={{
							width: "100%",
							flexDirection: "column"
						}}
					>
						<ReplaceMessageWithComponents
							content={message.message}
							darkMode={darkMode}
							failed={isFailed}
							participants={conversation.participants}
						/>
						{message.edited && (
							<Text
								style={{
									fontSize: 10,
									color: getColor(darkMode, "textSecondary")
								}}
							>
								{i18n(lang, "chatEdited").toLowerCase()}
							</Text>
						)}
					</View>
				)}
			</>
		)
	}
)

export const Message = memo(
	({
		darkMode,
		conversation,
		index,
		message,
		messages,
		userId,
		lang,
		blockedContacts,
		failedMessages,
		prevMessage,
		lastFocusTimestamp,
		setLastFocusTimestamp,
		editingMessageUUID,
		replyMessageUUID
	}: {
		darkMode: boolean
		conversation: ChatConversation
		index: number
		message: ChatMessage
		messages: ChatMessage[]
		userId: number
		lang: string
		blockedContacts: BlockedContact[]
		failedMessages: string[]
		prevMessage: ChatMessage
		lastFocusTimestamp: Record<string, number> | undefined
		editingMessageUUID: string
		replyMessageUUID: string
		setLastFocusTimestamp: React.Dispatch<React.SetStateAction<Record<string, number> | undefined>>
	}) => {
		const lastMessageUUID = useRef<string>(message.uuid)
		const [date, setDate] = useState<string>(formatMessageDate(message.sentTimestamp, lang))
		const dateInterval = useRef<ReturnType<typeof setTimeout>>()

		const updateDate = useCallback(() => {
			setDate(formatMessageDate(message.sentTimestamp, lang))
		}, [message.sentTimestamp, lang, setDate, lastMessageUUID, message.uuid])

		if (lastMessageUUID.current !== message.uuid) {
			lastMessageUUID.current = message.uuid

			clearInterval(dateInterval.current)

			dateInterval.current = setInterval(updateDate, 15000)

			setDate(formatMessageDate(message.sentTimestamp, lang))
		}

		const blockedContactsIds = useMemo(() => {
			return blockedContacts.map(c => c.userId)
		}, [blockedContacts])

		const isBlocked = useMemo(() => {
			return blockedContactsIds.includes(message.senderId) && message.senderId !== userId
		}, [blockedContactsIds, message, userId])

		const groupWithPrevMessage = useMemo(() => {
			if (!prevMessage) {
				return false
			}

			return prevMessage.senderId === message.senderId && isTimestampSameMinute(message.sentTimestamp, prevMessage.sentTimestamp)
		}, [message, prevMessage])

		const prevMessageSameDay = useMemo(() => {
			if (!prevMessage) {
				return true
			}

			return isTimestampSameDay(prevMessage.sentTimestamp, message.sentTimestamp)
		}, [prevMessage, message])

		const mentioningMe = useMemo(() => {
			const matches = message.message.match(MENTION_REGEX)

			if (!matches || matches.length === 0) {
				return false
			}

			const userEmail = conversation.participants.filter(p => p.userId === userId)

			if (userEmail.length === 0) {
				return false
			}

			return (
				matches.filter(match => {
					const email = match.trim().slice(1)

					if (email === "everyone") {
						return true
					}

					if (email.startsWith("@") || email.endsWith("@")) {
						return false
					}

					return userEmail[0].email === email
				}).length > 0
			)
		}, [message, userId, conversation])

		const isNewMessage = useMemo(() => {
			return (
				lastFocusTimestamp &&
				typeof lastFocusTimestamp[message.conversation] === "number" &&
				message.sentTimestamp > lastFocusTimestamp[message.conversation] &&
				message.senderId !== userId
			)
		}, [message, lastFocusTimestamp, userId])

		const bgAndBorder = useMemo(() => {
			return {
				backgroundColor:
					(message.replyTo.uuid.length > 0 && message.replyTo.message.length > 0 && message.replyTo.senderId === userId) ||
					mentioningMe
						? darkMode
							? "rgba(255, 255, 0, 0.15)"
							: "rgba(255, 255, 0, 0.25)"
						: isNewMessage
						? darkMode
							? "rgba(255, 255, 255, 0.1)"
							: "rgba(1, 1, 1, 0.15)"
						: replyMessageUUID === message.uuid || editingMessageUUID === message.uuid
						? darkMode
							? "rgba(255, 255, 255, 0.05)"
							: "rgba(1, 1, 1, 0.075)"
						: undefined,
				borderLeftColor:
					(message.replyTo.uuid.length > 0 && message.replyTo.message.length > 0 && message.replyTo.senderId === userId) ||
					mentioningMe
						? getColor(darkMode, "yellow")
						: isNewMessage
						? getColor(darkMode, "red")
						: replyMessageUUID === message.uuid || editingMessageUUID === message.uuid
						? getColor(darkMode, "linkPrimary")
						: "transparent",
				borderLeftWidth: 3
			}
		}, [isNewMessage, darkMode, message, mentioningMe, userId, replyMessageUUID, editingMessageUUID])

		useEffect(() => {
			clearInterval(dateInterval.current)

			dateInterval.current = setInterval(updateDate, 15000)

			return () => {
				clearInterval(dateInterval.current)
			}
		}, [])

		if (groupWithPrevMessage) {
			return (
				<TouchableOpacity
					style={{
						flexDirection: "column",
						paddingLeft: 57,
						paddingRight: 15,
						height: "auto",
						width: "100%",
						marginBottom: index === 0 ? 30 : 0,
						paddingTop: 1,
						paddingBottom: 1,
						...bgAndBorder
					}}
					onLongPress={() => eventListener.emit("openChatMessageActionSheet", message)}
				>
					{message.replyTo.uuid.length > 0 && message.replyTo.message.length > 0 && (
						<ReplyTo
							darkMode={darkMode}
							message={message}
							hideArrow={true}
							conversation={conversation}
						/>
					)}
					<View
						style={{
							flexDirection: "row",
							flexWrap: "wrap",
							flex: 1
						}}
					>
						<MessageContent
							darkMode={darkMode}
							lang={lang}
							message={message}
							conversation={conversation}
							failedMessages={failedMessages}
							isBlocked={isBlocked}
						/>
					</View>
				</TouchableOpacity>
			)
		}

		return (
			<>
				{lastFocusTimestamp &&
					typeof lastFocusTimestamp[message.conversation] === "number" &&
					message.sentTimestamp > lastFocusTimestamp[message.conversation] &&
					message.senderId !== userId &&
					!(prevMessage && prevMessage.sentTimestamp > lastFocusTimestamp[message.conversation]) && (
						<NewDivider
							darkMode={darkMode}
							lang={lang}
							setLastFocusTimestamp={setLastFocusTimestamp}
							conversationUUID={message.conversation}
						/>
					)}
				{!prevMessage && (
					<View
						style={{
							flexDirection: "column",
							paddingTop: 65
						}}
					>
						<ChatInfo
							darkMode={darkMode}
							lang={lang}
						/>
						<DateDivider
							timestamp={message.sentTimestamp}
							darkMode={darkMode}
						/>
					</View>
				)}
				{!prevMessageSameDay && (
					<DateDivider
						timestamp={message.sentTimestamp}
						darkMode={darkMode}
					/>
				)}
				<TouchableOpacity
					style={{
						flexDirection: "column",
						paddingLeft: 15,
						paddingRight: 15,
						height: "auto",
						marginBottom: index === 0 ? 30 : 0,
						marginTop: index >= messages.length - 1 && prevMessage ? 70 : 15,
						paddingTop: 1,
						paddingBottom: 1,
						...bgAndBorder
					}}
					onLongPress={() => eventListener.emit("openChatMessageActionSheet", message)}
				>
					{message.replyTo.uuid.length > 0 && message.replyTo.message.length > 0 && (
						<ReplyTo
							darkMode={darkMode}
							message={message}
							hideArrow={false}
							conversation={conversation}
						/>
					)}
					<View
						style={{
							flexDirection: "row"
						}}
					>
						<View
							style={{
								paddingTop: 3
							}}
						>
							{message.senderAvatar && message.senderAvatar.indexOf("https://") !== -1 ? (
								<Image
									source={{
										uri: message.senderAvatar
									}}
									placeholder={require("../../assets/images/avatar_placeholder.jpg")}
									cachePolicy="memory-disk"
									placeholderContentFit="contain"
									contentFit="contain"
									style={{
										width: 32,
										height: 32,
										borderRadius: 32
									}}
								/>
							) : (
								<View
									style={{
										width: 32,
										height: 32,
										borderRadius: 32,
										backgroundColor: generateAvatarColorCode(message.senderEmail, darkMode),
										flexDirection: "column",
										alignItems: "center",
										justifyContent: "center"
									}}
								>
									<Text
										style={{
											color: "white",
											fontWeight: "bold",
											fontSize: 18
										}}
									>
										{getUserNameFromMessage(message).slice(0, 1).toUpperCase()}
									</Text>
								</View>
							)}
						</View>
						<View
							style={{
								width: "100%",
								flexDirection: "column",
								alignItems: "flex-start",
								paddingLeft: 10
							}}
						>
							<View
								style={{
									width: "90%",
									flexDirection: "row",
									alignItems: "center"
								}}
							>
								<Text
									style={{
										color: getColor(darkMode, "textPrimary"),
										fontSize: 15,
										fontWeight: "600",
										maxWidth: "60%"
									}}
									numberOfLines={1}
								>
									{getUserNameFromMessage(message)}
								</Text>
								<Text
									style={{
										color: getColor(darkMode, "textSecondary"),
										fontSize: 11
									}}
									numberOfLines={1}
								>
									&nbsp;&nbsp;&nbsp;{date}
								</Text>
							</View>
							<View
								style={{
									width: "90%",
									marginTop: 1,
									flexDirection: "row",
									flexWrap: "wrap",
									flex: 1
								}}
							>
								<MessageContent
									darkMode={darkMode}
									lang={lang}
									message={message}
									conversation={conversation}
									failedMessages={failedMessages}
									isBlocked={isBlocked}
								/>
							</View>
						</View>
					</View>
				</TouchableOpacity>
			</>
		)
	}
)

export default Message
