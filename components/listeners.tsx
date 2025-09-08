import { memo, useEffect, useRef, useCallback } from "react"
import useReactQueryRefetchOnAppFocus from "@/hooks/useReactQueryRefetchOnAppFocus"
import { useAppStateStore } from "@/stores/appState.store"
import { AppState, type AppStateStatus } from "react-native"
import { useShallow } from "zustand/shallow"
import nodeWorker from "@/lib/nodeWorker"
import NetInfo from "@react-native-community/netinfo"

export const Listeners = memo(() => {
	useReactQueryRefetchOnAppFocus()

	const previousAppStateRef = useRef<AppStateStatus>(AppState.currentState)
	const isRefreshingRef = useRef<boolean>(false)
	const setAppState = useAppStateStore(useShallow(state => state.setAppState))

	const refresh = useCallback(async () => {
		if (isRefreshingRef.current) {
			return
		}

		isRefreshingRef.current = true

		try {
			const [, httpServerInfo] = await Promise.all([NetInfo.refresh(), nodeWorker.proxy("restartHTTPServer", undefined)])

			nodeWorker.httpAuthToken = httpServerInfo.authToken
			nodeWorker.httpServerPort = httpServerInfo.port

			isRefreshingRef.current = false
		} catch (e) {
			console.error(e)
		} finally {
			isRefreshingRef.current = false
		}
	}, [])

	useEffect(() => {
		const appStateSub = AppState.addEventListener("change", nextAppState => {
			if (previousAppStateRef.current !== nextAppState) {
				previousAppStateRef.current = nextAppState

				setAppState(nextAppState)

				if (nextAppState === "active") {
					refresh()
				}
			}
		})

		return () => {
			appStateSub.remove()
		}
	}, [setAppState, refresh])

	return null
})

Listeners.displayName = "Listeners"

export default Listeners
