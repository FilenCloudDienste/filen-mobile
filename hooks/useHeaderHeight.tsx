import { useHeaderStore } from "@/stores/header.store"
import { useMemo } from "react"
import { useHeaderHeight as useReactNavigationHeaderHeight } from "@react-navigation/elements"
import { Platform } from "react-native"
import { useShallow } from "zustand/shallow"

export default function useHeaderHeight() {
	const height = useHeaderStore(useShallow(state => state.height))
	const reactNavigationHeaderHeight = useReactNavigationHeaderHeight()

	const headerHeight = useMemo(() => {
		return Platform.select({
			ios: reactNavigationHeaderHeight > 0 ? reactNavigationHeaderHeight : 0,
			default: reactNavigationHeaderHeight > 0 ? reactNavigationHeaderHeight : height > 0 ? height : 0
		})
	}, [height, reactNavigationHeaderHeight])

	return headerHeight
}
