import { memo } from "react"
import { View } from "react-native"
import { Text } from "@/components/nativewindui/Text"
import { cn } from "@/lib/cn"
import { useTranslation } from "react-i18next"

export const OfflineListHeader = memo(({ className }: { className?: string }) => {
	const { t } = useTranslation()

	return (
		<View className={cn("flex-row items-center justify-center bg-red-500 p-2", className)}>
			<Text variant="body">{t("offlineListHeader.title")}</Text>
		</View>
	)
})

OfflineListHeader.displayName = "OfflineListHeader"

export default OfflineListHeader
