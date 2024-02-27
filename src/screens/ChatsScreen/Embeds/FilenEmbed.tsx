import { memo } from "react"
import { getColor } from "../../../style"
import { Text, Linking, Pressable, Image } from "react-native"

const FilenEmbed = memo(({ darkMode, link }: { darkMode: boolean; link: string }) => {
	return (
		<Pressable
			style={{
				width: "100%",
				flexDirection: "column",
				backgroundColor: getColor(darkMode, "backgroundSecondary"),
				borderRadius: 5,
				padding: 10,
				gap: 10
			}}
			onPress={() => Linking.openURL(link).catch(console.error)}
		>
			<Image
				style={{
					width: 45,
					height: 45,
					borderRadius: 45
				}}
				resizeMode="contain"
				source={require("../../../assets/images/appstore.png")}
			/>
			<Text
				style={{
					fontSize: 14,
					color: getColor(darkMode, "linkPrimary")
				}}
				numberOfLines={1}
			>
				{link}
			</Text>
		</Pressable>
	)
})

export default FilenEmbed
