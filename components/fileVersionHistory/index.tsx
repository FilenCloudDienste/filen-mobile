import { memo, useMemo, Fragment } from "react"
import { useLocalSearchParams, Redirect } from "expo-router"
import List from "./list"
import { LargeTitleHeader } from "../nativewindui/LargeTitleHeader"
import { useTranslation } from "react-i18next"
import { AdaptiveSearchHeader } from "../nativewindui/AdaptiveSearchHeader"
import { Platform } from "react-native"
import { useColorScheme } from "@/lib/useColorScheme"

export const FileVersionHistory = memo(() => {
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
		<Fragment>
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
		</Fragment>
	)
})

FileVersionHistory.displayName = "FileVersionHistory"

export default FileVersionHistory
