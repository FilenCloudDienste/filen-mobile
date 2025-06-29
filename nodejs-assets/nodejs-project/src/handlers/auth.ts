import FilenSDK, { type FilenSDKConfig } from "@filen/sdk"
import { ANONYMOUS_SDK_CONFIG } from "../lib/constants"
import { Semaphore } from "../lib/semaphore"
import type NodeWorker from ".."
import fs from "fs-extra"
import pathModule from "path"
import sdk from "../lib/sdk"

let tempSDK = new FilenSDK({
	...ANONYMOUS_SDK_CONFIG,
	connectToSocket: false,
	metadataCache: false
})

const mutex = new Semaphore(1)

export async function login(params: FilenSDKConfig) {
	await mutex.acquire()

	try {
		tempSDK = new FilenSDK({
			...ANONYMOUS_SDK_CONFIG,
			connectToSocket: false,
			metadataCache: false
		})

		await tempSDK.login(params)

		return {
			...(tempSDK.config as Required<FilenSDKConfig>),
			password: "redacted",
			twoFactorCode: "redacted",
			connectToSocket: false,
			metadataCache: true
		} satisfies Required<FilenSDKConfig>
	} finally {
		mutex.release()
	}
}

export async function register(params: Parameters<FilenSDK["register"]>[0]) {
	await mutex.acquire()

	try {
		tempSDK = new FilenSDK({
			...ANONYMOUS_SDK_CONFIG,
			connectToSocket: false,
			metadataCache: false
		})

		await tempSDK.register(params)
	} finally {
		mutex.release()
	}
}

export async function reinitSDK(
	this: NodeWorker,
	params: {
		tmpPath: string
		sdkConfig: Required<FilenSDKConfig>
	}
) {
	await mutex.acquire()

	try {
		const tmpPath = pathModule.join(params.tmpPath, "filen-sdk")

		await fs.ensureDir(tmpPath)

		sdk.reinit({
			...params.sdkConfig,
			connectToSocket: false,
			metadataCache: true,
			tmpPath
		})
	} finally {
		mutex.release()
	}
}

export async function resendConfirmation(params: { email: string }): Promise<void> {
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

export async function forgotPassword(params: { email: string }): Promise<void> {
	await mutex.acquire()

	try {
		tempSDK = new FilenSDK({
			...ANONYMOUS_SDK_CONFIG,
			connectToSocket: false,
			metadataCache: false
		})

		await tempSDK.api(3).user().password().forgot(params)
	} finally {
		mutex.release()
	}
}
