import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import useHeaderHeight from "@/hooks/useHeaderHeight"
import { useWindowDimensions } from "react-native"
import { useMemo } from "react"

export default function useContentDimensions(
	{ includeHeader, includeTabBar }: { includeHeader: boolean; includeTabBar: boolean } = { includeHeader: true, includeTabBar: true }
) {
	const insets = useSafeAreaInsets()
	const bottomTabBarHeight = useBottomTabBarHeight()
	const headerHeight = useHeaderHeight()
	const dimensions = useWindowDimensions()

	const contentDimensions = useMemo(() => {
		return {
			height: Math.floor(
				dimensions.height -
					(includeHeader ? insets.top + headerHeight : 0) -
					(includeTabBar ? insets.bottom + bottomTabBarHeight : 0)
			),
			width: Math.floor(dimensions.width - insets.left - insets.right)
		}
	}, [insets, bottomTabBarHeight, dimensions.height, headerHeight, includeHeader, includeTabBar, dimensions.width])

	const estimatedListSize = useMemo(() => {
		return {
			width: contentDimensions.width,
			height: contentDimensions.height
		}
	}, [contentDimensions])

	return {
		contentDimensions,
		insets,
		headerHeight,
		dimensions,
		estimatedListSize
	}
}
