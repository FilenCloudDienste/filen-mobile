import { memo, useRef, useState, useEffect } from "react"
import { getColor, blurhashes } from "../../../style"
import { Text, Linking, Pressable, View } from "react-native"
import { Image } from "expo-image"
import { getURL, parseYouTubeVideoId } from "../utils"

export interface YouTubeInfo {
	title: string
	author_name: string
	author_url: string
	type: string
	height: number
	width: number
	version: string
	provider_name: string
	provider_url: string
	thumbnail_height: number
	thumbnail_width: number
	thumbnail_url: string
	html: string
}

const YouTubeEmbed = memo(({ darkMode, link }: { darkMode: boolean; link: string }) => {
	const didFetchInfo = useRef<boolean>(false)
	const [info, setInfo] = useState<YouTubeInfo | undefined>(undefined)

	useEffect(() => {
		if (!didFetchInfo.current) {
			didFetchInfo.current = true
			;(async () => {
				try {
					const response = await getURL(
						"https://www.youtube.com/oembed?url=https://youtube.com/watch?v=" + parseYouTubeVideoId(link) + "&format=json"
					)

					if (!response || !response.data || typeof response.data !== "object") {
						return
					}

					setInfo(response.data)
				} catch (e) {
					console.error(e)
				}
			})()
		}
	}, [link])

	if (!info || !info.author_name || !info.title) {
		return (
			<Text
				style={{
					fontSize: 14,
					color: getColor(darkMode, "linkPrimary")
				}}
				numberOfLines={1}
			>
				{link}
			</Text>
		)
	}

	return (
		<Pressable
			style={{
				width: "100%",
				flexDirection: "column",
				backgroundColor: getColor(darkMode, "backgroundSecondary"),
				borderRadius: 5,
				padding: 10
			}}
			onPress={() => Linking.openURL(link).catch(console.error)}
		>
			<Text
				style={{
					fontSize: 14,
					color: getColor(darkMode, "linkPrimary")
				}}
				numberOfLines={1}
			>
				{link}
			</Text>
			<Text
				style={{
					fontSize: 14,
					color: getColor(darkMode, "textPrimary"),
					marginTop: 10
				}}
				numberOfLines={1}
			>
				{"YouTube - " + info.author_name + " - " + info.title}
			</Text>
			<View
				style={{
					width: "100%",
					height: 200,
					marginTop: 10,
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "center"
				}}
			>
				<Image
					style={{
						width: "100%",
						height: "100%",
						borderRadius: 5
					}}
					contentFit="contain"
					source={{
						uri: "https://img.youtube.com/vi/" + parseYouTubeVideoId(link) + "/hqdefault.jpg"
					}}
					cachePolicy="none"
					placeholder={darkMode ? blurhashes.dark.backgroundSecondary : blurhashes.light.backgroundSecondary}
				/>
			</View>
		</Pressable>
	)
})

export default YouTubeEmbed
