import { useRef, useState, useEffect } from "react"
import { AppState, AppStateStatus } from "react-native"

export default function useAppState() {
	const [state, setState] = useState<AppStateStatus>(AppState.currentState)
	const lastState = useRef<AppStateStatus>(AppState.currentState)
	const [didChangeSinceInit, setDidChangeSinceInit] = useState<boolean>(false)

	useEffect(() => {
		const listener = AppState.addEventListener("change", nextAppState => {
			if (global.isRequestingPermissions) {
				setState("active")
			} else {
				if (lastState.current === "active" && nextAppState === "background") {
					setState("background")
				} else if (lastState.current === "background" && nextAppState === "active") {
					setState("active")
				}
			}

			setDidChangeSinceInit(true)

			lastState.current = nextAppState
		})

		return () => {
			listener.remove()
		}
	}, [])

	return {
		state,
		didChangeSinceInit
	}
}
