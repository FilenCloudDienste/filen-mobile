import { useRef, useCallback } from "react"
import type { NotifyOnChangeProps } from "@tanstack/query-core"
import { useFocusEffect } from "@react-navigation/native"

export default function useFocusNotifyOnChangeProps(notifyOnChangeProps?: NotifyOnChangeProps) {
	const focusedRef = useRef<boolean>(true)

	useFocusEffect(
		useCallback(() => {
			focusedRef.current = true

			return () => {
				focusedRef.current = false
			}
		}, [])
	)

	return () => {
		if (!focusedRef.current) {
			return []
		}

		if (typeof notifyOnChangeProps === "function") {
			return notifyOnChangeProps()
		}

		return notifyOnChangeProps
	}
}
