import { memo, useCallback } from "react"
import { type GestureResponderEvent, View } from "react-native"
import { Text } from "@/components/nativewindui/Text"
import type { TextEditorItem } from "@/components/textEditor/editor"
import { useRouter } from "expo-router"
import { Button } from "@/components/nativewindui/Button"
import { FileNameToSVGIcon } from "@/assets/fileIcons"
import { Icon } from "@roninoss/icons"
import { useColorScheme } from "@/lib/useColorScheme"
import { formatBytes } from "@/lib/utils"
import * as Linking from "expo-linking"
import alerts from "@/lib/alerts"
import useChatEmbedContainerStyle from "@/hooks/useChatEmbedContainerStyle"

export const Code = memo(({ name, source, size, link }: { name: string; source: string; link: string; size?: number }) => {
	const { push: routerPush } = useRouter()
	const { colors } = useColorScheme()
	const chatEmbedContainerStyle = useChatEmbedContainerStyle()

	const onPress = useCallback(
		async (e: GestureResponderEvent) => {
			e.preventDefault()
			e.stopPropagation()

			if (size && size >= 1024 * 1024 * 1) {
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

				return
			}

			routerPush({
				pathname: "/textEditor",
				params: {
					item: JSON.stringify({
						type: "remote",
						name,
						uri: source
					} satisfies TextEditorItem)
				}
			})
		},
		[source, name, routerPush, link, size]
	)

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
					<FileNameToSVGIcon
						name={name}
						width={24}
						height={24}
					/>
					<Text
						className="font-normal text-base shrink"
						numberOfLines={1}
						ellipsizeMode="middle"
					>
						{name}
					</Text>
				</View>
				{typeof size === "number" && (
					<Text
						className="font-normal text-xs text-muted-foreground shrink-0"
						numberOfLines={1}
					>
						{formatBytes(size)}
					</Text>
				)}
				<Icon
					name="chevron-right"
					size={16}
					color={colors.grey}
				/>
			</View>
		</Button>
	)
})

Code.displayName = "Code"

export default Code
