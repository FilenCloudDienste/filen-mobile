import { memo, useMemo, useCallback } from "react"
import { parseYouTubeVideoId } from "@/lib/utils"
import { Text } from "@/components/nativewindui/Text"
import { View } from "react-native"
import TurboImage from "react-native-turbo-image"
import { Button } from "@/components/nativewindui/Button"
import * as Linking from "expo-linking"
import alerts from "@/lib/alerts"
import { Icon } from "@roninoss/icons"
import useChatEmbedContainerStyle from "@/hooks/useChatEmbedContainerStyle"
import useChatEmbedYouTubeQuery from "@/queries/useChatEmbedYouTube.query"

export const YouTube = memo(({ link }: { link: string }) => {
	const chatEmbedContainerStyle = useChatEmbedContainerStyle()

	const videoId = useMemo(() => {
		return parseYouTubeVideoId(link)
	}, [link])

	const query = useChatEmbedYouTubeQuery(
		{
			videoId: videoId ?? ""
		},
		{
			enabled: videoId !== null
		}
	)

	const onPress = useCallback(async () => {
		try {
			if (!(await Linking.canOpenURL(link))) {
				throw new Error("Cannot open URL.")
			}

			await Linking.openURL(link)
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		}
	}, [link])

	if (!videoId || query.status !== "success") {
		return null
	}

	return (
		<Button
			variant="plain"
			size="none"
			unstable_pressDelay={100}
			onPress={onPress}
			className="flex-1 active:opacity-70 basis-full w-full"
			style={chatEmbedContainerStyle}
		>
			<View
				className="flex-1 flex-col bg-card rounded-md p-2 mt-2 gap-2 border-l-red-500 border-l-2"
				style={chatEmbedContainerStyle}
			>
				<Text
					className="text-blue-500 font-normal text-xs"
					numberOfLines={1}
					ellipsizeMode="middle"
				>
					YouTube
				</Text>
				<Text
					numberOfLines={2}
					ellipsizeMode="tail"
				>
					{query.data.title} - {query.data.author_name}
				</Text>
				<View className="flex-1 bg-background rounded-md aspect-video overflow-hidden">
					<View className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
						<Icon
							name="play-circle-outline"
							size={32}
							color="white"
						/>
					</View>
					{query.data.thumbnail_url ? (
						<TurboImage
							source={{
								uri: query.data.thumbnail_url
							}}
							cachePolicy="dataCache"
							resizeMode="contain"
							style={{
								width: "100%",
								height: "100%"
							}}
						/>
					) : (
						<View className="w-full h-full bg-black" />
					)}
				</View>
			</View>
		</Button>
	)
})

YouTube.displayName = "YouTube"

export default YouTube
