import { ActivityIndicator as RNActivityIndicator } from "react-native"
import { memo } from "react"
import { useColorScheme } from "@/lib/useColorScheme"

export const ActivityIndicator = memo((props: React.ComponentPropsWithoutRef<typeof RNActivityIndicator>) => {
	const { colors } = useColorScheme()

	return (
		<RNActivityIndicator
			color={colors.primary}
			{...props}
		/>
	)
})

ActivityIndicator.displayName = "ActivityIndicator"
