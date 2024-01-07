import { memo, useState, useEffect, useRef, Fragment, useMemo } from "react"
import { ChatMessage, ChatConversation } from "../../../lib/api"
import {
	MessageDisplayType,
	extractLinksFromString,
	getMessageDisplayType,
	isMessageLink,
	headURL,
	parseOGFromURL,
	ReplaceMessageWithComponents
} from "../utils"
import { Semaphore, SemaphoreInterface } from "../../../lib/helpers"
import { getColor } from "../../../style"
import { View, Text, Linking } from "react-native"
import OGEmbed from "./OG"
import ImageEmbed from "./ImageEmbed"
import YouTubeEmbed from "./YouTubeEmbed"
import FilenEmbed from "./FilenEmbed"
import TwitterEmbed from "./TwitterEmbed"

const messageDisplayTypeCache: Record<string, MessageDisplayType> = {}
const ogDataCache: Record<string, Record<string, string>> = {}
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
		failedMessages,
		lang,
		conversation
	}: {
		darkMode: boolean
		message: ChatMessage
		failedMessages: string[]
		lang: string
		conversation: ChatConversation
	}) => {
		const links = useRef<string[]>(extractLinksFromString(message.message)).current
		const initialDisplayAs = useRef<Record<string, MessageDisplayType>>(
			links.reduce(
				(obj, link) => ({
					...obj,
					[link]: messageDisplayTypeCache[link] ? messageDisplayTypeCache[link] : getMessageDisplayType(link)
				}),
				{}
			)
		).current
		const [ogData, setOGData] = useState<Record<string, Record<string, string>>>(ogDataCache)
		const [displayAs, setDisplayAs] = useState<Record<string, MessageDisplayType>>(initialDisplayAs)
		const didGetHeaders = useRef<Record<string, boolean>>({})
		const didFetchInfo = useRef<boolean>(false)

		const isFailed = useMemo(() => {
			return failedMessages.includes(message.uuid)
		}, [failedMessages, message])

		useEffect(() => {
			if (!didFetchInfo.current) {
				didFetchInfo.current = true

				for (const link of links) {
					if (messageDisplayTypeCache[link]) {
						if (ogDataCache[link] && messageDisplayTypeCache[link] === "ogEmbed") {
							setOGData(prev => ({ ...prev, [link]: ogDataCache[link] }))
						}

						setDisplayAs(prev => ({ ...prev, [link]: messageDisplayTypeCache[link] }))

						continue
					}

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

									messageDisplayTypeCache[link] = "image"

									setDisplayAs(prev => ({ ...prev, [link]: "image" }))

									return
								}

								if (contentType === "text/html") {
									const og = await parseOGFromURL(link)

									corsMutex[mutexKey].release()

									messageDisplayTypeCache[link] = "ogEmbed"
									ogDataCache[link] = og

									setOGData(prev => ({ ...prev, [link]: og }))
									setDisplayAs(prev => ({ ...prev, [link]: "ogEmbed" }))

									return
								}
							} catch {}

							corsMutex[mutexKey].release()

							messageDisplayTypeCache[link] = "invalid"

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
					width: "100%",
					marginTop: 7,
					marginBottom: 5
				}}
			>
				{!isMessageLink(message.message) && (
					<View
						style={{
							width: "100%",
							flexDirection: "row",
							flexWrap: "wrap",
							marginBottom: 10,
							marginTop: -7,
							flex: 1
						}}
					>
						<ReplaceMessageWithComponents
							content={message.message}
							darkMode={darkMode}
							failed={isFailed}
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
										fontSize: 14,
										color: getColor(darkMode, "linkPrimary")
									}}
									onPress={() => Linking.openURL(link).catch(console.error)}
								>
									{link}
								</Text>
							)}
							{(displayAs[link] === "ogEmbed" || displayAs[link] === "invalid") && (
								<OGEmbed
									darkMode={darkMode}
									lang={lang}
									link={link}
									ogData={ogData[link]}
									displayAs={displayAs[link]}
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
							{displayAs[link] === "filenEmbed" && (
								<FilenEmbed
									darkMode={darkMode}
									link={link}
								/>
							)}
							{displayAs[link] === "twitterEmbed" && (
								<TwitterEmbed
									darkMode={darkMode}
									link={link}
								/>
							)}
						</Fragment>
					)
				})}
			</View>
		)
	}
)

export default Embed
