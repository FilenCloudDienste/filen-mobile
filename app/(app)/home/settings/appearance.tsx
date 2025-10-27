import { memo, useMemo } from "react"
import { Settings as SettingsComponent } from "@/components/settings"
import { Platform } from "react-native"
import { DropdownMenu } from "@/components/nativewindui/DropdownMenu"
import { createDropdownItem } from "@/components/nativewindui/DropdownMenu/utils"
import { Button } from "@/components/nativewindui/Button"
import { useColorScheme } from "@/lib/useColorScheme"
import { Icon } from "@roninoss/icons"
import { Text } from "@/components/nativewindui/Text"
import { translateMemoized } from "@/lib/i18n"
import { useMMKVString } from "react-native-mmkv"
import mmkvInstance from "@/lib/mmkv"

export const dropdownItems = ["home", "drive", "photos", "notes", "chats"].map(key =>
	createDropdownItem({
		actionKey: key,
		title: translateMemoized(`settings.appearance.items.startOn_${key}`)
	})
)

export const Appearance = memo(() => {
	const { colors } = useColorScheme()
	const [initialRouteName, setInitialRouteName] = useMMKVString("initialRouteName", mmkvInstance)

	const items = useMemo(() => {
		return [
			{
				id: "0",
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
	}, [colors.grey, initialRouteName, setInitialRouteName])

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
