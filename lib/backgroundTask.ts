import * as ExpoBackgroundTask from "expo-background-task"
import * as ExpoTaskManager from "expo-task-manager"
import { backgroundCameraUpload } from "./cameraUpload"
import { BACKGROUND_TASK_IDENTIFIER } from "./constants"
import setup from "./setup"

ExpoTaskManager.defineTask(BACKGROUND_TASK_IDENTIFIER, async () => {
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
