import storage from "../../storage"
import { queueFileUpload, UploadFile } from "../upload/upload"
import { Platform } from "react-native"
import {
	promiseAllSettled,
	convertTimestampToMs,
	getMasterKeys,
	toExpoFsPath,
	getAssetId,
	Semaphore,
	getFileExt,
	randomIdUnsafe
} from "../../helpers"
import { folderPresent, apiRequest, folderExists, createFolder } from "../../api"
import * as MediaLibrary from "expo-media-library"
import mimeTypes from "mime-types"
import RNHeicConverter from "react-native-heic-converter"
import { hasPhotoLibraryPermissions, hasReadPermissions, hasWritePermissions, hasStoragePermissions } from "../../permissions"
import { isOnline, isWifi } from "../isOnline"
import { MAX_CAMERA_UPLOAD_QUEUE } from "../../constants"
import pathModule from "path"
import { validate } from "uuid"
import { exportPhotoAssets } from "react-native-ios-asset-exporter"
import path from "path"
import { decryptFileMetadata, decryptFolderName } from "../../crypto"
import * as fs from "../../fs"
import * as db from "../../db"
import ImageResizer from "react-native-image-resizer"
import eventListener from "../../../lib/eventListener"

const CryptoJS = require("crypto-js")

const TIMEOUT = 5000
const FAILED: Record<string, number> = {}
const MAX_FAILED = 3
const uploadSemaphore = new Semaphore(MAX_CAMERA_UPLOAD_QUEUE)
let runTimeout = 0
const getFilesMutex = new Semaphore(1)
let parentFolderUUIDs: Record<string, { uuid: string; cachedUntil: number }> = {}
const getFileParentFolderUUIDMutex = new Semaphore(1)
let lastCameraUploadFolderUUID = ""

export const runMutex = new Semaphore(1)
export const getLocalAssetsMutex = new Semaphore(1)

export const disableCameraUpload = (resetFolder: boolean = false): void => {
	const userId = storage.getNumber("userId")

	if (userId === 0) {
		return
	}

	storage.set("cameraUploadEnabled:" + userId, false)

	if (resetFolder) {
		db.dbFs.remove("loadItems:photos").catch(console.error)

		storage.delete("cameraUploadFolderUUID:" + userId)
		storage.delete("cameraUploadFolderName:" + userId)
		storage.set("cameraUploadUploaded", 0)
		storage.set("cameraUploadTotal", 0)
	}
}

export const compressableImageExts = ["png", "jpg", "jpeg", "webp", "gif"]

export const getAssetDeltaName = (path: string) => {
	const lowercased = path.toLowerCase()
	const parsed = pathModule.parse(lowercased)
	const dir = !parsed.dir || parsed.dir === "." || parsed.dir === "/" || parsed.dir.length <= 0 ? "" : parsed.dir + "/"

	if (!parsed.name || parsed.name.length <= 0 || parsed.name === ".") {
		return lowercased
	}

	return parsed.name
}

export const getLastModified = async (path: string, name: string, fallback: number): Promise<number> => {
	const lastModified = convertTimestampToMs(fallback)

	return lastModified
}

export const getMediaTypes = () => {
	const userId = storage.getNumber("userId")
	const cameraUploadIncludeImages = storage.getBoolean("cameraUploadIncludeImages:" + userId)
	const cameraUploadIncludeVideos = storage.getBoolean("cameraUploadIncludeVideos:" + userId)
	let assetTypes: MediaLibrary.MediaTypeValue[] = [
		MediaLibrary.MediaType.video,
		MediaLibrary.MediaType.photo,
		MediaLibrary.MediaType.unknown
	]

	if (cameraUploadIncludeImages && !cameraUploadIncludeVideos) {
		assetTypes = [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.unknown]
	}

	if (!cameraUploadIncludeImages && cameraUploadIncludeVideos) {
		assetTypes = [MediaLibrary.MediaType.video, MediaLibrary.MediaType.unknown]
	}

	if (cameraUploadIncludeImages && cameraUploadIncludeVideos) {
		assetTypes = [MediaLibrary.MediaType.video, MediaLibrary.MediaType.photo, MediaLibrary.MediaType.unknown]
	}

	if (userId === 0) {
		assetTypes = [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.unknown]
	}

	return assetTypes
}

export const getAssetsFromAlbum = (album: MediaLibrary.AlbumRef): Promise<MediaLibrary.Asset[]> => {
	return new Promise((resolve, reject) => {
		const assets: MediaLibrary.Asset[] = []

		const fetch = (after: MediaLibrary.AssetRef | undefined) => {
			MediaLibrary.getAssetsAsync({
				...(typeof after !== "undefined" ? { after } : {}),
				first: 256,
				mediaType: [MediaLibrary.MediaType.video, MediaLibrary.MediaType.photo, MediaLibrary.MediaType.unknown],
				sortBy: [[MediaLibrary.SortBy.creationTime, false]],
				album
			})
				.then(fetched => {
					const filtered = fetched.assets.filter(
						asset => asset && typeof asset.filename === "string" && asset.filename.length > 0
					)

					for (const asset of filtered) {
						assets.push(asset)
					}

					if (fetched.hasNextPage) {
						return fetch(fetched.endCursor)
					}

					return resolve(assets)
				})
				.catch(reject)
		}

		return fetch(undefined)
	})
}

export interface Asset {
	album: MediaLibrary.AlbumRef
	asset: MediaLibrary.Asset
}

export type MediaAsset = MediaLibrary.Asset & {
	album: MediaLibrary.AlbumRef
	path: string
}

export const getLocalAssets = async (): Promise<MediaAsset[]> => {
	const albums = await MediaLibrary.getAlbumsAsync({
		includeSmartAlbums: true
	})

	const userId = storage.getNumber("userId")
	let cameraUploadExcludedAlbums: unknown = storage.getString("cameraUploadExcludedAlbums:" + userId)

	if (typeof cameraUploadExcludedAlbums === "string") {
		try {
			cameraUploadExcludedAlbums = JSON.parse(cameraUploadExcludedAlbums)

			if (typeof cameraUploadExcludedAlbums !== "object") {
				cameraUploadExcludedAlbums = {}
			}
		} catch (e) {
			console.error(e)

			cameraUploadExcludedAlbums = {}
		}
	} else {
		cameraUploadExcludedAlbums = {}
	}

	const promises: Promise<void>[] = []
	const assets: MediaAsset[] = []
	const existingIds: Record<string, boolean> = {}

	for (const album of albums) {
		if (typeof cameraUploadExcludedAlbums[album.id] !== "undefined") {
			continue
		}

		promises.push(
			new Promise<void>((resolve, reject) => {
				getAssetsFromAlbum(album)
					.then(fetched => {
						for (const asset of fetched) {
							if (!existingIds[asset.id]) {
								existingIds[asset.id] = true

								assets.push({
									...asset,
									album: album,
									path: !album.title || album.title.length <= 0 ? asset.filename : album.title + "/" + asset.filename
								})
							}
						}

						resolve()
					})
					.catch(reject)
			})
		)
	}

	await Promise.all(promises)

	return assets
}

export const fetchLocalAssets = async (): Promise<MediaAsset[]> => {
	await getLocalAssetsMutex.acquire()

	try {
		const userId = storage.getNumber("userId")
		const mediaTypes = getMediaTypes()
		const cameraUploadAfterEnabledTime = storage.getNumber("cameraUploadAfterEnabledTime:" + userId)
		const fetched = await getLocalAssets()
		const sorted = fetched
			.sort((a, b) => a.creationTime - b.creationTime)
			.filter(
				asset =>
					mediaTypes.includes(asset.mediaType) &&
					convertTimestampToMs(asset.creationTime) >= convertTimestampToMs(cameraUploadAfterEnabledTime)
			)
		const existingNames: Record<string, boolean> = {}
		const result: MediaAsset[] = []

		for (const asset of sorted) {
			if (!existingNames[asset.filename.toLowerCase()]) {
				existingNames[asset.filename.toLowerCase()] = true

				result.push(asset)
			} else {
				const nameParsed = pathModule.parse(asset.filename)
				const newFileName = nameParsed.name + "_" + convertTimestampToMs(asset.creationTime) + nameParsed.ext

				if (!existingNames[newFileName.toLowerCase()]) {
					existingNames[newFileName.toLowerCase()] = true

					result.push({
						...asset,
						filename: newFileName,
						path: asset.path.includes("/") ? pathModule.join(pathModule.dirname(asset.path), newFileName) : newFileName
					})
				} else {
					const assetId = getAssetId(asset)
					const newFileName =
						nameParsed.name +
						"_" +
						CryptoJS.SHA1(assetId || convertTimestampToMs(asset.creationTime))
							.toString()
							.slice(0, 10) +
						nameParsed.ext

					if (!existingNames[newFileName.toLowerCase()]) {
						existingNames[newFileName.toLowerCase()] = true

						result.push({
							...asset,
							filename: newFileName,
							path: asset.path.includes("/") ? pathModule.join(pathModule.dirname(asset.path), newFileName) : newFileName
						})
					}
				}
			}
		}

		return result
	} catch (e) {
		console.error(e)

		throw e
	} finally {
		getLocalAssetsMutex.release()
	}
}

export interface CameraUploadItem {
	name: string
	lastModified: number
	creation: number
	id: string
	type: "local" | "remote"
	asset: MediaAsset
	path: string
}

export type CameraUploadItems = Record<string, CameraUploadItem>

export const loadLocal = async (): Promise<CameraUploadItems> => {
	const assets = await fetchLocalAssets()

	if (assets.length === 0) {
		return {}
	}

	const items: CameraUploadItems = {}

	for (const asset of assets) {
		items[getAssetDeltaName(asset.filename)] = {
			name: asset.filename,
			lastModified: convertTimestampToMs(asset.modificationTime),
			creation: convertTimestampToMs(asset.creationTime),
			id: getAssetId(asset),
			type: "local",
			asset,
			path: asset.path
		}
	}

	return items
}

export const loadRemote = async (): Promise<CameraUploadItems> => {
	const userId = storage.getNumber("userId")
	const cameraUploadFolderUUID = storage.getString("cameraUploadFolderUUID:" + userId) || ""

	return await global.nodeThread.getCameraUploadRemote({ uuid: cameraUploadFolderUUID })
}

export type DeltaType = "UPLOAD" | "UPDATE"

export interface Delta {
	type: DeltaType
	item: CameraUploadItem
}

export const getDeltas = async (local: CameraUploadItems, remote: CameraUploadItems) => {
	const deltas: Delta[] = []
	const lastModified = await db.cameraUpload.getLastModifiedAll()

	for (const name in local) {
		const assetId = getAssetId(local[name].asset)

		if (!remote[name]) {
			if (typeof lastModified[assetId] === "number") {
				if (convertTimestampToMs(lastModified[assetId]) !== convertTimestampToMs(local[name].lastModified)) {
					deltas.push({
						type: "UPLOAD",
						item: local[name]
					})
				}
			} else {
				deltas.push({
					type: "UPLOAD",
					item: local[name]
				})
			}
		} else {
			if (typeof lastModified[assetId] === "number") {
				if (convertTimestampToMs(lastModified[assetId]) !== convertTimestampToMs(local[name].lastModified)) {
					const [lastModified, lastModifiedStat, lastSize, assetURI] = await Promise.all([
						db.cameraUpload.getLastModified(local[name].asset),
						db.cameraUpload.getLastModifiedStat(local[name].asset),
						db.cameraUpload.getLastSize(local[name].asset),
						getAssetURI(local[name].asset)
					])

					const stat = await fs.stat(assetURI)

					if (
						stat.exists &&
						(convertTimestampToMs(stat.modificationTime) === convertTimestampToMs(lastModifiedStat) ||
							convertTimestampToMs(lastModified) === convertTimestampToMs(local[name].lastModified) ||
							lastSize === stat.size)
					) {
						await Promise.all([
							db.cameraUpload.setLastModified(local[name].asset, convertTimestampToMs(local[name].lastModified)),
							db.cameraUpload.setLastModifiedStat(local[name].asset, convertTimestampToMs(stat.modificationTime)),
							db.cameraUpload.setLastSize(local[name].asset, stat.size)
						])

						continue
					}

					deltas.push({
						type: "UPDATE",
						item: local[name]
					})
				}
			}
		}
	}

	return deltas
}

export const getAssetURI = async (asset: MediaLibrary.Asset) => {
	const info = await MediaLibrary.getAssetInfoAsync(asset, {
		shouldDownloadFromNetwork: true
	})

	if (!info) {
		throw new Error("No asset URI found for " + asset.id)
	}

	let assetURI: string = ""

	if (Platform.OS === "android") {
		if (typeof asset.uri === "string" && asset.uri.length > 0) {
			assetURI = asset.uri
		} else {
			if (typeof info.localUri === "string" && info.localUri.length > 0) {
				assetURI = info.localUri
			}
		}
	} else {
		if (typeof info.localUri === "string" && info.localUri.length > 0) {
			assetURI = info.localUri
		} else {
			if (typeof info.uri === "string" && info.uri.length > 0) {
				assetURI = info.uri
			}
		}
	}

	if (typeof assetURI === "string" && assetURI.length > 0) {
		return assetURI
	}

	throw new Error("No asset URI found for " + asset.id)
}

export const convertHeicToJPGIOS = async (inputPath: string) => {
	if (!inputPath.toLowerCase().endsWith(".heic") || Platform.OS !== "ios") {
		return inputPath
	}

	const { success, path, error } = await RNHeicConverter.convert({
		path: toExpoFsPath(inputPath),
		quality: 1,
		extension: "jpg"
	})

	if (error || !success || !path) {
		throw new Error("Could not convert " + inputPath + " from HEIC to JPG")
	}

	if (inputPath.includes(fs.documentDirectory()) || inputPath.includes(fs.cacheDirectory())) {
		try {
			if ((await fs.stat(inputPath)).exists) {
				await fs.unlink(inputPath)
			}
		} catch (e) {
			console.error(e)
		}
	}

	return path
}

export const compressImage = async (inputPath: string) => {
	if (!compressableImageExts.includes(getFileExt(inputPath))) {
		return inputPath
	}

	try {
		const statsBefore = await fs.stat(inputPath)

		if (!statsBefore.exists) {
			return inputPath
		}

		const compressed = await ImageResizer.createResizedImage(
			toExpoFsPath(inputPath),
			999999999,
			999999999,
			"JPEG",
			80,
			undefined,
			undefined,
			true,
			{
				mode: "contain",
				onlyScaleDown: true
			}
		)

		if (compressed.size >= statsBefore.size) {
			await fs.unlink(compressed.path)

			return inputPath
		}

		if (inputPath.includes(fs.documentDirectory()) || inputPath.includes(fs.cacheDirectory())) {
			await fs.unlink(inputPath)
		}

		return toExpoFsPath(compressed.path)
	} catch (e) {
		console.error(e)

		return inputPath
	}
}

export const copyFile = async (asset: MediaLibrary.Asset, assetURI: string, tmp: string, enableHeic: boolean): Promise<UploadFile> => {
	let name = asset.filename
	const assetURIBefore = assetURI

	if (Platform.OS === "ios" && !enableHeic && assetURI.toLowerCase().endsWith(".heic") && asset.mediaType === "photo") {
		assetURI = await convertHeicToJPGIOS(assetURI)

		const parsedName = path.parse(name)

		name = getFileExt(assetURI) !== getFileExt(assetURIBefore) ? parsedName.name + ".JPG" : name
	}

	if (tmp.includes(fs.documentDirectory()) || tmp.includes(fs.cacheDirectory())) {
		try {
			if ((await fs.stat(tmp)).exists) {
				await fs.unlink(tmp)
			}
		} catch (e) {
			console.error(e)
		}
	}

	await fs.copy(assetURI, tmp)

	const stat = await fs.stat(tmp)

	if (!stat.exists || !stat.size) {
		throw new Error("No size for asset " + asset.id)
	}

	const lastModified = await getLastModified(
		tmp.split("file://").join(""),
		asset.filename,
		convertTimestampToMs(asset.creationTime || asset.modificationTime || Date.now())
	)

	return {
		path: tmp.split("file://").join(""),
		name,
		mime: mimeTypes.lookup(tmp) || "",
		size: stat.size,
		lastModified
	}
}

export const getFiles = async (asset: MediaLibrary.Asset, assetURI: string): Promise<UploadFile[]> => {
	await getFilesMutex.acquire()

	try {
		const userId = storage.getNumber("userId")
		const cameraUploadEnableHeic = storage.getBoolean("cameraUploadEnableHeic:" + userId)
		const cameraUploadOnlyUploadOriginal = storage.getBoolean("cameraUploadOnlyUploadOriginal:" + userId)
		const cameraUploadConvertLiveAndBurst = storage.getBoolean("cameraUploadConvertLiveAndBurst:" + userId)
		const cameraUploadConvertLiveAndBurstAndKeepOriginal = storage.getBoolean(
			"cameraUploadConvertLiveAndBurstAndKeepOriginal:" + userId
		)
		const cameraUploadCompressImages = storage.getBoolean("cameraUploadCompressImages:" + userId)
		const tmpPrefix = randomIdUnsafe() + "_"
		const tmp = fs.cacheDirectory() + tmpPrefix + asset.filename
		const files: UploadFile[] = []
		let originalKept = false
		const baseAssetDeltaName = getAssetDeltaName(asset.filename)

		if (
			cameraUploadOnlyUploadOriginal ||
			Platform.OS === "android" ||
			(!cameraUploadOnlyUploadOriginal && !cameraUploadConvertLiveAndBurst && !cameraUploadConvertLiveAndBurstAndKeepOriginal)
		) {
			originalKept = true

			files.push(await copyFile(asset, assetURI, tmp, cameraUploadEnableHeic))
		}

		if (Platform.OS === "ios" && !originalKept) {
			const exportedAssets = await exportPhotoAssets([asset.id], fs.cacheDirectory().substring(8), tmpPrefix, true, false)

			if (exportedAssets.error && exportedAssets.error.length > 0) {
				getFilesMutex.release()

				throw new Error("exportPhotoAssets error codes: " + exportedAssets.error.map(error => error).join(", "))
			}

			const filesToUploadPromises: Promise<void>[] = []
			const isConvertedLivePhoto =
				exportedAssets.exportResults!.filter(res => res.localFileLocations.toLowerCase().endsWith(".mov")).length > 0

			for (const resource of exportedAssets.exportResults!) {
				if (
					cameraUploadConvertLiveAndBurst &&
					isConvertedLivePhoto &&
					!resource.localFileLocations.toLowerCase().endsWith(".mov") &&
					(resource.localFileLocations.includes(fs.documentDirectory()) ||
						resource.localFileLocations.includes(fs.cacheDirectory()))
				) {
					// Don't upload the original of a live photo if we do not want to keep it aswell
					await fs.unlink(resource.localFileLocations).catch(console.error)

					continue
				}

				if (
					resource.localFileLocations.toLowerCase().indexOf("penultimate") !== -1 &&
					(resource.localFileLocations.includes(fs.documentDirectory()) ||
						resource.localFileLocations.includes(fs.cacheDirectory()))
				) {
					await fs.unlink(resource.localFileLocations).catch(console.error)

					continue
				}

				// Convert from HEIC to JPG, but do not convert FullSizeRender photos aka. edited photos due to compatibility issues with the HEICConverter
				if (
					!cameraUploadEnableHeic &&
					resource.localFileLocations.toLowerCase().endsWith(".heic") &&
					asset.mediaType === "photo" &&
					resource.localFileLocations.toLowerCase().indexOf("fullsizerender") === -1
				) {
					const convertedPath = await convertHeicToJPGIOS(resource.localFileLocations)

					if (
						resource.localFileLocations.includes(fs.documentDirectory()) ||
						resource.localFileLocations.includes(fs.cacheDirectory())
					) {
						await fs.unlink(resource.localFileLocations).catch(console.error)
					}

					filesToUploadPromises.push(
						new Promise<void>((resolve, reject) => {
							fs.statWithoutEncode(convertedPath)
								.then(stat => {
									if (!stat.exists) {
										return reject(new Error("Asset does not exist (after HEIC conversion) " + asset.id))
									}

									const assetFilenameWithoutEx =
										asset.filename.indexOf(".") !== -1
											? asset.filename.substring(0, asset.filename.lastIndexOf("."))
											: asset.filename
									const fileNameEx = (resource.localFileLocations.split(tmpPrefix).pop() || asset.filename).split(".")
									const nameWithoutEx =
										asset.filename.indexOf(".") !== -1
											? fileNameEx.slice(0, fileNameEx.length - 1).join(".")
											: asset.filename
									const newName =
										getFileExt(convertedPath) !== getFileExt(resource.localFileLocations)
											? !nameWithoutEx.includes(assetFilenameWithoutEx)
												? assetFilenameWithoutEx + "_" + nameWithoutEx + ".JPG"
												: nameWithoutEx + ".JPG"
											: asset.filename

									getLastModified(
										resource.localFileLocations.split("file://").join(""),
										asset.filename,
										convertTimestampToMs(asset.creationTime || asset.modificationTime || Date.now())
									)
										.then(lastModified => {
											files.push({
												path: convertedPath.split("file://").join(""),
												name: newName,
												mime: mimeTypes.lookup(convertedPath) || "",
												size: stat.size,
												lastModified
											})

											resolve()
										})
										.catch(reject)
								})
								.catch(reject)
						})
					)
				} else {
					filesToUploadPromises.push(
						new Promise<void>((resolve, reject) => {
							fs.statWithoutEncode(resource.localFileLocations)
								.then(stat => {
									if (!stat.exists) {
										return reject(new Error("Asset does not exist " + asset.id))
									}

									const assetFilenameWithoutEx =
										asset.filename.indexOf(".") !== -1
											? asset.filename.substring(0, asset.filename.lastIndexOf("."))
											: asset.filename
									let name = resource.localFileLocations.split(tmpPrefix).pop() || asset.filename

									// If File does not have a _, then append the asset filename to the name
									name = !name.includes(assetFilenameWithoutEx) ? assetFilenameWithoutEx + name : name

									getLastModified(
										resource.localFileLocations.split("file://").join(""),
										asset.filename,
										convertTimestampToMs(asset.creationTime || asset.modificationTime || Date.now())
									)
										.then(lastModified => {
											files.push({
												path: resource.localFileLocations.split("file://").join(""),
												name: name,
												mime: mimeTypes.lookup(resource.localFileLocations) || "",
												size: stat.size,
												lastModified
											})

											resolve()
										})
										.catch(reject)
								})
								.catch(reject)
						})
					)
				}
			}

			await promiseAllSettled(filesToUploadPromises)

			if (files.filter(file => getAssetDeltaName(file.name) === baseAssetDeltaName).length === 0) {
				files.push(await copyFile(asset, assetURI, tmp, cameraUploadEnableHeic))
			}
		}

		if (cameraUploadCompressImages) {
			for (let i = 0; i < files.length; i++) {
				if (compressableImageExts.includes(getFileExt(files[i].path))) {
					const compressed = await compressImage(files[i].path)
					const newName =
						files[i].name.indexOf(".") !== -1
							? files[i].name.substring(0, files[i].name.lastIndexOf(".")) + ".JPG"
							: files[i].name

					files[i] = {
						...files[i],
						path: compressed,
						name: newName
					}
				}
			}
		}

		getFilesMutex.release()

		return files
	} catch (e) {
		getFilesMutex.release()

		throw e
	}
}

export const hasPermissions = async (requestPermissions: boolean): Promise<boolean> => {
	if (
		!(await hasStoragePermissions(requestPermissions)) ||
		!(await hasPhotoLibraryPermissions(requestPermissions)) ||
		!(await hasReadPermissions(requestPermissions)) ||
		!(await hasWritePermissions(requestPermissions))
	) {
		return false
	}

	return true
}

export const getFileParentFolderUUID = async (baseParentUUID: string, parentFolderName: string): Promise<string> => {
	await getFileParentFolderUUIDMutex.acquire()

	try {
		const folderNameBefore = parentFolderName

		parentFolderName = parentFolderName.toLowerCase()

		if (parentFolderUUIDs[parentFolderName] && parentFolderUUIDs[parentFolderName].cachedUntil > Date.now()) {
			return parentFolderUUIDs[parentFolderName].uuid
		}

		const exists = await folderExists({ name: folderNameBefore, parent: baseParentUUID })

		if (exists.exists) {
			parentFolderUUIDs[parentFolderName] = {
				uuid: exists.existsUUID,
				cachedUntil: Date.now() + 300000
			}

			return exists.existsUUID
		}

		const uuid = await createFolder(folderNameBefore, baseParentUUID)

		parentFolderUUIDs[parentFolderName] = {
			uuid,
			cachedUntil: Date.now() + 300000
		}

		return uuid
	} catch (e) {
		throw e
	} finally {
		getFileParentFolderUUIDMutex.release()
	}
}

export const runCameraUpload = async (maxQueue: number = 65535, runOnce: boolean = false): Promise<void> => {
	await runMutex.acquire()

	try {
		if (runTimeout > Date.now()) {
			return
		}

		const isLoggedIn = storage.getBoolean("isLoggedIn")
		const userId = storage.getNumber("userId")

		if (!isLoggedIn || userId === 0) {
			eventListener.emit("cameraUploadStatus", "inactive")

			return
		}

		const cameraUploadEnabled = storage.getBoolean("cameraUploadEnabled:" + userId)
		const cameraUploadFolderUUID = storage.getString("cameraUploadFolderUUID:" + userId)
		const cameraUploadAutoOrganize = storage.getBoolean("cameraUploadAutoOrganize:" + userId)

		if (lastCameraUploadFolderUUID !== cameraUploadFolderUUID) {
			lastCameraUploadFolderUUID = cameraUploadFolderUUID
			parentFolderUUIDs = {}
		}

		if (
			!cameraUploadEnabled ||
			typeof cameraUploadFolderUUID !== "string" ||
			cameraUploadFolderUUID.length < 32 ||
			!validate(cameraUploadFolderUUID) ||
			!(await isOnline()) ||
			(storage.getBoolean("onlyWifiUploads") && !(await isWifi())) ||
			!(await hasPermissions(true))
		) {
			eventListener.emit("cameraUploadStatus", "inactive")

			return
		}

		let folderExists = false
		const isFolderPresent = await folderPresent(cameraUploadFolderUUID)

		if (isFolderPresent.present) {
			if (!isFolderPresent.trash) {
				folderExists = true
			}
		}

		if (!folderExists) {
			disableCameraUpload(true)

			eventListener.emit("cameraUploadStatus", "inactive")

			return
		}

		const [local, remote] = await Promise.all([loadLocal(), loadRemote()])
		const deltas = await getDeltas(local, remote)
		const currentlyUploadedCount = Object.keys(local).length - deltas.length

		eventListener.emit("cameraUploadStatus", deltas.length > 0 ? "active" : "inactive")

		storage.set("cameraUploadTotal", Object.keys(local).length)
		storage.set("cameraUploadUploaded", currentlyUploadedCount)

		let currentQueue = 0
		const uploads: Promise<void>[] = []
		let uploadedThisRun = 0

		const upload = async (delta: Delta): Promise<void> => {
			await uploadSemaphore.acquire()

			if (!storage.getBoolean("cameraUploadEnabled:" + userId)) {
				return
			}

			let assetId: string = null

			try {
				const asset = delta.item.asset

				assetId = getAssetId(asset)

				const assetURI = await getAssetURI(asset)
				const stat = await fs.stat(assetURI)

				const [lastModified, lastModifiedStat, lastSize] = await Promise.all([
					db.cameraUpload.getLastModified(asset),
					db.cameraUpload.getLastModifiedStat(asset),
					db.cameraUpload.getLastSize(asset)
				])

				if (
					stat.exists &&
					(convertTimestampToMs(stat.modificationTime) === convertTimestampToMs(lastModifiedStat) ||
						convertTimestampToMs(lastModified) === convertTimestampToMs(delta.item.lastModified) ||
						lastSize === stat.size)
				) {
					uploadedThisRun += 1

					storage.set("cameraUploadUploaded", currentlyUploadedCount + uploadedThisRun)

					await Promise.all([
						db.cameraUpload.setLastModified(asset, convertTimestampToMs(delta.item.lastModified)),
						db.cameraUpload.setLastModifiedStat(asset, convertTimestampToMs(stat.modificationTime)),
						db.cameraUpload.setLastSize(asset, stat.size)
					])

					return
				}

				const files = await getFiles(asset, assetURI)
				const parentFolderName = pathModule.dirname(delta.item.path)
				const parentFolderUUID = !cameraUploadAutoOrganize
					? cameraUploadFolderUUID
					: parentFolderName === "." || parentFolderName.length <= 0
					? cameraUploadFolderUUID
					: await getFileParentFolderUUID(cameraUploadFolderUUID, parentFolderName)

				for (const file of files) {
					await queueFileUpload({
						file,
						parent: parentFolderUUID,
						isCameraUpload: true
					}).catch(console.error)

					if (file.path.includes(fs.documentDirectory()) || file.path.includes(fs.cacheDirectory())) {
						await fs.unlink(file.path).catch(console.error)
					}
				}

				if (stat.exists) {
					await Promise.all([
						db.cameraUpload.setLastModified(asset, convertTimestampToMs(delta.item.lastModified)),
						db.cameraUpload.setLastModifiedStat(asset, convertTimestampToMs(stat.modificationTime)),
						db.cameraUpload.setLastSize(asset, stat.size)
					])
				}

				uploadedThisRun += 1

				storage.set("cameraUploadUploaded", currentlyUploadedCount + uploadedThisRun)
			} catch (e) {
				if (assetId) {
					if (typeof FAILED[assetId] !== "number") {
						FAILED[assetId] = 1
					} else {
						FAILED[assetId] += 1
					}
				}

				throw e
			} finally {
				uploadSemaphore.release()
			}
		}

		for (const delta of deltas) {
			const assetId = getAssetId(delta.item.asset)

			if (
				runOnce &&
				!["jpg", "jpeg", "png", "gif", "heic", "heif", "webp", "bmp", "avif", "tiff", "dib", "ico", "cur", "xbm", "jxl"].includes(
					pathModule.parse(delta.item.name).ext
				)
			) {
				continue
			}

			if (maxQueue > currentQueue && (typeof FAILED[assetId] !== "number" ? 0 : FAILED[assetId]) < MAX_FAILED) {
				currentQueue += 1

				if (delta.type === "UPLOAD" || delta.type === "UPDATE") {
					uploads.push(upload(delta))
				}
			}
		}

		if (uploads.length > 0) {
			await promiseAllSettled(uploads)

			storage.set("cameraUploadUploaded", currentlyUploadedCount + uploadedThisRun)
		} else {
			storage.set("cameraUploadUploaded", Object.keys(local).length)
		}

		eventListener.emit("cameraUploadStatus", deltas.length > 0 && !runOnce ? "active" : "inactive")
	} catch (e) {
		console.error(e)
	} finally {
		runTimeout = Date.now() + (TIMEOUT - 1000)

		runMutex.release()

		if (!runOnce) {
			setTimeout(() => {
				runCameraUpload(maxQueue)
			}, TIMEOUT)
		} else {
			eventListener.emit("cameraUploadStatus", "inactive")
		}
	}
}
