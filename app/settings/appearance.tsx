import { Button } from "@/components/nativewindui/Button"
import { DropdownMenu } from "@/components/nativewindui/DropdownMenu"
import type { DropdownItem } from "@/components/nativewindui/DropdownMenu/types"
import { createDropdownItem } from "@/components/nativewindui/DropdownMenu/utils"
import { Text } from "@/components/nativewindui/Text"
import { Settings as SettingsComponent } from "@/components/settings"
import { translateMemoized } from "@/lib/i18n"
import mmkvInstance from "@/lib/mmkv"
import { useColorScheme } from "@/lib/useColorScheme"
import { Icon } from "@roninoss/icons"
import { memo, useCallback, useMemo } from "react"
import { Platform, useColorScheme as useSystemColorScheme } from "react-native"
import { useMMKVString } from "react-native-mmkv"

export const dropdownItems = ["home", "drive", "photos", "notes", "chats"].map(key =>
	createDropdownItem({
		actionKey: key,
		title: translateMemoized(`settings.appearance.items.startOn_${key}`)
	})
)

export const themeDropdownItems = [
	createDropdownItem({
		actionKey: "system",
		title: translateMemoized("settings.appearance.items.theme_system")
	}),
	createDropdownItem({
		actionKey: "light",
		title: translateMemoized("settings.appearance.items.theme_light")
	}),
	createDropdownItem({
		actionKey: "dark",
		title: translateMemoized("settings.appearance.items.theme_dark")
	})
]

export const Appearance = memo(() => {
	const { colors, setColorScheme } = useColorScheme()
	const systemColorScheme = useSystemColorScheme()
	const [initialRouteName, setInitialRouteName] = useMMKVString("initialRouteName", mmkvInstance)
	const [themeSetting = "system", setThemeSetting] = useMMKVString("themeSetting", mmkvInstance)

	const onThemePress = useCallback(
		(item: Omit<DropdownItem, "icon">) => {
			const newTheme = item.actionKey as "system" | "light" | "dark"
			setThemeSetting(newTheme)

			if (newTheme === "system") {
				setColorScheme(systemColorScheme ?? "light")
			} else {
				setColorScheme(newTheme)
			}
		},
		[setThemeSetting, setColorScheme, systemColorScheme]
	)

	const items = useMemo(() => {
		return [
			{
				id: "theme",
				title: translateMemoized("settings.appearance.items.theme"),
				subTitle:
					Platform.OS === "android"
						? translateMemoized(`settings.appearance.items.theme_${themeSetting}`)
						: undefined,
				rightView: (
					<DropdownMenu
						items={themeDropdownItems}
						onItemPress={onThemePress}
					>
						<Button
							size={Platform.OS === "ios" ? "none" : "icon"}
							variant="plain"
							className="items-center justify-start"
						>
							{Platform.OS === "ios" && (
								<Text
									variant="callout"
									className="ios:px-0 text-muted-foreground px-2 font-normal"
									numberOfLines={1}
								>
									{translateMemoized(`settings.appearance.items.theme_${themeSetting}`)}
								</Text>
							)}
							<Icon
								name="pencil"
								size={24}
								color={colors.grey}
							/>
						</Button>
					</DropdownMenu>
				)
			},
			{
				id: "startOn",
				title: translateMemoized("settings.appearance.items.startOn"),
				subTitle:
					Platform.OS === "android"
						? translateMemoized(`settings.appearance.items.startOn_${initialRouteName ?? "home"}`)
						: undefined,
				rightView: (
					<DropdownMenu
						items={dropdownItems}
						onItemPress={item => setInitialRouteName(item.actionKey)}
					>
						<Button
							size={Platform.OS === "ios" ? "none" : "icon"}
							variant="plain"
							className="items-center justify-start"
						>
							{Platform.OS === "ios" && (
								<Text
									variant="callout"
									className="ios:px-0 text-muted-foreground px-2 font-normal"
									numberOfLines={1}
								>
									{translateMemoized(`settings.appearance.items.startOn_${initialRouteName ?? "home"}`)}
								</Text>
							)}
							<Icon
								name="pencil"
								size={24}
								color={colors.grey}
							/>
						</Button>
					</DropdownMenu>
				)
			}
		]
	}, [colors.grey, initialRouteName, setInitialRouteName, themeSetting, onThemePress])

	return (
		<SettingsComponent
			title={translateMemoized("settings.appearance.title")}
			showSearchBar={false}
			items={items}
		/>
	)
})

Appearance.displayName = "Appearance"

export default Appearance
