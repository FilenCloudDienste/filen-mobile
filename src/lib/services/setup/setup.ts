import { updateKeys } from "../user/keys"
import { apiRequest, registerPushToken } from "../../api"
import { promiseAllSettled } from "../../helpers"
import storage from "../../storage"
import { showToast } from "../../../components/Toasts"
import { NavigationContainerRef } from "@react-navigation/native"
import { getOfflineList, removeItemFromOfflineList } from "../offline"
import { validate } from "uuid"
import { Item } from "../../../types"
import * as fs from "../../fs"
import { init as initDb, dbFs } from "../../db"
import { Image } from "expo-image"
import { sharedStorage } from "../../storage/storage"
import { Platform } from "react-native"

const CACHE_CLEARING_ENABLED = true

const DONT_DELETE: string[] = [
	"sentry",
	"expo",
	"webview",
	"image_manager",
	"log",
	"logs",
	"com.hackemist",
	"com.apple",
	"nsird",
	"io.filen",
	"image_cache",
	"http-cache",
	"a document being saved by",
	"io.",
	"com."
]

export const canDelete = (name: string): boolean => {
	return DONT_DELETE.filter(d => name.toLowerCase().indexOf(d.toLowerCase()) !== -1).length == 0
}

export const checkOfflineItems = async (): Promise<void> => {
	const deletePromises = []

	let [list, offlinePath] = await Promise.all([getOfflineList(), fs.getDownloadPath({ type: "offline" })])

	offlinePath = offlinePath.slice(0, -1)

	const items: string[] = await fs.readDirectory(offlinePath)
	const inList: string[] = list.map(item => item.uuid)

	const inDir: string[] = items
		.filter(item => {
			if (item.indexOf("_") == -1) {
				return false
			}

			const exUnderscore = item.split("_")
			const uuidEx = exUnderscore[exUnderscore.length - 1].split(".")
			const uuid = uuidEx[0]

			if (!validate(uuid)) {
				return false
			}

			return true
		})
		.map(item => {
			const exUnderscore = item.split("_")
			const uuidEx = exUnderscore[exUnderscore.length - 1].split(".")
			const uuid = uuidEx[0]

			return uuid
		})

	const toDelete: string[] = []
	const toRemove: string[] = []

	for (let i = 0; i < items.length; i++) {
		let found = false

		for (let x = 0; x < inList.length; x++) {
			if (items[i].indexOf(inList[x]) !== -1) {
				found = true
			}
		}

		if (!found) {
			toDelete.push(items[i])
		}
	}

	for (let i = 0; i < inList.length; i++) {
		let found = false

		for (let x = 0; x < inDir.length; x++) {
			if (inList[i] == inDir[x]) {
				found = true
			}
		}

		if (!found) {
			toRemove.push(items[i])
		}
	}

	for (let i = 0; i < toDelete.length; i++) {
		if (canDelete(toDelete[i])) {
			deletePromises.push(fs.unlink(offlinePath + "/" + toDelete[i]))
		}
	}

	for (let i = 0; i < toRemove.length; i++) {
		removeItemFromOfflineList({
			item: {
				uuid: toRemove[i]
			} as Item
		}).catch(err => {
			console.log(6, "Could not remove", toRemove[i], err)
		})
	}

	await promiseAllSettled(deletePromises)
}

export const clearCacheDirectories = async (age: number = 300000): Promise<void> => {
	Image.clearDiskCache().catch(console.error)
	Image.clearMemoryCache().catch(console.error)

	const deletePromises: Promise<void>[] = []
	const cachedDownloadsPath = (await fs.getDownloadPath({ type: "cachedDownloads" })).slice(0, -1)
	const cacheDownloadsItems = await fs.readDirectory(cachedDownloadsPath)

	for (let i = 0; i < cacheDownloadsItems.length; i++) {
		if (CACHE_CLEARING_ENABLED) {
			if (canDelete(cacheDownloadsItems[i])) {
				deletePromises.push(
					new Promise((resolve, reject) => {
						fs.stat(cachedDownloadsPath + "/" + cacheDownloadsItems[i])
							.then(stat => {
								if (!stat.exists || stat.modificationTime + age > Date.now()) {
									resolve()

									return
								}

								fs.unlink(cachedDownloadsPath + "/" + cacheDownloadsItems[i])
									.then(resolve)
									.catch(reject)
							})
							.catch(reject)
					})
				)
			}
		}
	}

	if (fs.cacheDirectory) {
		const cachePath = fs.cacheDirectory().indexOf("file://") == -1 ? "file://" + fs.cacheDirectory() : fs.cacheDirectory()
		const cacheItems = await fs.readDirectory(cachePath)

		for (let i = 0; i < cacheItems.length; i++) {
			if (CACHE_CLEARING_ENABLED) {
				if (canDelete(cacheItems[i])) {
					deletePromises.push(
						new Promise((resolve, reject) => {
							fs.stat(cachePath + "/" + cacheItems[i])
								.then(stat => {
									if (!stat.exists || stat.modificationTime + age > Date.now()) {
										resolve()

										return
									}

									fs.unlink(cachePath + "/" + cacheItems[i])
										.then(resolve)
										.catch(reject)
								})
								.catch(reject)
						})
					)
				}
			}
		}
	}

	const tempPath = (await fs.getDownloadPath({ type: "temp" })).slice(0, -1)
	const tempItems = await fs.readDirectory(tempPath)

	for (let i = 0; i < tempItems.length; i++) {
		if (CACHE_CLEARING_ENABLED) {
			if (canDelete(tempItems[i])) {
				deletePromises.push(
					new Promise((resolve, reject) => {
						fs.stat(tempPath + "/" + tempItems[i])
							.then(stat => {
								if (!stat.exists || stat.modificationTime + age > Date.now()) {
									resolve()

									return
								}

								fs.unlink(tempPath + "/" + tempItems[i])
									.then(resolve)
									.catch(reject)
							})
							.catch(reject)
					})
				)
			}
		}
	}

	await promiseAllSettled(deletePromises)
}

export const setup = async ({ navigation }: { navigation: NavigationContainerRef<ReactNavigation.RootParamList> }): Promise<void> => {
	dbFs.warmUp()
		.then(() =>
			checkOfflineItems()
				.then(() =>
					clearCacheDirectories(300000)
						.then(() => {
							if (Platform.OS === "ios") {
								fs.deleteOldIOSDocumentDirs().catch(console.error)
							}
						})
						.catch(console.error)
				)
				.catch(console.error)
		)
		.catch(console.error)

	const result = await Promise.all([
		initDb(),
		updateKeys({ navigation }),
		apiRequest({
			method: "GET",
			endpoint: "/v3/user/baseFolder"
		})
	])

	const response = result[2]

	if (!response.status) {
		console.error(response.message)

		showToast({ message: response.message })

		throw new Error(response.message)
	}

	const userId = storage.getNumber("userId") || 0

	storage.set("defaultDriveUUID:" + userId, response.data.uuid)
	storage.set("defaultDriveOnly:" + userId, true)

	sharedStorage.set("apiKey", storage.getString("apiKey") || "")
	sharedStorage.set("masterKeys", storage.getString("masterKeys") || "[]")
	sharedStorage.set("isLoggedIn", storage.getBoolean("isLoggedIn"))
	sharedStorage.set("defaultDriveUUID:" + userId, response.data.uuid)
	sharedStorage.set("userId", userId)
	sharedStorage.set("biometricPinAuth:" + userId, storage.getBoolean("biometricPinAuth:" + userId))

	const pushToken = storage.getString("pushToken")

	if (typeof pushToken === "string" && pushToken.length > 0) {
		registerPushToken(pushToken)
			.then(() => {
				console.log("Push token registered:", pushToken)
			})
			.catch(console.error)
	}

	const deviceId = storage.getString("deviceId")

	if (typeof deviceId !== "string") {
		storage.set("deviceId", await global.nodeThread.uuidv4())
	}
}
