import { memo, useEffect, useCallback } from "react"
import { BACKGROUND_TASK_IDENTIFIER } from "@/lib/constants"
import * as ExpoBackgroundTask from "expo-background-task"
import { foregroundCameraUpload } from "@/lib/cameraUpload"
import { useAppStateStore } from "@/stores/appState.store"
import { useShallow } from "zustand/shallow"

export const Background = memo(() => {
	const appState = useAppStateStore(useShallow(state => state.appState))

	const enableBackgroundTask = useCallback(async () => {
		try {
			const status = await ExpoBackgroundTask.getStatusAsync()

			console.log("BackgroundTask status:", status)

			if (status !== ExpoBackgroundTask.BackgroundTaskStatus.Available) {
				return
			}

			await ExpoBackgroundTask.registerTaskAsync(BACKGROUND_TASK_IDENTIFIER, {
				minimumInterval: Math.floor(1440 / 24) // 24 times a day, every hour
			})

			console.log("BackgroundTask registered!")
		} catch (e) {
			console.error("Failed to register background task:", e)
		}
	}, [])

	useEffect(() => {
		if (appState === "active") {
			foregroundCameraUpload
				.canRun({
					checkAppState: true,
					checkBattery: true,
					checkNetwork: true,
					checkPermissions: true
				})
				.then(canRun => {
					if (canRun) {
						foregroundCameraUpload.run().catch(console.error)
					}
				})
				.catch(console.error)
		}
	}, [appState])

	useEffect(() => {
		enableBackgroundTask()
	}, [enableBackgroundTask])

	return null
})

Background.displayName = "Background"

export default Background
