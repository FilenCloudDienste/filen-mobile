import { useMemo } from "react"
import { StatusBar, Platform } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useDimensions as useDims } from "@react-native-community/hooks"
import { useVisibility } from "expo-navigation-bar"
import useIsPortrait from "../useIsPortrait"

export default function useDimensions() {
	const dims = useDims()
	const insets = useSafeAreaInsets()
	const navigationBarVisibility = Platform.OS === "android" ? useVisibility() : null
	const isPortrait = useIsPortrait()

	const dimensions = useMemo(() => {
		const statusbarHeight = StatusBar.currentHeight ?? 0

		return {
			width: dims.window.width,
			height: dims.window.height,
			realWidth: dims.window.width - insets.left - insets.right,
			realHeight: dims.window.height - insets.top - insets.left,
			statusbarHeight,
			navigationBarHeight:
				Platform.OS === "android"
					? navigationBarVisibility === "visible" || navigationBarVisibility === null
						? dims.screen.height - dims.window.height - (isPortrait ? statusbarHeight : 0)
						: 0
					: 0,
			insets,
			screen: dims.screen,
			window: dims.window,
			isPortrait
		}
	}, [dims, insets, isPortrait, navigationBarVisibility])

	return dimensions
}
