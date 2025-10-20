import { memo } from "react"
import { View } from "react-native"
import { Text } from "@/components/nativewindui/Text"
import { cn } from "@/lib/cn"
import { translateMemoized } from "@/lib/i18n"

export const OfflineListHeader = memo(({ className }: { className?: string }) => {
	return (
		<View className={cn("flex-row items-center justify-center bg-red-500 p-2", className)}>
			<Text variant="body">{translateMemoized("offlineListHeader.title")}</Text>
		</View>
	)
})

OfflineListHeader.displayName = "OfflineListHeader"

export default OfflineListHeader
