import storage from "../../storage"
import { getDownloadPath, queueFileDownload } from "../download/download"
import { getFileExt, getMasterKeys, simpleDate } from "../../helpers"
import { DeviceEventEmitter } from "react-native"
import { Item } from "../../../types"
import * as fs from "../../fs"
import * as db from "../../db"
import { isOnline } from "../isOnline"
import { fetchOfflineFilesInfo } from "../../api"
import { decryptFileMetadata } from "../../crypto"

export const getOfflineList = async (): Promise<Item[]> => {
	const userId = storage.getNumber("userId")

	if (userId == 0) {
		throw new Error("userId in storage invalid length")
	}

	const offlineList: Item[] = await db.dbFs.get("offlineList:" + userId)

	if (!offlineList) {
		return []
	}

	if (offlineList.length <= 0) {
		return []
	}

	return offlineList
}

export const saveOfflineList = async ({ list }: { list: Item[] }): Promise<boolean> => {
	const userId = storage.getNumber("userId")

	if (userId == 0) {
		throw new Error("userId in storage invalid length")
	}

	await db.dbFs.set("offlineList:" + userId, list)

	return true
}

export const addItemToOfflineList = async ({ item }: { item: Item }): Promise<boolean> => {
	const userId = storage.getNumber("userId")

	if (userId == 0) {
		throw new Error("userId in storage invalid length")
	}

	const offlineList = await getOfflineList()
	const offlineItem = item

	offlineItem.selected = false

	const newList = [...offlineList]
	let exists = false

	for (let i = 0; i < newList.length; i++) {
		if (newList[i].uuid == offlineItem.uuid) {
			exists = true
		}
	}

	if (exists) {
		return true
	}

	offlineItem.offline = true

	newList.push(offlineItem)

	await Promise.all([db.set(userId + ":offlineItems:" + offlineItem.uuid, true), saveOfflineList({ list: newList })])

	return true
}

export const changeItemNameInOfflineList = async ({ item, name }: { item: Item; name: string }): Promise<boolean> => {
	const userId = storage.getNumber("userId")

	if (userId == 0) {
		throw new Error("userId in storage invalid length")
	}

	const offlineList = await getOfflineList()
	const newList = offlineList.map(mapItem => (mapItem.uuid == item.uuid ? { ...mapItem, name } : mapItem))

	await saveOfflineList({ list: newList })

	return true
}

export const removeItemFromOfflineList = async ({ item }: { item: Item }): Promise<boolean> => {
	const userId = storage.getNumber("userId")

	if (typeof userId !== "number") {
		throw new Error("userId in storage !== number")
	}

	if (userId == 0) {
		throw new Error("userId in storage invalid length")
	}

	const offlineList = await getOfflineList()
	const newList = [...offlineList]

	for (let i = 0; i < newList.length; i++) {
		if (newList[i].uuid == item.uuid) {
			newList.splice(i, 1)
		}
	}

	await Promise.all([db.remove(userId + ":offlineItems:" + item.uuid), saveOfflineList({ list: newList })])

	return true
}

export const getItemOfflinePath = (offlinePath: string, item: Item): string => {
	return offlinePath + item.uuid + item.name + "_" + item.uuid + "." + getFileExt(item.name)
}

export const removeFromOfflineStorage = async ({ item }: { item: Item }): Promise<boolean> => {
	const path = getItemOfflinePath(await getDownloadPath({ type: "offline" }), item)

	try {
		if ((await fs.stat(path)).exists) {
			await fs.unlink(path)
		}
	} catch (e) {
		console.log(e)
	}

	await removeItemFromOfflineList({ item })

	DeviceEventEmitter.emit("event", {
		type: "mark-item-offline",
		data: {
			uuid: item.uuid,
			value: false
		}
	})

	return true
}

export const checkOfflineItems = async (items: Item[]) => {
	const userId = storage.getNumber("userId")
	const masterKeys = getMasterKeys()

	if (userId == 0 || masterKeys.length <= 0) {
		throw new Error("Invalid user data")
	}

	const offlineFilesToFetchInfo = items.map(item => item.uuid)

	if (offlineFilesToFetchInfo.length > 0 && (await isOnline())) {
		const offlineFilesInfo = await fetchOfflineFilesInfo(offlineFilesToFetchInfo)

		for (let i = 0; i < items.length; i++) {
			const prop = items[i].uuid
			const itemUUID = items[i].uuid
			const itemName = items[i].name

			if (typeof offlineFilesInfo[prop] !== "undefined") {
				if (offlineFilesInfo[prop].exists) {
					items[i].favorited = offlineFilesInfo[prop].favorited

					const metadata = await (offlineFilesInfo[prop].isVersioned
						? decryptFileMetadata(
								masterKeys,
								offlineFilesInfo[prop].versionedInfo.metadata,
								offlineFilesInfo[prop].versionedInfo.uuid
						  )
						: decryptFileMetadata(masterKeys, offlineFilesInfo[prop].metadata, prop))

					if (typeof metadata == "object") {
						if (offlineFilesInfo[prop].isVersioned || items[i].name !== metadata.name) {
							let newItem = items[i]

							if (offlineFilesInfo[prop].isVersioned) {
								newItem.uuid = offlineFilesInfo[prop].versionedUUID
								newItem.region = offlineFilesInfo[prop].versionedInfo.region
								newItem.bucket = offlineFilesInfo[prop].versionedInfo.bucket
								newItem.chunks = offlineFilesInfo[prop].versionedInfo.chunks
								newItem.timestamp = offlineFilesInfo[prop].versionedInfo.timestamp
								newItem.rm = offlineFilesInfo[prop].versionedInfo.rm
								newItem.thumbnail = undefined
								newItem.date = simpleDate(offlineFilesInfo[prop].versionedInfo.timestamp)
							}

							newItem.offline = true
							newItem.name = metadata.name
							newItem.size = metadata.size
							newItem.mime = metadata.mime
							newItem.key = metadata.key
							newItem.lastModified = metadata.lastModified

							if (offlineFilesInfo[prop].isVersioned) {
								queueFileDownload({
									file: newItem,
									storeOffline: true,
									isOfflineUpdate: true,
									optionalCallback: () => {
										removeFromOfflineStorage({
											item: {
												uuid: itemUUID,
												name: itemName
											} as Item
										})

										DeviceEventEmitter.emit("event", {
											type: "remove-item",
											data: {
												uuid: itemUUID
											}
										})

										DeviceEventEmitter.emit("event", {
											type: "add-item",
											data: {
												item: newItem,
												parent: newItem.parent
											}
										})
									}
								}).catch(console.error)
							} else {
								await new Promise((resolve, reject) => {
									changeItemNameInOfflineList({ item: items[i], name: metadata.name })
										.then(() => {
											DeviceEventEmitter.emit("event", {
												type: "change-item-name",
												data: {
													uuid: items[i].uuid,
													name: metadata.name
												}
											})

											return resolve(true)
										})
										.catch(reject)
								})
							}
						}
					}
				} else {
					await removeFromOfflineStorage({ item: items[i] })

					DeviceEventEmitter.emit("event", {
						type: "remove-item",
						data: {
							uuid: prop
						}
					})
				}
			}
		}
	}
}
