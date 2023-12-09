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
import FastImage from "react-native-fast-image"
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
	formatTime
} from "./utils"
import { dbFs } from "../../lib/db"
import useNetworkInfo from "../../lib/services/isOnline/useNetworkInfo"
import { TopBar } from "../../components/TopBar"
import striptags from "striptags"
import DefaultTopBar from "../../components/TopBar/DefaultTopBar"

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
		return (
			<TouchableOpacity
				activeOpacity={0.5}
				style={{
					flexDirection: "row",
					paddingLeft: 15,
					paddingRight: 15,
					height: "auto",
					marginBottom: index === 0 ? 20 : 0,
					marginTop: index >= messages.length - 1 ? 70 : 20
				}}
				onPress={() => {}}
				onLongPress={() => {}}
			>
				<View>
					{message.senderAvatar.indexOf("https://") !== -1 ? (
						<FastImage
							source={{
								uri: message.senderAvatar
							}}
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
							&nbsp;&nbsp;{formatMessageDate(message.sentTimestamp, lang)}
						</Text>
					</Text>
					<Text
						style={{
							width: "80%",
							height: "auto",
							color: getColor(darkMode, "textPrimary"),
							fontSize: 15,
							marginTop: 5
						}}
					>
						{message.message}
					</Text>
				</View>
			</TouchableOpacity>
		)
	}
)

export default Message
