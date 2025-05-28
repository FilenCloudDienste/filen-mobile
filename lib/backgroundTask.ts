import * as ExpoBackgroundTask from "expo-background-task"
import * as ExpoTaskManager from "expo-task-manager"
//import { backgroundCameraUpload } from "./cameraUpload"
import { BACKGROUND_TASK_IDENTIFIER } from "./constants"
//import setup from "./setup"

ExpoTaskManager.defineTask(BACKGROUND_TASK_IDENTIFIER, async () => {
	try {
		/*const abortController = new AbortController()

		const abortTimeout = setTimeout(() => {
			if (!abortController.signal.aborted) {
				abortController.abort()
			}
		}, 1000 * 20)

		try {
			await setup({
				background: true
			})

			await backgroundCameraUpload.run({
				abortSignal: abortController.signal
			})
		} finally {
			if (!abortController.signal.aborted) {
				abortController.abort()
			}

			clearTimeout(abortTimeout)
		}*/
	} catch (e) {
		console.error(e)
	}

	return ExpoBackgroundTask.BackgroundTaskResult.Success
})
