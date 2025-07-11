import { useLocalSearchParams, Redirect, Stack } from "expo-router"
import { useMemo, memo, Fragment, useState, useCallback } from "react"
import { View, Platform } from "react-native"
import Editor, { type TextEditorItem } from "@/components/textEditor/editor"
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import { Icon } from "@roninoss/icons"
import { Button } from "@/components/nativewindui/Button"
import { useColorScheme } from "@/lib/useColorScheme"
import { useTranslation } from "react-i18next"

export const TextEditor = memo(() => {
	const { item } = useLocalSearchParams()
	const [markdownPreview, setMarkdownPreview] = useState<boolean>(false)
	const { colors } = useColorScheme()
	const { t } = useTranslation()

	const itemParsed = useMemo(() => {
		if (typeof item !== "string") {
			return null
		}

		try {
			return JSON.parse(item) as TextEditorItem
		} catch {
			return null
		}
	}, [item])

	const toggleMarkdownPreview = useCallback(() => {
		setMarkdownPreview(prev => !prev)
	}, [])

	const itemName = useMemo(() => {
		if (!itemParsed) {
			return ""
		}

		if (itemParsed.type === "cloud") {
			return itemParsed.driveItem.name
		}

		return itemParsed.name
	}, [itemParsed])

	const headerRightView = useCallback(() => {
		if (!itemName.toLowerCase().trim().endsWith(".md")) {
			return null
		}

		return (
			<View className="flex-row items-center">
				<Button
					variant="plain"
					size="icon"
					onPress={toggleMarkdownPreview}
				>
					<Icon
						name={markdownPreview ? "eye-off-outline" : "eye-outline"}
						size={24}
						color={colors.primary}
					/>
				</Button>
			</View>
		)
	}, [colors.primary, markdownPreview, toggleMarkdownPreview, itemName])

	const header = useMemo(() => {
		return Platform.select({
			ios: (
				<Stack.Screen
					options={{
						headerShown: true,
						headerTitle: itemName,
						headerBackTitle: t("textEditor.header.back"),
						headerRight: headerRightView
					}}
				/>
			),
			default: (
				<Fragment>
					<Stack.Screen
						options={{
							headerShown: false
						}}
					/>
					<LargeTitleHeader
						title={itemName}
						materialPreset="inline"
						backVisible={true}
						rightView={headerRightView}
						backgroundColor={colors.card}
					/>
				</Fragment>
			)
		})
	}, [itemName, headerRightView, colors.card, t])

	if (!itemParsed) {
		return <Redirect href="/(app)/home" />
	}

	return (
		<Fragment>
			{header}
			<View className="flex-1">
				<Editor
					item={itemParsed}
					markdownPreview={markdownPreview}
				/>
			</View>
		</Fragment>
	)
})

TextEditor.displayName = "TextEditor"

export default TextEditor
