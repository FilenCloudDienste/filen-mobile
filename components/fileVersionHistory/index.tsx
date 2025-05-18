import { memo, useMemo, Fragment } from "react"
import { useLocalSearchParams, Redirect } from "expo-router"
import List from "./list"
import { View } from "@rn-primitives/slot"
import { LargeTitleHeader } from "../nativewindui/LargeTitleHeader"
import { useTranslation } from "react-i18next"

export const FileVersionHistory = memo(() => {
	const { item } = useLocalSearchParams()
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

	if (!itemParsed) {
		return <Redirect href="/(app)/home" />
	}

	return (
		<Fragment>
			<LargeTitleHeader
				title={t("fileVersionHistory.header.title")}
				backVisible={true}
				materialPreset="stack"
				iosBackButtonTitle="Back"
				iosBackButtonMenuEnabled={false}
				iosBackButtonTitleVisible={true}
			/>
			<View className="flex-1">
				<List item={itemParsed} />
			</View>
		</Fragment>
	)
})

FileVersionHistory.displayName = "FileVersionHistory"

export default FileVersionHistory
