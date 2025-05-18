import { memo, useEffect } from "react"
import useReactQueryRefetchOnAppFocus from "@/hooks/useReactQueryRefetchOnAppFocus"
import { useAppStateStore } from "@/stores/appState.store"
import { AppState } from "react-native"
import { useShallow } from "zustand/shallow"

export const Listeners = memo(() => {
	const setAppState = useAppStateStore(useShallow(state => state.setAppState))

	useReactQueryRefetchOnAppFocus()

	useEffect(() => {
		const appStateSub = AppState.addEventListener("change", nextAppState => {
			setAppState(nextAppState)
		})

		return () => {
			appStateSub.remove()
		}
	}, [setAppState])

	return null
})

Listeners.displayName = "Listeners"

export default Listeners
