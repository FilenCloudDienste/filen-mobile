import { useMemo } from "react"
import { useWindowDimensions } from "react-native"

export default function useIsPortrait() {
	const dimensions = useWindowDimensions()

	const portrait = useMemo(() => {
		return dimensions.height >= dimensions.width
	}, [dimensions])

	return portrait
}
