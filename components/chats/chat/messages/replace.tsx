import { memo, useMemo, useCallback, Fragment, useRef, useEffect } from "react"
import regexifyString from "regexify-string"
import { type ChatConversation, type ChatConversationParticipant } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import { type ChatMessage } from "@filen/sdk/dist/types/api/v3/chat/messages"
import { Text } from "@/components/nativewindui/Text"
import { View, type GestureResponderEvent } from "react-native"
import { customEmojis } from "./customEmojis"
import { contactName, getMessageLinkType } from "@/lib/utils"
import { Button } from "@/components/nativewindui/Button"
import Fallback from "./embeds/containers/fallback"
import alerts from "@/lib/alerts"
import TurboImage from "react-native-turbo-image"
import * as Clipboard from "expo-clipboard"
import { cn } from "@/lib/cn"
import { Embed } from "./embeds"
import useViewLayout from "@/hooks/useViewLayout"
import { useChatsStore } from "@/stores/chats.store"
import useChatEmbedContainerStyle from "@/hooks/useChatEmbedContainerStyle"
import useNetInfo from "@/hooks/useNetInfo"
import { useTranslation } from "react-i18next"
import { useMappingHelper } from "@shopify/flash-list"
import assets from "@/lib/assets"

export const MENTION_REGEX = /(@[\w.-]+@[\w.-]+\.\w+|@everyone)/g
export const customEmojisList = customEmojis.map(emoji => emoji.id)
export const customEmojisListRecord: Record<string, string> = customEmojis.reduce(
	(prev, value) => ({
		...prev,
		[value.id]: value.skins[0] ? value.skins[0].src : ""
	}),
	{}
)
export const lineBreakRegex: RegExp = /\n/gi
export const codeRegex: RegExp = /```([\s\S]*?)```/gi
export const urlRegex: RegExp = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,64}\b(?:[-a-zA-Z0-9()@:%_+.~#?&//=]*)/gi
export const emojiRegexWithSkinTones: RegExp = /:[\d+_a-z-]+(?:::skin-tone-\d+)?:/gi
export const mentions: RegExp = /(@[\w.-]+@[\w.-]+\.\w+|@everyone)/gi

export const messageContentRegex = new RegExp(
	`${emojiRegexWithSkinTones.source}|${codeRegex.source}|${urlRegex.source}|${mentions.source}|${lineBreakRegex.source}`
)

export const Mention = memo(({ name, participant }: { name: string; participant?: ChatConversationParticipant }) => {
	const onPress = useCallback(() => {
		if (!participant) {
			return
		}

		// TODO: profile popup
	}, [participant])

	return (
		<Button
			className="flex-row items-center justify-start active:opacity-70 shrink-0"
			unstable_pressDelay={100}
			variant="plain"
			size="none"
			onPress={onPress}
		>
			<View className="bg-blue-500 rounded-md p-[1px] px-1 shrink-0">
				<Text className="text-white text-sm font-normal">@{name}</Text>
			</View>
		</Button>
	)
})

Mention.displayName = "Mention"

export const CodeBlock = memo(({ match }: { match: string }) => {
	const chatEmbedContainerStyle = useChatEmbedContainerStyle()
	const { t } = useTranslation()

	const code = useMemo(() => {
		let code = match.split("```").join("").trim()

		if (code.startsWith("\n")) {
			code = code.slice(1, code.length)
		}

		if (code.endsWith("\n")) {
			code = code.slice(0, code.length - 1)
		}

		return code
	}, [match])

	const onPress = useCallback(
		async (e: GestureResponderEvent) => {
			try {
				e.preventDefault()
				e.stopPropagation()

				await Clipboard.setStringAsync(code)

				alerts.normal(t("copiedToClipboard"))
			} catch (e) {
				console.error(e)

				if (e instanceof Error) {
					alerts.error(e.message)
				}
			}
		},
		[code, t]
	)

	return (
		<View
			className="flex-1 rounded-md bg-card basis-full"
			style={chatEmbedContainerStyle}
		>
			<Button
				variant="plain"
				size="none"
				className="active:opacity-70 items-start justify-start p-2 py-1"
				unstable_pressDelay={100}
				android_ripple={null}
				onPress={onPress}
			>
				<Text className="text-muted-foreground font-normal text-sm">{code}</Text>
			</Button>
		</View>
	)
})

CodeBlock.displayName = "CodeBlock"

export const Link = memo(({ match, embedsDisabled }: { match: string; embedsDisabled: boolean }) => {
	const viewRef = useRef<View>(null)
	const { onLayout, layout } = useViewLayout(viewRef)
	const { hasInternet } = useNetInfo()

	const url = useMemo(() => {
		return match.trim()
	}, [match])

	const type = useMemo(() => {
		return getMessageLinkType(url)
	}, [url])

	useEffect(() => {
		if (!viewRef.current) {
			return
		}

		const width = Math.round(layout.width)

		if (width <= 0) {
			return
		}

		const currentWidth = Math.round(useChatsStore.getState().embedContainerWidth)

		if (currentWidth === width) {
			return
		}

		useChatsStore.getState().setEmbedContainerWidth(width)
	}, [layout.width])

	if (embedsDisabled || !hasInternet || url.length === 0 || url.startsWith("http://")) {
		return <Fallback link={url} />
	}

	return (
		<View
			ref={viewRef}
			onLayout={onLayout}
			className="flex-1 basis-full flex-row pt-1 w-full"
		>
			<Embed
				type={type}
				link={url}
			/>
		</View>
	)
})

Link.displayName = "Link"

export const ReplacedMessageContent = memo(
	({
		chat,
		message,
		emojiSize,
		embedsDisabled,
		edited
	}: {
		chat: ChatConversation
		message: ChatMessage
		emojiSize?: number
		embedsDisabled: boolean
		edited: boolean
	}) => {
		const { t } = useTranslation()
		const { getMappingKey } = useMappingHelper()

		const replaced = useMemo(() => {
			const emojiCount = message.message.match(emojiRegexWithSkinTones)
			const defaultSize = typeof emojiSize === "number" ? emojiSize : 32
			let size: number | undefined = defaultSize

			if (emojiCount) {
				const emojiCountJoined = emojiCount.join("")

				if (emojiCountJoined.length !== message.message.trim().length) {
					size = 20
				}
			}

			const regexed = regexifyString({
				pattern: messageContentRegex,
				decorator: match => {
					if (match.startsWith("@") && (match.split("@").length === 3 || match.startsWith("@everyone"))) {
						const email = match.slice(1).trim()

						if (email === "everyone") {
							return <Mention name={t("chats.messages.everyone")} />
						}

						if (!email.includes("@")) {
							return <Mention name={t("chats.messages.unknown")} />
						}

						const foundParticipant = chat.participants.find(p => p.email === email)

						if (!foundParticipant) {
							return <Mention name={t("chats.messages.unknown")} />
						}

						return (
							<Mention
								name={contactName(foundParticipant.email, foundParticipant.nickName)}
								participant={foundParticipant}
							/>
						)
					}

					if (match.split("```").length >= 3) {
						return <CodeBlock match={match} />
					}

					if (match.startsWith("https://") || match.startsWith("http://")) {
						return (
							<Link
								match={match}
								embedsDisabled={embedsDisabled ? embedsDisabled : match.startsWith("http://")}
							/>
						)
					}

					if (match.includes("\n")) {
						return <View className="flex-1 w-full h-2 basis-full" />
					}

					const customEmoji = match.split(":").join("").trim()

					if (customEmojisList.includes(customEmoji) && customEmojisListRecord[customEmoji]) {
						return (
							<TurboImage
								cachePolicy="dataCache"
								style={{
									width: size ? size : 24,
									height: size ? size : 24
								}}
								source={{
									uri: customEmojisListRecord[customEmoji]
								}}
								className="shrink-0"
								placeholder={{
									blurhash: assets.blurhash.images.fallback
								}}
							/>
						)
					}

					return match
				},
				input: message.message
			}) as (string | React.ReactElement)[]

			if (edited) {
				regexed.push(
					<Text
						variant="caption2"
						className={cn("text-muted-foreground flex-1 basis-full pt-1")}
					>
						(edited)
					</Text>
				)
			}

			return regexed
		}, [message.message, chat.participants, emojiSize, embedsDisabled, edited, t])

		return (
			<View className="flex-1 flex-row flex-wrap text-wrap justify-start break-all items-center">
				{replaced.map((item, index) => {
					if (typeof item === "string") {
						if (item.length === 0) {
							return null
						}

						return (
							<Text
								key={getMappingKey(index, index)}
								className="text-sm text-foreground font-normal shrink flex-wrap text-wrap items-center break-all"
							>
								{item}
							</Text>
						)
					}

					return <Fragment key={getMappingKey(index, index)}>{item}</Fragment>
				})}
			</View>
		)
	}
)

ReplacedMessageContent.displayName = "ReplacedMessageContent"

export const ReplacedMessageContentInline = memo(
	({
		chat,
		message,
		textClassName,
		prepend,
		emojiSize,
		linkClassName
	}: {
		chat: ChatConversation
		message: ChatMessage
		textClassName?: string
		prepend?: React.ReactNode
		emojiSize?: number
		linkClassName?: string
	}) => {
		const { t } = useTranslation()

		const replaced = useMemo(() => {
			const regexed = regexifyString({
				pattern: messageContentRegex,
				decorator: match => {
					if (match.startsWith("@") && (match.split("@").length === 3 || match.startsWith("@everyone"))) {
						const email = match.slice(1).trim()

						if (email === "everyone") {
							return <Text className={cn(textClassName, "text-foreground")}>@{t("chats.messages.everyone")}</Text>
						}

						if (!email.includes("@")) {
							return <Text className={cn(textClassName, "text-foreground")}>@{t("chats.messages.unknown")}</Text>
						}

						const foundParticipant = chat.participants.find(p => p.email === email)

						if (!foundParticipant) {
							return <Text className={cn(textClassName, "text-foreground")}>@{t("chats.messages.everyone")}</Text>
						}

						return (
							<Text className={cn(textClassName, "text-foreground")}>
								@{contactName(foundParticipant.email, foundParticipant.nickName)}
							</Text>
						)
					}

					if (match.split("```").length >= 3) {
						let code = match.split("```").join("").trim()

						if (code.startsWith("\n")) {
							code = code.slice(1, code.length)
						}

						if (code.endsWith("\n")) {
							code = code.slice(0, code.length - 1)
						}

						return <Text className={cn("text-foreground font-normal text-sm", textClassName)}>{code}</Text>
					}

					if (match.startsWith("https://") || match.startsWith("http://")) {
						const url = match.trim()

						return <Text className={cn(textClassName, "text-blue-500", linkClassName)}>{url}</Text>
					}

					const customEmoji = match.split(":").join("").trim()

					if (customEmojisList.includes(customEmoji) && customEmojisListRecord[customEmoji]) {
						return (
							<TurboImage
								cachePolicy="dataCache"
								style={{
									width: typeof emojiSize === "number" ? emojiSize : 14,
									height: typeof emojiSize === "number" ? emojiSize : 14
								}}
								source={{
									uri: customEmojisListRecord[customEmoji]
								}}
								placeholder={{
									blurhash: assets.blurhash.images.fallback
								}}
							/>
						)
					}

					return match
				},
				input: message.message.split("\n").join(" ")
			})

			return regexed
		}, [message.message, chat.participants, textClassName, emojiSize, linkClassName, t])

		return (
			<View className="flex-1 flex-row flex-wrap text-wrap justify-start items-center">
				{prepend && prepend}
				{replaced.map((item, index) => {
					if (typeof item === "string") {
						if (item.length === 0) {
							return null
						}

						return (
							<Text
								key={index}
								className={cn(
									"text-sm text-foreground flex-row items-center font-normal flex-wrap shrink-0",
									textClassName
								)}
							>
								{item}
							</Text>
						)
					}

					return <Fragment key={index}>{item}</Fragment>
				})}
			</View>
		)
	}
)

ReplacedMessageContentInline.displayName = "ReplacedMessageContentInline"

export default ReplacedMessageContent
