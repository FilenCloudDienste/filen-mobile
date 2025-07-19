import { memo, useCallback } from "react"
import { View, type GestureResponderEvent } from "react-native"
import { Text } from "@/components/nativewindui/Text"
import { Button } from "@/components/nativewindui/Button"
import { formatBytes } from "@/lib/utils"
import { type PublicLinkInfo } from "."
import { ColoredFolderSVGIcon } from "@/assets/fileIcons"
import * as Linking from "expo-linking"
import alerts from "@/lib/alerts"
import { useQuery } from "@tanstack/react-query"
import nodeWorker from "@/lib/nodeWorker"
import { DEFAULT_QUERY_OPTIONS } from "@/queries/client"
import { Icon } from "@roninoss/icons"
import { useColorScheme } from "@/lib/useColorScheme"
import useChatEmbedContainerStyle from "@/hooks/useChatEmbedContainerStyle"
import useNetInfo from "@/hooks/useNetInfo"

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
		const { hasInternet } = useNetInfo()

		const query = useQuery({
			queryKey: ["chatEmbedFilenPublicLinkDirectorySize", [info, parsedLink]],
			enabled: info !== null && info.type === "directory" && parsedLink.type === "directory" && hasInternet,
			queryFn: async () => {
				if (!info || info.type === "file" || parsedLink.type === "file") {
					throw new Error("No directory provided.")
				}

				return await nodeWorker.proxy("directorySizePublicLink", {
					uuid: info.data.info.parent,
					linkUUID: parsedLink.uuid
				})
			},
			refetchOnMount: DEFAULT_QUERY_OPTIONS.refetchOnMount,
			refetchOnReconnect: DEFAULT_QUERY_OPTIONS.refetchOnReconnect,
			refetchOnWindowFocus: DEFAULT_QUERY_OPTIONS.refetchOnWindowFocus,
			staleTime: DEFAULT_QUERY_OPTIONS.staleTime,
			gcTime: DEFAULT_QUERY_OPTIONS.gcTime,
			refetchInterval: false
		})

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
