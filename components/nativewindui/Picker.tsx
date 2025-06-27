import { Picker as RNPicker } from "@react-native-picker/picker"
import { View } from "react-native"
import { memo } from "react"
import { cn } from "@/lib/cn"
import { useColorScheme } from "@/lib/useColorScheme"

export function PickerComponent<T>({
	mode = "dropdown",
	style,
	dropdownIconColor,
	dropdownIconRippleColor,
	className,
	...props
}: React.ComponentPropsWithoutRef<typeof RNPicker<T>>) {
	const { colors } = useColorScheme()

	return (
		<View className={cn("ios:shadow-sm ios:shadow-black/5 border-background bg-background rounded-md border", className)}>
			<RNPicker
				mode={mode}
				style={
					style ?? {
						backgroundColor: colors.root,
						borderRadius: 8
					}
				}
				dropdownIconColor={dropdownIconColor ?? colors.foreground}
				dropdownIconRippleColor={dropdownIconRippleColor ?? colors.foreground}
				{...props}
			/>
		</View>
	)
}

export const Picker = memo(PickerComponent)

Picker.displayName = "Picker"

export const PickerItem = memo(RNPicker.Item)

PickerItem.displayName = "PickerItem"
