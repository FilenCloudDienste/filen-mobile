import { useState, useEffect } from "react"
import { Dimensions, type ScaledSize } from "react-native"

export type Orientation = "portrait" | "landscape"
export type DimensionType = "window" | "screen"

export type OrientationState = {
	orientation: Orientation
	isPortrait: boolean
	isLandscape: boolean
	width: number
	height: number
}

export function useOrientation(dimensionType: DimensionType = "window"): OrientationState {
	const [screenDimensions, setScreenDimensions] = useState<ScaledSize>(Dimensions.get(dimensionType))
	const isPortrait = screenDimensions.height > screenDimensions.width
	const orientation: Orientation = isPortrait ? "portrait" : "landscape"

	useEffect(() => {
		const onChange = ({ window, screen }: { window: ScaledSize; screen: ScaledSize }) => {
			setScreenDimensions(dimensionType === "window" ? window : screen)
		}

		const subscription = Dimensions.addEventListener("change", onChange)

		return () => {
			subscription.remove()
		}
	}, [dimensionType])

	return {
		orientation,
		isPortrait,
		isLandscape: !isPortrait,
		width: screenDimensions.width,
		height: screenDimensions.height
	}
}

export default useOrientation
