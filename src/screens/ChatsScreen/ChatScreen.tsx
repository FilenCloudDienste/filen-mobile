import React, { useState, memo, useCallback, useMemo, useEffect, useRef } from "react"
import {
	View,
	Text,
	TouchableOpacity,
	useWindowDimensions,
	AppState,
	ActivityIndicator,
	RefreshControl,
	TextInput,
	KeyboardAvoidingView
} from "react-native"
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
	formatTime
} from "./utils"
import { dbFs } from "../../lib/db"
import useNetworkInfo from "../../lib/services/isOnline/useNetworkInfo"
import { TopBar } from "../../components/TopBar"
import striptags from "striptags"
import DefaultTopBar from "../../components/TopBar/DefaultTopBar"
import Message from "./Message"
import useIsPortrait from "../../lib/hooks/useIsPortrait"

const ChatScreen = memo(({ navigation, route }: { navigation: NavigationContainerRef<ReactNavigation.RootParamList>; route: any }) => {
	const darkMode = useDarkMode()
	const lang = useLang()
	const [userId] = useMMKVNumber("userId", storage)
	const [loading, setLoading] = useState<boolean>(true)
	const dimensions = useWindowDimensions()
	const networkInfo = useNetworkInfo()
	const [unreadConversationsMessages, setUnreadConversationsMessages] = useState<Record<string, number>>({})
	const isFocused = useIsFocused()
	const [messages, setMessages] = useState<ChatMessage[]>([])
	const [atBottom, setAtBottom] = useState<boolean>(true)
	const conversation = useRef<ChatConversation>(route.params.conversation).current
	const conversationMe = useRef<ChatConversationParticipant>(conversation.participants.filter(p => p.userId === userId)[0]).current
	const lastFocusTimestampRef = useRef<string>("")
	const [lastFocusInitDone, setLastFocusInitDone] = useState<boolean>(false)
	const [failedMessages, setFailedMessages] = useState<string[]>([])
	const [displayMessageAs, setDisplayMessageAs] = useState<DisplayMessageAs>({})
	const [replyMessageUUID, setReplyMessageUUID] = useState<string>("")
	const [lastFocusTimestamp, setLastFocusTimestamp] = useState<Record<string, number>>({})
	const [conversationTitle, setConversationTitle] = useState<string>("ye")
	const [loadingPreviousMessages, setLoadingPreviousMessages] = useState<boolean>(false)
	const lastLoadPreviousMessagesTimestamp = useRef<number>(0)
	const isPortrait = useIsPortrait()
	const atBottomRef = useRef<boolean>(atBottom)
	const isFocusedRef = useRef<boolean>(isFocused)

	const sortedMessages = useMemo(() => {
		const exists: Record<string, boolean> = {}

		return messages
			.sort((a, b) => b.sentTimestamp - a.sentTimestamp)
			.filter(message => {
				if (!exists[message.uuid]) {
					exists[message.uuid] = true

					return true
				}

				return false
			})
	}, [messages])

	const onEndReached = useCallback(() => {
		if (sortedMessages.length === 0) {
			return
		}

		const firstMessage = sortedMessages[sortedMessages.length - 1]

		if (!firstMessage) {
			return
		}

		loadPreviousMessages(firstMessage.sentTimestamp)
	}, [sortedMessages])

	const loadPreviousMessages = useCallback(
		async (lastTimestamp: number) => {
			if (lastLoadPreviousMessagesTimestamp.current === lastTimestamp) {
				return
			}

			lastLoadPreviousMessagesTimestamp.current = lastTimestamp

			setLoadingPreviousMessages(true)

			try {
				const result = await fetchChatMessages(conversation.uuid, conversationMe.metadata, lastTimestamp, true, false)

				setMessages(prev => [...result.messages, ...prev])
			} catch (e) {
				console.error(e)

				lastLoadPreviousMessagesTimestamp.current = 0
			} finally {
				setLoadingPreviousMessages(false)
			}
		},
		[conversation, conversationMe]
	)

	const loadMessages = useCallback(
		async (skipCache: boolean = false) => {
			try {
				if (skipCache && !networkInfo.online) {
					return
				}

				const cache = await dbFs.get("chatMessages:" + conversation.uuid)
				const hasCache = cache && Array.isArray(cache)

				if (!hasCache) {
					setLoading(true)
					setMessages([])
				}

				const result = await fetchChatMessages(conversation.uuid, conversationMe.metadata, Date.now() + 3600000, skipCache, true)

				setMessages(result.messages)

				if (result.cache) {
					loadMessages(true)
				}
			} catch (e) {
				console.error(e)
			} finally {
				setLoading(false)
			}
		},
		[networkInfo, conversation, conversationMe]
	)

	const fetchLastFocus = useCallback(async () => {
		try {
			const res = await getChatLastFocus()

			if (res.length > 0) {
				setLastFocusTimestamp(res.reduce((prev, current) => ({ ...prev, [current.uuid]: current.lastFocus }), {}))
			}
		} catch (e) {
			console.error(e)
		}
	}, [])

	const initLastFocus = useCallback(async () => {
		setLastFocusInitDone(false)

		try {
			const res = await getChatLastFocus()

			if (res.length > 0) {
				setLastFocusTimestamp(res.reduce((prev, current) => ({ ...prev, [current.uuid]: current.lastFocus }), {}))
			}
		} catch (e) {
			console.error(e)
		} finally {
			setLastFocusInitDone(true)
		}
	}, [])

	const keyExtractor = useCallback((item: ChatMessage) => item.uuid, [])

	const renderItem = useCallback(
		({ item, index }: { item: ChatMessage; index: number }) => {
			return (
				<Message
					darkMode={darkMode}
					userId={userId}
					message={item}
					messages={sortedMessages}
					lang={lang}
					index={index}
					conversation={conversation}
				/>
			)
		},
		[darkMode, userId, sortedMessages, lang, conversation]
	)

	useEffect(() => {
		if (isFocused) {
			loadMessages(true)
		}
	}, [isFocused])

	useEffect(() => {
		if (sortedMessages.length > 0) {
			const failed: Record<string, boolean> = failedMessages.reduce((prev, current) => ({ ...prev, [current]: true }), {})

			dbFs.set(
				"chatMessages:" + sortedMessages[0].conversation,
				sortedMessages.filter(message => !failed[message.uuid])
			).catch(console.error)
		}
	}, [JSON.stringify(sortedMessages), failedMessages])

	useEffect(() => {
		atBottomRef.current = atBottom
		isFocusedRef.current = isFocused
	}, [atBottom, isFocused])

	useEffect(() => {
		loadMessages()
		initLastFocus()

		const appStateChangeListener = AppState.addEventListener("change", nextAppState => {
			if (nextAppState === "active") {
				loadMessages(true)
			}
		})

		const socketAuthedListener = eventListener.on("socketAuthed", () => {
			loadMessages(true)
		})

		const socketEventListener = eventListener.on("socketEvent", async (event: SocketEvent) => {
			if (event.type === "chatMessageNew" && event.data.senderId === userId && event.data.conversation === conversation.uuid) {
				setLastFocusTimestamp(prev => ({
					...prev,
					[event.data.conversation]: event.data.sentTimestamp
				}))
			}

			if (
				event.type === "chatMessageNew" &&
				event.data.senderId !== userId &&
				isFocusedRef.current &&
				atBottomRef.current &&
				event.data.conversation === conversation.uuid
			) {
				setLastFocusTimestamp(prev => ({
					...prev,
					[event.data.conversation]: event.data.sentTimestamp
				}))
			}

			if (event.type === "chatMessageNew" && event.data.senderId !== userId) {
				if (conversation.uuid !== event.data.conversation || !isFocusedRef.current || atBottomRef.current) {
					setUnreadConversationsMessages(prev => ({
						...prev,
						[event.data.conversation]: typeof prev[event.data.conversation] !== "number" ? 1 : prev[event.data.conversation] + 1
					}))
				}
			}

			if (event.type === "chatMessageNew") {
				if (!conversationMe || event.data.conversation !== conversation.uuid) {
					return
				}

				const privateKey = storage.getString("privateKey")
				const message = await decryptChatMessage(event.data.message, conversationMe.metadata, privateKey)
				const replyToMessageDecrypted =
					event.data.replyTo.uuid.length > 0 && event.data.replyTo.message.length > 0
						? await decryptChatMessage(event.data.replyTo.message, conversationMe.metadata, privateKey)
						: ""

				if (message.length > 0) {
					setMessages(prev => [
						{
							conversation: event.data.conversation,
							uuid: event.data.uuid,
							senderId: event.data.senderId,
							senderEmail: event.data.senderEmail,
							senderAvatar: event.data.senderAvatar,
							senderNickName: event.data.senderNickName,
							message,
							replyTo: {
								...event.data.replyTo,
								message: replyToMessageDecrypted
							},
							embedDisabled: event.data.embedDisabled,
							edited: false,
							editedTimestamp: 0,
							sentTimestamp: event.data.sentTimestamp
						},
						...prev.filter(message => message.uuid !== event.data.uuid)
					])
				}
			} else if (event.type === "chatMessageDelete") {
				setMessages(prev => prev.filter(message => message.uuid !== event.data.uuid))
			} else if (event.type === "chatMessageEmbedDisabled") {
				setMessages(prev => prev.map(message => (message.uuid === event.data.uuid ? { ...message, embedDisabled: true } : message)))
			} else if (event.type === "chatMessageEdited") {
				if (!conversationMe || event.data.conversation !== conversation.uuid) {
					return
				}

				const privateKey = storage.getString("privateKey")
				const message = await decryptChatMessage(event.data.message, conversationMe.metadata, privateKey)

				setMessages(prev =>
					prev.map(m =>
						m.uuid === event.data.uuid ? { ...m, message, edited: true, editedTimestamp: event.data.editedTimestamp } : m
					)
				)
			}
		})

		const chatMessageDeleteListener = eventListener.on("chatMessageDelete", (uuid: string) => {
			setMessages(prev => prev.filter(message => message.uuid !== uuid))
		})

		const chatMessageEmbedDisabledListener = eventListener.on("chatMessageEmbedDisabled", (uuid: string) => {
			setMessages(prev => prev.map(message => (message.uuid === uuid ? { ...message, embedDisabled: true } : message)))
		})

		return () => {
			appStateChangeListener.remove()
			socketAuthedListener.remove()
			chatMessageDeleteListener.remove()
			chatMessageEmbedDisabledListener.remove()
			socketEventListener.remove()
		}
	}, [userId, conversation, conversationMe])

	return (
		<KeyboardAvoidingView
			behavior="padding"
			keyboardVerticalOffset={65}
			style={{
				height: "100%",
				width: "100%",
				backgroundColor: getColor(darkMode, "backgroundPrimary")
			}}
		>
			<View
				style={{
					position: "absolute",
					flexDirection: "row",
					width: "100%",
					height: 50,
					alignItems: "center",
					borderBottomColor: getColor(darkMode, "primaryBorder"),
					borderBottomWidth: 0.5,
					backgroundColor: getColor(darkMode, "backgroundPrimary"),
					zIndex: 1001,
					justifyContent: "space-between"
				}}
			>
				<View
					style={{
						width: "80%",
						flexDirection: "row",
						alignItems: "center"
					}}
				>
					<TouchableOpacity
						hitSlop={{
							top: 15,
							bottom: 15,
							left: 15,
							right: 15
						}}
						onPress={() => navigation.goBack()}
					>
						<Ionicon
							name="chevron-back"
							size={28}
							color={getColor(darkMode, "textPrimary")}
							style={{
								flexShrink: 0,
								marginRight: 5
							}}
						/>
					</TouchableOpacity>
					{conversation.participants[0].avatar.indexOf("https://") !== -1 ? (
						<Image
							source={{
								uri: conversation.participants[0].avatar
							}}
							cachePolicy="memory-disk"
							style={{
								width: 30,
								height: 30,
								borderRadius: 30
							}}
						/>
					) : (
						<View
							style={{
								width: 30,
								height: 30,
								borderRadius: 30,
								backgroundColor: generateAvatarColorCode(conversation.participants[0].email, darkMode),
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
								{getUserNameFromParticipant(conversation.participants[0]).slice(0, 1).toUpperCase()}
							</Text>
						</View>
					)}
					<Text
						numberOfLines={1}
						style={{
							color: getColor(darkMode, "textPrimary"),
							fontWeight: "500",
							fontSize: 17,
							marginLeft: 10
						}}
					>
						{getUserNameFromParticipant(conversation.participants[0])}
					</Text>
				</View>
				<View
					style={{
						width: "20%",
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "flex-end"
					}}
				>
					<TouchableOpacity
						hitSlop={{
							top: 15,
							bottom: 15,
							left: 15,
							right: 15
						}}
					>
						<Ionicon
							name="ellipsis-horizontal-circle-outline"
							size={23}
							color={getColor(darkMode, "linkPrimary")}
						/>
					</TouchableOpacity>
				</View>
			</View>
			<FlashList
				key={"messages-" + isPortrait}
				data={sortedMessages}
				renderItem={renderItem}
				keyExtractor={keyExtractor}
				estimatedItemSize={60}
				inverted={true}
				onEndReached={onEndReached}
				ListEmptyComponent={
					<>
						{loading ? (
							<View
								style={{
									flexDirection: "column",
									justifyContent: "center",
									alignItems: "center",
									width: "100%",
									marginTop: Math.floor(dimensions.height / 2) - 100
								}}
							>
								<ActivityIndicator
									size="small"
									color={getColor(darkMode, "textPrimary")}
								/>
							</View>
						) : (
							<View
								style={{
									flexDirection: "column",
									justifyContent: "center",
									alignItems: "center",
									width: "100%",
									marginTop: Math.floor(dimensions.height / 2) - 200
								}}
							>
								<Ionicon
									name="chatbubble-outline"
									size={40}
									color={getColor(darkMode, "textSecondary")}
								/>
								<Text
									style={{
										color: getColor(darkMode, "textSecondary"),
										fontSize: 16,
										marginTop: 5
									}}
								>
									{i18n(lang, "noChatsYet")}
								</Text>
							</View>
						)}
					</>
				}
			/>
			<View
				style={{
					width: "100%",
					minHeight: 50,
					flexDirection: "row",
					alignItems: "center",
					borderTopColor: getColor(darkMode, "primaryBorder"),
					borderTopWidth: 0.5,
					paddingTop: 5,
					paddingBottom: 5
				}}
			>
				<TouchableOpacity
					style={{
						width: 35,
						height: 35,
						backgroundColor: getColor(darkMode, "backgroundSecondary"),
						borderRadius: 35,
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "center"
					}}
				>
					<Ionicon
						name="add-sharp"
						color={getColor(darkMode, "textPrimary")}
						size={24}
					/>
				</TouchableOpacity>
				<TextInput
					multiline={true}
					autoFocus={false}
					keyboardType="default"
					returnKeyType="send"
					scrollEnabled={true}
					cursorColor={getColor(darkMode, "linkPrimary")}
					style={{
						backgroundColor: getColor(darkMode, "backgroundSecondary"),
						minHeight: 35,
						maxHeight: 35 * 3,
						borderRadius: 15,
						width: "89%",
						marginLeft: 5,
						paddingLeft: 10,
						paddingRight: 10,
						paddingTop: 5,
						paddingBottom: 5,
						color: getColor(darkMode, "textPrimary"),
						fontSize: 16
					}}
				/>
			</View>
		</KeyboardAvoidingView>
	)
})

export default ChatScreen
