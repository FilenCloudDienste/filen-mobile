import { useMemo } from "react"
import { StatusBar, Platform } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useDimensions as useDims } from "@react-native-community/hooks"

export default function useDimensions() {
	const dims = useDims()
	const insets = useSafeAreaInsets()

	const dimensions = useMemo(() => {
		return {
			width: dims.window.width,
			height: dims.window.height,
			realWidth: dims.window.width - insets.left - insets.right,
			realHeight: dims.window.height - insets.top - insets.left,
			statusbarHeight: StatusBar.currentHeight ?? 0,
			navigationBarHeight: Platform.OS === "android" ? dims.screen.height - dims.window.height - (StatusBar.currentHeight ?? 0) : 0,
			insets,
			dims
		}
	}, [dims, insets])

	return dimensions
}
