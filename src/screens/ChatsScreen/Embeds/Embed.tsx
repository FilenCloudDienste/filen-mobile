import { memo, useState, useCallback, useEffect, useRef, Fragment } from "react"
import { ChatMessage, ChatConversation } from "../../../lib/api"
import {
	DisplayMessageAs,
	MessageDisplayType,
	extractLinksFromString,
	getMessageDisplayType,
	isMessageLink,
	parseFilenPublicLink,
	headURL,
	parseOGFromURL,
	ReplaceMessageWithComponents
} from "../utils"
import { Semaphore, SemaphoreInterface, getRandomArbitrary, randomIdUnsafe } from "../../../lib/helpers"
import striptags from "striptags"
import eventListener from "../../../lib/eventListener"
import { getColor } from "../../../style"
import { View, Text, Linking, Pressable } from "react-native"
import { i18n } from "../../../i18n"
import OGEmbed from "./OG"
import ImageEmbed from "./ImageEmbed"
import YouTubeEmbed from "./YouTubeEmbed"

const corsMutex: Record<string, SemaphoreInterface> = {}
const EMBED_CONTENT_TYPES_IMAGES = [
	"image/png",
	"image/jpeg",
	"image/jpg",
	"image/gif",
	"image/svg",
	"image/gifv",
	"image/webp",
	"image/svg+xml",
	"image/bmp",
	"image/tiff",
	"image/vnd.microsoft.icon",
	"image/x-icon",
	"image/jp2",
	"image/jpx",
	"image/x-xbitmap",
	"image/avif"
]

const Embed = memo(
	({
		darkMode,
		message,
		userId,
		isScrolling,
		failedMessages,
		lang,
		conversation
	}: {
		darkMode: boolean
		message: ChatMessage
		userId: number
		isScrolling: boolean
		failedMessages: string[]
		lang: string
		conversation: ChatConversation
	}) => {
		const links = useRef<string[]>(extractLinksFromString(message.message)).current
		const initialDisplayAs = useRef<Record<string, MessageDisplayType>>(
			links.reduce((obj, link) => ({ ...obj, [link]: getMessageDisplayType(link) }), {})
		).current
		const [ogData, setOGData] = useState<Record<string, Record<string, string>>>({})
		const [displayAs, setDisplayAs] = useState<Record<string, MessageDisplayType>>(initialDisplayAs)
		const didGetHeaders = useRef<Record<string, boolean>>({})
		const didFetchInfo = useRef<boolean>(false)

		useEffect(() => {
			if (!didFetchInfo.current) {
				didFetchInfo.current = true

				for (const link of links) {
					if (
						["async", "invalid", "ogEmbed"].includes(initialDisplayAs[link]) &&
						!message.embedDisabled &&
						!didGetHeaders.current[link]
					) {
						didGetHeaders.current[link] = true

						const mutexKey = message.uuid + ":" + link

						;(async () => {
							if (!corsMutex[mutexKey]) {
								corsMutex[mutexKey] = new Semaphore(1)
							}

							await corsMutex[mutexKey].acquire()

							try {
								const headers = await headURL(link)

								if (typeof headers["content-type"] !== "string") {
									corsMutex[mutexKey].release()

									return
								}

								const contentType = headers["content-type"].split(";")[0].trim()

								if (EMBED_CONTENT_TYPES_IMAGES.includes(contentType)) {
									corsMutex[mutexKey].release()

									setDisplayAs(prev => ({ ...prev, [link]: "image" }))

									return
								}

								if (contentType === "text/html") {
									const og = await parseOGFromURL(link)

									corsMutex[mutexKey].release()

									setOGData(prev => ({ ...prev, [link]: og }))
									setDisplayAs(prev => ({ ...prev, [link]: "ogEmbed" }))

									return
								}
							} catch {}

							corsMutex[mutexKey].release()

							setDisplayAs(prev => ({ ...prev, [link]: "invalid" }))
						})()
					}
				}
			}
		}, [message, initialDisplayAs])

		return (
			<View
				style={{
					flexDirection: "column",
					width: "100%"
				}}
			>
				{!isMessageLink(message.message) && (
					<View
						style={{
							width: "100%",
							flexDirection: "row",
							flexWrap: "wrap",
							marginBottom: 10
						}}
					>
						<ReplaceMessageWithComponents
							content={message.message}
							darkMode={darkMode}
							failed={false}
							participants={conversation.participants}
						/>
					</View>
				)}
				{Object.keys(displayAs).map(link => {
					return (
						<Fragment key={link}>
							{displayAs[link] === "async" && (
								<Text
									style={{
										fontSize: 15,
										color: getColor(darkMode, "linkPrimary")
									}}
									onPress={() => Linking.openURL(link).catch(console.error)}
								>
									{link}
								</Text>
							)}
							{displayAs[link] === "ogEmbed" && (
								<OGEmbed
									darkMode={darkMode}
									lang={lang}
									link={link}
									ogData={ogData[link]}
								/>
							)}
							{displayAs[link] === "image" && (
								<ImageEmbed
									darkMode={darkMode}
									link={link}
								/>
							)}
							{displayAs[link] === "youtubeEmbed" && (
								<YouTubeEmbed
									darkMode={darkMode}
									link={link}
								/>
							)}
							{(displayAs[link] === "filenEmbed" ||
								displayAs[link] === "twitterEmbed" ||
								displayAs[link] === "none" ||
								displayAs[link] === "invalid") && (
								<Text
									style={{
										fontSize: 15,
										color: getColor(darkMode, "linkPrimary")
									}}
									onPress={() => Linking.openURL(link).catch(console.error)}
								>
									{link}
								</Text>
							)}
						</Fragment>
					)
				})}
			</View>
		)
	}
)

export default Embed
