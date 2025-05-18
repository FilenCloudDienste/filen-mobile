import { useRef, useCallback } from "react"
import { useFocusEffect } from "@react-navigation/native"
import alerts from "@/lib/alerts"

export default function useRefreshOnFocus<T>(refetch: () => Promise<T>, enabled?: boolean) {
	const firstTimeRef = useRef<boolean>(true)

	useFocusEffect(
		useCallback(() => {
			if (firstTimeRef.current) {
				firstTimeRef.current = false

				return
			}

			if (typeof enabled === "boolean" && !enabled) {
				return
			}

			refetch().catch(err => {
				console.error(err)

				if (err instanceof Error) {
					alerts.error(err.message)
				}
			})
		}, [refetch, enabled])
	)
}
