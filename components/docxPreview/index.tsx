import { memo, useMemo } from "react"
import { Stack, useLocalSearchParams, Redirect } from "expo-router"
import { Platform } from "react-native"
import Preview from "./preview"
import { LargeTitleHeader } from "../nativewindui/LargeTitleHeader"
import { useColorScheme } from "@/lib/useColorScheme"
import RequireInternet from "../requireInternet"

export type DOCXPreviewItem =
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

export const DOCXPreview = memo(() => {
	const { item } = useLocalSearchParams()
	const { colors } = useColorScheme()

	const itemParsed = useMemo(() => {
		if (typeof item !== "string") {
			return null
		}

		try {
			return JSON.parse(item) as DOCXPreviewItem
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
		return <Redirect href="/(app)/home" />
	}

	return (
		<RequireInternet>
			{header}
			<Preview item={itemParsed} />
		</RequireInternet>
	)
})

DOCXPreview.displayName = "DOCXPreview"

export default DOCXPreview
