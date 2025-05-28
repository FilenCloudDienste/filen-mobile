import { useState, useEffect, useCallback } from "react"
import { Platform, StatusBar } from "react-native"
import { type EdgeInsets, useSafeAreaInsets } from "react-native-safe-area-context"
import useDimensions from "./useDimensions"
import useHeaderHeight from "@/hooks/useHeaderHeight"
import useBottomTabsHeight from "@/hooks/useBottomTabsHeight"

export const useKeyboardAvoidingViewVerticalOffset = ({
	additionalOffset = 0,
	includeStatusBar = true,
	includeBottomTabs = false
}: {
	additionalOffset?: number
	includeStatusBar?: boolean
	includeBottomTabs?: boolean
} = {}): number => {
	const bottomTabHeight = useBottomTabsHeight()
	const headerHeight = useHeaderHeight()
	const insets: EdgeInsets = useSafeAreaInsets()
	const [offset, setOffset] = useState<number>(0)
	const { screen } = useDimensions()
	const statusBarHeight: number = StatusBar.currentHeight ?? 0
	const isLandscape: boolean = screen.width > screen.height

	const getAndroidDeviceAdjustment = useCallback((): number => {
		const aspectRatio: number = screen.height / screen.width

		if (aspectRatio > 2) {
			return isLandscape ? 0 : 10
		}

		return 0
	}, [isLandscape, screen.height, screen.width])

	useEffect(() => {
		const calculateOffset = (): number => {
			if (Platform.OS === "ios") {
				let iosOffset = headerHeight + additionalOffset

				if (insets.bottom > 0) {
					iosOffset += insets.bottom
				}

				if (includeBottomTabs && bottomTabHeight > 0) {
					iosOffset += bottomTabHeight
				}

				return iosOffset
			} else {
				let androidOffset = headerHeight + additionalOffset

				if (includeStatusBar) {
					androidOffset += statusBarHeight
				}

				if (includeBottomTabs && bottomTabHeight > 0) {
					androidOffset += bottomTabHeight
				}

				const deviceAdjustment = getAndroidDeviceAdjustment()

				androidOffset += deviceAdjustment

				return androidOffset
			}
		}

		setOffset(calculateOffset())
	}, [
		headerHeight,
		additionalOffset,
		insets,
		includeStatusBar,
		statusBarHeight,
		includeBottomTabs,
		bottomTabHeight,
		screen.width,
		screen.height,
		getAndroidDeviceAdjustment
	])

	return offset
}

export default useKeyboardAvoidingViewVerticalOffset
