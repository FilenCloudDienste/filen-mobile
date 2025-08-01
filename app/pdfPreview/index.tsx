import { useMemo } from "react"
import { useLocalSearchParams, Stack, Redirect } from "expo-router"
import { Platform } from "react-native"
import RequireInternet from "@/components/requireInternet"
import Preview from "@/components/pdfPreview/preview"
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

export default function PDFPreview() {
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
						headerTitle: itemName
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
}
