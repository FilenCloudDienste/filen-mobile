import React, { useState, memo, useCallback, useMemo, useEffect, useRef } from "react"
import { View, Text, TouchableOpacity, useWindowDimensions, RefreshControl, ActivityIndicator, AppState } from "react-native"
import { getColor } from "../../style"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { NavigationContainerRef, CommonActions, useIsFocused } from "@react-navigation/native"
import {
	Contact,
	ChatConversation,
	ChatConversationParticipant,
	getPublicKeyFromEmail,
	chatConversationsParticipantsAdd,
	chatConversationsOnline,
	ChatConversationsOnline
} from "../../lib/api"
import { i18n } from "../../i18n"
import useLang from "../../lib/hooks/useLang"
import { generateAvatarColorCode } from "../../lib/helpers"
import eventListener from "../../lib/eventListener"
import Ionicon from "@expo/vector-icons/Ionicons"
import { FlashList } from "@shopify/flash-list"
import { Image } from "expo-image"
import { showToast } from "../../components/Toasts"
import useNetworkInfo from "../../lib/services/isOnline/useNetworkInfo"
import { TopBar } from "../../components/TopBar"
import storage from "../../lib/storage"
import { useMMKVNumber } from "react-native-mmkv"
import { fetchChatConversations } from "./utils"
import { selectContacts } from "../ContactsScreen/SelectContactScreen"
import {
	showFullScreenLoadingModal,
	hideFullScreenLoadingModal
} from "../../components/Modals/FullscreenLoadingModal/FullscreenLoadingModal"
import { decryptChatMessageKey } from "../../lib/crypto"
import { throttle } from "lodash"
import { ONLINE_TIMEOUT } from "../../lib/constants"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { SocketEvent } from "../../lib/services/socket"

export type OnlineUsers = Record<string, ChatConversationsOnline>

const Item = memo(
	({
		darkMode,
		participant,
		participants,
		index,
		onlineUsers,
		userId,
		conversation
	}: {
		darkMode: boolean
		participant: ChatConversationParticipant
		participants: ChatConversationParticipant[]
		index: number
		onlineUsers: OnlineUsers
		userId: number
		conversation: ChatConversation
	}) => {
		return (
			<TouchableOpacity
				style={{
					flexDirection: "row",
					height: 55,
					width: "100%"
				}}
				onPress={() => {
					if (userId !== conversation.ownerId || userId === participant.userId) {
						return
					}

					eventListener.emit("openChatParticipantActionSheet", {
						participant,
						conversation
					})
				}}
			>
				<View
					style={{
						flexDirection: "row",
						alignItems: "center",
						paddingLeft: 20,
						paddingRight: 20,
						height: 55,
						width: "100%",
						marginBottom: index >= participants.length - 1 ? 55 : 0,
						backgroundColor: getColor(darkMode, "backgroundPrimary")
					}}
				>
					<View>
						<View
							style={{
								backgroundColor:
									onlineUsers[participant.userId] &&
									!onlineUsers[participant.userId].appearOffline &&
									onlineUsers[participant.userId].lastActive > 0
										? onlineUsers[participant.userId].lastActive > Date.now() - ONLINE_TIMEOUT
											? getColor(darkMode, "green")
											: "gray"
										: "gray",
								width: 12,
								height: 12,
								borderRadius: 12,
								flexDirection: "row",
								alignItems: "center",
								justifyContent: "center",
								position: "absolute",
								left: 23,
								top: 23,
								zIndex: 10001
							}}
						/>
						{typeof participant.avatar === "string" && participant.avatar.indexOf("https://") !== -1 ? (
							<Image
								source={{
									uri: participant.avatar
								}}
								cachePolicy="memory-disk"
								placeholder={require("../../assets/images/avatar_placeholder.jpg")}
								placeholderContentFit="contain"
								contentFit="contain"
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
									backgroundColor: generateAvatarColorCode(participant.email, darkMode),
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
									{(participant.nickName.length > 0 ? participant.nickName : participant.email).slice(0, 1).toUpperCase()}
								</Text>
							</View>
						)}
					</View>
					<View
						style={{
							flexDirection: "column",
							marginLeft: 10,
							height: "100%",
							borderBottomColor: getColor(darkMode, "primaryBorder"),
							borderBottomWidth: index >= participants.length - 1 && participants.length > 1 ? 0 : 0.5,
							width: "100%",
							justifyContent: "center"
						}}
					>
						<View
							style={{
								maxWidth: "90%",
								flexDirection: "row",
								alignItems: "center",
								gap: 5
							}}
						>
							<Text
								style={{
									color: getColor(darkMode, "textPrimary"),
									fontSize: 16
								}}
								numberOfLines={1}
							>
								{participant.nickName.length > 0 ? participant.nickName : participant.email}
							</Text>
							{participant.userId === conversation.ownerId && (
								<MaterialCommunityIcons
									name="crown"
									size={16}
									color={getColor(darkMode, "yellow")}
								/>
							)}
						</View>
						<Text
							style={{
								color: getColor(darkMode, "textSecondary"),
								fontSize: 13,
								maxWidth: "90%"
							}}
							numberOfLines={1}
						>
							{participant.email}
						</Text>
					</View>
				</View>
			</TouchableOpacity>
		)
	}
)

const ChatParticipantsScreen = memo(
	({ navigation, route }: { navigation: NavigationContainerRef<ReactNavigation.RootParamList>; route: any }) => {
		const darkMode = useDarkMode()
		const lang = useLang()
		const dimensions = useWindowDimensions()
		const [searchTerm, setSearchTerm] = useState<string>("")
		const [loadDone, setLoadDone] = useState<boolean>(true)
		const [refreshing, setRefreshing] = useState<boolean>(false)
		const networkInfo = useNetworkInfo()
		const [userId] = useMMKVNumber("userId", storage)
		const [conversation, setConversation] = useState<ChatConversation>(route.params.conversation)
		const conversationMe = useRef<ChatConversationParticipant>(conversation.participants.filter(p => p.userId === userId)[0]).current
		const [onlineUsers, setOnlineUsers] = useState<Record<string, OnlineUsers>>({})
		const isFocused = useIsFocused()

		const participants = useMemo(() => {
			return conversation.participants
		}, [conversation.participants])

		const participantsSorted = useMemo(() => {
			if (!onlineUsers || !onlineUsers[conversation.uuid] || Object.keys(onlineUsers[conversation.uuid]).length === 0) {
				return []
			}

			return participants
				.sort((a, b) => {
					const isOnlineA =
						onlineUsers[conversation.uuid] &&
						onlineUsers[conversation.uuid][a.userId] &&
						onlineUsers[conversation.uuid][a.userId].appearOffline
							? -1
							: onlineUsers[conversation.uuid][a.userId] &&
							  typeof onlineUsers[conversation.uuid][a.userId].lastActive === "number" &&
							  onlineUsers[conversation.uuid][a.userId].lastActive > 0 &&
							  onlineUsers[conversation.uuid][a.userId].lastActive > Date.now() - ONLINE_TIMEOUT
							? 1
							: 0
					const isOnlineB =
						onlineUsers[conversation.uuid] &&
						onlineUsers[conversation.uuid][b.userId] &&
						onlineUsers[conversation.uuid][b.userId].appearOffline
							? -1
							: onlineUsers[conversation.uuid][b.userId] &&
							  typeof onlineUsers[conversation.uuid][b.userId].lastActive === "number" &&
							  onlineUsers[conversation.uuid][b.userId].lastActive > 0 &&
							  onlineUsers[conversation.uuid][b.userId].lastActive > Date.now() - ONLINE_TIMEOUT
							? 1
							: 0

					if (isOnlineA > isOnlineB) {
						return -1
					} else if (isOnlineA < isOnlineB) {
						return 1
					} else {
						return a.email.localeCompare(b.email)
					}
				})
				.filter(contact => {
					if (searchTerm.length === 0) {
						return true
					}

					if (
						contact.email.toLowerCase().trim().indexOf(searchTerm.toLowerCase().trim()) !== -1 ||
						contact.nickName.toLowerCase().trim().indexOf(searchTerm.toLowerCase().trim()) !== -1
					) {
						return true
					}

					return false
				})
		}, [participants, searchTerm, (onlineUsers || {})[conversation.uuid || ""]])

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

		const updateOnlineUsers = useCallback(
			throttle(async () => {
				if (!networkInfo.online) {
					return
				}

				const res = await chatConversationsOnline(conversation.uuid)

				const online: Record<string, ChatConversationsOnline> = {}

				for (const user of res) {
					online[user.userId] = user
				}

				setOnlineUsers(prev => ({
					...prev,
					[conversation.uuid]: online
				}))
			}, 1000),
			[networkInfo, conversation]
		)

		const add = useCallback(async () => {
			if (!networkInfo.online) {
				return
			}

			let contacts: Contact[] = []

			try {
				const hiddenUserIds = conversation.participants.map(p => p.userId)
				const selectContactsRes = await selectContacts(navigation, hiddenUserIds)

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
				const privateKey = storage.getString("privateKey")
				const key = await decryptChatMessageKey(conversationMe.metadata, privateKey)
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

								await chatConversationsParticipantsAdd(conversation.uuid, contact.uuid, participantMetadata)

								eventListener.emit("chatConversationParticipantAdded", { uuid: conversation.uuid, contact })
							} catch (e) {
								reject(e)

								return
							}

							resolve()
						})
					)
				}

				await Promise.all(promises)

				await loadConversation()
			} catch (e) {
				console.error(e)
			} finally {
				hideFullScreenLoadingModal()
			}
		}, [navigation, networkInfo, conversation, conversationMe])

		const keyExtractor = useCallback((item: ChatConversationParticipant) => item.userId.toString(), [])

		const renderItem = useCallback(
			({ item, index }: { item: ChatConversationParticipant; index: number }) => {
				return (
					<Item
						darkMode={darkMode}
						participant={item}
						participants={participantsSorted}
						index={index}
						onlineUsers={onlineUsers[conversation.uuid]}
						userId={userId}
						conversation={conversation}
					/>
				)
			},
			[darkMode, participantsSorted, onlineUsers, userId, conversation]
		)

		useEffect(() => {
			if (isFocused) {
				loadConversation()
				updateOnlineUsers()
			}
		}, [isFocused])

		useEffect(() => {
			loadConversation()
			updateOnlineUsers()

			const refreshInterval = setInterval(() => {
				loadConversation()
				updateOnlineUsers()
			}, 5000)

			const chatConversationParticipantRemovedListener = eventListener.on(
				"chatConversationParticipantRemoved",
				({ uuid, userId }: { uuid: string; userId: number }) => {
					if (uuid === conversation.uuid) {
						setConversation(prev => ({ ...prev, participants: prev.participants.filter(p => p.userId !== userId) }))
					}

					loadConversation()
					updateOnlineUsers()
				}
			)

			const socketAuthedListener = eventListener.on("socketAuthed", () => {
				loadConversation()
				updateOnlineUsers()
			})

			const appStateChangeListener = AppState.addEventListener("change", nextAppState => {
				if (nextAppState === "active") {
					loadConversation()
					updateOnlineUsers()
				}
			})

			const socketEventListener = eventListener.on("socketEvent", async (event: SocketEvent) => {
				if (event.type === "chatConversationParticipantNew") {
					if (event.data.conversation === conversation.uuid) {
						loadConversation()
					}
				} else if (event.type === "chatConversationDeleted") {
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

			const chatConversationNameEditedListener = eventListener.on("chatConversationNameEdited", ({ uuid }: { uuid: string }) => {
				if (uuid === conversation.uuid) {
					loadConversation()
				}
			})

			return () => {
				clearInterval(refreshInterval)

				chatConversationParticipantRemovedListener.remove()
				socketAuthedListener.remove()
				appStateChangeListener.remove()
				socketEventListener.remove()
				chatConversationNameEditedListener.remove()
			}
		}, [])

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
							onPress={() => add()}
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
						data={participantsSorted}
						renderItem={renderItem}
						keyExtractor={keyExtractor}
						estimatedItemSize={55}
						extraData={{
							darkMode,
							participantsSorted,
							onlineUsers,
							userId,
							conversation
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
									await loadConversation().catch(console.error)

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
											name="people-outline"
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
											{i18n(lang, "noParticipantsYet")}
										</Text>
									</View>
								)}
							</>
						}
					/>
				</View>
			</View>
		)
	}
)

export default ChatParticipantsScreen
