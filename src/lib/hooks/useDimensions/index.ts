import { useMemo } from "react"
import { StatusBar, Platform, useWindowDimensions, Dimensions } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useVisibility } from "expo-navigation-bar"
import useIsPortrait from "../useIsPortrait"

export default function useDimensions() {
	const dims = useWindowDimensions()
	const insets = useSafeAreaInsets()
	const navigationBarVisibility = Platform.OS === "android" ? useVisibility() : null
	const isPortrait = useIsPortrait()

	const SCREEN = useMemo(() => {
		return Dimensions.get("screen")
	}, [isPortrait])

	const dimensions = useMemo(() => {
		const statusbarHeight = StatusBar.currentHeight ?? 0

		return {
			width: dims.width,
			height: dims.height,
			realWidth: dims.width - insets.left - insets.right,
			realHeight: dims.height - insets.top - insets.left,
			statusbarHeight,
			navigationBarHeight:
				Platform.OS === "android"
					? navigationBarVisibility === "visible" || navigationBarVisibility === null
						? SCREEN.height - dims.height - (isPortrait ? statusbarHeight : 0)
						: 0
					: 0,
			insets,
			screen: SCREEN,
			window: dims,
			isPortrait
		}
	}, [dims, insets, isPortrait, navigationBarVisibility])

	return dimensions
}
