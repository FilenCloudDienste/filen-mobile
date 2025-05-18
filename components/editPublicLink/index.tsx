import { Fragment, memo, useMemo } from "react"
import { View } from "react-native"
import { LargeTitleHeader } from "../nativewindui/LargeTitleHeader"
import { useLocalSearchParams, Redirect } from "expo-router"
import File from "./file"

export const EditPublicLink = memo(() => {
	const { item } = useLocalSearchParams()

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
				title="Public link"
				backVisible={true}
				materialPreset="stack"
				iosBackButtonTitle="Back"
				iosBackButtonMenuEnabled={false}
				iosBackButtonTitleVisible={true}
			/>
			<View className="flex-1">
				<File item={itemParsed} />
			</View>
		</Fragment>
	)
})

EditPublicLink.displayName = "EditPublicLink"

export default EditPublicLink
