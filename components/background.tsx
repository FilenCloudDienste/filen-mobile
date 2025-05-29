import { memo, useEffect, useCallback, useRef } from "react"
import { BACKGROUND_TASK_IDENTIFIER } from "@/lib/constants"
import * as BackgroundTask from "expo-background-task"
import { foregroundCameraUpload } from "@/lib/cameraUpload"
import { useAppStateStore } from "@/stores/appState.store"
import { useShallow } from "zustand/shallow"

export const Background = memo(() => {
	const appState = useAppStateStore(useShallow(state => state.appState))
	const nextCameraUploadRunRef = useRef<number>(0)

	const enableBackgroundTask = useCallback(async () => {
		try {
			const status = await BackgroundTask.getStatusAsync()

			console.log("BackgroundTask status:", status)

			if (status !== BackgroundTask.BackgroundTaskStatus.Available) {
				return
			}

			await BackgroundTask.registerTaskAsync(BACKGROUND_TASK_IDENTIFIER, {
				minimumInterval: Math.floor(1440 / 24) // 24 times a day, every hour
			})

			console.log("BackgroundTask registered!")
		} catch (e) {
			console.error("Failed to register background task:", e)
		}
	}, [])

	useEffect(() => {
		const now = Date.now()

		if (appState === "active" && now > nextCameraUploadRunRef.current) {
			nextCameraUploadRunRef.current = now + 60000

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
