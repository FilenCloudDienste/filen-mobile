import { memo, useCallback } from "react"
import { View, type GestureResponderEvent } from "react-native"
import { Text } from "@/components/nativewindui/Text"
import { Button } from "@/components/nativewindui/Button"
import { formatBytes } from "@/lib/utils"
import type { PublicLinkInfo } from "."
import { ColoredFolderSVGIcon } from "@/assets/fileIcons"
import * as Linking from "expo-linking"
import alerts from "@/lib/alerts"
import { Icon } from "@roninoss/icons"
import { useColorScheme } from "@/lib/useColorScheme"
import useChatEmbedContainerStyle from "@/hooks/useChatEmbedContainerStyle"
import useChatEmbedFilenPublicLinkDirectorySizeQuery from "@/queries/useChatEmbedFilenPublicLinkDirectorySize.query"

export const Directory = memo(
	({
		info,
		link,
		parsedLink
	}: {
		info: PublicLinkInfo
		link: string
		parsedLink: {
			uuid: string
			key: string
			type: "file" | "directory"
		}
	}) => {
		const { colors } = useColorScheme()
		const chatEmbedContainerStyle = useChatEmbedContainerStyle()

		const query = useChatEmbedFilenPublicLinkDirectorySizeQuery(
			{
				info,
				link,
				parsedLink
			},
			{
				enabled: info !== null && info.type === "directory" && parsedLink.type === "directory"
			}
		)

		const onPress = useCallback(
			async (e: GestureResponderEvent) => {
				e.preventDefault()
				e.stopPropagation()

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
			},
			[link]
		)

		if (!info || info.type === "file" || parsedLink.type === "file" || query.status !== "success") {
			return null
		}

		return (
			<Button
				variant="plain"
				size="none"
				className="flex-1 bg-card rounded-md flex-col justify-start items-start p-3 active:opacity-70 basis-full w-full"
				onPress={onPress}
				unstable_pressDelay={100}
				style={chatEmbedContainerStyle}
			>
				<View className="flex-1 flex-row items-center gap-2 justify-between">
					<View className="flex-1 flex-row items-center gap-2">
						<ColoredFolderSVGIcon
							width={24}
							height={24}
						/>
						<Text
							className="font-normal text-base shrink"
							numberOfLines={1}
							ellipsizeMode="middle"
						>
							{info.data.info.metadata.name}
						</Text>
					</View>
					<Text
						className="font-normal text-xs text-muted-foreground shrink-0"
						numberOfLines={1}
					>
						{formatBytes(query.data.size)}
					</Text>
					<Icon
						name="chevron-right"
						size={16}
						color={colors.grey}
					/>
				</View>
			</Button>
		)
	}
)

Directory.displayName = "Directory"

export default Directory
