import * as ScreenOrientation from "expo-screen-orientation"
import { useFocusEffect } from "expo-router"
import { useCallback, useEffect } from "react"

export function useLockOrientation(orientation: ScreenOrientation.OrientationLock = ScreenOrientation.OrientationLock.PORTRAIT_UP) {
	useEffect(() => {
		ScreenOrientation.lockAsync(orientation).catch(console.error)

		return () => {
			ScreenOrientation.unlockAsync().catch(console.error)
		}
	}, [orientation])

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
