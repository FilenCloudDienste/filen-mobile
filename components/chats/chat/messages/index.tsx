import { memo, useMemo, useCallback, useRef, Fragment, useState } from "react"
import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import useChatMessagesQuery from "@/queries/useChatMessagesQuery"
import { FlashList, type ListRenderItemInfo, type ViewToken } from "@shopify/flash-list"
import { type ChatMessage } from "@filen/sdk/dist/types/api/v3/chat/messages"
import Message from "./message"
import queryUtils from "@/queries/utils"
import Typing from "./typing"
import nodeWorker from "@/lib/nodeWorker"
import alerts from "@/lib/alerts"
import useHeaderHeight from "@/hooks/useHeaderHeight"
import useChatsLastFocusQuery from "@/queries/useChatsLastFocusQuery"
import Top from "./top"
import useDimensions from "@/hooks/useDimensions"
import { type ViewabilityConfig, View, type NativeSyntheticEvent, type NativeScrollEvent } from "react-native"
import Animated, { useAnimatedStyle, interpolate, FadeIn, FadeOut } from "react-native-reanimated"
import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller"
import Emojis from "../input/suggestions/emojis"
import Mention from "../input/suggestions/mention"
import { useChatsStore } from "@/stores/chats.store"
import ReplyTo from "../input/suggestions/replyTo"
import { useShallow } from "zustand/shallow"
import { Icon } from "@roninoss/icons"
import { Button } from "@/components/nativewindui/Button"
import { useColorScheme } from "@/lib/useColorScheme"

export const Messages = memo(({ chat, isPreview, inputHeight }: { chat: ChatConversation; isPreview: boolean; inputHeight: number }) => {
	const headerHeight = useHeaderHeight()
	const isFetchingMoreMessagesRef = useRef<boolean>(false)
	const chatMessagesQuery = useChatMessagesQuery({
		uuid: chat.uuid
	})
	const lastMessageTimestampRef = useRef<number>(
		Math.max(
			...(
				chatMessagesQuery.data ?? [
					{
						sentTimestamp: Date.now()
					}
				]
			).map(m => m.sentTimestamp)
		)
	)
	const chatsLastFocusQuery = useChatsLastFocusQuery({})
	const { isPortrait, insets, screen } = useDimensions()
	const [initialScrollIndex, setInitialScrollIndex] = useState<number | undefined>(undefined)
	const { progress } = useReanimatedKeyboardAnimation()
	const showEmojis = useChatsStore(useShallow(state => state.showEmojis[chat.uuid] ?? false))
	const showMention = useChatsStore(useShallow(state => state.showMention[chat.uuid] ?? false))
	const emojisText = useChatsStore(useShallow(state => state.emojisText[chat.uuid] ?? ""))
	const mentionText = useChatsStore(useShallow(state => state.mentionText[chat.uuid] ?? ""))
	const emojisSuggestions = useChatsStore(useShallow(state => state.emojisSuggestions[chat.uuid] ?? []))
	const mentionSuggestions = useChatsStore(useShallow(state => state.mentionSuggestions[chat.uuid] ?? []))
	const replyToMessage = useChatsStore(useShallow(state => state.replyToMessage[chat.uuid] ?? null))
	const listRef = useRef<FlashList<ChatMessage>>(null)
	const { colors } = useColorScheme()
	const [showScrollToBottom, setShowScrollToBottom] = useState<boolean>(false)

	const suggestionsVisible = useMemo(() => {
		return (
			replyToMessage ||
			(showEmojis && emojisSuggestions.length > 0 && emojisText.length > 0) ||
			(showMention && mentionSuggestions.length > 0 && mentionText.length > 0)
		)
	}, [showEmojis, emojisText, emojisSuggestions, showMention, mentionText, mentionSuggestions, replyToMessage])

	const headerComponentStyle = useAnimatedStyle(() => {
		"worklet"

		return {
			height: interpolate(progress.value, [0, 1], [inputHeight + 32, insets.bottom + inputHeight - 32]),
			flex: 1
		}
	}, [progress, insets.bottom, inputHeight])

	const toolbarStyle = useAnimatedStyle(() => {
		"worklet"

		return {
			bottom: interpolate(progress.value, [0, 1], [inputHeight, inputHeight - insets.bottom]),
			flex: 1,
			position: "absolute",
			right: 0,
			left: 0,
			width: "100%",
			height: "auto"
		}
	}, [progress, insets.bottom, inputHeight, isPortrait])

	const scrollToBottomStyle = useAnimatedStyle(() => {
		"worklet"

		return {
			bottom: interpolate(progress.value, [0, 1], [inputHeight + 16, inputHeight + 16 - insets.bottom]),
			position: "absolute",
			right: 16,
			zIndex: 100,
			display: showScrollToBottom ? "flex" : "none"
		}
	}, [progress, insets.bottom, inputHeight, showScrollToBottom])

	const lastFocus = useMemo(() => {
		if (chatsLastFocusQuery.status !== "success") {
			return null
		}

		return chatsLastFocusQuery.data.find(chatFocus => chatFocus.uuid === chat.uuid)?.lastFocus ?? null
	}, [chatsLastFocusQuery.data, chatsLastFocusQuery.status, chat.uuid])

	const messages = useMemo(() => {
		if (chatMessagesQuery.status !== "success") {
			return []
		}

		return chatMessagesQuery.data.sort((a, b) => b.sentTimestamp - a.sentTimestamp)
	}, [chatMessagesQuery.data, chatMessagesQuery.status])

	const keyExtractor = useCallback((item: ChatMessage) => {
		return item.uuid
	}, [])

	const renderItem = useCallback(
		(info: ListRenderItemInfo<ChatMessage>) => {
			return (
				<Message
					info={info}
					chat={chat}
					lastMessageTimestamp={lastMessageTimestampRef.current}
					lastFocus={lastFocus}
					previousMessage={messages.at(info.index + 1)}
					nextMessage={messages.at(info.index - 1)}
				/>
			)
		},
		[chat, lastFocus, messages]
	)

	const fetchMoreMessages = useCallback(async () => {
		if (isFetchingMoreMessagesRef.current) {
			return
		}

		isFetchingMoreMessagesRef.current = true

		try {
			if (messages.length === 0) {
				return
			}

			const lastMessage = messages.at(-1)

			if (!lastMessage) {
				return
			}

			const fetched = await nodeWorker.proxy("fetchChatMessages", {
				conversation: chat.uuid,
				timestamp: lastMessage.sentTimestamp
			})

			const existingUUIDs = messages.map(m => m.uuid)

			queryUtils.useChatMessagesQuerySet({
				uuid: chat.uuid,
				updater: prev => [...fetched.filter(m => !existingUUIDs.includes(m.uuid)), ...prev]
			})
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			isFetchingMoreMessagesRef.current = false
		}
	}, [messages, chat.uuid])

	const viewabilityConfig = useMemo((): ViewabilityConfig => {
		return {
			itemVisiblePercentThreshold: 99
		}
	}, [])

	const onViewableItemsChanged = useCallback((info: { viewableItems: ViewToken[]; changed: ViewToken[] }) => {
		setInitialScrollIndex(info.viewableItems?.at(0)?.index ?? undefined)
	}, [])

	const onScroll = useCallback(
		(e: NativeSyntheticEvent<NativeScrollEvent>) => {
			setShowScrollToBottom(e.nativeEvent.contentOffset.y > screen.height)
		},
		[screen.height]
	)

	const scrollToBottom = useCallback(() => {
		listRef.current?.scrollToOffset({
			offset: 0,
			animated: false
		})

		setShowScrollToBottom(false)
	}, [])

	return (
		<Fragment>
			{!isPreview && (
				<Top
					chat={chat}
					messages={messages}
					lastFocus={lastFocus}
				/>
			)}
			<Animated.View
				style={scrollToBottomStyle}
				entering={FadeIn}
				exiting={FadeOut}
			>
				<Button
					onPress={scrollToBottom}
					size="none"
					variant="plain"
					className="rounded-full bg-card p-1.5"
					hitSlop={15}
					unstable_pressDelay={100}
				>
					<Icon
						name="arrow-down"
						size={20}
						color={colors.foreground}
					/>
				</Button>
			</Animated.View>
			<FlashList
				ref={listRef}
				onScroll={onScroll}
				onEndReached={fetchMoreMessages}
				data={messages}
				keyExtractor={keyExtractor}
				renderItem={renderItem}
				estimatedItemSize={100}
				inverted={true}
				drawDistance={isPreview ? 0 : screen.height}
				initialScrollIndex={initialScrollIndex}
				keyboardDismissMode={suggestionsVisible ? "none" : "on-drag"}
				keyboardShouldPersistTaps={suggestionsVisible ? "always" : "never"}
				showsHorizontalScrollIndicator={false}
				showsVerticalScrollIndicator={false}
				extraData={lastFocus}
				ListFooterComponent={
					isPreview ? undefined : (
						<View
							style={{
								height: headerHeight + 8
							}}
						/>
					)
				}
				ListHeaderComponent={isPreview ? undefined : <Animated.View style={headerComponentStyle} />}
				viewabilityConfig={viewabilityConfig}
				onViewableItemsChanged={onViewableItemsChanged}
			/>
			{!isPreview && (
				<Animated.View style={toolbarStyle}>
					<Typing chat={chat} />
					<Emojis chat={chat} />
					<Mention chat={chat} />
					<ReplyTo chat={chat} />
				</Animated.View>
			)}
		</Fragment>
	)
})

Messages.displayName = "Messages"

export default Messages
