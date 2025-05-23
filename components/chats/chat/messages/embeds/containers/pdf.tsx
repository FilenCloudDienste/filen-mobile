import { memo, useCallback } from "react"
import { View } from "react-native"
import { useRouter } from "expo-router"
import { Text } from "@/components/nativewindui/Text"
import { FileNameToSVGIcon } from "@/assets/fileIcons"
import { Button } from "@/components/nativewindui/Button"
import { type PDFPreviewItem } from "@/components/pdfPreview"
import { formatBytes } from "@/lib/utils"

export const PDF = memo(({ name, source, size }: { name: string; source: string; size?: number }) => {
	const { push: routerPush } = useRouter()

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
			className="flex-1 bg-background border border-border rounded-md flex-col justify-start items-start p-3 active:opacity-70"
			onPress={onPress}
			unstable_pressDelay={100}
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
			</View>
		</Button>
	)
})

PDF.displayName = "PDF"

export default PDF
