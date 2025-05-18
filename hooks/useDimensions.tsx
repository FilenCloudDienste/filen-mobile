import { Dimensions } from "react-native"
import { useEffect, useState } from "react"
import * as ScreenOrientation from "expo-screen-orientation"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useIsTablet } from "./useIsTablet"

export default function useDimensions() {
	const [windowDimensions, setWindowDimensions] = useState<{
		width: number
		height: number
	}>(Dimensions.get("window"))
	const [screenDimensions, setScreenDimensions] = useState<{
		width: number
		height: number
	}>(Dimensions.get("screen"))
	const [isPortrait, setIsPortrait] = useState<boolean>(windowDimensions.height > windowDimensions.width)
	const insets = useSafeAreaInsets()
	const isTablet = useIsTablet()

	useEffect(() => {
		const calc = () => {
			setTimeout(() => {
				const window = Dimensions.get("window")
				const screen = Dimensions.get("screen")

				setWindowDimensions(window)
				setScreenDimensions(screen)
				setIsPortrait(window.height > window.width)
			}, 100)
		}

		calc()

		const subscription = Dimensions.addEventListener("change", calc)
		const sub = ScreenOrientation.addOrientationChangeListener(calc)

		return () => {
			subscription?.remove()
			sub?.remove()
		}
	}, [])

	return {
		window: windowDimensions,
		screen: screenDimensions,
		isPortrait,
		isLandscape: !isPortrait,
		insets,
		isTablet
	}
}
