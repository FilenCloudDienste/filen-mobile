import FilenSDK from "@filen/sdk"
import { ANONYMOUS_SDK_CONFIG } from "../lib/constants"
import { Semaphore } from "../lib/semaphore"

let tempSDK = new FilenSDK({
	...ANONYMOUS_SDK_CONFIG,
	connectToSocket: false,
	metadataCache: false
})

const mutex = new Semaphore(1)

export default async function resendConfirmation(params: { email: string }): Promise<void> {
	await mutex.acquire()

	try {
		tempSDK = new FilenSDK({
			...ANONYMOUS_SDK_CONFIG,
			connectToSocket: false,
			metadataCache: false
		})

		await tempSDK.api(3).confirmationSend(params)
	} finally {
		mutex.release()
	}
}
