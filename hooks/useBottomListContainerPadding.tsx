import { Platform } from "react-native"
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs"
import { useMemo } from "react"

export default function useBottomListContainerPadding(): number {
	const bottomTabBarHeight = useBottomTabBarHeight()

	const padding = useMemo(() => {
		return Platform.select({
			ios: bottomTabBarHeight,
			android: 0,
			default: 0
		})
	}, [bottomTabBarHeight])

	return padding
}
