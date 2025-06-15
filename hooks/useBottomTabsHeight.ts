import { useBottomTabBarHeight } from "react-native-bottom-tabs"

export default function useBottomTabsHeight() {
	const height = useBottomTabBarHeight()

	return height
}
