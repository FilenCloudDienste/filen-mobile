import FilenSDK, { type FilenSDKConfig } from "@filen/sdk"
import { ANONYMOUS_SDK_CONFIG } from "../lib/constants"
import { Semaphore } from "../lib/semaphore"

let loginSDK = new FilenSDK({
	...ANONYMOUS_SDK_CONFIG,
	connectToSocket: false,
	metadataCache: false
})

const mutex = new Semaphore(1)

export default async function login(params: FilenSDKConfig) {
	await mutex.acquire()

	try {
		loginSDK = new FilenSDK({
			...ANONYMOUS_SDK_CONFIG,
			connectToSocket: false,
			metadataCache: false
		})

		await loginSDK.login(params)

		return {
			...(loginSDK.config as Required<FilenSDKConfig>),
			password: "redacted",
			twoFactorCode: "redacted",
			connectToSocket: false,
			metadataCache: true
		} satisfies Required<FilenSDKConfig>
	} finally {
		mutex.release()
	}
}
