import { memo, useMemo, useCallback } from "react"
import { type ChatMessage } from "@filen/sdk/dist/types/api/v3/chat/messages"
import { Button } from "@/components/nativewindui/Button"
import { Text } from "@/components/nativewindui/Text"
import Avatar from "@/components/avatar"
import { View, Platform, type ViewStyle, type StyleProp } from "react-native"
import { contactName, isTimestampSameDay, isTimestampSameMinute, simpleDateNoTime } from "@/lib/utils"
import Menu from "./menu"
import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import { useChatsStore } from "@/stores/chats.store"
import { cn } from "@/lib/cn"
import Animated, {
	useSharedValue,
	withSpring,
	runOnJS,
	useAnimatedStyle,
	type WithSpringConfig,
	type AnimatedStyle
} from "react-native-reanimated"
import useSDKConfig from "@/hooks/useSDKConfig"
import Date from "./date"
import ReplacedMessageContent, { MENTION_REGEX } from "./replace"
import { useActionSheet } from "@expo/react-native-action-sheet"
import useDimensions from "@/hooks/useDimensions"
import { useColorScheme } from "@/lib/useColorScheme"
import * as Clipboard from "expo-clipboard"
import alerts from "@/lib/alerts"
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons"
import { useShallow } from "zustand/shallow"
import ReplyTo from "./replyTo"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import * as Haptics from "expo-haptics"
import { useMMKVString } from "react-native-mmkv"
import mmkvInstance from "@/lib/mmkv"
import useNetInfo from "@/hooks/useNetInfo"
import { useTranslation } from "react-i18next"
import chatsService from "@/services/chats.service"
import { type ListRenderItemInfo } from "@shopify/flash-list"

const avatarStyle = {
	width: 36,
	height: 36
}

const springConfig = {
	damping: 20,
	stiffness: 300,
	mass: 0.4,
	overshootClamping: false,
	restDisplacementThreshold: 0.01,
	restSpeedThreshold: 2
} satisfies WithSpringConfig

export const Message = memo(
	({
		info,
		chat,
		lastFocus,
		previousMessage,
		nextMessage
	}: {
		info: ListRenderItemInfo<ChatMessage>
		chat: ChatConversation
		lastFocus: number | null
		previousMessage: ChatMessage | undefined
		nextMessage: ChatMessage | undefined
	}) => {
		const [{ userId }] = useSDKConfig()
		const pendingState = useChatsStore(
			useShallow(state => (state.pendingMessages[info.item.uuid] ? state.pendingMessages[info.item.uuid]?.status : undefined))
		)
		const {
			insets: { bottom: bottomInsets },
			screen
		} = useDimensions()
		const { showActionSheetWithOptions } = useActionSheet()
		const { colors } = useColorScheme()
		const translateX = useSharedValue<number>(0)
		const contextX = useSharedValue<number>(0)
		const replyToMessageUUID = useChatsStore(useShallow(state => state.replyToMessage[chat.uuid]?.uuid))
		const editMessageUUID = useChatsStore(useShallow(state => state.editMessage[chat.uuid]?.uuid))
		const [, setChatInputValue] = useMMKVString(`chatInputValue:${chat.uuid}`, mmkvInstance)
		const { hasInternet } = useNetInfo()
		const { t } = useTranslation()

		const { isMessageUndecryptable, isReplyToMessageUndecryptable } = useMemo(() => {
			const messageNormalized = info.item.message.toLowerCase().trim()
			const replyToMessageNormalized = info.item.replyTo?.message.toLowerCase().trim() ?? ""

			return {
				isMessageUndecryptable: messageNormalized.startsWith("cannot_decrypt_") && messageNormalized.endsWith(`_${info.item.uuid}`),
				isReplyToMessageUndecryptable:
					replyToMessageNormalized.startsWith("cannot_decrypt_") &&
					replyToMessageNormalized.endsWith(`_${info.item.replyTo?.uuid}`)
			}
		}, [info.item.uuid, info.item.message, info.item.replyTo?.uuid, info.item.replyTo?.message])

		const actionSheetOptions = useMemo(() => {
			const options =
				info.item.senderId === userId
					? [
							t("chats.messages.menu.reply"),
							t("chats.messages.menu.copyText"),
							t("chats.messages.menu.edit"),
							t("chats.messages.menu.disableEmbeds"),
							t("chats.messages.menu.delete"),
							t("chats.messages.menu.cancel")
					  ]
					: [t("chats.messages.menu.reply"), t("chats.messages.menu.copyText"), t("chats.messages.menu.cancel")]

			return {
				options,
				cancelIndex: options.length - 1,
				desctructiveIndex: info.item.senderId === userId ? [options.length - 2, options.length - 1] : options.length - 1,
				indexToType: (info.item.senderId === userId
					? {
							0: "reply",
							1: "copyText",
							2: "edit",
							3: "disableEmbeds",
							4: "delete"
					  }
					: {
							0: "reply",
							1: "copyText"
					  }) as Record<number, "reply" | "copyText" | "edit" | "delete" | "disableEmbeds">
			}
		}, [info.item.senderId, userId, t])

		const reply = useCallback(() => {
			useChatsStore.getState().setReplyToMessage(prev => ({
				...prev,
				[chat.uuid]: info.item
			}))

			useChatsStore.getState().setEditMessage(prev => ({
				...prev,
				[chat.uuid]: null
			}))
		}, [info.item, chat.uuid])

		const edit = useCallback(() => {
			setChatInputValue(info.item.message)

			useChatsStore.getState().setEditMessage(prev => ({
				...prev,
				[chat.uuid]: info.item
			}))

			useChatsStore.getState().setReplyToMessage(prev => ({
				...prev,
				[chat.uuid]: null
			}))
		}, [info.item, chat.uuid, setChatInputValue])

		const onPress = useCallback(() => {
			if (!hasInternet) {
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
									paddingBottom: bottomInsets,
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
							case "reply": {
								reply()

								break
							}

							case "copyText": {
								try {
									await Clipboard.setStringAsync(info.item.message)

									alerts.normal("Copied to clipboard.")
								} catch (e) {
									console.error(e)

									if (e instanceof Error) {
										alerts.error(e.message)
									}
								}

								break
							}

							case "edit": {
								edit()

								break
							}

							case "delete": {
								await chatsService.deleteMessage({
									chat,
									message: info.item
								})

								break
							}

							case "disableEmbeds": {
								await chatsService.disableEmbeds({
									chat,
									message: info.item
								})

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
			bottomInsets,
			colors.card,
			colors.foreground,
			showActionSheetWithOptions,
			actionSheetOptions,
			info.item,
			reply,
			edit,
			hasInternet,
			chat
		])

		const name = useMemo(() => {
			return contactName(info.item.senderEmail, info.item.senderNickName)
		}, [info.item.senderEmail, info.item.senderNickName])

		const avatarSource = useMemo(() => {
			return {
				uri:
					typeof info.item.senderAvatar === "string" && info.item.senderAvatar.startsWith("https")
						? info.item.senderAvatar
						: "avatar_fallback"
			}
		}, [info.item.senderAvatar])

		const groupWithPreviousMessage = useMemo((): boolean => {
			if (!previousMessage) {
				return false
			}

			return (
				previousMessage.senderId === info.item.senderId &&
				!(info.item.replyTo && info.item.replyTo.uuid && info.item.replyTo.uuid.length > 0) &&
				isTimestampSameMinute(previousMessage.sentTimestamp, info.item.sentTimestamp)
			)
		}, [previousMessage, info.item.senderId, info.item.sentTimestamp, info.item.replyTo])

		const groupWithNextMessage = useMemo((): boolean => {
			if (!nextMessage) {
				return false
			}

			return (
				nextMessage.senderId === info.item.senderId &&
				!(info.item.replyTo && info.item.replyTo.uuid && info.item.replyTo.uuid.length > 0) &&
				isTimestampSameMinute(nextMessage.sentTimestamp, info.item.sentTimestamp)
			)
		}, [nextMessage, info.item.senderId, info.item.sentTimestamp, info.item.replyTo])

		const showNewDivider = useMemo(() => {
			if (!lastFocus) {
				return false
			}

			return (
				info.item.sentTimestamp > lastFocus &&
				info.item.senderId !== userId &&
				!(previousMessage && previousMessage.sentTimestamp > lastFocus)
			)
		}, [info.item.sentTimestamp, lastFocus, userId, info.item.senderId, previousMessage])

		const previousMessageSameDay = useMemo((): boolean => {
			if (!previousMessage) {
				return true
			}

			return isTimestampSameDay(previousMessage.sentTimestamp, info.item.sentTimestamp)
		}, [previousMessage, info.item.sentTimestamp])

		const showDateDivider = useMemo(() => {
			return !previousMessageSameDay && !groupWithPreviousMessage && previousMessage
		}, [previousMessageSameDay, previousMessage, groupWithPreviousMessage])

		const mentioningMe = useMemo((): boolean => {
			if (info.item.replyTo && info.item.replyTo.senderId === userId) {
				return true
			}

			const matches = info.item.message.match(MENTION_REGEX)

			if (!matches || matches.length === 0) {
				return false
			}

			const userEmail = chat.participants.filter(p => p.userId === userId)

			if (userEmail.length === 0 || !userEmail[0]) {
				return false
			}

			return (
				matches.filter(match => {
					const email = match.trim().slice(1)

					if (email === "everyone") {
						return true
					}

					if (email.startsWith("@") || email.endsWith("@")) {
						return false
					}

					return userEmail[0]?.email === email
				}).length > 0
			)
		}, [info.item.message, chat.participants, userId, info.item.replyTo])

		const { SWIPE_THRESHOLD, MAX_SWIPE_DISTANCE } = useMemo(() => {
			return {
				SWIPE_THRESHOLD: screen.width * 0.1,
				MAX_SWIPE_DISTANCE: screen.width * 0.3
			}
		}, [screen.width])

		const onSwipeLeft = useCallback(() => {
			if (!hasInternet || isMessageUndecryptable) {
				return
			}

			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(console.error)

			onPress()
		}, [onPress, hasInternet, isMessageUndecryptable])

		const onSwipeRight = useCallback(() => {
			if (!hasInternet || isMessageUndecryptable) {
				return
			}

			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(console.error)

			useChatsStore.getState().setReplyToMessage(prev => ({
				...prev,
				[chat.uuid]: info.item
			}))
		}, [chat.uuid, info.item, hasInternet, isMessageUndecryptable])

		const panGesture = useMemo(() => {
			return Gesture.Pan()
				.onStart(() => {
					"worklet"

					contextX.value = translateX.value
				})
				.onUpdate(event => {
					"worklet"

					const maxDistance = MAX_SWIPE_DISTANCE
					const newTranslateX = contextX.value + event.translationX

					if (newTranslateX < 0) {
						translateX.value = Math.max(-maxDistance, newTranslateX)
					} else {
						translateX.value = Math.min(maxDistance, newTranslateX)
					}
				})
				.onEnd(event => {
					"worklet"

					if (Math.abs(event.velocityX) > 500) {
						if (event.velocityX < 0) {
							translateX.value = withSpring(-MAX_SWIPE_DISTANCE, springConfig, () => {
								translateX.value = withSpring(0, springConfig)

								runOnJS(onSwipeLeft)()
							})
						} else {
							translateX.value = withSpring(MAX_SWIPE_DISTANCE, springConfig, () => {
								translateX.value = withSpring(0, springConfig)

								runOnJS(onSwipeRight)()
							})
						}
					} else if (translateX.value < -SWIPE_THRESHOLD) {
						translateX.value = withSpring(-MAX_SWIPE_DISTANCE, springConfig, () => {
							translateX.value = withSpring(0, springConfig)

							runOnJS(onSwipeLeft)()
						})
					} else if (translateX.value > SWIPE_THRESHOLD) {
						translateX.value = withSpring(MAX_SWIPE_DISTANCE, springConfig, () => {
							translateX.value = withSpring(0, springConfig)

							runOnJS(onSwipeRight)()
						})
					} else {
						translateX.value = withSpring(0, springConfig)
					}
				})
				.activeOffsetX([-20, 20])
				.failOffsetY([-10, 10])
				.shouldCancelWhenOutside(true)
		}, [MAX_SWIPE_DISTANCE, SWIPE_THRESHOLD, onSwipeLeft, onSwipeRight, translateX, contextX])

		const panStyle = useAnimatedStyle(() => {
			return {
				transform: [
					{
						translateX: translateX.value
					}
				]
			}
		})

		const rootStyle = useMemo(() => {
			return {
				flex: 1,
				paddingTop: groupWithPreviousMessage ? 0 : 8,
				transform: [
					{
						scaleY: -1
					}
				]
			}
		}, [groupWithPreviousMessage])

		const animatedStyle = useMemo(() => {
			return [
				{
					flex: 1,
					flexDirection: "column",
					backgroundColor: colors.background
				},
				panStyle
			] satisfies StyleProp<AnimatedStyle<StyleProp<ViewStyle>>>
		}, [colors.background, panStyle])

		const buttonClassName = useMemo(() => {
			return cn(
				"justify-start flex-1 flex-col px-4 active:opacity-70",
				!groupWithPreviousMessage && !groupWithNextMessage ? "py-1.5" : "py-1",
				replyToMessageUUID === info.item.uuid || editMessageUUID === info.item.uuid
					? "bg-card/30 border-l-2 border-l-card"
					: pendingState && pendingState === "failed"
					? "bg-red-500/5 border-l-2 border-l-red-500"
					: mentioningMe
					? "bg-yellow-500/5 border-l-2 border-l-yellow-500"
					: ""
			)
		}, [
			groupWithPreviousMessage,
			groupWithNextMessage,
			replyToMessageUUID,
			editMessageUUID,
			info.item.uuid,
			pendingState,
			mentioningMe
		])

		const replaceClassName = useMemo(() => {
			return cn("flex-1", !groupWithPreviousMessage ? "pt-1" : "pl-[52px]", pendingState && pendingState !== "sent" && "opacity-70")
		}, [groupWithPreviousMessage, pendingState])

		return (
			<View style={rootStyle}>
				{showDateDivider && (
					<View className="flex-1 flex-row px-4 py-4 gap-2 items-center">
						<View className="flex-1 bg-border h-[0.5px]" />
						<Text
							variant="caption1"
							className="text-muted-foreground"
						>
							{simpleDateNoTime(info.item.sentTimestamp)}
						</Text>
						<View className="flex-1 bg-border h-[1px]" />
					</View>
				)}
				{showNewDivider && (
					<View className="flex-1 flex-row px-4 gap-0 items-center">
						<View className="flex-1 bg-red-500 h-[0.5px]" />
						<View className="flex-row items-center justify-center bg-red-500 rounded-full p-0.5 px-1">
							<Text
								variant="caption2"
								className="text-foreground uppercase font-normal"
							>
								{t("chats.messages.new").toUpperCase()}
							</Text>
						</View>
					</View>
				)}
				<Menu
					chat={chat}
					message={info.item}
				>
					<GestureDetector gesture={panGesture}>
						<Animated.View style={animatedStyle}>
							<Button
								className={buttonClassName}
								variant="plain"
								size="none"
								unstable_pressDelay={100}
								onPress={onPress}
							>
								{info.item.replyTo &&
									info.item.replyTo.uuid &&
									info.item.replyTo.uuid.length > 0 &&
									!isReplyToMessageUndecryptable && (
										<View className="flex-1 flex-row items-center">
											<ReplyTo
												message={info.item}
												chat={chat}
											/>
										</View>
									)}
								<View className="flex-row gap-4 flex-1">
									{!groupWithPreviousMessage && (
										<Avatar
											source={avatarSource}
											style={avatarStyle}
										/>
									)}
									<View className="flex-col flex-1">
										{!groupWithPreviousMessage && (
											<View className="flex-row items-center gap-2 flex-1">
												<Text
													variant="heading"
													numberOfLines={1}
													ellipsizeMode="middle"
													className="flex-shrink"
												>
													{name}
												</Text>
												<Text
													variant="caption1"
													className="text-muted-foreground shrink-0 pt-1"
												>
													<Date
														timestamp={info.item.sentTimestamp}
														uuid={info.item.uuid}
													/>
												</Text>
											</View>
										)}
										<View className={replaceClassName}>
											{isMessageUndecryptable ? (
												<Text className="italic text-sm text-muted-foreground font-normal shrink flex-wrap text-wrap items-center break-all">
													{t("chats.messages.undecryptable")}
												</Text>
											) : (
												<ReplacedMessageContent
													message={info.item}
													chat={chat}
													embedsDisabled={info.item.embedDisabled}
													edited={info.item.edited}
												/>
											)}
										</View>
										{pendingState && pendingState === "failed" && (
											<MaterialCommunityIcons
												name="signal-off"
												size={17}
												color="#ef4444"
												className={cn("pt-1", groupWithPreviousMessage && "pl-[52px]")}
											/>
										)}
									</View>
								</View>
							</Button>
						</Animated.View>
					</GestureDetector>
				</Menu>
				{info.index === 0 && <View className="h-8 w-full flex-1 basis-full" />}
			</View>
		)
	}
)

Message.displayName = "Message"

export default Message
