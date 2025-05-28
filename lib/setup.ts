import nodeWorker from "@/lib/nodeWorker"
import { Semaphore } from "@/lib/semaphore"
import { getIsAuthed, getSDKConfig } from "./auth"
import * as FileSystem from "expo-file-system/next"
import { type FilenSDKConfig } from "@filen/sdk"
import thumbnails from "./thumbnails"
import { waitForInitialization as waitForI18n } from "./i18n"
import sqlite from "./sqlite"
import paths from "./paths"
import assets from "./assets"
import { normalizeFilePathForNode } from "./utils"
import { reinitSDK } from "./sdk"

const mutex = new Semaphore(1)

export default async function setup(params?: { isAuthed?: boolean; sdkConfig?: Required<FilenSDKConfig>; background?: boolean }): Promise<
	| {
			isAuthed: false
	  }
	| {
			isAuthed: true
			sdkConfig: Required<FilenSDKConfig>
	  }
> {
	await mutex.acquire()

	try {
		if (!params?.background) {
			await nodeWorker.start()

			paths.clearTempDirectories()
		}

		const thumbnailWarmup = params?.background ? Promise.resolve() : thumbnails.warmupCache()
		const verifyOfflineFiles = params?.background ? Promise.resolve() : sqlite.offlineFiles.verify()
		const i18n = params?.background ? Promise.resolve() : waitForI18n()
		const isAuthed = params && typeof params.isAuthed === "boolean" ? params.isAuthed : getIsAuthed()
		const assetsCopy = params?.background ? Promise.resolve() : assets.copy()

		if (!isAuthed) {
			await Promise.all([thumbnailWarmup, verifyOfflineFiles, i18n, assetsCopy])

			console.log("setup done, not authed")

			return {
				isAuthed: false
			}
		}

		const tmpPath = normalizeFilePathForNode(FileSystem.Paths.cache.uri)
		const sdkConfig = params && params.sdkConfig ? params.sdkConfig : getSDKConfig()

		reinitSDK({
			...sdkConfig,
			connectToSocket: false,
			metadataCache: true,
			tmpPath
		})

		await Promise.all([
			params?.background
				? Promise.resolve()
				: nodeWorker.proxy("reinitSDK", {
						sdkConfig,
						tmpPath
				  }),
			thumbnailWarmup,
			verifyOfflineFiles,
			i18n,
			assetsCopy
		])

		console.log("setup done, authed")

		return {
			isAuthed: true,
			sdkConfig
		}
	} finally {
		mutex.release()
	}
}
