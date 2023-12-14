import { memo, useRef } from "react"
import { getColor } from "../../../style"
import { Text, Linking, Pressable, View } from "react-native"
import { i18n } from "../../../i18n"
import { Image } from "expo-image"

const OGEmbed = memo(
	({ darkMode, lang, link, ogData }: { darkMode: boolean; lang: string; link: string; ogData: Record<string, string> }) => {
		const image = useRef<string | null>(
			typeof ogData["og:image"] === "string"
				? ogData["og:image"]
				: typeof ogData["twitter:image"] === "string"
				? ogData["twitter:image"]
				: null
		).current

		const description = useRef<string | null>(
			typeof ogData["og:description"] === "string"
				? ogData["og:description"]
				: typeof ogData["meta:description"] === "string"
				? ogData["meta:description"]
				: typeof ogData["description"] === "string"
				? ogData["description"]
				: null
		).current

		const title = useRef<string | null>(
			typeof ogData["og:title"] === "string"
				? ogData["og:title"]
				: typeof ogData["meta:title"] === "string"
				? ogData["meta:title"]
				: typeof ogData["title"] === "string"
				? ogData["title"]
				: null
		).current

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
						fontSize: 15,
						color: getColor(darkMode, "linkPrimary")
					}}
					numberOfLines={1}
				>
					{link}
				</Text>
				<Text
					style={{
						fontSize: 15,
						color: getColor(darkMode, "textPrimary"),
						marginTop: 10
					}}
					numberOfLines={1}
				>
					{title ? title : i18n(lang, "chatOGNoTitle")}
				</Text>
				<Text
					style={{
						fontSize: 15,
						color: getColor(darkMode, "textSecondary"),
						marginTop: 5
					}}
				>
					{description ? description : i18n(lang, "chatOGNoDescription")}
				</Text>
				{image && image.startsWith("http") && (
					<View
						style={{
							width: "100%",
							height: 128,
							marginTop: 10,
							backgroundColor: getColor(darkMode, "backgroundTertiary"),
							borderRadius: 5,
							padding: 5,
							flexDirection: "row",
							alignItems: "center",
							justifyContent: "center"
						}}
					>
						<Image
							style={{
								width: "100%",
								height: "100%"
							}}
							contentFit="contain"
							source={{
								uri: image
							}}
							cachePolicy="none"
						/>
					</View>
				)}
			</Pressable>
		)
	}
)

export default OGEmbed
