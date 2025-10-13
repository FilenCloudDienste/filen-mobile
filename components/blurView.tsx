import { BlurView as ExpoBlurView } from "expo-blur"
import { View } from "react-native"
import { memo } from "react"
import { Platform } from "react-native"

export const BlurView = memo((props: React.ComponentProps<typeof ExpoBlurView>) => {
	// On Android we just return a normal View since BlurView is not supported well
	return Platform.select({
		ios: <ExpoBlurView {...props} />,
		android: <View {...props} />
	})
})

export default BlurView
