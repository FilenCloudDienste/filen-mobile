import nodeWorker from "@/lib/nodeWorker"
import { Semaphore } from "@/lib/semaphore"
import { getIsAuthed, getSDKConfig } from "./auth"
import * as FileSystem from "expo-file-system/next"
import { type FilenSDKConfig } from "@filen/sdk"
import thumbnails from "./thumbnails"
import { waitForInitialization as waitForI18n } from "./i18n"
import sqlite from "./sqlite"
import paths from "./paths"

const mutex = new Semaphore(1)

export default async function setup(params?: { isAuthed: boolean; sdkConfig: Required<FilenSDKConfig> }): Promise<void> {
	await mutex.acquire()

	try {
		await nodeWorker.start("foreground")

		paths.clearTempDirectories()

		const thumbnailWarmup = thumbnails.warmupCache()
		const verifyOfflineFiles = sqlite.offlineFiles.verify()
		const i18n = waitForI18n()

		const isAuthed = params ? params.isAuthed : getIsAuthed()

		if (!isAuthed) {
			console.log("setup done, not authed")

			return
		}

		const tmpPath = FileSystem.Paths.cache.uri

		await nodeWorker.proxy("reinitSDK", {
			sdkConfig: params ? params.sdkConfig : getSDKConfig(),
			tmpPath: tmpPath.split("file://").join("")
		})

		await Promise.all([thumbnailWarmup, verifyOfflineFiles, i18n])

		console.log("setup done, authed")
	} finally {
		mutex.release()
	}
}
