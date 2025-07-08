import * as ExpoBackgroundTask from "expo-background-task"
import * as ExpoTaskManager from "expo-task-manager"
import { backgroundCameraUpload } from "./cameraUpload"
import { BACKGROUND_TASK_IDENTIFIER } from "./constants"
import authService from "@/services/auth.service"

export async function registerBackgroundTask() {
	const status = await ExpoBackgroundTask.getStatusAsync()

	console.log("BackgroundTask status:", status)

	if (status !== ExpoBackgroundTask.BackgroundTaskStatus.Available) {
		return
	}

	await ExpoBackgroundTask.registerTaskAsync(BACKGROUND_TASK_IDENTIFIER, {
		minimumInterval: Math.floor(1440 / 24) // 24 times a day, every hour
	})

	console.log("BackgroundTask registered!")
}

registerBackgroundTask()

ExpoTaskManager.defineTask(BACKGROUND_TASK_IDENTIFIER, async () => {
	try {
		const abortController = new AbortController()

		const abortTimeout = setTimeout(() => {
			if (!abortController.signal.aborted) {
				abortController.abort()
			}
		}, 1000 * 25)

		try {
			const { isAuthed } = await authService.setup({
				background: true
			})

			if (!isAuthed) {
				return
			}

			await backgroundCameraUpload.run({
				abortSignal: abortController.signal
			})
		} finally {
			clearTimeout(abortTimeout)
		}
	} catch (e) {
		console.error(e)
	}

	return ExpoBackgroundTask.BackgroundTaskResult.Success
})
