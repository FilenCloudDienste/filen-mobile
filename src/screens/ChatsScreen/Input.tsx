import React, { useState, memo, useCallback, useRef, useEffect } from "react"
import {
	View,
	TouchableOpacity,
	useWindowDimensions,
	TextInput,
	NativeSyntheticEvent,
	TextInputChangeEventData,
	TextInputSelectionChangeEventData,
	Text,
	ScrollView,
	Image,
	Keyboard
} from "react-native"
import { getColor } from "../../style"
import { ChatConversation, ChatConversationParticipant, ChatMessage, chatSendTyping, TypingType, sendChatMessage } from "../../lib/api"
import { i18n } from "../../i18n"
import { useMMKVString } from "react-native-mmkv"
import storage from "../../lib/storage"
import eventListener from "../../lib/eventListener"
import Ionicon from "@expo/vector-icons/Ionicons"
import { decryptChatMessageKey, encryptChatMessage } from "../../lib/crypto"
import Typing from "./Typing"
import { TYPING_TIMEOUT } from "./Typing"
import { showToast } from "../../components/Toasts"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { findClosestIndex, generateAvatarColorCode } from "../../lib/helpers"
import { getUserNameFromParticipant, filterEmojisByShortcode } from "./utils"
import { useKeyboard } from "@react-native-community/hooks"

const INPUT_HEIGHT = 35

const Input = memo(
	({
		darkMode,
		conversation,
		conversationMe,
		lang,
		setMessages,
		setFailedMessages,
		setEditingMessageUUID,
		setReplyMessageUUID
	}: {
		darkMode: boolean
		conversation: ChatConversation
		conversationMe: ChatConversationParticipant
		lang: string
		setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
		setFailedMessages: React.Dispatch<React.SetStateAction<string[]>>
		setEditingMessageUUID: React.Dispatch<React.SetStateAction<string>>
		setReplyMessageUUID: React.Dispatch<React.SetStateAction<string>>
	}) => {
		const [text, setText] = useMMKVString("chatTextInput:" + conversation.uuid, storage)
		const [textSelection, setTextSelection] = useState<{ start: number; end: number }>(
			typeof text === "string" ? { start: text.length, end: text.length } : { start: 0, end: 0 }
		)
		const isTyping = useRef<boolean>(false)
		const isTypingTimer = useRef<ReturnType<typeof setTimeout>>()
		const isTypingTimeout = useRef<Record<TypingType, number>>({ down: 0, up: 0 })
		const [replyToMessage, setReplyToMessage] = useState<ChatMessage | undefined>(undefined)
		const [textContentHeight, setTextContentHeight] = useState<number>(INPUT_HEIGHT)
		const dimensions = useWindowDimensions()
		const insets = useSafeAreaInsets()
		const [emojiSuggestionsOpen, setEmojiSuggestionsOpen] = useState<boolean>(false)
		const [emojiSuggestions, setEmojiSuggestions] = useState<{ id: string; src: string }[]>([])
		const [mentionMode, setMentionMode] = useState<boolean>(false)
		const [mentionSearch, setMentionSearch] = useState<ChatConversationParticipant[]>([])
		const [inputContainerHeight, setInputContainerHeight] = useState<number>(0)
		const keyboard = useKeyboard()
		const inputRef = useRef<TextInput>()

		const sendTypingEvents = useCallback(
			async (ignoreTimeout: boolean = false) => {
				const type = isTyping.current ? "down" : "up"

				if (!ignoreTimeout) {
					if (isTypingTimeout.current[type] > Date.now()) {
						return
					}

					isTypingTimeout.current[type] = Date.now() + TYPING_TIMEOUT
				} else {
					isTypingTimeout.current[type] = Date.now()
				}

				try {
					await chatSendTyping(conversation.uuid, type)
				} catch (e) {
					console.error(e)
				}
			},
			[conversation]
		)

		const onKeyDownOrUp = useCallback(async () => {
			isTyping.current = true

			sendTypingEvents()

			clearTimeout(isTypingTimer.current)

			isTypingTimer.current = setTimeout(() => {
				isTyping.current = false

				sendTypingEvents()
			}, TYPING_TIMEOUT)
		}, [])

		const sendMessage = useCallback(async () => {
			let uuid: string

			try {
				const message = `${text}`

				if (!message || message.length === 0) {
					return
				}

				if (message.length > 4096) {
					showToast({ message: i18n(lang, "chatMessageLimitReached", true, ["__LIMIT__"], ["2000"]) })

					return
				}

				uuid = await global.nodeThread.uuidv4()

				const replyMessage = replyToMessage

				setReplyToMessage(undefined)
				setText("")
				setMessages(prev => [
					{
						conversation: conversation.uuid,
						uuid,
						senderId: conversationMe.userId,
						senderEmail: conversationMe.email,
						senderAvatar: conversationMe.avatar,
						senderNickName: conversationMe.nickName,
						message,
						replyTo: {
							uuid: typeof replyMessage !== "undefined" ? replyMessage.uuid : "",
							senderId: typeof replyMessage !== "undefined" ? replyMessage.senderId : 0,
							senderEmail: typeof replyMessage !== "undefined" ? replyMessage.senderEmail : "",
							senderAvatar:
								typeof replyMessage !== "undefined" && typeof replyMessage.senderAvatar === "string"
									? replyMessage.senderAvatar
									: "",
							senderNickName:
								typeof replyMessage !== "undefined" && typeof replyMessage.senderNickName === "string"
									? replyMessage.senderNickName
									: "",
							message: typeof replyMessage !== "undefined" ? replyMessage.message : ""
						},
						embedDisabled: false,
						edited: false,
						editedTimestamp: 0,
						sentTimestamp: Date.now()
					},
					...prev
				])

				const privateKey = storage.getString("privateKey")
				const key = await decryptChatMessageKey(conversationMe.metadata, privateKey)

				if (key.length === 0) {
					setFailedMessages(prev => [...prev, uuid])

					return
				}

				const messageEncrypted = await encryptChatMessage(message, key)

				if (messageEncrypted.length === 0) {
					setFailedMessages(prev => [...prev, uuid])

					return
				}

				await sendChatMessage(
					conversation.uuid,
					uuid,
					messageEncrypted,
					typeof replyMessage !== "undefined" ? replyMessage.uuid : ""
				)

				eventListener.emit("scrollChatToBottom")
				eventListener.emit("chatMessageSent", {
					conversation: conversation.uuid,
					uuid,
					senderId: conversationMe.userId,
					senderEmail: conversationMe.email,
					senderAvatar: conversationMe.avatar,
					senderNickName: conversationMe.nickName,
					message,
					replyTo: {
						uuid: typeof replyMessage !== "undefined" ? replyMessage.uuid : "",
						senderId: typeof replyMessage !== "undefined" ? replyMessage.senderId : 0,
						senderEmail: typeof replyMessage !== "undefined" ? replyMessage.senderEmail : "",
						senderAvatar:
							typeof replyMessage !== "undefined" && typeof replyMessage.senderAvatar === "string"
								? replyMessage.senderAvatar
								: "",
						senderNickName:
							typeof replyMessage !== "undefined" && typeof replyMessage.senderNickName === "string"
								? replyMessage.senderNickName
								: "",
						message: typeof replyMessage !== "undefined" ? replyMessage.message : ""
					},
					embedDisabled: false,
					edited: false,
					editedTimestamp: 0,
					sentTimestamp: Date.now()
				})
			} catch (e) {
				console.error(e)

				showToast({ message: e.toString() })

				if (uuid) {
					setFailedMessages(prev => [...prev, uuid])
				}
			} finally {
				setText("")

				clearTimeout(isTypingTimer.current)

				isTyping.current = false

				sendTypingEvents(true)
			}
		}, [text, conversation, replyToMessage])

		const onChange = useCallback((e: NativeSyntheticEvent<TextInputChangeEventData>) => {
			const value = e.nativeEvent.text

			setText(value)

			if (value.trim().length <= 0) {
				setEditingMessageUUID("")
				setReplyMessageUUID("")
			}
		}, [])

		const addTextAfterLastTextComponent = useCallback(
			(component: string, replaceWith: string) => {
				const closestIndex = findClosestIndex(text, component, textSelection.end)

				if (closestIndex === -1) {
					return
				}

				const replacedMessage = text.slice(0, closestIndex) + replaceWith + " "

				if (replacedMessage.trim().length <= 0) {
					return
				}

				setText(replacedMessage)
				setTextSelection({ end: replacedMessage.length, start: replacedMessage.length })
			},
			[text, textSelection, conversation]
		)

		const toggleEmojiSuggestions = useCallback(
			(selection: { start: number; end: number }) => {
				if (text.length === 0 || text.indexOf(":") === -1 || selection.end <= 0) {
					setEmojiSuggestions([])
					setEmojiSuggestionsOpen(false)

					return
				}

				const closestIndex = findClosestIndex(text, ":", selection.end)
				const sliced = text.slice(closestIndex === -1 ? text.lastIndexOf(":") : closestIndex, selection.end)
				const open =
					sliced.startsWith(":") &&
					sliced.length >= 3 &&
					sliced.indexOf(" ") === -1 &&
					!sliced.endsWith(":") &&
					!sliced.endsWith(" ")
				const suggestionText = open ? sliced : ""
				const searchText = suggestionText.split(":").join("").toLowerCase().trim()

				setEmojiSuggestionsOpen(open)

				if (open) {
					setEmojiSuggestions(filterEmojisByShortcode(searchText, 8))
				} else {
					setEmojiSuggestions([])
				}
			},
			[text]
		)

		const toggleMentionSuggestions = useCallback(
			(selection: { start: number; end: number }) => {
				if (text.length === 0 || text.indexOf("@") === -1 || selection.end <= 0) {
					setMentionMode(false)

					return
				}

				const closestIndex = findClosestIndex(text, "@", selection.end)
				const sliced = text.slice(closestIndex === -1 ? text.lastIndexOf("@") : closestIndex, selection.end)
				const open = sliced.startsWith("@") && sliced.length >= 1 && sliced.indexOf(" ") === -1 && !sliced.endsWith(" ")

				setMentionMode(open)

				if (open) {
					const searchFor = sliced.split("@").join("").trim().toLowerCase()
					const filteredParticipants = conversation.participants.filter(
						p => p.email.toLowerCase().indexOf(searchFor) !== -1 || p.nickName.toLowerCase().indexOf(searchFor) !== -1
					)

					if (filteredParticipants.length === 0) {
						setMentionMode(false)

						return
					}

					setMentionSearch([
						...filteredParticipants,
						...[
							{
								userId: 0,
								email: "everyone",
								avatar: null,
								nickName: "everyone",
								metadata: "",
								permissionsAdd: false,
								addedTimestamp: 0
							}
						]
					])
				} else {
					setMentionMode(false)
				}
			},
			[text, conversation]
		)

		const onSelectionChange = useCallback(
			(e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
				const selection = e.nativeEvent.selection

				setTextSelection(selection)
				toggleEmojiSuggestions(selection)
				toggleMentionSuggestions(selection)
			},
			[text]
		)

		const keyboardDidHide = useCallback(() => {
			if (text.trim().length <= 0) {
				setReplyMessageUUID("")
				setReplyToMessage(undefined)
				setEditingMessageUUID("")
			}
		}, [text])

		useEffect(() => {
			const editChatMessageListener = eventListener.on("editChatMessage", (message: ChatMessage) => {
				setEditingMessageUUID(message.uuid)
				setText(message.message)
				setReplyMessageUUID("")
				setReplyToMessage(undefined)

				setTimeout(() => {
					if (inputRef.current) {
						inputRef.current.focus()
					}
				}, 100)
			})

			const replyToChatMessageListener = eventListener.on("replyToChatMessage", (message: ChatMessage) => {
				setReplyMessageUUID(message.uuid)
				setReplyToMessage(message)
				setEditingMessageUUID("")

				setTimeout(() => {
					if (inputRef.current) {
						inputRef.current.focus()
					}
				}, 100)
			})

			const keyboardDidHideListener = Keyboard.addListener("keyboardDidHide", () => {
				keyboardDidHide()
			})

			const keyboardWillHideListener = Keyboard.addListener("keyboardWillHide", () => {
				keyboardDidHide()
			})

			return () => {
				editChatMessageListener.remove()
				replyToChatMessageListener.remove()
				keyboardDidHideListener.remove()
				keyboardWillHideListener.remove()
			}
		}, [])

		return (
			<View
				style={{
					width: "100%",
					minHeight: 55,
					flexDirection: "row",
					alignItems: "center",
					borderTopColor: getColor(darkMode, "primaryBorder"),
					borderTopWidth: 0.5,
					paddingTop: 5,
					paddingBottom: 5,
					paddingLeft: 10,
					paddingRight: 10,
					justifyContent: "space-between",
					gap: 5
				}}
				onLayout={e => setInputContainerHeight(e.nativeEvent.layout.height)}
			>
				<Typing
					darkMode={darkMode}
					conversation={conversation}
					lang={lang}
				/>
				{replyToMessage && (
					<View
						style={{
							flexDirection: "row",
							width: dimensions.width - insets.left - insets.right,
							position: "absolute",
							bottom: inputContainerHeight,
							backgroundColor: getColor(darkMode, "backgroundSecondary"),
							zIndex: 1001,
							alignItems: "center",
							justifyContent: "space-between",
							padding: 5,
							paddingLeft: 10,
							paddingRight: 10,
							borderTopLeftRadius: 5,
							borderTopRightRadius: 5
						}}
					>
						<View
							style={{
								width: "90%"
							}}
						>
							<Text numberOfLines={1}>
								<Text
									style={{
										fontSize: 12,
										color: getColor(darkMode, "textSecondary")
									}}
								>
									{i18n(lang, "replyingTo")}
								</Text>
								<Text
									style={{
										fontSize: 12,
										color: getColor(darkMode, "textPrimary")
									}}
								>
									&nbsp;{replyToMessage.senderEmail}
								</Text>
							</Text>
						</View>
						<TouchableOpacity
							onPress={() => {
								setReplyMessageUUID("")
								setReplyToMessage(undefined)
								setEditingMessageUUID("")
							}}
						>
							<Ionicon
								name="close-circle-outline"
								color={getColor(darkMode, "textSecondary")}
								size={18}
							/>
						</TouchableOpacity>
					</View>
				)}
				{emojiSuggestionsOpen && keyboard.keyboardShown && emojiSuggestions.length > 0 && (
					<ScrollView
						style={{
							flexDirection: "column",
							maxHeight: Math.floor((dimensions.height - insets.top - insets.bottom - keyboard.keyboardHeight) / 2),
							width: dimensions.width - insets.left - insets.right,
							position: "absolute",
							bottom: inputContainerHeight,
							backgroundColor: getColor(darkMode, "backgroundSecondary"),
							zIndex: 10001
						}}
						keyboardShouldPersistTaps="always"
					>
						{emojiSuggestions.map((emoji, index) => {
							return (
								<TouchableOpacity
									key={index}
									style={{
										flexDirection: "column",
										width: "100%",
										padding: 5
									}}
									onPress={() => addTextAfterLastTextComponent(":", ":" + emoji.id + ":")}
								>
									<View
										style={{
											padding: 5,
											paddingLeft: 10,
											paddingRight: 10,
											alignItems: "center",
											justifyContent: "space-between",
											gap: 10,
											flexDirection: "row"
										}}
									>
										<View
											style={{
												width: "50%",
												alignItems: "center",
												flexDirection: "row",
												gap: 10
											}}
										>
											<Image
												source={{
													uri: emoji.src
												}}
												style={{
													width: 24,
													height: 24
												}}
											/>
											<Text
												style={{
													color: getColor(darkMode, "textPrimary"),
													fontSize: 14
												}}
												numberOfLines={1}
											>
												{":" + emoji.id + ":"}
											</Text>
										</View>
									</View>
								</TouchableOpacity>
							)
						})}
					</ScrollView>
				)}
				{mentionMode && keyboard.keyboardShown && (
					<ScrollView
						style={{
							flexDirection: "column",
							maxHeight: Math.floor((dimensions.height - insets.top - insets.bottom - keyboard.keyboardHeight) / 2),
							width: dimensions.width - insets.left - insets.right,
							position: "absolute",
							bottom: inputContainerHeight,
							backgroundColor: getColor(darkMode, "backgroundSecondary"),
							zIndex: 100001
						}}
						keyboardShouldPersistTaps="always"
					>
						{(mentionSearch.length > 0 ? mentionSearch : conversation.participants).map((p, index) => {
							return (
								<TouchableOpacity
									key={index}
									style={{
										flexDirection: "column",
										width: "100%",
										padding: 5
									}}
									onPress={() => addTextAfterLastTextComponent("@", "@" + p.email)}
								>
									{p.email === "everyone" && (
										<View
											style={{
												width: "100%",
												height: 1,
												backgroundColor: getColor(darkMode, "primaryBorder"),
												marginBottom: 5
											}}
										/>
									)}
									<View
										style={{
											padding: 5,
											paddingLeft: 10,
											paddingRight: 10,
											alignItems: "center",
											justifyContent: "space-between",
											gap: 10,
											flexDirection: "row"
										}}
									>
										<View
											style={{
												width: "50%",
												alignItems: "center",
												flexDirection: "row",
												gap: 8
											}}
										>
											{p.email !== "everyone" && (
												<View>
													{typeof p.avatar === "string" && p.avatar.indexOf("https://") !== -1 ? (
														<Image
															source={{
																uri: p.avatar
															}}
															style={{
																width: 24,
																height: 24,
																borderRadius: 24
															}}
														/>
													) : (
														<View
															style={{
																width: 24,
																height: 24,
																borderRadius: 24,
																backgroundColor: generateAvatarColorCode(p.email, darkMode),
																flexDirection: "column",
																alignItems: "center",
																justifyContent: "center"
															}}
														>
															<Text
																style={{
																	color: "white",
																	fontWeight: "bold",
																	fontSize: 16
																}}
															>
																{getUserNameFromParticipant(p).slice(0, 1).toUpperCase()}
															</Text>
														</View>
													)}
												</View>
											)}
											<Text
												style={{
													color:
														p.email === "everyone"
															? getColor(darkMode, "textSecondary")
															: getColor(darkMode, "textPrimary"),
													fontSize: 14
												}}
												numberOfLines={1}
											>
												{p.email === "everyone" ? "@everyone" : getUserNameFromParticipant(p)}
											</Text>
										</View>
										<View
											style={{
												width: "40%",
												alignItems: "flex-end"
											}}
										>
											{p.email !== "everyone" && (
												<Text
													style={{
														color: getColor(darkMode, "textSecondary"),
														fontSize: 12
													}}
													numberOfLines={1}
												>
													{p.email}
												</Text>
											)}
										</View>
									</View>
								</TouchableOpacity>
							)
						})}
					</ScrollView>
				)}
				<TouchableOpacity
					style={{
						backgroundColor: getColor(darkMode, "backgroundSecondary"),
						borderRadius: INPUT_HEIGHT + 4,
						width: INPUT_HEIGHT + 4,
						height: INPUT_HEIGHT + 4,
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "center",
						alignSelf: "flex-start",
						marginTop: 3
					}}
				>
					<Ionicon
						name="add-sharp"
						color={getColor(darkMode, "linkPrimary")}
						size={30}
					/>
				</TouchableOpacity>
				<TextInput
					ref={inputRef}
					multiline={true}
					autoFocus={false}
					keyboardType="default"
					returnKeyType="default"
					scrollEnabled={true}
					cursorColor={getColor(darkMode, "textSecondary")}
					value={typeof text !== "string" ? "" : text}
					onChange={onChange}
					onContentSizeChange={e => {
						setTextContentHeight(
							e.nativeEvent.contentSize.height < INPUT_HEIGHT
								? INPUT_HEIGHT
								: e.nativeEvent.contentSize.height > INPUT_HEIGHT * 3
								? INPUT_HEIGHT * 3
								: e.nativeEvent.contentSize.height
						)
					}}
					onSelectionChange={onSelectionChange}
					onKeyPress={onKeyDownOrUp}
					style={{
						backgroundColor: getColor(darkMode, "backgroundSecondary"),
						minHeight: textContentHeight,
						maxHeight: INPUT_HEIGHT * 3,
						lineHeight: 20,
						borderRadius: 20,
						width: dimensions.width - insets.left - insets.right - 120,
						paddingLeft: 12,
						paddingRight: 12,
						paddingTop: 10,
						paddingBottom: 10,
						color: getColor(darkMode, "textPrimary"),
						fontSize: 17,
						alignItems: "center",
						justifyContent: "center",
						alignContent: "center",
						flexDirection: "row"
					}}
				/>
				<TouchableOpacity
					style={{
						borderRadius: INPUT_HEIGHT + 4,
						width: INPUT_HEIGHT + 4,
						height: INPUT_HEIGHT + 4,
						backgroundColor:
							typeof text === "string" && text.length > 0
								? getColor(darkMode, "indigo")
								: getColor(darkMode, "backgroundSecondary"),
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "center",
						alignSelf: "flex-start",
						marginTop: 3
					}}
					onPress={() => sendMessage()}
				>
					<Ionicon
						name="ios-send"
						color={typeof text === "string" && text.length > 0 ? "white" : getColor(darkMode, "textSecondary")}
						size={19}
						style={{
							flexShrink: 0,
							marginLeft: 4
						}}
					/>
				</TouchableOpacity>
			</View>
		)
	}
)

export default Input
