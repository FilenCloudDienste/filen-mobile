import { useEffect } from "react"
import { useAuthContext } from "./authContextProvider"
import * as SplashScreen from "expo-splash-screen"

SplashScreen.setOptions({
	duration: 400,
	fade: true
})

SplashScreen.preventAutoHideAsync().catch(console.error)

export function SplashScreenController() {
	const { setupDone } = useAuthContext()

	useEffect(() => {
		if (setupDone) {
			SplashScreen.hideAsync().catch(console.error)
		}
	}, [setupDone])

	return null
}
