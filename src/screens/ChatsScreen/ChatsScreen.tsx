import React, { useState, memo, useCallback, useMemo, useEffect, useRef } from "react"
import { View, Text, TouchableOpacity, useWindowDimensions, ActivityIndicator, RefreshControl } from "react-native"
import { getColor } from "../../style"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { NavigationContainerRef, useFocusEffect, StackActions } from "@react-navigation/native"
import {
	ChatConversation,
	chatConversationsUnread,
	chatConversationsRead,
	chatConversationsCreate,
	Contact,
	getPublicKeyFromEmail,
	chatConversationsParticipantsAdd
} from "../../lib/api"
import { SocketEvent } from "../../lib/services/socket"
import { i18n } from "../../i18n"
import useLang from "../../lib/hooks/useLang"
import { useMMKVNumber } from "react-native-mmkv"
import storage, { sharedStorage } from "../../lib/storage/storage"
import { generateAvatarColorCode, Semaphore } from "../../lib/helpers"
import eventListener from "../../lib/eventListener"
import Ionicon from "@expo/vector-icons/Ionicons"
import { FlashList } from "@shopify/flash-list"
import { Image } from "expo-image"
import { decryptChatMessage, decryptChatConversationName } from "../../lib/crypto"
import { sortAndFilterConversations, fetchChatConversations, getUserNameFromParticipant, ReplaceInlineMessageWithComponents } from "./utils"
import { dbFs } from "../../lib/db"
import useNetworkInfo from "../../lib/services/isOnline/useNetworkInfo"
import { TopBar } from "../../components/TopBar"
import striptags from "striptags"
import { navigationAnimation } from "../../lib/state"
import useIsPortrait from "../../lib/hooks/useIsPortrait"
import { BottomBar } from "../../components/BottomBar"
import { selectContacts } from "../ContactsScreen/SelectContactScreen"
import {
	showFullScreenLoadingModal,
	hideFullScreenLoadingModal
} from "../../components/Modals/FullscreenLoadingModal/FullscreenLoadingModal"
import { showToast } from "../../components/Toasts"
import notifee from "@notifee/react-native"
import { Notifications } from "react-native-notifications"
import { SheetManager } from "react-native-actions-sheet"
import useAppState from "../../lib/hooks/useAppState"

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

		const markAsRead = useCallback(async () => {
			try {
				await chatConversationsRead(conversation.uuid)

				eventListener.emit("chatConversationRead", {
					uuid: conversation.uuid,
					count:
						typeof unreadConversationsMessages[conversation.uuid] === "number"
							? unreadConversationsMessages[conversation.uuid]
							: 0
				})
			} catch (e) {
				console.error(e)
			}
		}, [conversation])

		if (conversationParticipantsFilteredWithoutMe.length === 0) {
			return null
		}

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
					markAsRead()

					await navigationAnimation({ enable: true })

					navigation.dispatch(
						StackActions.push("ChatScreen", {
							conversation
						})
					)
				}}
				onLongPress={() => eventListener.emit("openChatConversationActionSheet", conversation)}
			>
				<View
					style={{
						height: "100%",
						alignItems: "center",
						flexDirection: "row"
					}}
				>
					{conversationParticipantsFilteredWithoutMe.length > 1 ? (
						<>
							<View
								style={{
									width: AVATAR_HEIGHT,
									height: AVATAR_HEIGHT,
									borderRadius: AVATAR_HEIGHT,
									backgroundColor: generateAvatarColorCode(
										conversation.participants.length + "@" + conversation.uuid,
										darkMode
									),
									flexDirection: "column",
									alignItems: "center",
									justifyContent: "center",
									zIndex: 1001
								}}
							>
								<Text
									style={{
										color: "white",
										fontWeight: "bold",
										fontSize: 20
									}}
								>
									{conversation.participants.length.toString()}
								</Text>
							</View>
							{typeof unreadConversationsMessages[conversation.uuid] === "number" &&
								unreadConversationsMessages[conversation.uuid] > 0 && (
									<View
										style={{
											backgroundColor: getColor(darkMode, "red"),
											width: 16,
											height: 16,
											borderRadius: 16,
											flexDirection: "row",
											alignItems: "center",
											justifyContent: "center",
											position: "absolute",
											left: AVATAR_HEIGHT - 15,
											top: AVATAR_HEIGHT - 1,
											zIndex: 10001
										}}
									>
										<Text
											style={{
												color: "white",
												fontWeight: "bold",
												fontSize: 11
											}}
										>
											{unreadConversationsMessages[conversation.uuid] >= 9
												? 9
												: unreadConversationsMessages[conversation.uuid]}
										</Text>
									</View>
								)}
						</>
					) : typeof conversationParticipantsFilteredWithoutMe[0].avatar === "string" &&
					  conversationParticipantsFilteredWithoutMe[0].avatar.indexOf("https://") !== -1 ? (
						<>
							<Image
								source={{
									uri: conversationParticipantsFilteredWithoutMe[0].avatar
								}}
								cachePolicy="memory-disk"
								placeholder={require("../../assets/images/avatar_placeholder.jpg")}
								placeholderContentFit="contain"
								contentFit="contain"
								style={{
									width: 34,
									height: 34,
									borderRadius: 34,
									zIndex: 101
								}}
							/>
							{typeof unreadConversationsMessages[conversation.uuid] === "number" &&
								unreadConversationsMessages[conversation.uuid] > 0 && (
									<View
										style={{
											backgroundColor: getColor(darkMode, "red"),
											width: 16,
											height: 16,
											borderRadius: 16,
											flexDirection: "row",
											alignItems: "center",
											justifyContent: "center",
											position: "absolute",
											left: AVATAR_HEIGHT - 15,
											top: AVATAR_HEIGHT - 1,
											zIndex: 10001
										}}
									>
										<Text
											style={{
												color: "white",
												fontWeight: "bold",
												fontSize: 11
											}}
										>
											{unreadConversationsMessages[conversation.uuid] >= 9
												? 9
												: unreadConversationsMessages[conversation.uuid]}
										</Text>
									</View>
								)}
						</>
					) : (
						<>
							<View
								style={{
									width: AVATAR_HEIGHT,
									height: AVATAR_HEIGHT,
									borderRadius: AVATAR_HEIGHT,
									backgroundColor: generateAvatarColorCode(
										getUserNameFromParticipant(conversationParticipantsFilteredWithoutMe[0]),
										darkMode
									),
									flexDirection: "column",
									alignItems: "center",
									justifyContent: "center",
									zIndex: 1001
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
							{typeof unreadConversationsMessages[conversation.uuid] === "number" &&
								unreadConversationsMessages[conversation.uuid] > 0 &&
								!conversation.muted && (
									<View
										style={{
											backgroundColor: getColor(darkMode, "red"),
											width: 16,
											height: 16,
											borderRadius: 16,
											flexDirection: "row",
											alignItems: "center",
											justifyContent: "center",
											position: "absolute",
											left: AVATAR_HEIGHT - 15,
											top: AVATAR_HEIGHT - 1,
											zIndex: 10001
										}}
									>
										<Text
											style={{
												color: "white",
												fontWeight: "bold",
												fontSize: 11
											}}
										>
											{unreadConversationsMessages[conversation.uuid] >= 9
												? 9
												: unreadConversationsMessages[conversation.uuid]}
										</Text>
									</View>
								)}
						</>
					)}
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
						<View
							style={{
								flexDirection: "row",
								alignItems: "center",
								maxWidth: "100%",
								gap: 8
							}}
						>
							{conversation.muted && (
								<Ionicon
									name="volume-mute-outline"
									color={getColor(darkMode, "textSecondary")}
									size={17}
								/>
							)}
							<Text
								style={{
									color: getColor(darkMode, "textPrimary"),
									fontSize: 16,
									maxWidth: "90%"
								}}
								numberOfLines={1}
							>
								{typeof conversation.name === "string" && conversation.name.length > 0
									? conversation.name
									: conversationParticipantsFilteredWithoutMe
											.map(participant => striptags(getUserNameFromParticipant(participant)))
											.join(", ")}
							</Text>
						</View>
						{typeof conversation.lastMessage === "string" && conversation.lastMessage.length > 0 && (
							<View
								style={{
									width: "100%",
									flexDirection: "row",
									alignItems: "center",
									paddingRight: 15,
									overflow: "hidden",
									marginTop: 1
								}}
							>
								<Text
									style={{
										color: getColor(darkMode, "textSecondary"),
										fontSize: 14
									}}
								>
									{typeof conversation.lastMessage !== "string" || conversation.lastMessage.length === 0 ? (
										<>&nbsp;</>
									) : (
										youOrElse
									)}
								</Text>
								<View
									style={{
										flexDirection: "row",
										alignItems: "center",
										flexWrap: "nowrap",
										height: 20
									}}
								>
									<ReplaceInlineMessageWithComponents
										darkMode={darkMode}
										content={conversation.lastMessage}
										emojiSize={15}
										hideLinks={true}
										hideMentions={true}
										fontSize={14}
										participants={conversation.participants}
										color={getColor(darkMode, "textSecondary")}
									/>
								</View>
							</View>
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
	const conversationsRef = useRef<ChatConversation[]>(conversations)
	const isPortrait = useIsPortrait()
	const appState = useAppState()

	const conversationsSorted = useMemo(() => {
		return sortAndFilterConversations(conversations, searchTerm, userId)
	}, [conversations, searchTerm, userId])

	const loadConversations = useCallback(
		async (skipCache: boolean = false) => {
			try {
				if (skipCache && !networkInfo.online) {
					return
				}

				const cache = await dbFs.get<ChatConversation[]>("chatConversations")
				const hasCache = cache && Array.isArray(cache)

				if (!hasCache) {
					setLoadDone(false)
					setConversations([])
				}

				const result = await fetchChatConversations(skipCache)

				setConversations(result.conversations)

				if (result.cache) {
					loadConversations(true)
				}

				const promises: Promise<void>[] = []
				const semaphore = new Semaphore(128)

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

				Promise.allSettled(promises).catch(console.error)
			} catch (e) {
				console.error(e)
			} finally {
				setLoadDone(true)
			}
		},
		[networkInfo]
	)

	const createChat = useCallback(async () => {
		if (!networkInfo.online) {
			return
		}

		let contacts: Contact[] = []

		try {
			const selectContactsRes = await selectContacts(navigation)

			if (selectContactsRes.cancelled) {
				return
			}

			contacts = selectContactsRes.contacts
		} catch (e) {
			console.error(e)

			showToast({ message: e.toString() })

			return
		}

		if (contacts.length <= 0) {
			return
		}

		showFullScreenLoadingModal()

		try {
			const key = await global.nodeThread.generateRandomString({ charLength: 32 })
			const publicKey = storage.getString("publicKey")
			const metadata = await global.nodeThread.encryptMetadataPublicKey({ data: JSON.stringify({ key }), publicKey })
			const uuid = await global.nodeThread.uuidv4()

			await chatConversationsCreate(uuid, metadata)

			const promises: Promise<void>[] = []

			for (const contact of contacts) {
				promises.push(
					new Promise(async (resolve, reject) => {
						try {
							const participantPublicKey = await getPublicKeyFromEmail(contact.email)
							const participantMetadata = await global.nodeThread.encryptMetadataPublicKey({
								data: JSON.stringify({ key }),
								publicKey: participantPublicKey
							})

							await chatConversationsParticipantsAdd(uuid, contact.uuid, participantMetadata)
						} catch (e) {
							reject(e)

							return
						}

						resolve()
					})
				)
			}

			await Promise.all(promises)

			await loadConversations(true)
		} catch (e) {
			console.error(e)
		} finally {
			hideFullScreenLoadingModal()
		}
	}, [navigation, networkInfo])

	const resetNotifications = useCallback(async () => {
		try {
			await Promise.all([
				notifee.cancelAllNotifications(),
				notifee.setBadgeCount(0),
				notifee.cancelDisplayedNotifications(),
				Notifications.removeAllDeliveredNotifications()
			])

			sharedStorage.set("notificationBadgeCount", 0)
		} catch (e) {
			console.error(e)
		}
	}, [])

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

	useFocusEffect(
		useCallback(() => {
			loadConversations(true)
			resetNotifications()
		}, [])
	)

	useEffect(() => {
		if (appState.state === "active" && appState.didChangeSinceInit) {
			loadConversations(true)
			resetNotifications()
		}
	}, [appState])

	useEffect(() => {
		conversationsRef.current = conversations
	}, [conversations])

	useEffect(() => {
		loadConversations()
		resetNotifications()

		const socketEventListener = eventListener.on("socketEvent", async (event: SocketEvent) => {
			if (event.type === "chatMessageNew") {
				if (event.data.senderId !== userId && !event.data.muted) {
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
			} else if (event.type === "chatConversationParticipantNew") {
				loadConversations(true)
			} else if (event.type === "chatConversationDeleted") {
				setConversations(prev => prev.filter(c => c.uuid !== event.data.uuid))

				loadConversations(true)
			} else if (event.type === "chatConversationParticipantLeft") {
				if (event.data.userId === userId) {
					setConversations(prev => prev.filter(c => c.uuid !== event.data.uuid))
				} else {
					setConversations(prev =>
						prev.map(c =>
							c.uuid === event.data.uuid
								? { ...c, participants: c.participants.filter(p => p.userId !== event.data.userId) }
								: c
						)
					)
				}

				loadConversations(true)
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

		const chatConversationNameEditedListener = eventListener.on(
			"chatConversationNameEdited",
			({ uuid, name }: { uuid: string; name: string }) => {
				setConversations(prev =>
					prev.map(conversation =>
						conversation.uuid === uuid
							? {
									...conversation,
									name
							  }
							: conversation
					)
				)
			}
		)

		const updateChatConversationsListener = eventListener.on("updateChatConversations", () => {
			loadConversations(true)
		})

		const socketAuthedListener = eventListener.on("socketAuthed", () => {
			loadConversations(true)
		})

		const chatConversationReadListener = eventListener.on("chatConversationRead", ({ uuid }: { uuid: string }) => {
			setUnreadConversationsMessages(prev => ({
				...prev,
				[uuid]: 0
			}))
		})

		const chatConversationParticipantRemovedListener = eventListener.on("chatConversationParticipantRemoved", () => {
			loadConversations(true)
		})

		const chatConversationParticipantAdded = eventListener.on("chatConversationParticipantAdded", () => {
			loadConversations(true)
		})

		const chatConversationDeletedListener = eventListener.on("chatConversationDeleted", (uuid: string) => {
			setConversations(prev => prev.filter(c => c.uuid !== uuid))

			loadConversations(true)
		})

		return () => {
			socketEventListener.remove()
			updateChatConversationsListener.remove()
			socketAuthedListener.remove()
			chatConversationReadListener.remove()
			chatConversationParticipantRemovedListener.remove()
			chatConversationParticipantAdded.remove()
			chatConversationNameEditedListener.remove()
			chatConversationDeletedListener.remove()
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
					<View
						style={{
							flexDirection: "row",
							alignItems: "center",
							gap: 8,
							justifyContent: "flex-end"
						}}
					>
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
							onPress={() => createChat()}
						>
							<Ionicon
								name="add-outline"
								size={28}
								color={getColor(darkMode, "linkPrimary")}
							/>
						</TouchableOpacity>
						<TouchableOpacity
							hitSlop={{
								top: 15,
								bottom: 15,
								right: 5,
								left: 5
							}}
							onPress={() => SheetManager.show("TopBarActionSheet")}
						>
							<Ionicon
								name="ellipsis-horizontal-circle-outline"
								size={23}
								color={getColor(darkMode, "linkPrimary")}
							/>
						</TouchableOpacity>
					</View>
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
					key={"chats-" + isPortrait}
					data={conversationsSorted}
					renderItem={renderItem}
					keyExtractor={keyExtractor}
					estimatedItemSize={ITEM_HEIGHT}
					extraData={{
						darkMode,
						conversations,
						lang,
						userId,
						unreadConversationsMessages,
						navigation
					}}
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
			<View
				style={{
					position: "absolute",
					width: "100%",
					bottom: 0,
					height: 50
				}}
			>
				<BottomBar navigation={navigation} />
			</View>
		</View>
	)
})

export default ChatsScreen
