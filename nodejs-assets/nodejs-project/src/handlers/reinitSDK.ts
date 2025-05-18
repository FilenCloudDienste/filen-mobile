import sdk from "../lib/sdk"
import { Semaphore } from "../lib/semaphore"
import fs from "fs-extra"
import pathModule from "path"
import type NodeWorker from ".."
import { type FilenSDKConfig } from "@filen/sdk"

const mutex = new Semaphore(1)

export default async function reinitSDK(
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
