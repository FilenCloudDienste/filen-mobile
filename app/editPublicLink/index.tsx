import { useLocalSearchParams, Redirect } from "expo-router"
import { Platform } from "react-native"
import RequireInternet from "@/components/requireInternet"
import { useMemo } from "react"
import { useColorScheme } from "@/lib/useColorScheme"
import { AdaptiveSearchHeader } from "@/components/nativewindui/AdaptiveSearchHeader"
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import Content from "@/components/editPublicLink/content"
import { useTranslation } from "react-i18next"

export default function EditPublicLink() {
	const { item } = useLocalSearchParams()
	const { colors } = useColorScheme()
	const { t } = useTranslation()

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

	const header = useMemo(() => {
		return Platform.OS === "ios" ? (
			<AdaptiveSearchHeader
				iosBackButtonTitle={t("editPublicLink.cancel")}
				iosBackButtonTitleVisible={true}
				iosBlurEffect="systemChromeMaterial"
				iosTitle={t("editPublicLink.title")}
				iosIsLargeTitle={false}
				iosBackButtonMenuEnabled={false}
				backVisible={true}
				iosBackVisible={true}
				backgroundColor={colors.card}
			/>
		) : (
			<LargeTitleHeader
				title={t("editPublicLink.title")}
				backVisible={true}
			/>
		)
	}, [colors.card, t])

	if (!itemParsed) {
		return <Redirect href="/(app)/home" />
	}

	return (
		<RequireInternet>
			{header}
			<Content item={itemParsed} />
		</RequireInternet>
	)
}
