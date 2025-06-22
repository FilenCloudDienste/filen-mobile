import FilenSDK, { type FilenSDKConfig } from "@filen/sdk"
import { ANONYMOUS_SDK_CONFIG } from "../lib/constants"
import { Semaphore } from "../lib/semaphore"

let registerSDK = new FilenSDK({
	...ANONYMOUS_SDK_CONFIG,
	connectToSocket: false,
	metadataCache: false
})

const mutex = new Semaphore(1)

export default async function register(params: Parameters<FilenSDK["register"]>[0]) {
	await mutex.acquire()

	try {
		registerSDK = new FilenSDK({
			...ANONYMOUS_SDK_CONFIG,
			connectToSocket: false,
			metadataCache: false
		})

		await registerSDK.register(params)
	} finally {
		mutex.release()
	}
}
