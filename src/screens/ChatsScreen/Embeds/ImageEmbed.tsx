import { memo, useRef } from "react"
import { getColor, blurhashes } from "../../../style"
import { Text, Linking, Pressable, View } from "react-native"
import { Image } from "expo-image"
import { isMessageLink } from "../utils"

const ImageEmbed = memo(({ darkMode, link }: { darkMode: boolean; link: string }) => {
	const image = useRef<string>(link.trim()).current

	if (!isMessageLink(image) || !image.startsWith("http")) {
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
			<View
				style={{
					width: "100%",
					height: 200,
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
						height: "100%",
						borderRadius: 5
					}}
					contentFit="contain"
					placeholder={darkMode ? blurhashes.dark.backgroundSecondary : blurhashes.light.backgroundSecondary}
					source={{
						uri: image
					}}
					cachePolicy="none"
				/>
			</View>
		</Pressable>
	)
})

export default ImageEmbed
