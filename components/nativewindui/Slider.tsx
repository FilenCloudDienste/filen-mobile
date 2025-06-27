import RNSlider from "@react-native-community/slider"
import { Platform } from "react-native"
import { useColorScheme } from "~/lib/useColorScheme"
import { COLORS } from "~/theme/colors"
import { memo } from "react"

export const Slider = memo(
	({ thumbTintColor, minimumTrackTintColor, maximumTrackTintColor, ...props }: React.ComponentPropsWithoutRef<typeof RNSlider>) => {
		const { colors } = useColorScheme()

		return (
			<RNSlider
				thumbTintColor={thumbTintColor ?? Platform.OS === "ios" ? COLORS.white : colors.primary}
				minimumTrackTintColor={minimumTrackTintColor ?? colors.primary}
				maximumTrackTintColor={maximumTrackTintColor ?? Platform.OS === "android" ? colors.primary : undefined}
				{...props}
			/>
		)
	}
)

Slider.displayName = "Slider"
