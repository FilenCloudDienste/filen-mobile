import { memo, useCallback } from "react"
import { View } from "react-native"
import { useRouter } from "expo-router"
import { Text } from "@/components/nativewindui/Text"
import { FileNameToSVGIcon } from "@/assets/fileIcons"
import { Button } from "@/components/nativewindui/Button"
import { type PDFPreviewItem } from "@/app/pdfPreview"
import { formatBytes } from "@/lib/utils"
import { Icon } from "@roninoss/icons"
import { useColorScheme } from "@/lib/useColorScheme"
import useChatEmbedContainerStyle from "@/hooks/useChatEmbedContainerStyle"

export const PDF = memo(({ name, source, size }: { name: string; source: string; size?: number }) => {
	const { push: routerPush } = useRouter()
	const { colors } = useColorScheme()
	const chatEmbedContainerStyle = useChatEmbedContainerStyle()

	const onPress = useCallback(() => {
		routerPush({
			pathname: "/pdfPreview",
			params: {
				item: JSON.stringify({
					type: "remote",
					uri: source,
					name
				} satisfies PDFPreviewItem)
			}
		})
	}, [name, routerPush, source])

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

PDF.displayName = "PDF"

export default PDF
