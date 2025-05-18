import { useWindowDimensions, Platform, PixelRatio } from "react-native"
import { useMemo } from "react"

export const useIsTablet = (): boolean => {
	const { width, height } = useWindowDimensions()

	return useMemo(() => {
		const shortDimension = Math.min(width, height)

		if (Platform.OS === "ios") {
			return shortDimension >= 768
		} else if (Platform.OS === "android") {
			const pixelDensity = PixelRatio.get()
			const adjustedWidth = width / pixelDensity
			const adjustedHeight = height / pixelDensity
			const diagonalInches = Math.sqrt(Math.pow(adjustedWidth, 2) + Math.pow(adjustedHeight, 2)) / 160

			return diagonalInches >= 7
		}

		return shortDimension >= 600
	}, [width, height])
}
