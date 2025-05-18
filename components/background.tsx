import { memo, useEffect, useRef, useCallback } from "react"
import { foregroundCameraUpload } from "@/lib/cameraUpload"
import { useAppStateStore } from "@/stores/appState.store"
import { BACKGROUND_TASK_IDENTIFIER } from "@/lib/constants"
import * as ExpoBackgroundTask from "expo-background-task"
import * as ExpoTaskManager from "expo-task-manager"
import { useShallow } from "zustand/shallow"

export const Background = memo(() => {
	const appState = useAppStateStore(useShallow(state => state.appState))
	const registeringBackgroundTaskRef = useRef<boolean>(false)
	const backgroundTaskRegisteredRef = useRef<boolean>(false)

	const toggleBackgroundTask = useCallback(async (enable: boolean) => {
		if (registeringBackgroundTaskRef.current) {
			return
		}

		registeringBackgroundTaskRef.current = true

		try {
			const [status, registered] = await Promise.all([
				ExpoBackgroundTask.getStatusAsync(),
				ExpoTaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_IDENTIFIER)
			])

			if (registered || status !== ExpoBackgroundTask.BackgroundTaskStatus.Available) {
				return
			}

			if (enable) {
				if (backgroundTaskRegisteredRef.current) {
					return
				}

				await ExpoBackgroundTask.registerTaskAsync(BACKGROUND_TASK_IDENTIFIER, {
					minimumInterval: 15
				})

				backgroundTaskRegisteredRef.current = true

				console.log("BackgroundTask registered!")
			} else {
				await ExpoBackgroundTask.unregisterTaskAsync(BACKGROUND_TASK_IDENTIFIER)

				backgroundTaskRegisteredRef.current = false

				console.log("BackgroundTask unregistered!")
			}
		} finally {
			registeringBackgroundTaskRef.current = false
		}
	}, [])

	useEffect(() => {
		if (appState === "active") {
			toggleBackgroundTask(true)

			foregroundCameraUpload.run().catch(console.error)
		}
	}, [appState, toggleBackgroundTask])

	return null
})

Background.displayName = "Background"

export default Background
