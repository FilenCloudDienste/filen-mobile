import React, { useState, memo, useCallback, useMemo, useEffect, useRef } from "react"
import { View, Text, TouchableOpacity, useWindowDimensions, AppState, ActivityIndicator, RefreshControl } from "react-native"
import { getColor } from "../../style"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { NavigationContainerRef, useIsFocused } from "@react-navigation/native"
import {
	Note,
	NoteParticipant,
	Contact,
	noteParticipantsAdd,
	ChatConversation,
	chatConversationsUnread,
	ChatConversationParticipant,
	ChatConversationsOnline,
	ChatMessage,
	chatConversations,
	getChatLastFocus,
	updateChatLastFocus
} from "../../lib/api"
import { SocketEvent } from "../../lib/services/socket"
import { i18n } from "../../i18n"
import useLang from "../../lib/hooks/useLang"
import { useMMKVNumber, useMMKVObject } from "react-native-mmkv"
import storage from "../../lib/storage"
import { generateAvatarColorCode, Semaphore } from "../../lib/helpers"
import eventListener from "../../lib/eventListener"
import Ionicon from "@expo/vector-icons/Ionicons"
import { FlashList } from "@shopify/flash-list"
import { Image } from "expo-image"
import { selectContact } from "../ContactsScreen/SelectContactScreen"
import { showToast } from "../../components/Toasts"
import {
	showFullScreenLoadingModal,
	hideFullScreenLoadingModal
} from "../../components/Modals/FullscreenLoadingModal/FullscreenLoadingModal"
import { decryptChatMessage, decryptChatConversationName } from "../../lib/crypto"
import {
	sortAndFilterConversations,
	fetchChatConversations,
	getUserNameFromAccount,
	getMessageDisplayType,
	getUserNameFromMessage,
	getUserNameFromParticipant,
	getUserNameFromReplyTo,
	DisplayMessageAs,
	MessageDisplayType,
	fetchChatMessages,
	formatDate,
	formatMessageDate,
	formatTime,
	ReplaceMessageWithComponents,
	extractLinksFromString
} from "./utils"
import Embed from "./Embeds/Embed"

const Message = memo(
	({
		darkMode,
		conversation,
		index,
		message,
		messages,
		userId,
		lang
	}: {
		darkMode: boolean
		conversation: ChatConversation
		index: number
		message: ChatMessage
		messages: ChatMessage[]
		userId: number
		lang: string
	}) => {
		const [date, setDate] = useState<string>(formatMessageDate(message.sentTimestamp, lang))

		const updateDate = useCallback(() => {
			setDate(formatMessageDate(message.sentTimestamp, lang))
		}, [message.sentTimestamp, lang, setDate])

		useEffect(() => {
			const dateInterval = setInterval(updateDate, 15000)

			return () => {
				clearInterval(dateInterval)
			}
		}, [])

		return (
			<TouchableOpacity
				activeOpacity={0.5}
				style={{
					flexDirection: "row",
					paddingLeft: 15,
					paddingRight: 15,
					height: "auto",
					marginBottom: index === 0 ? 35 : 0,
					marginTop: index >= messages.length - 1 ? 70 : 20
				}}
				onPress={() => {}}
				onLongPress={() => {}}
			>
				<View>
					{message.senderAvatar && message.senderAvatar.indexOf("https://") !== -1 ? (
						<Image
							source={{
								uri: message.senderAvatar
							}}
							cachePolicy="memory-disk"
							style={{
								width: 34,
								height: 34,
								borderRadius: 34
							}}
						/>
					) : (
						<View
							style={{
								width: 34,
								height: 34,
								borderRadius: 34,
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
									fontSize: 20
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
					<Text
						numberOfLines={1}
						style={{
							width: "90%"
						}}
					>
						<Text
							style={{
								color: getColor(darkMode, "textPrimary"),
								fontSize: 16,
								fontWeight: "500"
							}}
						>
							{getUserNameFromMessage(message)}
						</Text>
						<Text
							style={{
								color: getColor(darkMode, "textSecondary"),
								fontSize: 12
							}}
							numberOfLines={1}
						>
							&nbsp;&nbsp;{date}
						</Text>
					</Text>
					<View
						style={{
							width: "85%",
							marginTop: 5,
							flexDirection: "row",
							flexWrap: "wrap"
						}}
					>
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
									failedMessages={[]}
									userId={userId}
									isScrolling={false}
									lang={lang}
								/>
								{message.edited && (
									<Text
										style={{
											fontSize: 12,
											color: getColor(darkMode, "textSecondary"),
											paddingTop: 5
										}}
									>
										{i18n(lang, "chatEdited").toLowerCase()}
									</Text>
								)}
							</View>
						) : (
							<>
								<ReplaceMessageWithComponents
									content={message.message}
									darkMode={darkMode}
									failed={false}
									participants={conversation.participants}
								/>
								{message.edited && (
									<Text
										style={{
											fontSize: 12,
											paddingLeft: 4,
											color: getColor(darkMode, "textSecondary"),
											paddingTop: 2.5
										}}
									>
										{i18n(lang, "chatEdited").toLowerCase()}
									</Text>
								)}
							</>
						)}
					</View>
				</View>
			</TouchableOpacity>
		)
	}
)

export default Message
