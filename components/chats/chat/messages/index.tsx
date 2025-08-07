import { memo, useMemo, useCallback, useRef, Fragment, useState } from "react"
import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import useChatMessagesQuery from "@/queries/useChatMessagesQuery"
import { type ChatMessage } from "@filen/sdk/dist/types/api/v3/chat/messages"
import Message from "./message"
import queryUtils from "@/queries/utils"
import nodeWorker from "@/lib/nodeWorker"
import alerts from "@/lib/alerts"
import useHeaderHeight from "@/hooks/useHeaderHeight"
import useChatsLastFocusQuery from "@/queries/useChatsLastFocusQuery"
import Top from "./top"
import useDimensions from "@/hooks/useDimensions"
import { View, type NativeSyntheticEvent, type NativeScrollEvent, ActivityIndicator, type ViewToken } from "react-native"
import Animated, { useAnimatedStyle, FadeIn, FadeOut } from "react-native-reanimated"
import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller"
import { useChatsStore } from "@/stores/chats.store"
import { useShallow } from "zustand/shallow"
import { Icon } from "@roninoss/icons"
import { Button } from "@/components/nativewindui/Button"
import { useColorScheme } from "@/lib/useColorScheme"
import { FlashList, type ListRenderItemInfo, type FlashListRef, type FlashListProps } from "@shopify/flash-list"
import { Text } from "@/components/nativewindui/Text"
import { cn } from "@/lib/cn"

export const Messages = memo(({ chat, isPreview }: { chat: ChatConversation; isPreview: boolean }) => {
	const headerHeight = useHeaderHeight()
	const isFetchingMoreMessagesRef = useRef<boolean>(false)
	const chatMessagesQuery = useChatMessagesQuery({
		uuid: chat.uuid
	})
	const chatsLastFocusQuery = useChatsLastFocusQuery({})
	const { insets, screen } = useDimensions()
	const { progress } = useReanimatedKeyboardAnimation()
	const showEmojis = useChatsStore(useShallow(state => state.showEmojis[chat.uuid] ?? false))
	const showMention = useChatsStore(useShallow(state => state.showMention[chat.uuid] ?? false))
	const emojisText = useChatsStore(useShallow(state => state.emojisText[chat.uuid] ?? ""))
	const mentionText = useChatsStore(useShallow(state => state.mentionText[chat.uuid] ?? ""))
	const emojisSuggestions = useChatsStore(useShallow(state => state.emojisSuggestions[chat.uuid] ?? []))
	const mentionSuggestions = useChatsStore(useShallow(state => state.mentionSuggestions[chat.uuid] ?? []))
	const replyToMessage = useChatsStore(useShallow(state => state.replyToMessage[chat.uuid] ?? null))
	const listRef = useRef<FlashListRef<ChatMessage>>(null)
	const { colors } = useColorScheme()
	const [showScrollToBottom, setShowScrollToBottom] = useState<boolean>(false)
	const [initialScrollIndex, setInitialScrollIndex] = useState<number | null>(null)

	const suggestionsVisible = useMemo(() => {
		return (
			replyToMessage ||
			(showEmojis && emojisSuggestions.length > 0 && emojisText.length > 0) ||
			(showMention && mentionSuggestions.length > 0 && mentionText.length > 0)
		)
	}, [showEmojis, emojisText, emojisSuggestions, showMention, mentionText, mentionSuggestions, replyToMessage])

	const scrollToBottomStyle = useAnimatedStyle(() => {
		"worklet"

		return {
			bottom: insets.bottom + 48,
			position: "absolute",
			right: 16,
			zIndex: 100,
			display: showScrollToBottom && !suggestionsVisible ? "flex" : "none"
		}
	}, [progress, insets.bottom, showScrollToBottom, suggestionsVisible])

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
			console.log(
				"renderItem",
				info.index,
				messages.at(info.index + 1)?.uuid,
				messages.at(info.index - 1)?.uuid,
				info.index + 1,
				info.index - 1
			)
			return (
				<Message
					info={info}
					chat={chat}
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

			const firstMessage = messages.at(-1)

			if (!firstMessage) {
				return
			}

			const fetched = await nodeWorker.proxy("fetchChatMessages", {
				conversation: chat.uuid,
				timestamp: firstMessage.sentTimestamp
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

	const onScroll = useCallback(
		(e: NativeSyntheticEvent<NativeScrollEvent>) => {
			setShowScrollToBottom(e.nativeEvent.contentOffset.y > screen.height)
		},
		[screen.height]
	)

	const scrollToBottom = useCallback(() => {
		listRef?.current?.scrollToTop({
			animated: false
		})

		setShowScrollToBottom(false)
	}, [])

	const ListFooterComponent = useCallback(() => {
		return isPreview ? undefined : (
			<View
				style={{
					height: headerHeight + 8
				}}
			/>
		)
	}, [headerHeight, isPreview])

	const ListEmptyComponent = useCallback(() => {
		return (
			<View className={cn("flex-1 flex-col gap-2 px-4", isPreview && "py-4")}>
				<Text variant="heading">End-to-end encrypted chat</Text>
				<Text variant="subhead">Filen secures every chat with zero-knowledge end-to-end encryption by default.</Text>
				{chatMessagesQuery.status === "pending" && !isPreview && (
					<ActivityIndicator
						size="small"
						color={colors.foreground}
					/>
				)}
			</View>
		)
	}, [chatMessagesQuery.status, colors.foreground, isPreview])

	const viewabilityConfig = useMemo(() => {
		return {
			itemVisiblePercentThreshold: 99.9
		} satisfies FlashListProps<ChatMessage>["viewabilityConfig"]
	}, [])

	const onViewableItemsChanged = useCallback((items: { viewableItems: ViewToken<ChatMessage>[]; changed: ViewToken<ChatMessage>[] }) => {
		if (!items || !items.viewableItems || items.viewableItems.length === 0) {
			return
		}

		const firstVisibleItem = items.viewableItems.at(0)

		if (!firstVisibleItem || typeof firstVisibleItem.index !== "number") {
			return
		}

		setInitialScrollIndex(firstVisibleItem.index)
	}, [])

	const maintainVisibleContentPosition = useMemo(() => {
		return {
			disabled: false,
			startRenderingFromBottom: false,
			animateAutoScrollToBottom: false,
			autoscrollToTopThreshold: undefined,
			autoscrollToBottomThreshold: undefined
		} satisfies FlashListProps<ChatMessage>["maintainVisibleContentPosition"]
	}, [])

	const scrollIndicatorInsets = useMemo(() => {
		return {
			top: -(insets.bottom + 68),
			bottom: headerHeight
		} satisfies FlashListProps<ChatMessage>["scrollIndicatorInsets"]
	}, [insets.bottom, headerHeight])

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
					className="rounded-full bg-card p-2"
					hitSlop={15}
					unstable_pressDelay={100}
				>
					<Icon
						name="arrow-down"
						size={24}
						color={colors.foreground}
					/>
				</Button>
			</Animated.View>
			<View
				style={{
					flex: 1,
					transform: [
						{
							scaleY: -1
						}
					]
				}}
			>
				<FlashList
					ref={listRef}
					className="bg-background"
					onScroll={onScroll}
					onEndReached={fetchMoreMessages}
					onEndReachedThreshold={0.2}
					initialScrollIndex={initialScrollIndex}
					viewabilityConfig={viewabilityConfig}
					onViewableItemsChanged={onViewableItemsChanged}
					data={messages}
					keyExtractor={keyExtractor}
					renderItem={renderItem}
					keyboardDismissMode={suggestionsVisible ? "interactive" : "on-drag"}
					keyboardShouldPersistTaps={suggestionsVisible ? "handled" : "always"}
					showsHorizontalScrollIndicator={false}
					showsVerticalScrollIndicator={true}
					scrollIndicatorInsets={scrollIndicatorInsets}
					ListFooterComponent={ListFooterComponent}
					ListEmptyComponent={ListEmptyComponent}
					maintainVisibleContentPosition={maintainVisibleContentPosition}
				/>
			</View>
		</Fragment>
	)
})

Messages.displayName = "Messages"

export default Messages
