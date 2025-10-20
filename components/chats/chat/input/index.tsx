import { memo, useCallback, useRef, useMemo, useEffect } from "react"
import type { ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import {
	View,
	TextInput,
	Platform,
	type NativeSyntheticEvent,
	type TextInputKeyPressEventData,
	type StyleProp,
	type TextStyle
} from "react-native"
import useDimensions from "@/hooks/useDimensions"
import type { ChatMessage } from "@filen/sdk/dist/types/api/v3/chat/messages"
import { contactName, findClosestIndexString } from "@/lib/utils"
import { Button } from "@/components/nativewindui/Button"
import { Icon } from "@roninoss/icons"
import { useColorScheme } from "@/lib/useColorScheme"
import nodeWorker from "@/lib/nodeWorker"
import alerts from "@/lib/alerts"
import Semaphore from "@/lib/semaphore"
import { randomUUID } from "expo-crypto"
import useSDKConfig from "@/hooks/useSDKConfig"
import useAccountQuery from "@/queries/useAccount.query"
import { useChatsStore } from "@/stores/chats.store"
import useChatsLastFocusQuery, { chatsLastFocusQueryUpdate } from "@/queries/useChatsLastFocus.query"
import useChatUnreadQuery, { chatUnreadQueryUpdate } from "@/queries/useChatUnread.query"
import useChatUnreadCountQuery, { chatUnreadCountQueryUpdate } from "@/queries/useChatUnreadCount.query"
import { useMMKVString } from "react-native-mmkv"
import mmkvInstance from "@/lib/mmkv"
import { customEmojis } from "../messages/customEmojis"
import Animated, { FadeIn, FadeOut } from "react-native-reanimated"
import { useShallow } from "zustand/shallow"
import useIsProUser from "@/hooks/useIsProUser"
import useNetInfo from "@/hooks/useNetInfo"
import { translateMemoized } from "@/lib/i18n"
import { useActionSheet } from "@expo/react-native-action-sheet"
import chatsService from "@/services/chats.service"
import useViewLayout from "@/hooks/useViewLayout"
import ReplyTo from "./suggestions/replyTo"
import Emojis from "./suggestions/emojis"
import Typing from "../messages/typing"
import Mention from "./suggestions/mention"
import { chatMessagesQueryUpdate } from "@/queries/useChatMessages.query"

export const Input = memo(
	({ chat, setInputHeight }: { chat: ChatConversation; setInputHeight: React.Dispatch<React.SetStateAction<number>> }) => {
		const { insets, screen } = useDimensions()
		const { colors } = useColorScheme()
		const [value, setValue] = useMMKVString(`chatInputValue:${chat.uuid}`, mmkvInstance)
		const typingUpEventTimeout = useRef<ReturnType<typeof setTimeout>>(undefined)
		const nextTypingEventDownTimestamp = useRef<number>(0)
		const sendTypingEventMutex = useRef<Semaphore>(new Semaphore(1))
		const [{ userId, email }] = useSDKConfig()
		const replyToMessage = useChatsStore(useShallow(state => state.replyToMessage[chat.uuid] ?? null))
		const didTriggerValueEffectOnMount = useRef<boolean>(false)
		const showEmojis = useChatsStore(useShallow(state => state.showEmojis[chat.uuid] ?? false))
		const showMention = useChatsStore(useShallow(state => state.showMention[chat.uuid] ?? false))
		const emojisText = useChatsStore(useShallow(state => state.emojisText[chat.uuid] ?? ""))
		const mentionText = useChatsStore(useShallow(state => state.mentionText[chat.uuid] ?? ""))
		const emojisSuggestions = useChatsStore(useShallow(state => state.emojisSuggestions[chat.uuid] ?? []))
		const mentionSuggestions = useChatsStore(useShallow(state => state.mentionSuggestions[chat.uuid] ?? []))
		const textInputRef = useRef<TextInput>(null)
		const isProUser = useIsProUser()
		const editMessage = useChatsStore(useShallow(state => state.editMessage[chat.uuid] ?? null))
		const { hasInternet } = useNetInfo()
		const { showActionSheetWithOptions } = useActionSheet()
		const viewRef = useRef<View>(null)
		const { layout, onLayout } = useViewLayout(viewRef)

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

		const chatUnreadCountQuery = useChatUnreadCountQuery(
			{
				conversation: chat.uuid
			},
			{
				enabled: false
			}
		)

		const lastFocus = useMemo(() => {
			if (chatsLastFocusQuery.status !== "success") {
				return []
			}

			return chatsLastFocusQuery.data
		}, [chatsLastFocusQuery.data, chatsLastFocusQuery.status])

		const onChangeText = useCallback(
			(text: string) => {
				setValue(text)

				if (text.length === 0) {
					resetSuggestions()

					useChatsStore.getState().setEditMessage(prev => ({
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

					useChatsStore.getState().setShowEmojis(prev => ({
						...prev,
						[chat.uuid]: true
					}))

					useChatsStore.getState().setEmojisText(prev => ({
						...prev,
						[chat.uuid]: emojisSliced
					}))

					useChatsStore.getState().setEmojisSuggestions(prev => ({
						...prev,
						[chat.uuid]: customEmojis.filter(emoji => emoji.name.toLowerCase().includes(normalized)).slice(0, 100)
					}))

					return
				}

				if (mentionOpen) {
					const normalized = mentionSliced.slice(1).toLowerCase().trim()

					useChatsStore.getState().setShowMention(prev => ({
						...prev,
						[chat.uuid]: true
					}))

					useChatsStore.getState().setMentionText(prev => ({
						...prev,
						[chat.uuid]: mentionSliced
					}))

					useChatsStore.getState().setMentionSuggestions(prev => ({
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
			[chat.participants, chat.uuid, resetSuggestions, setValue]
		)

		const actionSheetOptions = useMemo(() => {
			const options = [
				translateMemoized("chats.input.attachment.options.addPhotos"),
				translateMemoized("chats.input.attachment.options.addMedia"),
				translateMemoized("chats.input.attachment.options.addFiles"),
				translateMemoized("chats.input.attachment.options.addDriveItems"),
				translateMemoized("chats.input.attachment.options.cancel")
			]

			return {
				options,
				cancelIndex: options.length - 1,
				desctructiveIndex: options.length - 1,
				indexToType: {
					0: "addPhotos",
					1: "addMedia",
					2: "addFiles",
					3: "addDriveItems"
				} as Record<number, "addPhotos" | "addMedia" | "addFiles" | "addDriveItems">
			}
		}, [])

		const onPlus = useCallback(() => {
			if (!isProUser || !hasInternet) {
				return
			}

			showActionSheetWithOptions(
				{
					options: actionSheetOptions.options,
					cancelButtonIndex: actionSheetOptions.cancelIndex,
					destructiveButtonIndex: actionSheetOptions.desctructiveIndex,
					...(Platform.OS === "android"
						? {
								containerStyle: {
									paddingBottom: insets.bottom,
									backgroundColor: colors.card
								},
								textStyle: {
									color: colors.foreground
								}
						  }
						: {})
				},
				async (selectedIndex?: number) => {
					const type = actionSheetOptions.indexToType[selectedIndex ?? -1]

					try {
						switch (type) {
							case "addFiles": {
								const links = await chatsService.uploadFilesForAttachment({})

								if (links.length === 0) {
									return
								}

								const prevText = value ?? ""

								onChangeText(`${prevText ? `${prevText}\n` : ""}${links.map(link => link.link).join("\n")}`)

								break
							}

							case "addMedia": {
								const links = await chatsService.uploadMediaForAttachment({})

								if (links.length === 0) {
									return
								}

								const prevText = value ?? ""

								onChangeText(`${prevText ? `${prevText}\n` : ""}${links.map(link => link.link).join("\n")}`)

								break
							}

							case "addPhotos": {
								const links = await chatsService.createPhotosForAttachment({})

								if (links.length === 0) {
									return
								}

								const prevText = value ?? ""

								onChangeText(`${prevText ? `${prevText}\n` : ""}${links.map(link => link.link).join("\n")}`)

								break
							}

							case "addDriveItems": {
								const links = await chatsService.selectDriveItemsForAttachment({})

								if (links.length === 0) {
									return
								}

								const prevText = value ?? ""

								onChangeText(`${prevText ? `${prevText}\n` : ""}${links.map(link => link.link).join("\n")}`)

								break
							}
						}
					} catch (e) {
						console.error(e)

						if (e instanceof Error) {
							alerts.error(e.message)
						}
					}
				}
			)
		}, [
			isProUser,
			hasInternet,
			showActionSheetWithOptions,
			actionSheetOptions,
			onChangeText,
			colors.card,
			colors.foreground,
			value,
			insets.bottom
		])

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

			useChatsStore.getState().setReplyToMessage(prev => ({
				...prev,
				[chat.uuid]: null
			}))

			useChatsStore.getState().setEditMessage(prev => ({
				...prev,
				[chat.uuid]: null
			}))

			const uuid = editMessageCopied ? editMessageCopied.uuid : randomUUID()

			try {
				useChatsStore.getState().setPendingMessages(prev => ({
					...prev,
					[uuid]: {
						uuid,
						status: "pending"
					}
				}))

				if (editMessageCopied) {
					chatMessagesQueryUpdate({
						params: {
							conversation: chat.uuid
						},
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
					chatMessagesQueryUpdate({
						params: {
							conversation: chat.uuid
						},
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

					chatUnreadCountQueryUpdate({
						params: {
							conversation: chat.uuid
						},
						updater: count => {
							chatUnreadQueryUpdate({
								updater: prev => (prev - count >= 0 ? prev - count : 0)
							})

							return 0
						}
					})
				}

				const lastFocusTimestamp = Date.now()

				chatsLastFocusQueryUpdate({
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
						values: lastFocus.some(v => v.uuid === chat.uuid)
							? lastFocus.map(v =>
									v.uuid === chat.uuid
										? {
												...v,
												lastFocus: lastFocusTimestamp
										  }
										: v
							  )
							: [
									...lastFocus,
									{
										uuid: chat.uuid,
										lastFocus: lastFocusTimestamp
									}
							  ]
					}),
					chatUnreadQuery.refetch(),
					chatUnreadCountQuery.refetch()
				])

				useChatsStore.getState().setPendingMessages(prev => ({
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

				useChatsStore.getState().setPendingMessages(prev => ({
					...prev,
					[uuid]: {
						uuid,
						status: "failed"
					}
				}))
			} finally {
				setValue("")
			}
		}, [
			value,
			chat.uuid,
			replyToMessage,
			sendTypingEvent,
			userId,
			accountQuery.status,
			email,
			accountQuery.data,
			lastFocus,
			chatUnreadQuery,
			chatUnreadCountQuery,
			setValue,
			editMessage,
			resetSuggestions
		])

		const textInputStyle = useMemo(() => {
			return {
				maxHeight: screen.height / 5,
				borderCurve: "continuous"
			} satisfies StyleProp<TextStyle>
		}, [screen.height])

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

		useEffect(() => {
			setInputHeight(layout.height)
		}, [layout.height, setInputHeight])

		return (
			<View
				ref={viewRef}
				className="shrink-0"
				onLayout={onLayout}
			>
				<View
					className="z-10"
					style={{
						bottom: layout.height,
						flex: 1,
						position: "absolute",
						right: 0,
						left: 0,
						width: "100%",
						height: "auto"
					}}
				>
					<Emojis chat={chat} />
					<Typing chat={chat} />
					<Mention chat={chat} />
					<ReplyTo chat={chat} />
				</View>
				<View className="flex-row items-end gap-2 px-4 py-3 bg-card z-50">
					{isProUser && hasInternet && (
						<Button
							size="icon"
							variant="plain"
							onPress={onPlus}
							className="pb-0.5"
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
						placeholder={translateMemoized("chats.input.placeholder")}
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
						style={{
							bottom: 18,
							right: 24,
							position: "absolute"
						}}
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
		)
	}
)

Input.displayName = "Input"

export default Input
