import React, { useState, memo, useCallback, useMemo, useEffect, useRef } from "react"
import { View, Text, TouchableOpacity, useWindowDimensions, AppState, ActivityIndicator, RefreshControl } from "react-native"
import { getColor } from "../../style"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { NavigationContainerRef, useIsFocused, StackActions } from "@react-navigation/native"
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
	chatConversations
} from "../../lib/api"
import { SocketEvent } from "../../lib/services/socket"
import { i18n } from "../../i18n"
import useLang from "../../lib/hooks/useLang"
import { useMMKVNumber } from "react-native-mmkv"
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
	getUserNameFromReplyTo
} from "./utils"
import { dbFs } from "../../lib/db"
import useNetworkInfo from "../../lib/services/isOnline/useNetworkInfo"
import { TopBar } from "../../components/TopBar"
import striptags from "striptags"
import { navigationAnimation } from "../../lib/state"

const ITEM_HEIGHT = 61
const AVATAR_HEIGHT = 36

const Item = memo(
	({
		darkMode,
		conversation,
		index,
		conversations,
		userId,
		lang,
		unreadConversationsMessages,
		navigation
	}: {
		darkMode: boolean
		conversation: ChatConversation
		index: number
		conversations: ChatConversation[]
		userId: number
		lang: string
		unreadConversationsMessages: Record<string, number>
		navigation: NavigationContainerRef<ReactNavigation.RootParamList>
	}) => {
		const conversationParticipantsFilteredWithoutMe = useMemo(() => {
			const filtered = conversation.participants.filter(participant => participant.userId !== userId)

			return (conversation.participants.length <= 1 ? conversation.participants : filtered).sort((a, b) =>
				a.email.localeCompare(b.email)
			)
		}, [conversation.participants, userId])

		const youOrElse = useMemo(() => {
			if (conversation.lastMessageSender === userId) {
				return i18n(lang, "chatYou") + ": "
			} else {
				const senderFromList = conversationParticipantsFilteredWithoutMe.filter(
					participant => participant.userId === conversation.lastMessageSender
				)

				if (senderFromList.length === 1) {
					return getUserNameFromParticipant(senderFromList[0]) + ": "
				} else {
					return ""
				}
			}
		}, [lang, conversationParticipantsFilteredWithoutMe, conversation, userId])

		return (
			<TouchableOpacity
				activeOpacity={0.5}
				style={{
					flexDirection: "row",
					paddingLeft: 15,
					paddingRight: 15,
					height: ITEM_HEIGHT,
					marginBottom: index >= conversations.length - 1 ? ITEM_HEIGHT : 0
				}}
				onPress={async () => {
					await navigationAnimation({ enable: true })

					navigation.dispatch(
						StackActions.push("ChatScreen", {
							conversation
						})
					)
				}}
				onLongPress={() => {
					eventListener.emit("openChatActionSheet", { conversation })
				}}
			>
				<View
					style={{
						height: "100%",
						alignItems: "center",
						flexDirection: "row"
					}}
				>
					<View
						style={{
							width: AVATAR_HEIGHT,
							height: AVATAR_HEIGHT,
							borderRadius: AVATAR_HEIGHT,
							backgroundColor: generateAvatarColorCode(conversation.uuid, darkMode),
							flexDirection: "column",
							alignItems: "center",
							justifyContent: "center"
						}}
					>
						{typeof unreadConversationsMessages[conversation.uuid] === "number" &&
							unreadConversationsMessages[conversation.uuid] > 0 && (
								<View
									style={{
										backgroundColor: getColor(darkMode, "red"),
										width: 18,
										height: 18,
										borderRadius: 18,
										flexDirection: "row",
										alignItems: "center",
										justifyContent: "center",
										position: "absolute",
										left: AVATAR_HEIGHT / 2 + 3,
										top: AVATAR_HEIGHT / 2 + 3
									}}
								>
									<Text
										style={{
											color: "white",
											fontWeight: "bold",
											fontSize: 12
										}}
									>
										{unreadConversationsMessages[conversation.uuid] >= 9
											? 9
											: unreadConversationsMessages[conversation.uuid]}
									</Text>
								</View>
							)}
						<Text
							style={{
								color: "white",
								fontWeight: "bold",
								fontSize: 20
							}}
						>
							{conversation.uuid.slice(0, 1).toUpperCase()}
						</Text>
					</View>
				</View>
				<View
					style={{
						height: "100%",
						borderBottomColor: getColor(darkMode, "primaryBorder"),
						borderBottomWidth: index >= conversations.length - 1 && conversations.length > 1 ? 0 : 0.5,
						flexDirection: "row",
						marginLeft: 13,
						width: "100%",
						alignItems: "center"
					}}
				>
					<View
						style={{
							flexDirection: "column",
							width: "85%",
							height: "100%",
							justifyContent: "center"
						}}
					>
						<Text
							style={{
								color: getColor(darkMode, "textPrimary"),
								fontSize: 16,
								maxWidth: "100%"
							}}
							numberOfLines={1}
						>
							{typeof conversation.name === "string" && conversation.name.length > 0
								? conversation.name
								: conversationParticipantsFilteredWithoutMe
										.map(participant => striptags(getUserNameFromParticipant(participant)))
										.join(", ")}
						</Text>
						{typeof conversation.lastMessage === "string" && conversation.lastMessage.length > 0 && (
							<Text
								style={{
									color: getColor(darkMode, "textSecondary"),
									fontSize: 13,
									maxWidth: "100%",
									marginTop: 4
								}}
								numberOfLines={1}
							>
								<Text>
									{typeof conversation.lastMessage !== "string" || conversation.lastMessage.length === 0 ? (
										<>&nbsp;</>
									) : (
										youOrElse
									)}
								</Text>
								<Text>{conversation.lastMessage}</Text>
							</Text>
						)}
					</View>
				</View>
			</TouchableOpacity>
		)
	}
)

const ChatsScreen = memo(({ navigation, route }: { navigation: NavigationContainerRef<ReactNavigation.RootParamList>; route: any }) => {
	const darkMode = useDarkMode()
	const lang = useLang()
	const [userId] = useMMKVNumber("userId", storage)
	const [loadDone, setLoadDone] = useState<boolean>(false)
	const [refreshing, setRefreshing] = useState<boolean>(false)
	const dimensions = useWindowDimensions()
	const [conversations, setConversations] = useState<ChatConversation[]>([])
	const [searchTerm, setSearchTerm] = useState<string>("")
	const networkInfo = useNetworkInfo()
	const [unreadConversationsMessages, setUnreadConversationsMessages] = useState<Record<string, number>>({})
	const isFocused = useIsFocused()
	const conversationsRef = useRef<ChatConversation[]>(conversations)

	const conversationsSorted = useMemo(() => {
		return sortAndFilterConversations(conversations, searchTerm, userId)
	}, [conversations, searchTerm, userId])

	const loadConversations = useCallback(
		async (skipCache: boolean = false) => {
			try {
				if (skipCache && !networkInfo.online) {
					return
				}

				const cache = await dbFs.get<ReturnType<typeof fetchChatConversations>>("chatConversations")
				const hasCache = cache && cache.conversations && Array.isArray(cache.conversations)

				if (hasCache) {
					setLoadDone(false)
					setConversations([])
				}

				const result = await fetchChatConversations(skipCache)

				setConversations(result.conversations)

				if (result.cache) {
					loadConversations(true)
				}

				const promises: Promise<void>[] = []
				const semaphore = new Semaphore(32)

				for (const conversation of result.conversations) {
					promises.push(
						new Promise<void>(async resolve => {
							await semaphore.acquire()

							try {
								const unreadResult = await chatConversationsUnread(conversation.uuid)

								setUnreadConversationsMessages(prev => ({
									...prev,
									[conversation.uuid]: unreadResult
								}))
							} catch (e) {
								console.error(e)
							} finally {
								semaphore.release()

								resolve()
							}
						})
					)
				}

				Promise.all(promises).catch(console.error)
			} catch (e) {
				console.error(e)
			} finally {
				setLoadDone(true)
			}
		},
		[networkInfo]
	)

	const keyExtractor = useCallback((item: ChatConversation) => item.uuid, [])

	const renderItem = useCallback(
		({ item, index }: { item: ChatConversation; index: number }) => {
			return (
				<Item
					darkMode={darkMode}
					conversation={item}
					conversations={conversations}
					userId={userId}
					lang={lang}
					index={index}
					unreadConversationsMessages={unreadConversationsMessages}
					navigation={navigation}
				/>
			)
		},
		[darkMode, conversations, lang, userId, unreadConversationsMessages, navigation]
	)

	useEffect(() => {
		if (isFocused) {
			loadConversations(true)
		}
	}, [isFocused])

	useEffect(() => {
		conversationsRef.current = conversations
	}, [conversations])

	useEffect(() => {
		loadConversations()

		const appStateChangeListener = AppState.addEventListener("change", nextAppState => {
			if (nextAppState === "active") {
				loadConversations(true)
			}
		})

		const socketEventListener = eventListener.on("socketEvent", async (event: SocketEvent) => {
			if (event.type === "chatMessageNew") {
				if (event.data.senderId !== userId) {
					setUnreadConversationsMessages(prev => ({
						...prev,
						[event.data.conversation]: typeof prev[event.data.conversation] !== "number" ? 1 : prev[event.data.conversation] + 1
					}))
				}

				if (conversationsRef.current) {
					const privateKey = storage.getString("privateKey")
					const convo = conversationsRef.current.filter(c => c.uuid === event.data.conversation)

					if (convo.length !== 1) {
						return
					}

					const metadata = convo[0].participants.filter(p => p.userId === userId)

					if (metadata.length !== 1) {
						return
					}

					const messageDecrypted = await decryptChatMessage(event.data.message, metadata[0].metadata, privateKey)

					if (messageDecrypted.length === 0) {
						return
					}

					setConversations(prev =>
						prev.map(conversation =>
							conversation.uuid === event.data.conversation
								? {
										...conversation,
										lastMessage: messageDecrypted,
										lastMessageSender: event.data.senderId,
										lastMessageTimestamp: event.data.sentTimestamp
								  }
								: conversation
						)
					)
				}
			} else if (event.type === "chatConversationsNew") {
				loadConversations(true)
			} else if (event.type === "chatConversationDeleted") {
				setConversations(prev => prev.filter(c => c.uuid !== event.data.uuid))

				loadConversations(true)
			} else if (event.type === "chatConversationParticipantLeft") {
				if (event.data.userId === userId) {
					setConversations(prev => prev.filter(c => c.uuid !== event.data.uuid))

					loadConversations(true)
				} else {
					setConversations(prev =>
						prev.map(c =>
							c.uuid === event.data.uuid
								? { ...c, participants: c.participants.filter(p => p.userId !== event.data.userId) }
								: c
						)
					)
				}
			} else if (event.type === "chatMessageDelete") {
				loadConversations(true)
			} else if (event.type === "chatConversationNameEdited") {
				if (event.data.name.length === 0) {
					setConversations(prev =>
						prev.map(conversation =>
							conversation.uuid === event.data.uuid
								? {
										...conversation,
										name: ""
								  }
								: conversation
						)
					)

					return
				}

				if (conversationsRef.current) {
					const privateKey = storage.getString("privateKey")
					const convo = conversationsRef.current.filter(c => c.uuid === event.data.uuid)

					if (convo.length !== 1) {
						return
					}

					const metadata = convo[0].participants.filter(p => p.userId === userId)

					if (metadata.length !== 1) {
						return
					}

					const nameDecrypted = await decryptChatConversationName(event.data.name, metadata[0].metadata, privateKey)

					if (nameDecrypted.length === 0) {
						setConversations(prev =>
							prev.map(conversation =>
								conversation.uuid === event.data.uuid
									? {
											...conversation,
											name: ""
									  }
									: conversation
							)
						)

						return
					}

					setConversations(prev =>
						prev.map(conversation =>
							conversation.uuid === event.data.uuid
								? {
										...conversation,
										name: nameDecrypted
								  }
								: conversation
						)
					)
				}
			}
		})

		const updateChatConversationsListener = eventListener.on("updateChatConversations", () => {
			loadConversations(true)
		})

		const socketAuthedListener = eventListener.on("socketAuthed", () => {
			loadConversations(true)
		})

		return () => {
			appStateChangeListener.remove()
			socketEventListener.remove()
			updateChatConversationsListener.remove()
			socketAuthedListener.remove()
		}
	}, [userId])

	return (
		<View
			style={{
				height: "100%",
				width: "100%",
				backgroundColor: getColor(darkMode, "backgroundPrimary")
			}}
		>
			<TopBar
				navigation={navigation}
				route={route}
				setLoadDone={setLoadDone}
				searchTerm={searchTerm}
				setSearchTerm={setSearchTerm}
				rightComponent={
					<TouchableOpacity
						hitSlop={{
							top: 15,
							bottom: 15,
							right: 15,
							left: 15
						}}
						style={{
							alignItems: "flex-end",
							flexDirection: "row",
							backgroundColor: "transparent",
							width: "33%",
							paddingLeft: 0,
							justifyContent: "flex-end"
						}}
						onPress={() => {}}
					>
						<Ionicon
							name="add-outline"
							size={26}
							color={getColor(darkMode, "linkPrimary")}
						/>
					</TouchableOpacity>
				}
			/>
			<View
				style={{
					height: "100%",
					width: "100%",
					marginTop: 50
				}}
			>
				<FlashList
					data={conversationsSorted}
					renderItem={renderItem}
					keyExtractor={keyExtractor}
					estimatedItemSize={ITEM_HEIGHT}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={async () => {
								if (!loadDone || !networkInfo.online) {
									return
								}

								setRefreshing(true)

								await new Promise(resolve => setTimeout(resolve, 500))
								await loadConversations(true).catch(console.error)

								setRefreshing(false)
							}}
							tintColor={getColor(darkMode, "textPrimary")}
						/>
					}
					ListEmptyComponent={
						<>
							{!loadDone || refreshing ? (
								<>
									{!loadDone && (
										<View
											style={{
												flexDirection: "column",
												justifyContent: "center",
												alignItems: "center",
												width: "100%",
												marginTop: Math.floor(dimensions.height / 2) - 200
											}}
										>
											<ActivityIndicator
												size="small"
												color={getColor(darkMode, "textPrimary")}
											/>
										</View>
									)}
								</>
							) : searchTerm.length > 0 ? (
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
										name="search-outline"
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
										{i18n(lang, "nothingFoundFor", true, ["__TERM__"], [searchTerm])}
									</Text>
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
			</View>
		</View>
	)
})

export default ChatsScreen
