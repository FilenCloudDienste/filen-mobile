import { useMemo } from "react"
import { Platform } from "react-native"
import useIsPortrait from "../useIsPortrait"

export default function useKeyboardOffset() {
	const isPortrait = useIsPortrait()

	const offset = useMemo(() => {
		if (Platform.OS === "ios") {
			if (isPortrait) {
				return 64
			}

			return 40
		}

		return 0
	}, [isPortrait])

	return offset
}
