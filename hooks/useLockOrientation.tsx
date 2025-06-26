import * as ScreenOrientation from "expo-screen-orientation"
import { useFocusEffect } from "expo-router"
import { useCallback } from "react"

export function useLockOrientation(orientation: ScreenOrientation.OrientationLock = ScreenOrientation.OrientationLock.PORTRAIT_UP) {
	useFocusEffect(
		useCallback(() => {
			ScreenOrientation.lockAsync(orientation).catch(console.error)

			return () => {
				ScreenOrientation.unlockAsync().catch(console.error)
			}
		}, [orientation])
	)
}

export default useLockOrientation
