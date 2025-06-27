import { Switch } from "react-native"
import { memo } from "react"
import { useColorScheme } from "@/lib/useColorScheme"
import { COLORS } from "@/theme/colors"

export const Toggle = memo((props: React.ComponentPropsWithoutRef<typeof Switch>) => {
	const { colors } = useColorScheme()

	return (
		<Switch
			trackColor={{
				true: colors.primary,
				false: colors.grey
			}}
			thumbColor={COLORS.white}
			{...props}
		/>
	)
})

Toggle.displayName = "Toggle"
