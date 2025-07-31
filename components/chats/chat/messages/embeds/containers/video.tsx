import { memo, useCallback } from "react"
import { View, type GestureResponderEvent } from "react-native"
import { Icon } from "@roninoss/icons"
import Outer from "./outer"
import { useGalleryStore } from "@/stores/gallery.store"
import * as Linking from "expo-linking"
import alerts from "@/lib/alerts"
import Fallback from "./fallback"
import { useQuery } from "@tanstack/react-query"
import * as VideoThumbnails from "expo-video-thumbnails"
import * as FileSystem from "expo-file-system/next"
import { xxHash32 } from "js-xxhash"
import { Image } from "expo-image"
import useChatEmbedContainerStyle from "@/hooks/useChatEmbedContainerStyle"
import useNetInfo from "@/hooks/useNetInfo"

export const Video = memo(({ source, link, name }: { source: string; link: string; name: string }) => {
	const chatEmbedContainerStyle = useChatEmbedContainerStyle()
	const { hasInternet } = useNetInfo()

	const query = useQuery({
		queryKey: ["chatEmbedVideoThumbnail", source, link, name],
		enabled: source !== null && hasInternet,
		queryFn: async () => {
			const destination = new FileSystem.File(
				FileSystem.Paths.join(
					FileSystem.Paths.cache,
					`chat-embed-video-thumbnail-${xxHash32(`${source}:${link}`).toString(16)}${FileSystem.Paths.extname(name)}`
				)
			)

			if (!destination.exists) {
				const videoThumbnail = await VideoThumbnails.getThumbnailAsync(source, {
					quality: 0.7,
					time: 500
				})

				const videoThumbnailFile = new FileSystem.File(videoThumbnail.uri)

				if (!videoThumbnailFile.exists) {
					throw new Error("Failed to generate video thumbnail.")
				}

				videoThumbnailFile.move(destination)

				if (!destination.exists) {
					throw new Error(`Generated thumbnail at ${destination.uri} does not exist.`)
				}
			}

			return destination.uri
		},
		refetchOnMount: false,
		refetchOnReconnect: false,
		refetchIntervalInBackground: false,
		refetchOnWindowFocus: false
	})

	const onPress = useCallback(
		async (e: GestureResponderEvent) => {
			e.preventDefault()
			e.stopPropagation()

			if (query.status !== "success") {
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
			}

			useGalleryStore.getState().open({
				items: [
					{
						itemType: "remoteItem" as const,
						previewType: "video",
						data: {
							uri: source
						}
					}
				],
				initialUUIDOrURI: source
			})
		},
		[link, source, query.status]
	)

	if (query.status !== "success") {
		return <Fallback link={link} />
	}

	return (
		<Outer
			onPress={onPress}
			title={name}
			titleClassName="text-foreground"
		>
			<View
				className="flex-1 items-center justify-center flex-row aspect-video bg-background"
				style={chatEmbedContainerStyle}
			>
				<View className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
					<Icon
						name="play-circle-outline"
						size={32}
						color="white"
					/>
				</View>
				<Image
					source={{
						uri: query.data
					}}
					cachePolicy="disk"
					priority="low"
					contentFit="contain"
					style={{
						width: "100%",
						height: "100%"
					}}
				/>
			</View>
		</Outer>
	)
})

Video.displayName = "Video"

export default Video
