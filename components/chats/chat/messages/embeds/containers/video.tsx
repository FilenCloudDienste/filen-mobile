import { memo, useCallback } from "react"
import { View, type GestureResponderEvent } from "react-native"
import { Icon } from "@roninoss/icons"
import Outer from "./outer"
import { useGalleryStore } from "@/stores/gallery.store"
import * as Linking from "expo-linking"
import alerts from "@/lib/alerts"
import Fallback from "./fallback"
import TurboImage from "react-native-turbo-image"
import useChatEmbedContainerStyle from "@/hooks/useChatEmbedContainerStyle"
import assets from "@/lib/assets"
import useChatEmbedVideoThumbnailQuery from "@/queries/useChatEmbedVideoThumbnail.query"

export const Video = memo(({ source, link, name }: { source: string; link: string; name: string }) => {
	const chatEmbedContainerStyle = useChatEmbedContainerStyle()

	const query = useChatEmbedVideoThumbnailQuery(
		{
			source,
			link,
			name
		},
		{
			enabled: source !== null
		}
	)

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
				<TurboImage
					source={{
						uri: query.data
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
			</View>
		</Outer>
	)
})

Video.displayName = "Video"

export default Video
