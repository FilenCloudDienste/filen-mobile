import { Platform } from "react-native"
import useBottomTabsHeight from "@/hooks/useBottomTabsHeight"
import { useMemo } from "react"

export default function useBottomListContainerPadding(): number {
	const bottomTabBarHeight = useBottomTabsHeight()

	const padding = useMemo(() => {
		return Platform.select({
			ios: bottomTabBarHeight,
			android: 0,
			default: 0
		})
	}, [bottomTabBarHeight])

	return padding
}
