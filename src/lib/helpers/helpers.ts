import storage from "../storage"
import { Platform } from "react-native"
import { useStore } from "../state"
import { i18n } from "../../i18n"
import { NavigationContainerRefWithCurrent } from "@react-navigation/native"
import * as MediaLibrary from "expo-media-library"
import { Item } from "../../types"
import { getColor } from "../../style"

export const getAPIServer = (): string => {
	const servers = [
		"https://gateway.filen.io",
		"https://gateway.filen.net",
		"https://gateway.filen-1.net",
		"https://gateway.filen-2.net",
		"https://gateway.filen-3.net",
		"https://gateway.filen-4.net",
		"https://gateway.filen-5.net",
		"https://gateway.filen-6.net"
	]

	return servers[getRandomArbitrary(0, servers.length - 1)]
}

export const getDownloadServer = (): string => {
	const servers = [
		"https://egest.filen.io",
		"https://egest.filen.net",
		"https://egest.filen-1.net",
		"https://egest.filen-2.net",
		"https://egest.filen-3.net",
		"https://egest.filen-4.net",
		"https://egest.filen-5.net",
		"https://egest.filen-6.net"
	]

	return servers[getRandomArbitrary(0, servers.length - 1)]
}

export const getUploadServer = (): string => {
	const servers = [
		"https://ingest.filen.io",
		"https://ingest.filen.net",
		"https://ingest.filen-1.net",
		"https://ingest.filen-2.net",
		"https://ingest.filen-3.net",
		"https://ingest.filen-4.net",
		"https://ingest.filen-5.net",
		"https://ingest.filen-6.net"
	]

	return servers[getRandomArbitrary(0, servers.length - 1)]
}

export const getMasterKeys = (): string[] => {
	try {
		return JSON.parse(storage.getString("masterKeys") || "[]")
	} catch (e) {
		return []
	}
}

export const calcSpeed = (now: number, started: number, bytes: number): number => {
	now = Date.now() - 1000

	const secondsDiff: number = (now - started) / 1000
	const bps: number = Math.floor((bytes / secondsDiff) * 1)

	return bps > 0 ? bps : 0
}

export const calcTimeLeft = (loadedBytes: number, totalBytes: number, started: number): number => {
	const elapsed: number = Date.now() - started
	const speed: number = loadedBytes / (elapsed / 1000)
	const remaining: number = (totalBytes - loadedBytes) / speed

	return remaining > 0 ? remaining : 0
}

export const getFolderColor = (color: string | null | undefined): string => {
	const colors = getAvailableFolderColors()

	if (!color) {
		return Platform.OS == "ios" ? colors["default_ios"] : colors["default_ios"]
	}

	if (typeof colors[color] !== "undefined") {
		if (color == "default") {
			return Platform.OS == "ios" ? colors["default_ios"] : colors["default_ios"]
		}

		return colors[color]
	}

	return Platform.OS == "ios" ? colors["default_ios"] : colors["default_ios"]
}

export const getAvailableFolderColors = (): { [key: string]: string } => {
	return {
		default: "#ffd04c",
		blue: "#2992E5",
		green: "#57A15B",
		purple: "#8E3A9D",
		red: "#CB2E35",
		gray: "gray",
		default_ios: "#79CCFC"
	}
}

export const fileAndFolderNameValidation = (name: string): boolean => {
	const regex = /[<>:"\/\\|?*\x00-\x1F]|^(?:aux|con|clock\$|nul|prn|com[1-9]|lpt[1-9])$/i

	if (regex.test(name)) {
		return false
	}

	return true
}

export const getFileParentPath = (filePath: string): string => {
	const ex = filePath.split("/")

	ex.pop()

	return ex.join("/")
}

export const getFilenameFromPath = (path: string): string => {
	return path.split("\\")?.pop()?.split("/")?.pop() as string
}

export const getRouteURL = (passedRoute?: any): string => {
	try {
		if (typeof passedRoute !== "undefined") {
			var route = passedRoute
			var routeURL = getParent(passedRoute)
		} else {
			var routes = useStore.getState().currentRoutes

			if (typeof routes == "undefined") {
				return "base"
			}

			if (!Array.isArray(routes)) {
				return "base"
			}

			var route = routes[routes.length - 1]
			var routeURL = getParent()
		}

		if (typeof route !== "undefined") {
			if (typeof route.params !== "undefined") {
				if (typeof route.params.parent !== "undefined") {
					routeURL = route.params.parent
				}
			}
		}

		return routeURL
	} catch (e) {
		console.error(e)
	}

	return "base"
}

export const getParent = (passedRoute?: any): string => {
	try {
		let routes = useStore.getState().currentRoutes

		if (typeof routes == "undefined") {
			return "base"
		}

		if (!Array.isArray(routes)) {
			return "base"
		}

		let route = routes[routes.length - 1]

		if (typeof passedRoute !== "undefined") {
			route = passedRoute
		}

		if (typeof route !== "undefined") {
			if (typeof route.params !== "undefined") {
				if (typeof route.params.parent !== "undefined") {
					if (route.params.parent.indexOf("/") !== -1) {
						const ex = route.params.parent.split("/")

						return ex[ex.length - 1].trim()
					} else {
						return route.params.parent
					}
				}
			}
		}
	} catch (e) {
		console.error(e)
	}

	return "base"
}

export const getRandomArbitrary = (min: number, max: number): number => {
	return Math.floor(Math.random() * (max - min) + min)
}

export const formatBytes = (bytes: number, decimals: number = 2) => {
	if (bytes == 0) {
		return "0 Bytes"
	}

	let k = 1024
	let dm = decimals < 0 ? 0 : decimals
	let sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]

	let i = Math.floor(Math.log(bytes) / Math.log(k))

	return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
}

const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

// Use a lookup table to find the index.
const lookup = typeof Uint8Array === "undefined" ? [] : new Uint8Array(256)
for (let i = 0; i < chars.length; i++) {
	lookup[chars.charCodeAt(i)] = i
}

export const arrayBufferToBase64 = (arraybuffer: ArrayBuffer): string => {
	let bytes = new Uint8Array(arraybuffer),
		i,
		len = bytes.length,
		base64 = ""

	for (i = 0; i < len; i += 3) {
		base64 += chars[bytes[i] >> 2]
		base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)]
		base64 += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)]
		base64 += chars[bytes[i + 2] & 63]
	}

	if (len % 3 === 2) {
		base64 = base64.substring(0, base64.length - 1) + "="
	} else if (len % 3 === 1) {
		base64 = base64.substring(0, base64.length - 2) + "=="
	}

	return base64
}

export const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
	let bufferLength = base64.length * 0.75,
		len = base64.length,
		i,
		p = 0,
		encoded1,
		encoded2,
		encoded3,
		encoded4

	if (base64[base64.length - 1] === "=") {
		bufferLength--
		if (base64[base64.length - 2] === "=") {
			bufferLength--
		}
	}

	const arraybuffer = new ArrayBuffer(bufferLength),
		bytes = new Uint8Array(arraybuffer)

	for (i = 0; i < len; i += 4) {
		encoded1 = lookup[base64.charCodeAt(i)]
		encoded2 = lookup[base64.charCodeAt(i + 1)]
		encoded3 = lookup[base64.charCodeAt(i + 2)]
		encoded4 = lookup[base64.charCodeAt(i + 3)]

		bytes[p++] = (encoded1 << 2) | (encoded2 >> 4)
		bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2)
		bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63)
	}

	return arraybuffer
}

export const convertTimestampToMs = (timestamp: number): number => {
	const now = Date.now()

	if (Math.abs(now - timestamp) < Math.abs(now - timestamp * 1000)) {
		return timestamp
	}

	return Math.floor(timestamp * 1000)
}

export const simpleDate = (timestamp: number): string => {
	try {
		return new Date(convertTimestampToMs(timestamp)).toString().split(" ").slice(0, 5).join(" ")
	} catch (e) {
		return new Date().toString().split(" ").slice(0, 5).join(" ")
	}
}

export const normalizePhotosRange = (range: string | undefined): string => {
	if (typeof range !== "string") {
		return "all"
	}

	if (!["years", "months", "days", "all"].includes(range)) {
		return "all"
	}

	return range
}

export const randomIdUnsafe = (): string => {
	return Math.random().toString().slice(3)
}

export const generateRandomString = async (length: number = 32): Promise<string> => {
	return await global.nodeThread.generateRandomString({ charLength: length })
}

export function unixTimestamp(): number {
	return Math.floor(Date.now() / 1000)
}

export const canCompressThumbnail = (ext: string): boolean => {
	if (Platform.OS === "android") {
		switch (ext.toLowerCase()) {
			case "heif":
			case "heic":
				return Platform.constants.Version >= 30
				break
			case "jpeg":
			case "jpg":
			case "png":
			case "gif":
			case "mp4":
			case "webm":
			case "webp":
				return true
				break
			default:
				return false
				break
		}
	} else {
		switch (ext.toLowerCase()) {
			case "jpeg":
			case "jpg":
			case "png":
			case "gif":
			case "heif":
			case "heic":
			case "mp4":
			case "mov":
			case "avi":
			case "webm":
			case "webp":
				return true
				break
			default:
				return false
				break
		}
	}
}

export const canCompressThumbnailLocally = (ext: string): boolean => {
	if (Platform.OS === "android") {
		switch (ext.toLowerCase()) {
			case "heif":
			case "heic":
				return Platform.constants.Version >= 30
				break
			case "jpeg":
			case "jpg":
			case "png":
			case "gif":
			case "mp4":
			case "webm":
			case "webp":
				return true
				break
			default:
				return false
				break
		}
	} else {
		switch (ext.toLowerCase()) {
			case "jpeg":
			case "jpg":
			case "png":
			case "gif":
			case "heif":
			case "heic":
			case "mp4":
			case "mov":
			case "avi":
			case "webm":
			case "webp":
				return true
				break
			default:
				return false
				break
		}
	}
}

export const getFilePreviewType = (ext: string) => {
	if (Platform.OS === "android") {
		switch (ext.toLowerCase()) {
			case "heif":
			case "heic":
				return Platform.constants.Version >= 30 ? "image" : "none"
				break
			case "hevc":
				return Platform.constants.Version >= 30 ? "video" : "none"
				break
			case "jpeg":
			case "jpg":
			case "png":
			case "gif":
			case "svg":
			case "webp":
				return "image"
				break
			case "mp3":
			case "mp2":
			case "wav":
			case "ogg":
			case "m4a":
			case "aac":
			case "flac":
			case "midi":
			case "xmf":
			case "rtx":
			case "ota":
			case "mpa":
			case "aif":
			case "rtttl":
			case "wma":
				return "audio"
				break
			case "mp4":
			case "webm":
			case "mkv":
			case "flv":
			case "mov":
			case "ogv":
			case "3gp":
			case "avi":
				return "video"
				break
			case "json":
			case "swift":
			case "m":
			case "js":
			case "md":
			case "php":
			case "css":
			case "c":
			case "perl":
			case "html":
			case "html5":
			case "jsx":
			case "php5":
			case "yml":
			case "md":
			case "xml":
			case "sql":
			case "java":
			case "csharp":
			case "dist":
			case "py":
			case "cc":
			case "cpp":
			case "log":
			case "conf":
			case "cxx":
			case "ini":
			case "lock":
			case "bat":
			case "sh":
			case "properties":
			case "cfg":
			case "ahk":
			case "ts":
			case "tsx":
				return "code"
				break
			case "txt":
			case "rtf":
				return "text"
				break
			case "pdf":
				return "pdf"
				break
			case "docx":
			case "doc":
			case "odt":
			case "xls":
			case "xlsx":
			case "ods":
			case "ppt":
			case "pptx":
			case "csv":
				return "doc"
				break
			case "heic":
				return "heic"
				break
			case "heif":
				return "heif"
				break
			case "hevc":
				return "hevc"
				break
			default:
				return "none"
				break
		}
	} else {
		switch (ext.toLowerCase()) {
			case "jpeg":
			case "jpg":
			case "png":
			case "gif":
			case "svg":
			case "heic":
			case "heif":
			case "webp":
				return "image"
				break
			case "mp3":
			case "mp2":
			case "wav":
			case "ogg":
			case "m4a":
			case "aac":
			case "flac":
			case "midi":
			case "xmf":
			case "rtx":
			case "ota":
			case "mpa":
			case "aif":
			case "rtttl":
			case "wma":
				return "audio"
				break
			case "mp4":
			case "webm":
			case "mkv":
			case "flv":
			case "mov":
			case "ogv":
			case "3gp":
			case "avi":
			case "hevc":
				return "video"
				break
			case "json":
			case "swift":
			case "m":
			case "js":
			case "md":
			case "php":
			case "css":
			case "c":
			case "perl":
			case "html":
			case "html5":
			case "jsx":
			case "php5":
			case "yml":
			case "md":
			case "xml":
			case "sql":
			case "java":
			case "csharp":
			case "dist":
			case "py":
			case "cc":
			case "cpp":
			case "log":
			case "conf":
			case "cxx":
			case "ini":
			case "lock":
			case "bat":
			case "sh":
			case "properties":
			case "cfg":
			case "ahk":
			case "ts":
			case "tsx":
				return "code"
				break
			case "txt":
			case "rtf":
				return "text"
				break
			case "pdf":
				return "pdf"
				break
			case "docx":
			case "doc":
			case "odt":
			case "xls":
			case "xlsx":
			case "ods":
			case "ppt":
			case "pptx":
			case "csv":
				return "doc"
				break
			case "heic":
				return "heic"
				break
			case "heif":
				return "heif"
				break
			case "hevc":
				return "hevc"
				break
			default:
				return "none"
				break
		}
	}
}

export function convertUint8ArrayToBinaryString(u8Array: Uint8Array | ArrayBuffer): string {
	const arr: Uint8Array = new Uint8Array(u8Array)
	let i,
		len = arr.length,
		b_str = ""

	for (i = 0; i < len; i++) {
		b_str += String.fromCharCode(arr[i])
	}

	return b_str
}

export const calcCameraUploadCurrentDate = (from: number, to: number, lang: string = "en"): string => {
	const fromDate = new Date(convertTimestampToMs(from))
	const toDate = new Date(convertTimestampToMs(to))
	const fromMonth = fromDate.getMonth()
	const toMonth = toDate.getMonth()
	const fromYear = fromDate.getFullYear()
	const toYear = toDate.getFullYear()
	const fromDay = fromDate.getDate()
	const toDay = toDate.getDate()

	if (fromMonth == toMonth && fromYear == toYear) {
		if (fromDay == toDay) {
			return fromDay + " " + i18n(lang, "monthShort_" + fromMonth) + " " + fromYear
		} else {
			return toDay + "-" + fromDay + " " + i18n(lang, "monthShort_" + fromMonth) + " " + fromYear
		}
	} else if (fromMonth !== toMonth && fromYear == toYear) {
		return (
			toDay +
			" " +
			i18n(lang, "monthShort_" + toMonth) +
			" - " +
			fromDay +
			" " +
			i18n(lang, "monthShort_" + fromMonth) +
			" " +
			fromYear
		)
	} else if (fromMonth !== toMonth && fromYear !== toYear) {
		return (
			toDay +
			" " +
			i18n(lang, "monthShort_" + toMonth) +
			" " +
			toYear +
			" - " +
			fromDay +
			" " +
			i18n(lang, "monthShort_" + fromMonth) +
			" " +
			fromYear
		)
	} else {
		return i18n(lang, "monthShort_" + fromMonth) + " " + fromYear
	}
}

export const calcPhotosGridSize = (num: number): number => {
	if (num <= 0) {
		return 3
	}

	return num
}

export const orderItemsByType = (
	items: Item[],
	type:
		| "nameAsc"
		| "sizeAsc"
		| "dateAsc"
		| "typeAsc"
		| "lastModifiedAsc"
		| "nameDesc"
		| "sizeDesc"
		| "dateDesc"
		| "typeDesc"
		| "lastModifiedDesc"
		| "uploadDateAsc"
		| "uploadDateDesc"
): Item[] => {
	let files: Item[] = []
	let folders: Item[] = []

	for (let i = 0; i < items.length; i++) {
		if (items[i].type == "file") {
			files.push(items[i])
		} else {
			folders.push(items[i])
		}
	}

	if (type == "nameAsc") {
		let sortedFiles = files.sort((a, b) => {
			return a.name.localeCompare(b.name, "en", { numeric: true })
		})

		let sortedFolders = folders.sort((a, b) => {
			return a.name.localeCompare(b.name, "en", { numeric: true })
		})

		return sortedFolders.concat(sortedFiles)
	} else if (type == "sizeAsc") {
		let sortedFiles = files.sort((a, b) => {
			return a.size - b.size
		})

		let sortedFolders = folders.sort((a, b) => {
			return b.timestamp - a.timestamp
		})

		return sortedFolders.concat(sortedFiles)
	} else if (type == "dateAsc") {
		let sortedFiles = files.sort((a, b) => {
			return a.lastModifiedSort - b.lastModifiedSort
		})

		let sortedFolders = folders.sort((a, b) => {
			return a.timestamp - b.timestamp
		})

		return sortedFolders.concat(sortedFiles)
	} else if (type == "dateDesc") {
		let sortedFiles = files.sort((a, b) => {
			return b.lastModifiedSort - a.lastModifiedSort
		})

		let sortedFolders = folders.sort((a, b) => {
			return b.timestamp - a.timestamp
		})

		return sortedFolders.concat(sortedFiles)
	} else if (type == "typeAsc") {
		let sortedFiles = files.sort((a, b) => {
			if (typeof a.mime == "undefined") {
				a.mime = "_"
			}

			if (typeof b.mime == "undefined") {
				b.mime = "_"
			}

			if (a.mime.length <= 1) {
				a.mime = "_"
			}

			if (b.mime.length <= 1) {
				b.mime = "_"
			}

			return a.mime.localeCompare(b.mime, "en", { numeric: true })
		})

		let sortedFolders = folders.sort((a, b) => {
			return b.timestamp - a.timestamp
		})

		return sortedFolders.concat(sortedFiles)
	} else if (type == "nameDesc") {
		let sortedFiles = files.sort((a, b) => {
			return b.name.localeCompare(a.name, "en", { numeric: true })
		})

		let sortedFolders = folders.sort((a, b) => {
			return b.name.localeCompare(a.name, "en", { numeric: true })
		})

		return sortedFolders.concat(sortedFiles)
	} else if (type == "sizeDesc") {
		let sortedFiles = files.sort((a, b) => {
			return b.size - a.size
		})

		let sortedFolders = folders.sort((a, b) => {
			return b.timestamp - a.timestamp
		})

		return sortedFolders.concat(sortedFiles)
	} else if (type == "typeDesc") {
		let sortedFiles = files.sort((a, b) => {
			if (typeof a.mime == "undefined") {
				a.mime = "_"
			}

			if (typeof b.mime == "undefined") {
				b.mime = "_"
			}

			if (a.mime.length <= 1) {
				a.mime = "_"
			}

			if (b.mime.length <= 1) {
				b.mime = "_"
			}

			return b.mime.localeCompare(a.mime, "en", { numeric: true })
		})

		let sortedFolders = folders.sort((a, b) => {
			return b.timestamp - a.timestamp
		})

		return sortedFolders.concat(sortedFiles)
	} else if (type == "lastModifiedAsc") {
		let sortedFiles = files.sort((a, b) => {
			return a.lastModifiedSort - b.lastModifiedSort
		})

		let sortedFolders = folders.sort((a, b) => {
			return a.timestamp - b.timestamp
		})

		return sortedFolders.concat(sortedFiles)
	} else if (type == "lastModifiedDesc") {
		let sortedFiles = files.sort((a, b) => {
			return b.lastModifiedSort - a.lastModifiedSort
		})

		let sortedFolders = folders.sort((a, b) => {
			return b.timestamp - a.timestamp
		})

		return sortedFolders.concat(sortedFiles)
	} else if (type == "uploadDateAsc") {
		let sortedFiles = files.sort((a, b) => {
			return a.timestamp - b.timestamp
		})

		let sortedFolders = folders.sort((a, b) => {
			return a.timestamp - b.timestamp
		})

		return sortedFolders.concat(sortedFiles)
	} else if (type == "uploadDateDesc") {
		let sortedFiles = files.sort((a, b) => {
			return b.timestamp - a.timestamp
		})

		let sortedFolders = folders.sort((a, b) => {
			return b.timestamp - a.timestamp
		})

		return sortedFolders.concat(sortedFiles)
	} else {
		//default, nameAsc

		const sortedFiles = files.sort((a, b) => {
			return a.name.localeCompare(b.name, "en", { numeric: true })
		})

		const sortedFolders = folders.sort((a, b) => {
			return a.name.localeCompare(b.name, "en", { numeric: true })
		})

		return sortedFolders.concat(sortedFiles)
	}
}

export interface SemaphoreInterface {
	acquire: Function
	release: Function
	count: Function
	setMax: Function
	purge: Function
}

export const Semaphore = function (this: SemaphoreInterface, max: number) {
	var counter = 0
	var waiting: any = []
	var maxCount = max || 1

	var take = function () {
		if (waiting.length > 0 && counter < maxCount) {
			counter++
			let promise = waiting.shift()
			promise.resolve()
		}
	}

	this.acquire = function () {
		if (counter < maxCount) {
			counter++
			return new Promise(resolve => {
				resolve(true)
			})
		} else {
			return new Promise((resolve, err) => {
				waiting.push({ resolve: resolve, err: err })
			})
		}
	}

	this.release = function () {
		counter--
		take()
	}

	this.count = function () {
		return counter
	}

	this.setMax = function (newMax: number) {
		maxCount = newMax
	}

	this.purge = function () {
		let unresolved = waiting.length

		for (let i = 0; i < unresolved; i++) {
			waiting[i].err("Task has been purged.")
		}

		counter = 0
		waiting = []

		return unresolved
	}
} as any as { new (max: number): SemaphoreInterface }

export const getAPIKey = (): string => {
	return storage.getString("apiKey") || ""
}

export const getFileExt = (name: string): string => {
	if (typeof name !== "string" || name.length <= 0) {
		return ""
	}

	try {
		if (name.indexOf(".") == -1) {
			return ""
		}

		let ex = name.split(".")

		return ex[ex.length - 1].toLowerCase()
	} catch {
		return ""
	}
}

export const promiseAllSettled = (promises: Promise<any>[]) =>
	Promise.all(
		promises.map(p =>
			p
				.then((value: any) => ({
					status: "fulfilled",
					value
				}))
				.catch((reason: any) => ({
					status: "rejected",
					reason
				}))
		)
	)

export const isRouteInStack = (
	navigationRef: NavigationContainerRefWithCurrent<ReactNavigation.RootParamList>,
	routeNames: string[]
): boolean => {
	try {
		if (!isNavReady(navigationRef)) {
			return false
		}

		if (typeof navigationRef == "undefined") {
			return false
		}

		if (typeof navigationRef.getState !== "function") {
			return false
		}

		const navState = navigationRef.getState()

		if (typeof navState == "undefined") {
			return false
		}

		if (typeof navState.routes == "undefined") {
			return false
		}

		if (!navState.routes) {
			return false
		}

		if (!Array.isArray(navState.routes)) {
			return false
		}

		if (navState.routes.filter(route => routeNames.includes(route.name)).length > 0) {
			return true
		}
	} catch (e) {
		console.error(e)
	}

	return false
}

export const isBetween = (num: number, start: number, end: number) => {
	if (num >= start && num <= end) {
		return true
	}

	return false
}

export const isNavReady = (navigationRef: NavigationContainerRefWithCurrent<ReactNavigation.RootParamList>): Promise<boolean> => {
	return new Promise(resolve => {
		try {
			if (
				navigationRef &&
				typeof navigationRef.isReady === "function" &&
				navigationRef.current &&
				typeof navigationRef.current.isReady === "function" &&
				navigationRef.isReady() &&
				navigationRef.current.isReady()
			) {
				resolve(true)

				return
			}

			const wait = setInterval(() => {
				try {
					if (
						navigationRef &&
						typeof navigationRef.isReady === "function" &&
						navigationRef.current &&
						typeof navigationRef.current.isReady === "function" &&
						navigationRef.isReady() &&
						navigationRef.current.isReady()
					) {
						clearInterval(wait)

						resolve(true)

						return
					}
				} catch (e) {
					clearInterval(wait)

					console.error(e)

					resolve(false)
				}
			}, 100)
		} catch (e) {
			console.error(e)

			resolve(false)
		}
	})
}

export const toExpoFsPath = (path: string) => {
	if (typeof path !== "string" || path.length <= 0) {
		return path
	}

	try {
		path = path.split("file://").join("").split("file:").join("")

		const before = path

		path = encodeURI(path)

		if (before.indexOf("file://") == -1) {
			return "file://" + path
		}

		return path
	} catch {
		return path
	}
}

export const toExpoFsPathWithoutEncode = (path: string) => {
	if (typeof path !== "string" || path.length <= 0) {
		return path
	}

	try {
		path = path.split("file://").join("").split("file:").join("")

		if (path.indexOf("file://") === -1) {
			return "file://" + path
		}

		return path
	} catch {
		return path
	}
}

export const toBlobUtilPath = (path: string) => {
	/*if (typeof path !== "string" || path.length <= 0) {
		return path
	}

	try {
		if (path.indexOf("file://") !== -1) {
			return encodeURI(path.split("file://").join(""))
		}

		if (path.indexOf("file:") !== -1) {
			return encodeURI(path.split("file:").join(""))
		}

		return encodeURI(path)
	} catch {
		return path
	}*/

	if (typeof path !== "string" || path.length <= 0) {
		return path
	}

	try {
		if (path.indexOf("file://") !== -1) {
			return path.split("file://").join("")
		}

		if (path.indexOf("file:") !== -1) {
			return path.split("file:").join("")
		}

		return path
	} catch {
		return path
	}
}

export const toBlobUtilPathWithoutEncode = (path: string) => {
	if (typeof path !== "string" || path.length <= 0) {
		return path
	}

	try {
		if (path.indexOf("file://") !== -1) {
			return path.split("file://").join("")
		}

		if (path.indexOf("file:") !== -1) {
			return path.split("file:").join("")
		}

		return path
	} catch {
		return path
	}
}

export const toBlobUtilPathDecode = (path: string) => {
	try {
		if (path.indexOf("file://") !== -1) {
			return decodeURI(path.split("file://").join(""))
		}

		if (path.indexOf("file:") !== -1) {
			return decodeURI(path.split("file:").join(""))
		}

		return decodeURI(path)
	} catch {
		try {
			if (path.indexOf("file://") !== -1) {
				return path.split("file://").join("")
			}

			if (path.indexOf("file:") !== -1) {
				return path.split("file:").join("")
			}

			return path
		} catch {
			return path
		}
	}
}

export const getAssetId = (asset: MediaLibrary.Asset) => asset.id

export function msToMinutesAndSeconds(ms: number) {
	const minutes = Math.floor(ms / 60000)
	const seconds = parseInt(((ms % 60000) / 1000).toFixed(0))

	return seconds == 60 ? minutes + 1 + ":00" : minutes + ":" + (seconds < 10 ? "0" : "") + seconds
}

export const safeAwait = async <T>(promise: Promise<T>): Promise<[Error | null, T]> => {
	try {
		const result = await promise

		return [null, result]
	} catch (e) {
		return [e as Error, null as any as T]
	}
}

export const normalizeProgress = (progress: number) => {
	// Convert progress number (0-100) to RN SVG progress compatible (0.00 - 1.00)
	if (isNaN(progress)) {
		return 0
	}

	const fixed = parseFloat(progress.toFixed(2))

	if (fixed <= 1) {
		return 0
	}

	if (fixed >= 99) {
		return 1
	}

	const calced = parseFloat((progress / 100).toFixed(2))

	if (isNaN(calced)) {
		return 0
	}

	return calced
}

export const generateAvatarColorCode = (input: string, darkMode: boolean, avatarURL?: string | null): string => {
	if (typeof avatarURL === "string" && avatarURL.length >= 1 && avatarURL.indexOf("https://") !== -1) {
		return "transparent"
	}

	if (typeof input !== "string") {
		input = "default"
	}

	const colorCodes: string[] = [
		getColor(darkMode, "pink"),
		getColor(darkMode, "green"),
		getColor(darkMode, "red"),
		getColor(darkMode, "indigo"),
		getColor(darkMode, "purple"),
		getColor(darkMode, "cyan"),
		getColor(darkMode, "blue"),
		getColor(darkMode, "brown"),
		getColor(darkMode, "mint"),
		getColor(darkMode, "orange"),
		getColor(darkMode, "teal"),
		getColor(darkMode, "yellow")
	]

	const index = Math.abs(hashCode(input)) % colorCodes.length

	if (index < colorCodes.length) {
		return colorCodes[index]
	}

	const hash = hashCode(input)
	const color = intToRGB(hash)

	return color
}

export function hashCode(input: string): number {
	let hash = 0

	if (input.length === 0) {
		return hash
	}

	for (let i = 0; i < input.length; i++) {
		const char = input.charCodeAt(i)
		hash = (hash << 5) - hash + char
		hash = hash & hash
	}

	return hash
}

export function intToRGB(value: number): string {
	const r = (value & 0xff0000) >> 16
	const g = (value & 0x00ff00) >> 8
	const b = value & 0x0000ff

	return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`
}

export function componentToHex(value: number): string {
	const hex = value.toString(16)

	return hex.length === 1 ? "0" + hex : hex
}

export const findClosestIndex = (sourceString: string, targetString: string, givenIndex: number): number => {
	const extractedSubstring = sourceString.slice(0, givenIndex + 1)
	const lastIndexWithinExtracted = extractedSubstring.lastIndexOf(targetString)

	if (lastIndexWithinExtracted !== -1) {
		return lastIndexWithinExtracted
	}

	for (let offset = 1; offset <= givenIndex; offset++) {
		const substringBefore = sourceString.slice(givenIndex - offset, givenIndex + 1)
		const lastIndexBefore = substringBefore.lastIndexOf(targetString)

		if (lastIndexBefore !== -1) {
			return givenIndex - offset + lastIndexBefore
		}
	}

	return -1
}

export const hexToRgb = (hex: string) => {
	const bigint = parseInt(hex, 16)
	const r = (bigint >> 16) & 255
	const g = (bigint >> 8) & 255
	const b = bigint & 255

	return r + "," + g + "," + b
}
