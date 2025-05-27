import * as ExpoBackgroundTask from "expo-background-task"
import * as ExpoTaskManager from "expo-task-manager"
import { backgroundCameraUpload } from "./cameraUpload"
import { BACKGROUND_TASK_IDENTIFIER } from "./constants"
import setup from "./setup"

export async function registerBackgroundTask(): Promise<void> {
	try {
		const [status, registered] = await Promise.all([
			ExpoBackgroundTask.getStatusAsync(),
			ExpoTaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_IDENTIFIER)
		])

		if (registered) {
			console.log("BackgroundTask registered!")

			return
		}

		if (status !== ExpoBackgroundTask.BackgroundTaskStatus.Available) {
			console.error("BackgroundTask is not available. Status:", status)

			return
		}

		await ExpoBackgroundTask.registerTaskAsync(BACKGROUND_TASK_IDENTIFIER, {
			minimumInterval: 15
		})

		console.log("BackgroundTask registered!")
	} catch (e) {
		console.error("Failed to register background task:", e)
	}
}

ExpoTaskManager.defineTask(BACKGROUND_TASK_IDENTIFIER, async () => {
	console.log("Running background task:", BACKGROUND_TASK_IDENTIFIER)

	try {
		const abortController = new AbortController()

		const abortTimeout = setTimeout(() => {
			if (!abortController.signal.aborted) {
				abortController.abort()
			}
		}, 1000 * 25)

		try {
			const { isAuthed } = await setup({
				background: true
			})

			if (isAuthed) {
				await backgroundCameraUpload.run({
					abortSignal: abortController.signal
				})
			}
		} finally {
			clearTimeout(abortTimeout)
		}
	} catch (e) {
		console.error(e)
	}

	console.log("Background task completed:", BACKGROUND_TASK_IDENTIFIER)

	return ExpoBackgroundTask.BackgroundTaskResult.Success
})
