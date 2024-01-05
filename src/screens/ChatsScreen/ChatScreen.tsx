import React, { useState, memo, useCallback, useMemo, useEffect, useRef } from "react"
import {
	View,
	Text,
	TouchableOpacity,
	useWindowDimensions,
	AppState,
	ActivityIndicator,
	KeyboardAvoidingView,
	NativeSyntheticEvent,
	NativeScrollEvent,
	Platform
} from "react-native"
import { getColor, blurhashes } from "../../style"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { NavigationContainerRef, useIsFocused, StackActions, CommonActions } from "@react-navigation/native"
import {
	ChatConversation,
	ChatConversationParticipant,
	ChatMessage,
	getChatLastFocus,
	BlockedContact,
	contactsBlocked,
	chatConversationsRead,
	updateChatLastFocus
} from "../../lib/api"
import { SocketEvent } from "../../lib/services/socket"
import { fetchChatConversations } from "./utils"
import useLang from "../../lib/hooks/useLang"
import { useMMKVNumber } from "react-native-mmkv"
import storage from "../../lib/storage"
import { generateAvatarColorCode, Semaphore, SemaphoreInterface } from "../../lib/helpers"
import eventListener from "../../lib/eventListener"
import Ionicon from "@expo/vector-icons/Ionicons"
import { FlashList } from "@shopify/flash-list"
import { Image } from "expo-image"
import { decryptChatMessage } from "../../lib/crypto"
import { getUserNameFromParticipant, fetchChatMessages } from "./utils"
import { dbFs } from "../../lib/db"
import useNetworkInfo from "../../lib/services/isOnline/useNetworkInfo"
import Message from "./Message"
import useIsPortrait from "../../lib/hooks/useIsPortrait"
import TopbarUnread from "./TopbarUnread"
import striptags from "striptags"
import Input from "./Input"
import useKeyboardOffset from "../../lib/hooks/useKeyboardOffset"
import { ChatInfo } from "./Message"
import { navigationAnimation } from "../../lib/state"

const ChatScreen = memo(({ navigation, route }: { navigation: NavigationContainerRef<ReactNavigation.RootParamList>; route: any }) => {
	const darkMode = useDarkMode()
	const lang = useLang()
	const [userId] = useMMKVNumber("userId", storage)
	const [loading, setLoading] = useState<boolean>(true)
	const dimensions = useWindowDimensions()
	const networkInfo = useNetworkInfo()
	const isFocused = useIsFocused()
	const [messages, setMessages] = useState<ChatMessage[]>([])
	const [atBottom, setAtBottom] = useState<boolean>(true)
	const [conversation, setConversation] = useState<ChatConversation>(route.params.conversation)
	const conversationMe = useRef<ChatConversationParticipant>(conversation.participants.filter(p => p.userId === userId)[0]).current
	const lastFocusTimestampRef = useRef<string>("")
	const [failedMessages, setFailedMessages] = useState<string[]>([])
	const [replyMessageUUID, setReplyMessageUUID] = useState<string>("")
	const [editingMessageUUID, setEditingMessageUUID] = useState<string>("")
	const [lastFocusTimestamp, setLastFocusTimestamp] = useState<Record<string, number>>({})
	const [conversationTitle, setConversationTitle] = useState<string>("")
	const lastLoadPreviousMessagesTimestamp = useRef<number>(0)
	const isPortrait = useIsPortrait()
	const atBottomRef = useRef<boolean>(atBottom)
	const isFocusedRef = useRef<boolean>(isFocused)
	const [blockedContacts, setBlockedContacts] = useState<BlockedContact[]>([])
	const markNotificationsAsReadMutex = useRef<SemaphoreInterface>(new Semaphore(1)).current
	const markNotificationsAsReadLastMessageRef = useRef<string>("")
	const updateLastFocusMutex = useRef<SemaphoreInterface>(new Semaphore(1)).current
	const didInitialLoad = useRef<boolean>(false)
	const keyboardOffset = useKeyboardOffset()
	const [showScrollDownButton, setShowScrollDownButton] = useState<boolean>(false)
	const listRef = useRef<FlashList<ChatMessage>>()
	const canLoadPreviousMessages = useRef<boolean>(true)

	const conversationParticipantsFilteredWithoutMe = useMemo(() => {
		const filtered = conversation.participants.filter(participant => participant.userId !== userId)

		return (conversation.participants.length <= 1 ? conversation.participants : filtered).sort((a, b) => a.email.localeCompare(b.email))
	}, [conversation.participants, userId])

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

	const onEndReached = useCallback(async () => {
		if (sortedMessages.length === 0) {
			return
		}

		const firstMessage = sortedMessages[sortedMessages.length - 1]

		if (!firstMessage || !canLoadPreviousMessages.current) {
			return
		}

		canLoadPreviousMessages.current = false

		try {
			await loadPreviousMessages(firstMessage.sentTimestamp)
		} catch (e) {
			console.error(e)
		} finally {
			canLoadPreviousMessages.current = true
		}
	}, [sortedMessages])

	const onScroll = useCallback(
		(event: NativeSyntheticEvent<NativeScrollEvent>) => {
			setAtBottom(event.nativeEvent.contentOffset.y <= 100)
			setShowScrollDownButton(event.nativeEvent.contentOffset.y >= (isPortrait ? dimensions.height * 1.5 : 1000))
		},
		[dimensions, isPortrait]
	)

	const fetchBlockedContacts = useCallback(async () => {
		try {
			const res = await contactsBlocked()

			setBlockedContacts(res)
		} catch (e) {
			console.error(e)
		}
	}, [])

	const loadConversation = useCallback(async () => {
		try {
			if (!networkInfo.online) {
				return
			}

			const result = await fetchChatConversations(true)
			const convos = result.conversations.filter(c => c.uuid === conversation.uuid)

			if (convos.length > 0) {
				setConversation(convos[0])
			}
		} catch (e) {
			console.error(e)
		}
	}, [networkInfo, conversation])

	const loadPreviousMessages = useCallback(
		async (lastTimestamp: number) => {
			if (lastLoadPreviousMessagesTimestamp.current === lastTimestamp) {
				return
			}

			lastLoadPreviousMessagesTimestamp.current = lastTimestamp

			try {
				const result = await fetchChatMessages(conversation.uuid, conversationMe.metadata, lastTimestamp, true, false)

				setMessages(prev => [...result.messages, ...prev])
			} catch (e) {
				console.error(e)

				lastLoadPreviousMessagesTimestamp.current = 0
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

	const initLastFocus = useCallback(async () => {
		try {
			const res = await getChatLastFocus()

			if (res.length > 0) {
				setLastFocusTimestamp(res.reduce((prev, current) => ({ ...prev, [current.uuid]: current.lastFocus }), {}))
			}
		} catch (e) {
			console.error(e)
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
					blockedContacts={blockedContacts}
					failedMessages={failedMessages}
					prevMessage={sortedMessages[index + 1]}
					nextMessage={sortedMessages[index - 1]}
					lastFocusTimestamp={lastFocusTimestamp}
					setLastFocusTimestamp={setLastFocusTimestamp}
					editingMessageUUID={editingMessageUUID}
					replyMessageUUID={replyMessageUUID}
				/>
			)
		},
		[
			darkMode,
			userId,
			sortedMessages,
			lang,
			conversation,
			blockedContacts,
			failedMessages,
			lastFocusTimestamp,
			setLastFocusTimestamp,
			editingMessageUUID,
			replyMessageUUID
		]
	)

	const markNotificationsAsRead = useCallback(async (convo: string) => {
		try {
			await chatConversationsRead(convo)

			eventListener.emit("chatConversationRead", { uuid: convo, count: 0 })
		} catch (e) {
			console.error(e)
		}
	}, [])

	useEffect(() => {
		;(async () => {
			await markNotificationsAsReadMutex.acquire()

			if (
				messages.length > 0 &&
				markNotificationsAsReadLastMessageRef.current !== messages[messages.length - 1].uuid &&
				isFocused &&
				atBottom
			) {
				try {
					await markNotificationsAsRead(conversation.uuid)

					markNotificationsAsReadLastMessageRef.current = messages[messages.length - 1].uuid
				} catch (e) {
					console.error(e)
				}
			}

			markNotificationsAsReadMutex.release()
		})()
	}, [messages, atBottom, isFocused, conversation, userId])

	useEffect(() => {
		if (typeof lastFocusTimestamp !== "undefined") {
			const convoUUID = conversation.uuid
			const currentLastFocus = lastFocusTimestamp[convoUUID]

			if (typeof currentLastFocus === "number") {
				const current = JSON.stringify(currentLastFocus)

				if (current !== lastFocusTimestampRef.current) {
					lastFocusTimestampRef.current = current
					;(async () => {
						await updateLastFocusMutex.acquire()

						try {
							await updateChatLastFocus([
								{
									uuid: convoUUID,
									lastFocus: currentLastFocus
								}
							])
						} catch (e) {
							console.error(e)
						}

						updateLastFocusMutex.release()
					})()
				}
			}
		}
	}, [JSON.stringify(lastFocusTimestamp), conversation])

	useEffect(() => {
		if (isFocused) {
			loadMessages(true)
			fetchBlockedContacts()
			loadConversation()
		}
	}, [isFocused])

	useEffect(() => {
		if (sortedMessages.length > 0) {
			dbFs.set(
				"chatMessages:" + sortedMessages[0].conversation,
				sortedMessages.filter(message => !failedMessages.includes(message.uuid))
			).catch(console.error)
		}
	}, [JSON.stringify(sortedMessages), failedMessages])

	useEffect(() => {
		atBottomRef.current = atBottom
		isFocusedRef.current = isFocused
	}, [atBottom, isFocused])

	useEffect(() => {
		if (!didInitialLoad.current) {
			didInitialLoad.current = true

			loadMessages()
			initLastFocus()
			fetchBlockedContacts()
			loadConversation()
		}

		const appStateChangeListener = AppState.addEventListener("change", nextAppState => {
			if (nextAppState === "active") {
				loadMessages(true)
				fetchBlockedContacts()
				loadConversation()
			}
		})

		const socketAuthedListener = eventListener.on("socketAuthed", () => {
			loadMessages(true)
			fetchBlockedContacts()
			loadConversation()
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
			} else if (event.type === "chatConversationParticipantNew") {
				if (event.data.conversation === conversation.uuid) {
					loadConversation()
				}
			} else if (event.type === "chatConversationDeleted") {
				if (event.data.uuid === conversation.uuid) {
					navigation.dispatch(
						CommonActions.reset({
							index: 0,
							routes: [
								{
									name: "ChatsScreen"
								}
							]
						})
					)
				}
			} else if (event.type === "chatConversationParticipantLeft") {
				if (event.data.uuid === conversation.uuid) {
					loadConversation()
				}
			} else if (event.type === "chatConversationNameEdited") {
				if (event.data.uuid === conversation.uuid) {
					loadConversation()
				}
			}
		})

		const chatMessageDeleteListener = eventListener.on("chatMessageDelete", (uuid: string) => {
			setMessages(prev => prev.filter(message => message.uuid !== uuid))
		})

		const chatMessageEmbedDisabledListener = eventListener.on("chatMessageEmbedDisabled", (uuid: string) => {
			setMessages(prev => prev.map(message => (message.uuid === uuid ? { ...message, embedDisabled: true } : message)))
		})

		const chatConversationParticipantRemovedListener = eventListener.on(
			"chatConversationParticipantRemoved",
			({ uuid, userId }: { uuid: string; userId: number }) => {
				if (uuid === conversation.uuid) {
					setConversation(prev => ({ ...prev, participants: prev.participants.filter(p => p.userId !== userId) }))

					loadConversation()
				}
			}
		)

		const chatConversationParticipantAdded = eventListener.on("chatConversationParticipantAdded", ({ uuid }: { uuid: string }) => {
			if (uuid === conversation.uuid) {
				loadConversation()
			}
		})

		const chatConversationNameEditedListener = eventListener.on("chatConversationNameEdited", ({ uuid }: { uuid: string }) => {
			if (uuid === conversation.uuid) {
				loadConversation()
			}
		})

		return () => {
			appStateChangeListener.remove()
			socketAuthedListener.remove()
			chatMessageDeleteListener.remove()
			chatMessageEmbedDisabledListener.remove()
			socketEventListener.remove()
			chatConversationParticipantRemovedListener.remove()
			chatConversationParticipantAdded.remove()
			chatConversationNameEditedListener.remove()
		}
	}, [userId, conversation, conversationMe])

	const RootView = Platform.OS === "android" ? View : KeyboardAvoidingView

	return (
		<RootView
			behavior={Platform.OS === "android" ? undefined : "padding"}
			keyboardVerticalOffset={keyboardOffset}
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
					justifyContent: "space-between",
					paddingLeft: 15,
					paddingRight: 15
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
								marginRight: 8
							}}
						/>
					</TouchableOpacity>
					{conversationParticipantsFilteredWithoutMe.length > 1 ? (
						<View
							style={{
								width: 30,
								height: 30,
								borderRadius: 30,
								backgroundColor: generateAvatarColorCode(
									conversation.participants.length + "@" + conversation.uuid,
									darkMode
								),
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
								{getUserNameFromParticipant(conversationParticipantsFilteredWithoutMe[0]).slice(0, 1).toUpperCase()}
							</Text>
						</View>
					) : typeof conversationParticipantsFilteredWithoutMe[0].avatar === "string" &&
					  conversationParticipantsFilteredWithoutMe[0].avatar.indexOf("https://") !== -1 ? (
						<Image
							source={{
								uri: conversationParticipantsFilteredWithoutMe[0].avatar
							}}
							cachePolicy="memory-disk"
							placeholder={darkMode ? blurhashes.dark.backgroundSecondary : blurhashes.light.backgroundSecondary}
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
								backgroundColor: generateAvatarColorCode(
									getUserNameFromParticipant(conversationParticipantsFilteredWithoutMe[0]),
									darkMode
								),
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
								{getUserNameFromParticipant(conversationParticipantsFilteredWithoutMe[0]).slice(0, 1).toUpperCase()}
							</Text>
						</View>
					)}
					<TouchableOpacity
						onPress={() => {
							if (userId === conversation.ownerId) {
								eventListener.emit("openChatConversationNameDialog", conversation)
							}
						}}
					>
						<Text
							numberOfLines={1}
							style={{
								color: getColor(darkMode, "textPrimary"),
								fontWeight: "500",
								fontSize: 18,
								marginLeft: 10
							}}
						>
							{conversationTitle.length > 0
								? conversationTitle
								: typeof conversation.name === "string" && conversation.name.length > 0
								? conversation.name
								: conversationParticipantsFilteredWithoutMe.length > 0
								? conversationParticipantsFilteredWithoutMe
										.map(user => striptags(getUserNameFromParticipant(user)))
										.join(", ")
								: conversation.participants.map(user => striptags(getUserNameFromParticipant(user))).join(", ")}
						</Text>
					</TouchableOpacity>
				</View>
				<View
					style={{
						width: "20%",
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "flex-end",
						paddingRight: 5
					}}
				>
					<TouchableOpacity
						hitSlop={{
							top: 15,
							bottom: 15,
							left: 15,
							right: 15
						}}
						onPress={async () => {
							await navigationAnimation({ enable: true })

							navigation.dispatch(
								StackActions.push("ChatParticipantsScreen", {
									conversation
								})
							)
						}}
					>
						<Ionicon
							name="people-outline"
							size={22}
							color={getColor(darkMode, "linkPrimary")}
						/>
					</TouchableOpacity>
				</View>
			</View>
			<TopbarUnread
				darkMode={darkMode}
				conversation={conversation}
				messages={messages}
				lastFocusTimestamp={lastFocusTimestamp}
				setLastFocusTimestamp={setLastFocusTimestamp}
				userId={userId}
				lang={lang}
			/>
			<FlashList
				ref={listRef}
				key={"messages-" + isPortrait}
				data={sortedMessages}
				renderItem={renderItem}
				keyExtractor={keyExtractor}
				estimatedItemSize={50}
				inverted={true}
				onEndReached={onEndReached}
				onEndReachedThreshold={0.2}
				extraData={{
					darkMode,
					userId,
					sortedMessages,
					lang,
					conversation,
					blockedContacts,
					failedMessages,
					lastFocusTimestamp,
					setLastFocusTimestamp,
					editingMessageUUID,
					replyMessageUUID
				}}
				onScroll={onScroll}
				ListEmptyComponent={
					<View
						style={{
							transform: [{ rotateX: "180deg" }],
							flexDirection: "column",
							justifyContent: "center",
							alignItems: "center",
							width: "100%",
							height: "100%"
						}}
					>
						{loading ? (
							<View
								style={{
									flexDirection: "column",
									justifyContent: "center",
									alignItems: "center",
									width: "100%",
									marginBottom: Math.floor(dimensions.height / 2) - 50
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
									width: "100%",
									height: "100%",
									paddingBottom: 30
								}}
							>
								<ChatInfo
									darkMode={darkMode}
									lang={lang}
								/>
							</View>
						)}
					</View>
				}
			/>
			{showScrollDownButton && (
				<TouchableOpacity
					style={{
						backgroundColor: getColor(darkMode, "backgroundSecondary"),
						width: 36,
						height: 36,
						borderRadius: 36,
						position: "absolute",
						bottom: 70,
						right: 15,
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center"
					}}
					onPress={() => {
						listRef?.current?.scrollToOffset({ animated: true, offset: 0 })
					}}
				>
					<Ionicon
						name="chevron-down-outline"
						color={getColor(darkMode, "textPrimary")}
						size={22}
					/>
				</TouchableOpacity>
			)}
			<Input
				darkMode={darkMode}
				lang={lang}
				conversation={conversation}
				setFailedMessages={setFailedMessages}
				setMessages={setMessages}
				conversationMe={conversationMe}
				setEditingMessageUUID={setEditingMessageUUID}
				setReplyMessageUUID={setReplyMessageUUID}
			/>
		</RootView>
	)
})

export default ChatScreen
