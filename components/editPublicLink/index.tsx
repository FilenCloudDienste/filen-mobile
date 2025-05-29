import { Fragment, memo, useMemo } from "react"
import { Platform } from "react-native"
import { LargeTitleHeader } from "../nativewindui/LargeTitleHeader"
import { useLocalSearchParams, Redirect } from "expo-router"
import Content from "./content"
import { AdaptiveSearchHeader } from "../nativewindui/AdaptiveSearchHeader"
import { useColorScheme } from "@/lib/useColorScheme"

export const EditPublicLink = memo(() => {
	const { item } = useLocalSearchParams()
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
					iosBackButtonTitle="Cancel"
					iosBackButtonTitleVisible={true}
					iosBlurEffect="systemChromeMaterial"
					iosTitle="Public link"
					iosIsLargeTitle={false}
					iosBackButtonMenuEnabled={false}
					backVisible={true}
					iosBackVisible={true}
					backgroundColor={colors.card}
				/>
			) : (
				<LargeTitleHeader
					title="Public link"
					backVisible={true}
					materialPreset="inline"
					backgroundColor={colors.card}
				/>
			)}
			<Content item={itemParsed} />
		</Fragment>
	)
})

EditPublicLink.displayName = "EditPublicLink"

export default EditPublicLink
