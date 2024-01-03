import { useMemo } from "react"
import { useWindowDimensions } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

export default function useIsPortrait() {
	const dims = useWindowDimensions()
	const insets = useSafeAreaInsets()

	const dimensions = useMemo(() => {
		return {
			width: dims.width,
			height: dims.height,
			realWidth: dims.width - insets.left - insets.right,
			realHeight: dims.height - insets.top - insets.left
		}
	}, [dims, insets])

	return dimensions
}
