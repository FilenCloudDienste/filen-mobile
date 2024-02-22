import { apiRequest, folderPresent } from "../../api"
import storage from "../../storage"
import {
	orderItemsByType,
	getFilePreviewType,
	getFileExt,
	getRouteURL,
	canCompressThumbnail,
	simpleDate,
	convertTimestampToMs,
	getMasterKeys,
	getParent,
	promiseAllChunked
} from "../../helpers"
import { queueFileDownload } from "../download/download"
import * as fs from "../../fs"
import { DeviceEventEmitter, Platform } from "react-native"
import { useStore } from "../../state"
import FileViewer from "react-native-file-viewer"
import { getOfflineList, removeFromOfflineStorage, checkOfflineItems, getItemOfflinePath } from "../offline"
import { showToast } from "../../../components/Toasts"
import { i18n } from "../../../i18n/i18n"
import { StackActions } from "@react-navigation/native"
import { navigationAnimation } from "../../state"
import memoryCache from "../../memoryCache"
import { isOnline, isWifi } from "../isOnline"
import { Item, ItemReceiver } from "../../../types"
import { MB } from "../../constants"
import { Asset } from "expo-media-library"
import { getLocalAssetsMutex, getAssetURI } from "../cameraUpload"
import { getThumbnailCacheKey } from "../thumbnails"
import {
	decryptFolderNamePrivateKey,
	decryptFileMetadataPrivateKey,
	decryptFolderName,
	decryptFileMetadata,
	FileMetadata
} from "../../crypto"
import * as db from "../../db"

export interface BuildFolder {
	folder: any
	name?: string
	masterKeys?: string[]
	sharedIn?: boolean
	privateKey?: string
}

export const buildFolder = async ({
	folder,
	name = "",
	masterKeys = [],
	sharedIn = false,
	privateKey = ""
}: BuildFolder): Promise<Item> => {
	const cacheKey = "itemMetadata:folder:" + folder.uuid + ":" + folder.name + ":" + sharedIn

	if (memoryCache.has(cacheKey)) {
		name = memoryCache.get(cacheKey)
	} else {
		if (!sharedIn) {
			if (Array.isArray(masterKeys) && folder.name) {
				name = await decryptFolderName(masterKeys, folder.name)

				memoryCache.set(cacheKey, name)
			}
		} else {
			if (folder.metadata) {
				name = await decryptFolderNamePrivateKey(privateKey, folder.metadata)

				memoryCache.set(cacheKey, name)
			}
		}
	}

	const folderLastModified = convertTimestampToMs(folder.timestamp)
	const cachedSize = memoryCache.has("folderSizeCache:" + folder.uuid)
		? memoryCache.get("folderSizeCache:" + folder.uuid)
		: await db.get("folderSizeCache:" + folder.uuid)

	return {
		id: folder.uuid,
		type: "folder",
		uuid: folder.uuid,
		name: name,
		date: simpleDate(folderLastModified),
		timestamp: folder.timestamp,
		lastModified: folderLastModified,
		lastModifiedSort: parseFloat(folderLastModified + "." + folder.uuid.replace(/\D/g, "")),
		parent: folder.parent || "base",
		receiverId: typeof folder.receiverId === "number" ? folder.receiverId : 0,
		receiverEmail: typeof folder.receiverEmail === "string" ? folder.receiverEmail : "",
		sharerId: typeof folder.sharerId === "number" ? folder.sharerId : 0,
		sharerEmail: typeof folder.sharerEmail === "string" ? folder.sharerEmail : "",
		color: folder.color || null,
		favorited: folder.favorited === 1 ? true : false,
		isBase: typeof folder.parent === "string" ? false : true,
		isSync: folder.is_sync || false,
		isDefault: folder.is_default || false,
		size: cachedSize ? (cachedSize > 0 ? cachedSize : 0) : 0,
		selected: false,
		mime: "",
		key: "",
		offline: false,
		bucket: "",
		region: "",
		rm: "",
		chunks: 0,
		thumbnail: undefined,
		version: 0,
		hash: ""
	}
}

export interface BuildFile {
	file: any
	metadata?: FileMetadata
	masterKeys?: string[]
	sharedIn?: boolean
	privateKey?: string
	routeURL?: string
	userId?: number
}

export const buildFile = async ({
	file,
	metadata = { name: "", mime: "", size: 0, key: "", lastModified: 0, hash: "" },
	masterKeys = [],
	sharedIn = false,
	privateKey = "",
	routeURL = "",
	userId = 0
}: BuildFile): Promise<Item> => {
	const cacheKey = "itemMetadata:file:" + file.uuid + ":" + file.metadata + ":" + sharedIn

	if (memoryCache.has(cacheKey)) {
		metadata = memoryCache.get(cacheKey)
	} else {
		if (!sharedIn) {
			if (Array.isArray(masterKeys) && typeof file.metadata !== "undefined") {
				metadata = await decryptFileMetadata(masterKeys, file.metadata)

				memoryCache.set(cacheKey, metadata)
			}
		} else {
			if (Array.isArray(masterKeys) && typeof file.metadata !== "undefined") {
				metadata = await decryptFileMetadataPrivateKey(file.metadata, privateKey)

				memoryCache.set(cacheKey, metadata)
			}
		}
	}

	let thumbnailCachePath = undefined

	if (canCompressThumbnail(getFileExt(metadata.name))) {
		const thumbnailCacheKey = getThumbnailCacheKey({ uuid: file.uuid }).cacheKey

		if (memoryCache.has(thumbnailCacheKey)) {
			thumbnailCachePath = memoryCache.get(thumbnailCacheKey)
		} else {
			const thumbnailCache = storage.getString(thumbnailCacheKey)

			if (typeof thumbnailCache === "string") {
				if (thumbnailCache.length > 0) {
					thumbnailCachePath = thumbnailCache

					memoryCache.set(thumbnailCacheKey, thumbnailCache)
				}
			}
		}
	}

	const fileLastModified =
		typeof metadata.lastModified === "number" && !isNaN(metadata.lastModified) && metadata.lastModified > 1348846653
			? convertTimestampToMs(metadata.lastModified)
			: convertTimestampToMs(file.timestamp)
	const isAvailableOffline = await db.has(userId + ":offlineItems:" + file.uuid)

	return {
		id: file.uuid,
		type: "file",
		uuid: file.uuid,
		name: metadata.name,
		mime: metadata.mime,
		size:
			typeof file.size === "number"
				? file.size
				: typeof file.chunks_size === "number"
				? file.chunks_size
				: typeof file.chunksSize === "number"
				? file.chunksSize
				: 0,
		key: metadata.key,
		lastModified: fileLastModified,
		lastModifiedSort: parseFloat(fileLastModified + "." + file.uuid.replace(/\D/g, "")),
		bucket: file.bucket,
		region: file.region,
		parent: file.parent || "base",
		rm: file.rm,
		chunks: file.chunks,
		date: simpleDate(fileLastModified),
		timestamp: file.timestamp,
		receiverId: typeof file.receiverId === "number" ? file.receiverId : 0,
		receiverEmail: typeof file.receiverEmail === "string" ? file.receiverEmail : undefined,
		sharerId: typeof file.sharerId === "number" ? file.sharerId : 0,
		sharerEmail: typeof file.sharerEmail === "string" ? file.sharerEmail : undefined,
		offline: isAvailableOffline,
		version: file.version,
		favorited: file.favorited,
		thumbnail: thumbnailCachePath,
		selected: false,
		color: null,
		isBase: false,
		isSync: false,
		isDefault: false,
		hash: typeof metadata.hash === "string" && metadata.hash.length > 0 ? metadata.hash : ""
	}
}

export const sortItems = ({ items, passedRoute = undefined }: { items: Item[]; passedRoute: any }): Item[] => {
	let routeURL = ""

	if (typeof passedRoute !== "undefined") {
		routeURL = getRouteURL(passedRoute)
	} else {
		routeURL = getRouteURL()
	}

	if (routeURL.indexOf("recent") !== -1) {
		return items.sort((a, b) => b.timestamp - a.timestamp)
	}

	if (routeURL.indexOf("photos") !== -1) {
		return items.sort((a, b) => b.lastModifiedSort - a.lastModifiedSort)
	}

	const sortBy = JSON.parse(storage.getString("sortBy") || "{}")

	return orderItemsByType(items, sortBy[routeURL])
}

export const loadItems = async (route: any, skipCache: boolean = false): Promise<{ cached: boolean; items: Item[] }> => {
	const uuid: string = getParent(route)
	const url: string = getRouteURL(route)
	const userId = storage.getNumber("userId")
	const sortBy = JSON.parse(storage.getString("sortBy") || "{}")

	const [offlinePath, thumbnailPath] = await Promise.all([
		fs.getDownloadPath({ type: "offline" }),
		fs.getDownloadPath({ type: "thumbnail" })
	])
	const offlinePathPosix = offlinePath.split("file://").join("").split("file:/").join("").split("file:").join("")
	const thumbnailPathPosix = thumbnailPath.split("file://").join("").split("file:/").join("").split("file:").join("")

	const refresh = async (): Promise<{ cached: boolean; items: Item[] }> => {
		if (!(await isOnline())) {
			throw new Error("Device offline")
		}

		let items: Item[] = []

		if (url.indexOf("recent") !== -1) {
			items = await global.nodeThread.loadItems({
				url,
				offlinePath: offlinePathPosix.startsWith("/") ? offlinePathPosix : "/" + offlinePathPosix,
				thumbnailPath: thumbnailPathPosix.startsWith("/") ? thumbnailPathPosix : "/" + thumbnailPathPosix,
				uuid,
				receiverId: 0,
				sortBy: sortBy[url],
				platform: Platform.OS,
				platformVersion: Platform.OS === "android" ? Platform.constants.Version : 0
			})
		} else if (url.indexOf("shared-in") !== -1) {
			items = await global.nodeThread.loadItems({
				url,
				offlinePath: offlinePathPosix.startsWith("/") ? offlinePathPosix : "/" + offlinePathPosix,
				thumbnailPath: thumbnailPathPosix.startsWith("/") ? thumbnailPathPosix : "/" + thumbnailPathPosix,
				uuid,
				receiverId: 0,
				sortBy: sortBy[url],
				platform: Platform.OS,
				platformVersion: Platform.OS === "android" ? Platform.constants.Version : 0
			})
		} else if (url.indexOf("shared-out") !== -1) {
			items = await global.nodeThread.loadItems({
				url,
				offlinePath: offlinePathPosix.startsWith("/") ? offlinePathPosix : "/" + offlinePathPosix,
				thumbnailPath: thumbnailPathPosix.startsWith("/") ? thumbnailPathPosix : "/" + thumbnailPathPosix,
				uuid,
				receiverId: global.currentReceiverId ? global.currentReceiverId : 0,
				sortBy: sortBy[url],
				platform: Platform.OS,
				platformVersion: Platform.OS === "android" ? Platform.constants.Version : 0
			})
		} else if (url.indexOf("photos") !== -1) {
			const cameraUploadParent = storage.getString("cameraUploadFolderUUID:" + userId)

			if (typeof cameraUploadParent !== "string") {
				return {
					cached: false,
					items: []
				}
			}

			if (cameraUploadParent.length < 16) {
				return {
					cached: false,
					items: []
				}
			}

			const isFolderPresent = await folderPresent(cameraUploadParent)
			const folderExists: boolean = isFolderPresent.present && !isFolderPresent.trash

			if (!folderExists) {
				return {
					cached: false,
					items: []
				}
			}

			items = await global.nodeThread.loadItems({
				url,
				offlinePath: offlinePathPosix.startsWith("/") ? offlinePathPosix : "/" + offlinePathPosix,
				thumbnailPath: thumbnailPathPosix.startsWith("/") ? thumbnailPathPosix : "/" + thumbnailPathPosix,
				uuid: cameraUploadParent,
				receiverId: global.currentReceiverId ? global.currentReceiverId : 0,
				sortBy: sortBy[url],
				platform: Platform.OS,
				platformVersion: Platform.OS === "android" ? Platform.constants.Version : 0
			})
		} else if (url.indexOf("offline") !== -1) {
			const [list, offlinePath] = await Promise.all([getOfflineList(), fs.getDownloadPath({ type: "offline" })])

			for (let file of list) {
				file.offline = true

				const itemOfflinePath = getItemOfflinePath(offlinePath, file)

				if (!(await fs.stat(itemOfflinePath)).exists) {
					await removeFromOfflineStorage({ item: file })

					if (await isOnline()) {
						queueFileDownload({
							file,
							storeOffline: true
						}).catch(console.error)
					}
				} else {
					items.push(file)
				}
			}

			items = sortItems({ items, passedRoute: route })

			checkOfflineItems(items).catch(console.error)
		} else {
			items = await global.nodeThread.loadItems({
				url,
				offlinePath: offlinePathPosix.startsWith("/") ? offlinePathPosix : "/" + offlinePathPosix,
				thumbnailPath: thumbnailPathPosix.startsWith("/") ? thumbnailPathPosix : "/" + thumbnailPathPosix,
				uuid,
				receiverId: global.currentReceiverId ? global.currentReceiverId : 0,
				sortBy: sortBy[url],
				platform: Platform.OS,
				platformVersion: Platform.OS === "android" ? Platform.constants.Version : 0
			})
		}

		for (const item of items) {
			if (item.type !== "folder") {
				continue
			}

			memoryCache.set("itemCache:folder:" + item.uuid, item)
		}

		for (let i = 0; i < items.length; i++) {
			if (items[i].type === "folder") {
				const cachedSize: number | undefined | null = memoryCache.has("folderSizeCache:" + items[i].uuid)
					? memoryCache.get("folderSizeCache:" + items[i].uuid)
					: storage.getNumber("folderSizeCache:" + items[i].uuid)

				if (typeof cachedSize === "number") {
					items[i].size = cachedSize
				}
			}
		}

		const sorted = sortItems({ items, passedRoute: route })

		await db.dbFs.set("loadItems:" + url, sorted)

		memoryCache.set("loadItems:" + url, sorted)

		return {
			cached: false,
			items: sorted
		}
	}

	const cached = await db.dbFs.get("loadItems:" + url)

	if (!(await isOnline())) {
		if (cached && Array.isArray(cached)) {
			const sorted = sortItems({ items: cached, passedRoute: route })

			memoryCache.set("loadItems:" + url, sorted)

			return {
				cached: true,
				items: sorted
			}
		}

		return {
			cached: false,
			items: []
		}
	}

	if (cached && Array.isArray(cached) && !skipCache) {
		const sorted = sortItems({ items: cached, passedRoute: route })

		memoryCache.set("loadItems:" + url, sorted)

		return {
			cached: true,
			items: sorted
		}
	}

	return await refresh()
}

export const previewItem = async ({
	item,
	setCurrentActionSheetItem = true,
	navigation
}: {
	item: Item
	setCurrentActionSheetItem?: boolean
	navigation?: any
}) => {
	if (item.size >= MB * 1024) {
		DeviceEventEmitter.emit("event", {
			type: "open-item-actionsheet",
			data: item
		})

		return
	}

	const previewType = getFilePreviewType(getFileExt(item.name))
	const canThumbnail = canCompressThumbnail(getFileExt(item.name))

	if (item.size >= 131072 && (previewType === "code" || previewType === "text")) {
		DeviceEventEmitter.emit("event", {
			type: "open-item-actionsheet",
			data: item
		})

		return
	}

	if (!["image", "video", "text", "code", "pdf", "doc", "audio"].includes(previewType)) {
		DeviceEventEmitter.emit("event", {
			type: "open-item-actionsheet",
			data: item
		})

		return
	}

	let existsOffline = false
	let offlinePath = ""

	try {
		offlinePath = getItemOfflinePath(await fs.getDownloadPath({ type: "offline" }), item)

		if ((await fs.stat(offlinePath)).exists) {
			existsOffline = true
		}
	} catch (e) {
		//console.log(e)
	}

	if (previewType === "image") {
		if (!canThumbnail) {
			DeviceEventEmitter.emit("event", {
				type: "open-item-actionsheet",
				data: item
			})

			return
		}

		if (typeof item.thumbnail !== "string") {
			return
		}

		if (!(await isOnline()) && !existsOffline) {
			showToast({ message: i18n(storage.getString("lang"), "deviceOffline") })

			return
		}

		await navigationAnimation({ enable: true })

		navigation.dispatch(
			StackActions.push("ImageViewerScreen", {
				uuid: item.uuid
			})
		)

		return
	}

	const open = (path: string, offlineMode: boolean = false) => {
		setTimeout(
			() => {
				useStore.setState({ fullscreenLoadingModalVisible: false })

				if (offlineMode) {
					return FileViewer.open(path, {
						displayName: item.name,
						showOpenWithDialog: false
					})
						.then(() => {
							//console.log(path)
						})
						.catch(err => {
							console.log(err)

							showToast({
								message: i18n(storage.getString("lang"), "couldNotOpenFileLocally", true, ["__NAME__"], [item.name])
							})
						})
				}

				if (previewType === "video") {
					FileViewer.open(path, {
						displayName: item.name,
						showOpenWithDialog: false
					})
						.then(() => {
							//console.log(path)
						})
						.catch(err => {
							console.log(err)

							showToast({
								message: i18n(storage.getString("lang"), "couldNotOpenFileLocally", true, ["__NAME__"], [item.name])
							})
						})
				} else if (previewType === "pdf" || previewType === "doc") {
					FileViewer.open(path, {
						displayName: item.name,
						showOpenWithDialog: false
					})
						.then(() => {
							//console.log(path)
						})
						.catch(err => {
							console.log(err)

							showToast({
								message: i18n(storage.getString("lang"), "couldNotOpenFileLocally", true, ["__NAME__"], [item.name])
							})
						})
				} else if (previewType === "text" || previewType === "code") {
					fs.readAsString(path, "utf8")
						.then(content => {
							if (setCurrentActionSheetItem) {
								useStore.setState({ currentActionSheetItem: item })
							}

							useStore.setState({
								textEditorState: "view",
								textEditorParent: item.parent,
								createTextFileDialogName: item.name,
								textEditorText: content
							})

							navigationAnimation({ enable: true }).then(() => {
								navigation.dispatch(StackActions.push("TextEditorScreen"))
							})
						})
						.catch(err => {
							console.log(err)
						})
				}
			},
			existsOffline ? 1 : 100
		)
	}

	if (existsOffline) {
		open(offlinePath, true)

		return
	}

	if (!(await isOnline()) && !existsOffline) {
		showToast({ message: i18n(storage.getString("lang"), "deviceOffline") })

		return
	}

	if (storage.getBoolean("onlyWifiDownloads") && !(await isWifi())) {
		showToast({ message: i18n(storage.getString("lang"), "onlyWifiDownloads") })

		return
	}

	useStore.setState({ fullscreenLoadingModalVisible: true, fullscreenLoadingModalDismissable: true })

	queueFileDownload({
		file: item,
		optionalCallback: (err: any, path: string) => {
			useStore.setState({ fullscreenLoadingModalVisible: false })

			if (err) {
				console.log(err)

				showToast({ message: err.toString() })

				return
			}

			open(path)
		},
		isPreview: true
	}).catch(err => {
		if (err.toString() === "stopped") {
			return
		}

		if (err.toString() === "wifiOnly") {
			showToast({ message: i18n(storage.getString("lang"), "onlyWifiDownloads") })

			return
		}

		console.error(err)

		showToast({ message: err.toString() })
	})
}

export const convertHeic = async (item: Item, path: string): Promise<string> => {
	const tmpPath = await fs.getDownloadPath({ type: "temp" })
	const outputPath: string = tmpPath + item.uuid + "_convertHeic.jpg"

	try {
		if ((await fs.stat(outputPath)).exists) {
			return outputPath
		}
	} catch (e) {
		//console.log(e)
	}

	return global.nodeThread.convertHeic({
		input: path,
		output: outputPath,
		format: "JPEG"
	})
}

export const addToSavedToGallery = async (asset: Asset) => {
	await getLocalAssetsMutex.acquire()

	try {
		const assetURI = await getAssetURI(asset)
		const stat = await fs.stat(assetURI)

		if (stat.exists) {
			await Promise.all([
				db.cameraUpload.setLastModified(asset, convertTimestampToMs(asset.modificationTime)),
				db.cameraUpload.setLastModifiedStat(asset, convertTimestampToMs(stat.modificationTime || asset.modificationTime)),
				db.cameraUpload.setLastSize(asset, stat.size || 0)
			])
		}
	} catch (e) {
		console.error(e)
	}

	getLocalAssetsMutex.release()
}
