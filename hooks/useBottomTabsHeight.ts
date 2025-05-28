import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs"
import { useMemo } from "react"
import { useShallow } from "zustand/shallow"
import { useBottomTabsStore } from "@/stores/bottomTabs.store"
import { Platform } from "react-native"

export default function useBottomTabsHeight() {
	const ios = useBottomTabBarHeight()
	const android = useBottomTabsStore(useShallow(state => state.height))

	const height = useMemo(() => {
		return Platform.select({
			ios,
			default: android
		})
	}, [ios, android])

	return height
}
