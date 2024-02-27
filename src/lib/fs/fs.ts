import * as FileSystem from "expo-file-system"
import {
	toExpoFsPath,
	toExpoFsPathWithoutEncode,
	toBlobUtilPath,
	toBlobUtilPathWithoutEncode,
	convertTimestampToMs,
	Semaphore
} from "../helpers"
import { Platform } from "react-native"
import ReactNativeBlobUtil from "react-native-blob-util"
import * as ScopedStorage from "react-native-scoped-storage"
import AndroidSAF from "react-native-saf-x"
import mimeTypes from "mime-types"
import pathModule from "path"

const mutex = new Semaphore(1)
let IOS_APP_GROUP_PATH = ""

export const deleteOldIOSDocumentDirs = async (): Promise<void> => {
	if (Platform.OS !== "ios") {
		return
	}

	const dirs = await readDirectory(FileSystem.documentDirectory)

	for (const dir of dirs) {
		if (dir === "Downloads") {
			continue
		}

		await unlink(FileSystem.documentDirectory + "/" + dir)
	}
}

export const cacheDirectory = (): string => {
	return FileSystem.cacheDirectory
}

export const documentDirectory = (): string => {
	if (Platform.OS === "android") {
		return FileSystem.documentDirectory
	}

	if (IOS_APP_GROUP_PATH.length > 0) {
		return IOS_APP_GROUP_PATH
	}

	try {
		// ReactNativeBlobUtil typings incorrect
		// @ts-expect-error
		const appGroupPath = ReactNativeBlobUtil.fs.syncPathAppGroup("group.io.filen.app") + "/data"

		if (typeof appGroupPath === "string" && appGroupPath.length > 0) {
			IOS_APP_GROUP_PATH = appGroupPath

			console.log("appGroupPath", IOS_APP_GROUP_PATH)

			return IOS_APP_GROUP_PATH
		}
	} catch (e) {
		console.error(e)
	}

	return FileSystem.documentDirectory
}

export const expoCopy = async (from: string, to: string): Promise<void> => {
	await mutex.acquire()

	try {
		await FileSystem.copyAsync({
			from: toExpoFsPath(from),
			to: toExpoFsPath(to)
		})
	} finally {
		mutex.release()
	}
}

export const copy = async (from: string, to: string): Promise<void> => {
	await mutex.acquire()

	try {
		if (Platform.OS === "ios") {
			await ReactNativeBlobUtil.fs.cp(toBlobUtilPath(from), toBlobUtilPath(to))

			return
		}

		await FileSystem.copyAsync({
			from: toExpoFsPath(from),
			to: toExpoFsPath(to)
		})
	} finally {
		mutex.release()
	}
}

export type Stat =
	| {
			exists: true
			uri: string
			size: number
			isDirectory: boolean
			modificationTime: number
	  }
	| {
			exists: false
			uri: string
			isDirectory: false
	  }

export const fstat = async (path: string): Promise<Stat> => {
	if (Platform.OS === "ios") {
		try {
			const response = await ReactNativeBlobUtil.fs.stat(toBlobUtilPath(path))

			return {
				exists: true,
				uri: response.path,
				size: response.size,
				isDirectory: response.type === "directory",
				modificationTime: convertTimestampToMs(response.lastModified)
			}
		} catch {
			return {
				exists: false,
				uri: path,
				isDirectory: false
			}
		}
	}

	const response = await FileSystem.getInfoAsync(toExpoFsPath(path))

	if (!response.exists) {
		return {
			exists: false,
			uri: response.uri,
			isDirectory: false
		}
	}

	return {
		exists: response.exists,
		uri: response.uri,
		size: response.size,
		isDirectory: response.isDirectory,
		modificationTime: convertTimestampToMs(response.modificationTime)
	}
}

export const stat = fstat

export const statWithoutEncode = async (path: string): Promise<Stat> => {
	if (Platform.OS === "ios") {
		try {
			const response = await ReactNativeBlobUtil.fs.stat(toBlobUtilPathWithoutEncode(path))

			return {
				exists: true,
				uri: response.path,
				size: response.size,
				isDirectory: response.type === "directory",
				modificationTime: convertTimestampToMs(response.lastModified)
			}
		} catch {
			return {
				exists: false,
				uri: path,
				isDirectory: false
			}
		}
	}

	const response = await FileSystem.getInfoAsync(toExpoFsPathWithoutEncode(path))

	if (!response.exists) {
		return {
			exists: false,
			uri: response.uri,
			isDirectory: false
		}
	}

	return {
		exists: response.exists,
		uri: response.uri,
		size: response.size,
		isDirectory: response.isDirectory,
		modificationTime: convertTimestampToMs(response.modificationTime)
	}
}

export const unlink = async (path: string): Promise<void> => {
	await mutex.acquire()

	try {
		if (Platform.OS === "ios") {
			await ReactNativeBlobUtil.fs.unlink(toBlobUtilPath(path))

			return
		}

		await FileSystem.deleteAsync(toExpoFsPath(path), {
			idempotent: true
		})
	} finally {
		mutex.release()
	}
}

export const move = async (from: string, to: string): Promise<void> => {
	await mutex.acquire()

	try {
		if (Platform.OS === "ios") {
			await ReactNativeBlobUtil.fs.cp(toBlobUtilPath(from), toBlobUtilPath(to))

			return
		}

		await FileSystem.moveAsync({
			from: toExpoFsPath(from),
			to: toExpoFsPath(to)
		})
	} finally {
		mutex.release()
	}
}

export const readAsString = async (
	path: string,
	encoding: FileSystem.EncodingType | "utf8" | "base64" | undefined = "utf8"
): Promise<string> => {
	if (Platform.OS === "ios") {
		return await ReactNativeBlobUtil.fs.readFile(toBlobUtilPath(path), "utf8")
	}

	return await FileSystem.readAsStringAsync(toExpoFsPath(path), {
		encoding
	})
}

export const writeAsString = async (path: string, contents: string, options: FileSystem.WritingOptions = {}): Promise<void> => {
	await mutex.acquire()

	try {
		if (Platform.OS === "ios") {
			await ReactNativeBlobUtil.fs.writeFile(toBlobUtilPath(path), contents, options.encoding)

			return
		}

		await FileSystem.writeAsStringAsync(toExpoFsPath(path), contents, options)
	} finally {
		mutex.release()
	}
}

export const readDirectory = async (path: string): Promise<string[]> => {
	if (Platform.OS === "ios") {
		return await ReactNativeBlobUtil.fs.ls(toBlobUtilPath(path))
	}

	return await FileSystem.readDirectoryAsync(toExpoFsPath(path))
}

export const mkdir = async (path: string, intermediates: boolean = true): Promise<void> => {
	await mutex.acquire()

	try {
		const stat = await fstat(path)

		if (stat.exists) {
			return
		}

		if (Platform.OS === "ios") {
			await ReactNativeBlobUtil.fs.mkdir(toBlobUtilPath(path))

			return
		}

		await FileSystem.makeDirectoryAsync(toExpoFsPath(path), {
			intermediates
		})
	} finally {
		mutex.release()
	}
}

export const downloadFile = async (uri: string, fileUri: string, options: FileSystem.DownloadOptions = {}): Promise<void> => {
	if (Platform.OS === "ios") {
		const response = await ReactNativeBlobUtil.config({
			fileCache: true
		}).fetch("GET", uri.indexOf("http://") !== -1 || uri.indexOf("https://") !== -1 ? uri : toBlobUtilPath(uri))

		await move(response.path(), fileUri)

		return
	}

	await FileSystem.downloadAsync(
		uri.indexOf("http://") !== -1 || uri.indexOf("https://") !== -1 ? uri : toExpoFsPath(uri),
		toExpoFsPath(fileUri),
		options
	)
}

export const getDownloadPath = async ({
	type = "temp"
}: {
	type: "temp" | "thumbnail" | "offline" | "misc" | "cachedDownloads" | "download" | "node" | "db" | "offline"
}): Promise<string> => {
	if (Platform.OS === "android") {
		if (type === "temp") {
			return cacheDirectory().endsWith("/") ? cacheDirectory() : cacheDirectory() + "/"
		} else if (type === "thumbnail") {
			const root = documentDirectory().endsWith("/") ? documentDirectory() : documentDirectory() + "/"
			const path = root + "thumbnailCache"

			await mkdir(path, true)

			return path + "/"
		} else if (type === "offline") {
			const root = documentDirectory().endsWith("/") ? documentDirectory() : documentDirectory() + "/"
			const path = root + "offlineFiles"

			await mkdir(path, true)

			return path + "/"
		} else if (type === "misc") {
			const root = documentDirectory().endsWith("/") ? documentDirectory() : documentDirectory() + "/"
			const path = root + "misc"

			await mkdir(path, true)

			return path + "/"
		} else if (type === "cachedDownloads") {
			const root = documentDirectory().endsWith("/") ? documentDirectory() : documentDirectory() + "/"
			const path = root + "cachedDownloads"

			await mkdir(path, true)

			return path + "/"
		} else if (type === "download") {
			return ReactNativeBlobUtil.fs.dirs.DownloadDir + "/"
		} else if (type === "node") {
			const root = documentDirectory().endsWith("/") ? documentDirectory() : documentDirectory() + "/"
			const path = root + "node"

			await mkdir(path, true)

			return path + "/"
		} else if (type === "db") {
			const root = documentDirectory().endsWith("/") ? documentDirectory() : documentDirectory() + "/"
			const path = root + "db"

			await mkdir(path, true)

			return path + "/"
		}
	}

	if (type === "temp") {
		return cacheDirectory().endsWith("/") ? cacheDirectory() : cacheDirectory() + "/"
	} else if (type === "thumbnail") {
		const root = documentDirectory().endsWith("/") ? documentDirectory() : documentDirectory() + "/"
		const path = root + "thumbnailCache"

		await mkdir(path, true)

		return path + "/"
	} else if (type === "offline") {
		const root = documentDirectory().endsWith("/") ? documentDirectory() : documentDirectory() + "/"
		const path = root + "offlineFiles"

		await mkdir(path, true)

		return path + "/"
	} else if (type === "misc") {
		const root = documentDirectory().endsWith("/") ? documentDirectory() : documentDirectory() + "/"
		const path = root + "misc"

		await mkdir(path, true)

		return path + "/"
	} else if (type === "cachedDownloads") {
		const root = documentDirectory().endsWith("/") ? documentDirectory() : documentDirectory() + "/"
		const path = root + "cachedDownloads"

		await mkdir(path, true)

		return path + "/"
	} else if (type === "download") {
		const dir = FileSystem.documentDirectory
		const root = dir.endsWith("/") ? dir : dir + "/"
		const path = root + "Downloads"

		await mkdir(path, true)

		return path + "/"
	} else if (type === "db") {
		const root = documentDirectory().endsWith("/") ? documentDirectory() : documentDirectory() + "/"
		const path = root + "db"

		await mkdir(path, true)

		return path + "/"
	}
}

export type SAFStat = {
	name: string
	size: number
	lastModified: number
	isDirectory?: boolean
	type: "file" | "directory"
	mime: string
	uri: string
	path: string
	lib?: "expo-filesystem" | "react-native-blob-util" | "android-saf-x" | "android-scoped-storage"
}

export const saf = {
	ls: async (uri: string) => {
		return await AndroidSAF.listFiles(uri)
	},
	copy: async (from: string, to: string): Promise<void> => {
		try {
			await AndroidSAF.copyFile(from, to, {
				replaceIfDestinationExists: true
			})

			return
		} catch {
			// Noop
		}

		try {
			if ((await FileSystem.getInfoAsync(to)).exists) {
				await FileSystem.deleteAsync(to)
			}
		} catch {
			// Noop
		}

		try {
			await FileSystem.StorageAccessFramework.copyAsync({
				from,
				to
			})

			return
		} catch {
			// Noop
		}

		await ReactNativeBlobUtil.fs.cp(from, to)
	},
	stat: async (uri: string): Promise<SAFStat> => {
		try {
			const stat = await AndroidSAF.stat(uri)

			return {
				name: stat.name,
				size: stat.size || 0,
				lastModified: convertTimestampToMs(stat.lastModified || Date.now()),
				isDirectory: stat.type === "directory",
				type: stat.type,
				uri,
				path: uri,
				mime: mimeTypes.lookup(stat.name) || "application/octet-stream",
				lib: "android-saf-x"
			}
		} catch {
			// Noop
		}

		try {
			const stat = await ReactNativeBlobUtil.fs.stat(uri)

			return {
				name: stat.filename,
				size: stat.size || 0,
				lastModified: convertTimestampToMs(stat.lastModified || Date.now()),
				isDirectory: stat.type === "directory",
				type: stat.type,
				uri,
				path: uri,
				mime: mimeTypes.lookup(stat.filename) || "application/octet-stream",
				lib: "react-native-blob-util"
			}
		} catch {
			// Noop
		}

		try {
			const stat = await ScopedStorage.stat(uri)

			if (
				typeof stat.name === "string" &&
				typeof stat.size === "number" &&
				typeof stat.lastModified === "number" &&
				typeof stat.type === "string"
			) {
				return {
					name: stat.name,
					size: stat.size || 0,
					lastModified: convertTimestampToMs(stat.lastModified || Date.now()),
					isDirectory: stat.type === "directory",
					type: stat.type,
					uri,
					path: uri,
					mime: mimeTypes.lookup(stat.name) || "application/octet-stream",
					lib: "react-native-blob-util"
				}
			}
		} catch {
			// Noop
		}

		const stat = await FileSystem.getInfoAsync(uri)

		if (!stat.exists) {
			throw new Error(uri + " does not exist.")
		}

		const fileName = pathModule.basename(stat.uri)

		if (fileName.length <= 0 || fileName === "." || fileName === "/") {
			throw new Error("Could not parse file name.")
		}

		return {
			name: fileName || (await global.nodeThread.uuidv4()),
			size: stat.size || 0,
			lastModified: convertTimestampToMs(stat.modificationTime || Date.now()),
			isDirectory: stat.isDirectory,
			type: stat.isDirectory ? "directory" : "file",
			uri,
			path: uri,
			mime: mimeTypes.lookup(fileName || (await global.nodeThread.uuidv4())) || "application/octet-stream",
			lib: "expo-filesystem"
		}
	}
}
