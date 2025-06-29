import { memo, useCallback, useRef, useMemo, useEffect } from "react"
import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import {
	View,
	TextInput,
	Platform,
	type LayoutChangeEvent,
	type NativeSyntheticEvent,
	type TextInputKeyPressEventData,
	type ViewStyle,
	type StyleProp,
	type TextStyle
} from "react-native"
import useDimensions from "@/hooks/useDimensions"
import { type ChatMessage } from "@filen/sdk/dist/types/api/v3/chat/messages"
import { KeyboardStickyView } from "react-native-keyboard-controller"
import { contactName, findClosestIndexString } from "@/lib/utils"
import { Button } from "@/components/nativewindui/Button"
import { Icon } from "@roninoss/icons"
import { useColorScheme } from "@/lib/useColorScheme"
import { BlurView } from "expo-blur"
import { cn } from "@/lib/cn"
import nodeWorker from "@/lib/nodeWorker"
import alerts from "@/lib/alerts"
import Semaphore from "@/lib/semaphore"
import { randomUUID } from "expo-crypto"
import queryUtils from "@/queries/utils"
import useSDKConfig from "@/hooks/useSDKConfig"
import useAccountQuery from "@/queries/useAccountQuery"
import { useChatsStore } from "@/stores/chats.store"
import useChatsLastFocusQuery from "@/queries/useChatsLastFocusQuery"
import useChatUnreadQuery from "@/queries/useChatUnreadQuery"
import useChatUnreadCountQuery from "@/queries/useChatUnreadCountQuery"
import Container from "@/components/Container"
import { useMMKVString } from "react-native-mmkv"
import mmkvInstance from "@/lib/mmkv"
import { customEmojis } from "../messages/customEmojis"
import Animated, { FadeIn, FadeOut, type AnimatedStyle } from "react-native-reanimated"
import { useShallow } from "zustand/shallow"
import useIsProUser from "@/hooks/useIsProUser"
import useNetInfo from "@/hooks/useNetInfo"
import { useTranslation } from "react-i18next"

export const Input = memo(
	({ chat, setInputHeight }: { chat: ChatConversation; setInputHeight: React.Dispatch<React.SetStateAction<number>> }) => {
		const { insets, screen } = useDimensions()
		const { colors } = useColorScheme()
		const [value, setValue] = useMMKVString(`chatInputValue:${chat.uuid}`, mmkvInstance)
		const typingUpEventTimeout = useRef<ReturnType<typeof setTimeout>>(undefined)
		const nextTypingEventDownTimestamp = useRef<number>(0)
		const sendTypingEventMutex = useRef<Semaphore>(new Semaphore(1))
		const [{ userId, email }] = useSDKConfig()
		const sendMutex = useRef<Semaphore>(new Semaphore(1))
		const setPendingMessages = useChatsStore(useShallow(state => state.setPendingMessages))
		const setShowEmojis = useChatsStore(useShallow(state => state.setShowEmojis))
		const setShowMention = useChatsStore(useShallow(state => state.setShowMention))
		const setEmojisSuggestions = useChatsStore(useShallow(state => state.setEmojisSuggestions))
		const setMentionSuggestions = useChatsStore(useShallow(state => state.setMentionSuggestions))
		const setEmojisText = useChatsStore(useShallow(state => state.setEmojisText))
		const setMentionText = useChatsStore(useShallow(state => state.setMentionText))
		const replyToMessage = useChatsStore(useShallow(state => state.replyToMessage[chat.uuid] ?? null))
		const setReplyToMessage = useChatsStore(useShallow(state => state.setReplyToMessage))
		const didTriggerValueEffectOnMount = useRef<boolean>(false)
		const showEmojis = useChatsStore(useShallow(state => state.showEmojis[chat.uuid] ?? false))
		const showMention = useChatsStore(useShallow(state => state.showMention[chat.uuid] ?? false))
		const emojisText = useChatsStore(useShallow(state => state.emojisText[chat.uuid] ?? ""))
		const mentionText = useChatsStore(useShallow(state => state.mentionText[chat.uuid] ?? ""))
		const emojisSuggestions = useChatsStore(useShallow(state => state.emojisSuggestions[chat.uuid] ?? []))
		const mentionSuggestions = useChatsStore(useShallow(state => state.mentionSuggestions[chat.uuid] ?? []))
		const textInputRef = useRef<TextInput>(null)
		const isProUser = useIsProUser()
		const setEditMessage = useChatsStore(useShallow(state => state.setEditMessage))
		const editMessage = useChatsStore(useShallow(state => state.editMessage[chat.uuid] ?? null))
		const { hasInternet } = useNetInfo()
		const { t } = useTranslation()

		const suggestionsOrReplyOrEditVisible = useMemo(() => {
			return (
				replyToMessage ||
				editMessage ||
				(showEmojis && emojisSuggestions.length > 0 && emojisText.length > 0) ||
				(showMention && mentionSuggestions.length > 0 && mentionText.length > 0)
			)
		}, [showEmojis, emojisText, emojisSuggestions, showMention, mentionText, mentionSuggestions, replyToMessage, editMessage])

		const resetSuggestions = useCallback(() => {
			useChatsStore.getState().resetSuggestions(chat.uuid)
		}, [chat.uuid])

		const chatsLastFocusQuery = useChatsLastFocusQuery({
			enabled: false
		})

		const accountQuery = useAccountQuery({
			enabled: false
		})

		const chatUnreadQuery = useChatUnreadQuery({
			enabled: false
		})

		const chatUnreadCountQuery = useChatUnreadCountQuery({
			uuid: chat.uuid,
			enabled: false
		})

		const lastFocus = useMemo(() => {
			if (chatsLastFocusQuery.status !== "success") {
				return []
			}

			return chatsLastFocusQuery.data
		}, [chatsLastFocusQuery.data, chatsLastFocusQuery.status])

		const onLayout = useCallback(
			(e: LayoutChangeEvent) => {
				const { height } = e.nativeEvent.layout

				setInputHeight(height)
			},
			[setInputHeight]
		)

		const onChangeText = useCallback(
			(text: string) => {
				setValue(text)

				if (text.length === 0) {
					resetSuggestions()

					setEditMessage(prev => ({
						...prev,
						[chat.uuid]: null
					}))

					return
				}

				const closestEmojiIndex = findClosestIndexString(text, ":", text.length)
				const emojisSliced = text.slice(closestEmojiIndex === -1 ? text.lastIndexOf(":") : closestEmojiIndex, text.length)
				const emojisOpen =
					emojisSliced.startsWith(":") &&
					emojisSliced.length >= 2 &&
					!emojisSliced.includes(" ") &&
					!emojisSliced.endsWith(":") &&
					!emojisSliced.endsWith(" ")

				const mentionClosestIndex = findClosestIndexString(text, "@", text.length)
				const mentionSliced = text.slice(mentionClosestIndex === -1 ? text.lastIndexOf("@") : mentionClosestIndex, text.length)
				const mentionOpen =
					mentionSliced === "@" ||
					(mentionSliced.startsWith("@") &&
						mentionSliced.length >= 1 &&
						!mentionSliced.includes(" ") &&
						!mentionSliced.endsWith("@") &&
						!mentionSliced.endsWith(" "))

				resetSuggestions()

				if (emojisOpen) {
					const normalized = emojisSliced.slice(1).toLowerCase().trim()

					setShowEmojis(prev => ({
						...prev,
						[chat.uuid]: true
					}))

					setEmojisText(prev => ({
						...prev,
						[chat.uuid]: emojisSliced
					}))

					setEmojisSuggestions(prev => ({
						...prev,
						[chat.uuid]: customEmojis.filter(emoji => emoji.name.toLowerCase().includes(normalized)).slice(0, 100)
					}))

					return
				}

				if (mentionOpen) {
					const normalized = mentionSliced.slice(1).toLowerCase().trim()

					setShowMention(prev => ({
						...prev,
						[chat.uuid]: true
					}))

					setMentionText(prev => ({
						...prev,
						[chat.uuid]: mentionSliced
					}))

					setMentionSuggestions(prev => ({
						...prev,
						[chat.uuid]: chat.participants
							.filter(participant => {
								const name = contactName(participant.email, participant.nickName)

								return (
									name.toLowerCase().trim().includes(normalized) ||
									participant.email.toLowerCase().trim().includes(normalized)
								)
							})
							.slice(0, 100)
					}))

					return
				}
			},
			[
				chat.participants,
				chat.uuid,
				resetSuggestions,
				setValue,
				setShowEmojis,
				setShowMention,
				setEmojisSuggestions,
				setMentionSuggestions,
				setEmojisText,
				setMentionText,
				setEditMessage
			]
		)

		const onTextInputPress = useCallback(() => {
			if (!value || value.length === 0) {
				return
			}

			onChangeText(value)
		}, [value, onChangeText])

		const sendTypingEvent = useCallback(
			async (type: "up" | "down") => {
				await sendTypingEventMutex.current.acquire()

				try {
					await nodeWorker.proxy("sendChatTyping", {
						conversation: chat.uuid,
						type
					})
				} catch (e) {
					console.error(e)
				} finally {
					sendTypingEventMutex.current.release()
				}
			},
			[chat.uuid]
		)

		const onKeyPress = useCallback(
			async (_: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
				clearTimeout(typingUpEventTimeout.current)

				const now = Date.now()

				if (now > nextTypingEventDownTimestamp.current) {
					nextTypingEventDownTimestamp.current = now + 1000

					sendTypingEvent("down")
				}

				typingUpEventTimeout.current = setTimeout(async () => {
					nextTypingEventDownTimestamp.current = Date.now() + 3000

					sendTypingEvent("up")
				}, 3000)
			},
			[sendTypingEvent]
		)

		const send = useCallback(async () => {
			if (accountQuery.status !== "success") {
				return
			}

			const valueCopied = `${(value ?? "").trim()}`

			if (valueCopied.length === 0) {
				return
			}

			const replyToMessageCopied: ChatMessage | null = replyToMessage ? JSON.parse(JSON.stringify(replyToMessage)) : null
			const editMessageCopied: ChatMessage | null = editMessage ? JSON.parse(JSON.stringify(editMessage)) : null

			setValue("")
			resetSuggestions()
			setReplyToMessage(prev => ({
				...prev,
				[chat.uuid]: null
			}))
			setEditMessage(prev => ({
				...prev,
				[chat.uuid]: null
			}))

			const uuid = editMessageCopied ? editMessageCopied.uuid : randomUUID()

			await sendMutex.current.acquire()

			try {
				setPendingMessages(prev => ({
					...prev,
					[uuid]: {
						uuid,
						status: "pending"
					}
				}))

				if (editMessageCopied) {
					queryUtils.useChatMessagesQuerySet({
						uuid: chat.uuid,
						updater: prev =>
							prev.map(m =>
								m.uuid === editMessageCopied.uuid
									? ({
											...m,
											message: valueCopied,
											edited: true,
											editedTimestamp: Date.now()
									  } satisfies ChatMessage)
									: m
							)
					})
				} else {
					queryUtils.useChatMessagesQuerySet({
						uuid: chat.uuid,
						updater: prev => [
							...prev.filter(m => m.uuid !== uuid),
							{
								uuid,
								conversation: chat.uuid,
								message: valueCopied,
								senderId: userId,
								sentTimestamp: Date.now(),
								senderEmail: email,
								senderNickName: accountQuery.data?.account?.nickName ?? "",
								senderAvatar: accountQuery.data?.account?.avatarURL ?? "",
								embedDisabled: false,
								edited: false,
								editedTimestamp: 0,
								replyTo: replyToMessageCopied
									? {
											uuid: replyToMessageCopied.uuid,
											senderId: replyToMessageCopied.senderId,
											senderEmail: replyToMessageCopied.senderEmail,
											senderAvatar: replyToMessageCopied.senderAvatar ?? "",
											senderNickName: replyToMessageCopied.senderNickName ?? "",
											message: replyToMessageCopied.message
									  }
									: {
											uuid: "",
											senderId: 0,
											senderEmail: "",
											senderAvatar: "",
											senderNickName: "",
											message: ""
									  }
							} satisfies ChatMessage
						]
					})

					queryUtils.useChatUnreadCountQuerySet({
						uuid: chat.uuid,
						updater: count => {
							queryUtils.useChatUnreadQuerySet({
								updater: prev => (prev - count >= 0 ? prev - count : 0)
							})

							return 0
						}
					})
				}

				const lastFocusTimestamp = Date.now()

				queryUtils.useChatsLastFocusQuerySet({
					updater: prev =>
						prev.map(v =>
							v.uuid === chat.uuid
								? {
										...v,
										lastFocus: lastFocusTimestamp
								  }
								: v
						)
				})

				if (editMessageCopied) {
					await nodeWorker.proxy("editChatMessage", {
						uuid,
						conversation: chat.uuid,
						message: valueCopied
					})
				} else {
					await nodeWorker.proxy("sendChatMessage", {
						uuid,
						conversation: chat.uuid,
						message: valueCopied,
						replyTo: replyToMessageCopied ? replyToMessageCopied.uuid : ""
					})
				}

				await Promise.all([
					sendTypingEvent("up"),
					nodeWorker.proxy("chatMarkAsRead", {
						conversation: chat.uuid
					}),
					nodeWorker.proxy("updateChatsLastFocus", {
						values: lastFocus.map(v =>
							v.uuid === chat.uuid
								? {
										...v,
										lastFocus: lastFocusTimestamp
								  }
								: v
						)
					}),
					chatUnreadQuery.refetch(),
					chatUnreadCountQuery.refetch()
				])

				setPendingMessages(prev => ({
					...prev,
					[uuid]: {
						uuid,
						status: "sent"
					}
				}))
			} catch (e) {
				console.error(e)

				if (e instanceof Error) {
					alerts.error(e.message)
				}

				setPendingMessages(prev => ({
					...prev,
					[uuid]: {
						uuid,
						status: "failed"
					}
				}))
			} finally {
				sendMutex.current.release()
			}
		}, [
			value,
			chat.uuid,
			replyToMessage,
			setReplyToMessage,
			sendTypingEvent,
			userId,
			accountQuery.status,
			email,
			accountQuery.data,
			setPendingMessages,
			lastFocus,
			chatUnreadQuery,
			chatUnreadCountQuery,
			setValue,
			setEditMessage,
			editMessage,
			resetSuggestions
		])

		const keyboardStickyViewOffset = useMemo(() => {
			return {
				opened: insets.bottom
			}
		}, [insets.bottom])

		const blurViewStyle = useMemo(() => {
			return {
				paddingBottom: insets.bottom
			}
		}, [insets.bottom])

		const textInputStyle = useMemo(() => {
			return {
				maxHeight: screen.height / 5,
				borderCurve: "continuous"
			} satisfies StyleProp<TextStyle>
		}, [screen.height])

		const viewStyle = useMemo(() => {
			return {
				bottom: 18,
				right: 24,
				position: "absolute"
			} satisfies StyleProp<AnimatedStyle<StyleProp<ViewStyle>>>
		}, [])

		const textValue = useMemo(() => {
			return value ?? ""
		}, [value])

		const disabled = useMemo(() => {
			return textValue.length === 0 || !hasInternet
		}, [textValue, hasInternet])

		useEffect(() => {
			if (suggestionsOrReplyOrEditVisible && textInputRef.current && !textInputRef.current.isFocused()) {
				textInputRef.current.focus()
			}
		}, [suggestionsOrReplyOrEditVisible, value])

		useEffect(() => {
			if (didTriggerValueEffectOnMount.current) {
				return
			}

			didTriggerValueEffectOnMount.current = true

			if (!value || value.length === 0) {
				return
			}

			onChangeText(value)
		}, [value, onChangeText])

		return (
			<KeyboardStickyView offset={keyboardStickyViewOffset}>
				<BlurView
					onLayout={onLayout}
					className={cn(
						"flex-1 absolute bottom-0 flex-row",
						(Platform.OS === "android" || suggestionsOrReplyOrEditVisible) && "bg-card"
					)}
					intensity={Platform.OS === "ios" && !suggestionsOrReplyOrEditVisible ? 100 : 0}
					tint={Platform.OS === "ios" && !suggestionsOrReplyOrEditVisible ? "systemChromeMaterial" : undefined}
					style={blurViewStyle}
				>
					<Container>
						<View className="flex-col flex-1">
							<View className="flex-1 flex-row items-end gap-0 px-4 py-3">
								{isProUser && hasInternet && (
									<Button
										size="icon"
										variant="plain"
									>
										<Icon
											name="plus"
											size={24}
											color={colors.foreground}
										/>
									</Button>
								)}
								<TextInput
									ref={textInputRef}
									value={textValue}
									onChangeText={onChangeText}
									onPress={onTextInputPress}
									placeholder={t("chats.input.placeholder")}
									multiline={true}
									scrollEnabled={true}
									autoFocus={false}
									readOnly={!hasInternet}
									keyboardType="default"
									returnKeyType="default"
									className="ios:pt-[8px] ios:pb-2 border-border bg-card text-foreground min-h-10 flex-1 rounded-[18px] border py-1 pl-3 pr-12 text-base leading-5"
									placeholderTextColor={colors.grey2}
									onKeyPress={onKeyPress}
									style={textInputStyle}
								/>
								<Animated.View
									entering={FadeIn}
									exiting={FadeOut}
									style={viewStyle}
								>
									<Button
										size="icon"
										className="ios:rounded-full rounded-full h-7 w-7"
										disabled={disabled}
										onPress={send}
										hitSlop={15}
									>
										<Icon
											name="arrow-up"
											size={18}
											color="white"
										/>
									</Button>
								</Animated.View>
							</View>
						</View>
					</Container>
				</BlurView>
			</KeyboardStickyView>
		)
	}
)

Input.displayName = "Input"

export default Input
