import { useEffect } from "react"
import { AppState, Platform, type AppStateStatus } from "react-native"
import { focusManager } from "@tanstack/react-query"

export function onAppStateChange(status: AppStateStatus): void {
	if (Platform.OS !== "web") {
		focusManager.setFocused(status === "active")
	}
}

export default function useReactQueryRefetchOnAppFocus(): void {
	useEffect(() => {
		const subscription = AppState.addEventListener("change", onAppStateChange)

		return () => {
			subscription.remove()
		}
	}, [])
}
