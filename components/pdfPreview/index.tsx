import { memo, Fragment, useMemo } from "react"
import { Stack, useLocalSearchParams, Redirect } from "expo-router"
import { Platform } from "react-native"
import Preview from "./preview"
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import { useColorScheme } from "@/lib/useColorScheme"

export type PDFPreviewItem =
	| {
			type: "cloud"
			driveItem: DriveCloudItem
	  }
	| {
			type: "remote"
			uri: string
			name: string
	  }
	| {
			type: "local"
			uri: string
			name: string
	  }

export const PDFPreview = memo(() => {
	const { item } = useLocalSearchParams()
	const { colors } = useColorScheme()

	const itemParsed = useMemo(() => {
		if (typeof item !== "string") {
			return null
		}

		try {
			return JSON.parse(item) as PDFPreviewItem
		} catch {
			return null
		}
	}, [item])

	const itemName = useMemo(() => {
		if (!itemParsed) {
			return ""
		}

		if (itemParsed.type === "cloud") {
			return itemParsed.driveItem.name
		}

		return itemParsed.name
	}, [itemParsed])

	const header = useMemo(() => {
		return Platform.select({
			ios: (
				<Stack.Screen
					options={{
						headerShown: true,
						headerTitle: itemName,
						headerBackTitle: "Back"
					}}
				/>
			),
			default: (
				<LargeTitleHeader
					title={itemName}
					materialPreset="inline"
					backVisible={true}
					backgroundColor={colors.card}
				/>
			)
		})
	}, [itemName, colors.card])

	if (!itemParsed) {
		return <Redirect href="/home" />
	}

	return (
		<Fragment>
			{header}
			<Preview item={itemParsed} />
		</Fragment>
	)
})

PDFPreview.displayName = "PDFPreview"

export default PDFPreview
