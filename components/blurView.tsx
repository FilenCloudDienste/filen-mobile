import { BlurView as ExpoBlurView } from "expo-blur"
import { View, Platform } from "react-native"
import { memo } from "react"

export const BlurView = memo((props: React.ComponentProps<typeof ExpoBlurView>) => {
	// On Android we just return a normal View since BlurView is not supported well
	return Platform.select({
		ios: <ExpoBlurView {...props} />,
		android: <View {...props} />
	})
})

BlurView.displayName = "BlurView"

export default BlurView
