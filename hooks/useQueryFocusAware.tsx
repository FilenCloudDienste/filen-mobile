import { useRef, useCallback } from "react"
import { useFocusEffect } from "@react-navigation/native"

export default function useQueryFocusAware() {
	const focusedRef = useRef<boolean>(true)

	useFocusEffect(
		useCallback(() => {
			focusedRef.current = true

			return () => {
				focusedRef.current = false
			}
		}, [])
	)

	return () => focusedRef.current
}
