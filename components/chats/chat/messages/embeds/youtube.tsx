import { memo, useMemo, useCallback } from "react"
import { parseYouTubeVideoId } from "@/lib/utils"
import { Text } from "@/components/nativewindui/Text"
import { View } from "react-native"
import axios from "axios"
import { useQuery } from "@tanstack/react-query"
import TurboImage from "react-native-turbo-image"
import { Button } from "@/components/nativewindui/Button"
import * as Linking from "expo-linking"
import alerts from "@/lib/alerts"
import { Icon } from "@roninoss/icons"
import { DEFAULT_QUERY_OPTIONS } from "@/queries/client"
import useChatEmbedContainerStyle from "@/hooks/useChatEmbedContainerStyle"
import useNetInfo from "@/hooks/useNetInfo"
import assets from "@/lib/assets"

export type YouTubeInfo = {
	title?: string
	author_name?: string
	author_url?: string
	type?: string
	height?: number
	width?: number
	version?: string
	provider_name?: string
	provider_url?: string
	thumbnail_height?: number
	thumbnail_width?: number
	thumbnail_url?: string
	html?: string
}

export const YouTube = memo(({ link }: { link: string }) => {
	const chatEmbedContainerStyle = useChatEmbedContainerStyle()
	const { hasInternet } = useNetInfo()

	const videoId = useMemo(() => {
		return parseYouTubeVideoId(link)
	}, [link])

	const query = useQuery({
		queryKey: ["chatEmbedYouTube", videoId],
		enabled: videoId !== null && hasInternet,
		queryFn: async () => {
			if (!videoId) {
				throw new Error("No videoId provided.")
			}

			const request = await axios.get(`https://www.youtube.com/oembed?url=https://youtube.com/watch?v=${videoId}&format=json`, {
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json"
				},
				timeout: 60000
			})

			if (
				request.status !== 200 ||
				!request.data ||
				!request.data.title ||
				!request.data.thumbnail_url ||
				!request.data.author_name
			) {
				throw new Error("Failed to fetch YouTube data.")
			}

			return request.data as YouTubeInfo
		},
		throwOnError(err) {
			console.error(err)

			return false
		},
		refetchOnMount: DEFAULT_QUERY_OPTIONS.refetchOnMount,
		refetchOnReconnect: DEFAULT_QUERY_OPTIONS.refetchOnReconnect,
		refetchOnWindowFocus: DEFAULT_QUERY_OPTIONS.refetchOnWindowFocus,
		staleTime: DEFAULT_QUERY_OPTIONS.staleTime,
		gcTime: DEFAULT_QUERY_OPTIONS.gcTime,
		refetchInterval: false
	})

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
							placeholder={{
								blurhash: assets.blurhash.images.fallback
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
