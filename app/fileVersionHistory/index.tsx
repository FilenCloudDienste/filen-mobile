import { Platform } from "react-native"
import RequireInternet from "@/components/requireInternet"
import { useLocalSearchParams, Redirect } from "expo-router"
import { useMemo } from "react"
import { useColorScheme } from "@/lib/useColorScheme"
import { AdaptiveSearchHeader } from "@/components/nativewindui/AdaptiveSearchHeader"
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import { useTranslation } from "react-i18next"
import List from "@/components/fileVersionHistory/list"

export default function FileVersionHistory() {
	const { item } = useLocalSearchParams()
	const { t } = useTranslation()
	const { colors } = useColorScheme()

	const itemParsed = useMemo(() => {
		if (typeof item !== "string") {
			return null
		}

		try {
			return JSON.parse(item) as DriveCloudItem
		} catch {
			return null
		}
	}, [item])

	if (!itemParsed) {
		return <Redirect href="/(app)/home" />
	}

	return (
		<RequireInternet>
			{Platform.OS === "ios" ? (
				<AdaptiveSearchHeader
					iosTitle={t("fileVersionHistory.header.title")}
					iosIsLargeTitle={false}
					iosBackButtonMenuEnabled={true}
					backgroundColor={colors.card}
					backVisible={true}
					iosBackButtonTitle="Back"
					iosBackVisible={true}
					iosBackButtonTitleVisible={true}
					iosBlurEffect="systemChromeMaterial"
				/>
			) : (
				<LargeTitleHeader
					title={t("fileVersionHistory.header.title")}
					materialPreset="inline"
					backVisible={true}
					backgroundColor={colors.card}
				/>
			)}
			<List item={itemParsed} />
		</RequireInternet>
	)
}
