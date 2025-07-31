import {
	UNCACHED_QUERY_KEYS,
	EXPO_IMAGE_SUPPORTED_EXTENSIONS,
	EXPO_VIDEO_SUPPORTED_EXTENSIONS,
	EXPO_AUDIO_SUPPORTED_EXTENSIONS
} from "./constants"
import memoize from "lodash/memoize"
import { type PreviewType } from "@/stores/gallery.store"
import { Paths } from "expo-file-system/next"
import { t } from "@/lib/i18n"
import { validate as validateUUID } from "uuid"
import { Buffer } from "buffer"
import { getRandomValues } from "expo-crypto"
import mimeTypes from "mime-types"
import { type Note } from "@filen/sdk/dist/types/api/v3/notes"

export function serializeError(error: Error): SerializedError {
	return {
		name: error.name,
		message: error.message,
		stack: error.stack,
		stringified: JSON.stringify(error)
	}
}

export function deserializeError(serializedError: SerializedError): Error {
	const error = new Error(serializedError.message)

	error.name = serializedError.name
	error.stack = serializedError.stack

	return error
}

export function convertTimestampToMs(timestamp: number): number {
	const now = Date.now()

	if (Math.abs(now - timestamp) < Math.abs(now - timestamp * 1000)) {
		return timestamp
	}

	return Math.floor(timestamp * 1000)
}

export const simpleDateFormatter = new Intl.DateTimeFormat((typeof navigator !== "undefined" && navigator.language) || "de-DE", {
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
	hour: "2-digit",
	minute: "2-digit",
	second: "2-digit"
})

export function simpleDate(timestamp: number | Date): string {
	const date = timestamp instanceof Date ? timestamp : new Date(convertTimestampToMs(timestamp))

	return simpleDateFormatter.format(date)
}

export const simpleDateNoTimeFormatter = new Intl.DateTimeFormat((typeof navigator !== "undefined" && navigator.language) || "de-DE", {
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
	hour: undefined,
	minute: undefined,
	second: undefined
})

export function simpleDateNoTime(timestamp: number | Date): string {
	const date = timestamp instanceof Date ? timestamp : new Date(convertTimestampToMs(timestamp))

	return simpleDateNoTimeFormatter.format(date)
}

export const simpleDateNoDateFormatter = new Intl.DateTimeFormat((typeof navigator !== "undefined" && navigator.language) || "de-DE", {
	year: undefined,
	month: undefined,
	day: undefined,
	hour: "2-digit",
	minute: "2-digit",
	second: "2-digit"
})

export function simpleDateNoDate(timestamp: number | Date): string {
	const date = timestamp instanceof Date ? timestamp : new Date(convertTimestampToMs(timestamp))

	return simpleDateNoDateFormatter.format(date)
}

export const formatBytesSizes = [
	t("formatBytes.b"),
	t("formatBytes.kib"),
	t("formatBytes.mib"),
	t("formatBytes.gib"),
	t("formatBytes.tib"),
	t("formatBytes.pib"),
	t("formatBytes.eib"),
	t("formatBytes.zib"),
	t("formatBytes.yib")
]

export function formatBytes(bytes: number, decimals: number = 2): string {
	if (bytes === 0) {
		return "0 Bytes"
	}

	const k = 1024
	const dm = decimals < 0 ? 0 : decimals
	const i = Math.floor(Math.log(bytes) / Math.log(k))

	return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + formatBytesSizes[i]
}

export function parseNumbersFromString(string: string): number {
	if (!string || !/\d/.test(string)) {
		return 0
	}

	if (string.length < 10) {
		return parseInt(string.replace(/\D/g, "")) || 0
	}

	let result = ""
	const maxDigits = 16

	for (let i = 0; i < string.length && result.length < maxDigits; i++) {
		const char = string[i]

		if (char && char >= "0" && char <= "9") {
			result += char
		}
	}

	return parseInt(result) || 0
}

export type OrderByType =
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
	| "creationAsc"
	| "creationDesc"

export const orderItemsByTypeCompareItemTypes = (a: DriveCloudItem, b: DriveCloudItem): number => {
	if (a.type !== b.type) {
		return a.type === "directory" ? -1 : 1
	}

	return 0
}

export const orderItemsByTypeCompareFunctions = {
	name: (a: DriveCloudItem, b: DriveCloudItem, isAscending: boolean = true): number => {
		const typeComparison = orderItemsByTypeCompareItemTypes(a, b)

		if (typeComparison !== 0) {
			return typeComparison
		}

		return isAscending
			? a.name.toLowerCase().localeCompare(b.name.toLowerCase(), "en", {
					numeric: true
				})
			: b.name.toLowerCase().localeCompare(a.name.toLowerCase(), "en", {
					numeric: true
				})
	},
	size: (a: DriveCloudItem, b: DriveCloudItem, isAscending: boolean = true): number => {
		const typeComparison = orderItemsByTypeCompareItemTypes(a, b)

		if (typeComparison !== 0) {
			return typeComparison
		}

		return isAscending ? a.size - b.size : b.size - a.size
	},
	date: (a: DriveCloudItem, b: DriveCloudItem, isAscending: boolean = true): number => {
		const typeComparison = orderItemsByTypeCompareItemTypes(a, b)

		if (typeComparison !== 0) {
			return typeComparison
		}

		if (a.timestamp === b.timestamp) {
			const aUuid = parseNumbersFromString(a.uuid)
			const bUuid = parseNumbersFromString(b.uuid)

			return isAscending ? aUuid - bUuid : bUuid - aUuid
		}

		return isAscending ? a.timestamp - b.timestamp : b.timestamp - a.timestamp
	},
	lastModified: (a: DriveCloudItem, b: DriveCloudItem, isAscending: boolean = true): number => {
		const typeComparison = orderItemsByTypeCompareItemTypes(a, b)

		if (typeComparison !== 0) {
			return typeComparison
		}

		if (a.lastModified === b.lastModified) {
			const aUuid = parseNumbersFromString(a.uuid)
			const bUuid = parseNumbersFromString(b.uuid)

			return isAscending ? aUuid - bUuid : bUuid - aUuid
		}

		return isAscending ? a.lastModified - b.lastModified : b.lastModified - a.lastModified
	},
	creation: (a: DriveCloudItem, b: DriveCloudItem, isAscending: boolean = true): number => {
		const typeComparison = orderItemsByTypeCompareItemTypes(a, b)

		if (typeComparison !== 0) {
			return typeComparison
		}

		const aTime = a.type === "file" ? (a.creation ?? a.lastModified ?? a.timestamp) : (a.lastModified ?? a.timestamp)
		const bTime = b.type === "file" ? (b.creation ?? b.lastModified ?? b.timestamp) : (b.lastModified ?? b.timestamp)

		if (aTime === bTime) {
			const aUuid = parseNumbersFromString(a.uuid)
			const bUuid = parseNumbersFromString(b.uuid)

			return isAscending ? aUuid - bUuid : bUuid - aUuid
		}

		return isAscending ? aTime - bTime : bTime - aTime
	}
}

export const orderItemsByTypeSortMap: Record<string, (a: DriveCloudItem, b: DriveCloudItem) => number> = {
	nameAsc: (a, b) => orderItemsByTypeCompareFunctions.name(a, b, true),
	nameDesc: (a, b) => orderItemsByTypeCompareFunctions.name(a, b, false),
	sizeAsc: (a, b) => orderItemsByTypeCompareFunctions.size(a, b, true),
	sizeDesc: (a, b) => orderItemsByTypeCompareFunctions.size(a, b, false),
	dateAsc: (a, b) => orderItemsByTypeCompareFunctions.date(a, b, true),
	dateDesc: (a, b) => orderItemsByTypeCompareFunctions.date(a, b, false),
	typeAsc: (a, b) => orderItemsByTypeCompareFunctions.name(a, b, true),
	typeDesc: (a, b) => orderItemsByTypeCompareFunctions.name(a, b, false),
	lastModifiedAsc: (a, b) => orderItemsByTypeCompareFunctions.lastModified(a, b, true),
	uploadDateAsc: (a, b) => orderItemsByTypeCompareFunctions.date(a, b, true),
	uploadDateDesc: (a, b) => orderItemsByTypeCompareFunctions.date(a, b, false),
	lastModifiedDesc: (a, b) => orderItemsByTypeCompareFunctions.lastModified(a, b, false),
	creationAsc: (a, b) => orderItemsByTypeCompareFunctions.creation(a, b, true),
	creationDesc: (a, b) => orderItemsByTypeCompareFunctions.creation(a, b, false)
}

export function orderItemsByType({ items, type }: { items: DriveCloudItem[]; type: OrderByType }): DriveCloudItem[] {
	const compareFunction = orderItemsByTypeSortMap[type] ?? orderItemsByTypeSortMap["nameAsc"]

	return [...items].sort(compareFunction)
}

export const shouldPersistQuery = memoize(
	(queryKey: unknown[]) => {
		const shouldNotPersist = queryKey.some(queryKey => typeof queryKey === "string" && UNCACHED_QUERY_KEYS.includes(queryKey))

		return !shouldNotPersist
	},
	queryKey => queryKey.join(":")
)

export function normalizeTransferProgress(size: number, bytes: number): number {
	const result = parseInt(((bytes / size) * 100).toFixed(0))

	if (isNaN(result)) {
		return 0
	}

	return result >= 100 ? 100 : result <= 0 ? 0 : result
}

export const bpsToReadableUnits = [
	t("bpsToReadable.kib"),
	t("bpsToReadable.mib"),
	t("bpsToReadable.gib"),
	t("bpsToReadable.tib"),
	t("bpsToReadable.pib"),
	t("bpsToReadable.eib"),
	t("bpsToReadable.zib"),
	t("bpsToReadable.yib")
]

export function bpsToReadable(bps: number): string {
	if (!(bps > 0 && bps < 1024 * 1024 * 1024 * 1024)) {
		bps = 1
	}

	let i = -1

	do {
		bps = bps / 1024
		i++
	} while (bps > 1024)

	return Math.max(bps, 0.1).toFixed(1) + " " + bpsToReadableUnits[i]
}

export function getPreviewType(name: string): PreviewType {
	const extname = Paths.extname(name.trim().toLowerCase())

	if (EXPO_IMAGE_SUPPORTED_EXTENSIONS.includes(extname)) {
		return "image"
	}

	if (EXPO_VIDEO_SUPPORTED_EXTENSIONS.includes(extname)) {
		return "video"
	}

	if (EXPO_AUDIO_SUPPORTED_EXTENSIONS.includes(extname)) {
		return "audio"
	}

	switch (extname) {
		case ".pdf": {
			return "pdf"
		}

		case ".txt": {
			return "text"
		}

		case ".js":
		case ".cjs":
		case ".mjs":
		case ".jsx":
		case ".tsx":
		case ".ts":
		case ".md":
		case ".cpp":
		case ".c":
		case ".php":
		case ".htm":
		case ".html5":
		case ".html":
		case ".css":
		case ".css3":
		case ".coffee":
		case ".litcoffee":
		case ".sass":
		case ".xml":
		case ".json":
		case ".sql":
		case ".java":
		case ".kt":
		case ".swift":
		case ".py3":
		case ".py":
		case ".cmake":
		case ".cs":
		case ".dart":
		case ".dockerfile":
		case ".go":
		case ".less":
		case ".yaml":
		case ".vue":
		case ".svelte":
		case ".vbs":
		case ".cobol":
		case ".toml":
		case ".conf":
		case ".sh":
		case ".rs":
		case ".rb":
		case ".ps1":
		case ".bat":
		case ".ps":
		case ".protobuf":
		case ".proto": {
			return "code"
		}

		case ".docx": {
			return "docx"
		}

		default: {
			return "unknown"
		}
	}
}

export function getPreviewTypeFromMime(mimeType: string): PreviewType {
	const normalizedMimeType = mimeType.toLowerCase().trim()
	const extname = mimeTypes.extension(normalizedMimeType)

	if (!extname) {
		return "unknown"
	}

	return getPreviewType(`file.${extname}`)
}

export function isValidHexColor(value: string, length: number = 6): boolean {
	const hexColorPattern = length >= 6 ? /^#([0-9A-Fa-f]{6})$/ : /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/

	return hexColorPattern.test(value)
}

export function normalizeFilePath(filePath: string): string {
	const normalizedPath = filePath.trim().replace(/^file:\/+/, "/")

	return normalizedPath.startsWith("/") ? normalizedPath : "/" + normalizedPath
}

export function normalizeFilePathForNode(filePath: string): string {
	return normalizeFilePath(filePath)
}

export function normalizeFilePathForExpo(filePath: string): string {
	return `file://${normalizeFilePath(filePath)}`
}

/**
 * Chunk large Promise.all executions.
 * @date 2/14/2024 - 11:59:34 PM
 *
 * @export
 * @async
 * @template T
 * @param {Promise<T>[]} promises
 * @param {number} [chunkSize=10000]
 * @returns {Promise<T[]>}
 */
export async function promiseAllChunked<T>(promises: Promise<T>[], chunkSize = 10000): Promise<T[]> {
	const results: T[] = []

	for (let i = 0; i < promises.length; i += chunkSize) {
		const chunkResults = await Promise.all(promises.slice(i, i + chunkSize))

		results.push(...chunkResults)
	}

	return results
}

/**
 * Chunk large Promise.allSettled executions.
 * @date 3/5/2024 - 12:41:08 PM
 *
 * @export
 * @async
 * @template T
 * @param {Promise<T>[]} promises
 * @param {number} [chunkSize=10000]
 * @returns {Promise<T[]>}
 */
export async function promiseAllSettledChunked<T>(promises: Promise<T>[], chunkSize = 10000): Promise<T[]> {
	const results: T[] = []

	for (let i = 0; i < promises.length; i += chunkSize) {
		const chunkPromisesSettled = await Promise.allSettled(promises.slice(i, i + chunkSize))
		const chunkResults = chunkPromisesSettled.reduce((acc: T[], current) => {
			if (current.status === "fulfilled") {
				acc.push(current.value)
			} else {
				// Handle rejected promises or do something with the error (current.reason)
			}

			return acc
		}, [])

		results.push(...chunkResults)
	}

	return results
}

export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
	const chunks: T[][] = []

	for (let i = 0; i < array.length; i += chunkSize) {
		chunks.push(array.slice(i, i + chunkSize))
	}

	return chunks
}

export function sanitizeFileName(filename: string, replacement: string = "_"): string {
	const illegalCharsWindows = /[<>:"/\\|?*]/g
	const illegalCharsUnix = /\//g
	const reservedNamesWindows: Set<string> = new Set([
		"CON",
		"PRN",
		"AUX",
		"NUL",
		"COM1",
		"COM2",
		"COM3",
		"COM4",
		"COM5",
		"COM6",
		"COM7",
		"COM8",
		"COM9",
		"LPT1",
		"LPT2",
		"LPT3",
		"LPT4",
		"LPT5",
		"LPT6",
		"LPT7",
		"LPT8",
		"LPT9"
	])

	let sanitizedFilename = filename.replace(illegalCharsWindows, replacement)

	sanitizedFilename = sanitizedFilename.replace(illegalCharsUnix, replacement)
	sanitizedFilename = sanitizedFilename.replace(/[. ]+$/, "")
	sanitizedFilename = sanitizedFilename.split(" ").join(replacement)

	if (reservedNamesWindows.has(sanitizedFilename.toUpperCase())) {
		sanitizedFilename += replacement
	}

	const maxLength = 255

	if (sanitizedFilename.length > maxLength) {
		sanitizedFilename = sanitizedFilename.substring(0, maxLength)
	}

	if (!sanitizedFilename) {
		return "file"
	}

	return sanitizedFilename
}

export function contactName(email?: string, nickName?: string): string {
	if (typeof nickName === "string" && nickName.length > 0) {
		return nickName
	}

	return email ?? ""
}

export function isTimestampSameDay(timestamp1: number, timestamp2: number): boolean {
	const date1 = new Date(timestamp1)
	const date2 = new Date(timestamp2)

	return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth() && date1.getDate() === date2.getDate()
}

export function isTimestampSameMinute(timestamp1: number, timestamp2: number): boolean {
	const date1 = new Date(timestamp1)
	const date2 = new Date(timestamp2)
	const date1Year = date1.getFullYear()
	const date1Month = date1.getMonth()
	const date1Date = date1.getDate()
	const date1Minutes = date1.getMinutes()
	const date2Year = date2.getFullYear()
	const date2Month = date2.getMonth()
	const date2Date = date2.getDate()
	const date2Minutes = date2.getMinutes()
	const date1Hours = date1.getHours()
	const date2Hours = date2.getHours()

	return (
		date1Year === date2Year &&
		date1Month === date2Month &&
		date1Date === date2Date &&
		date1Hours === date2Hours &&
		(date1Minutes === date2Minutes ||
			date1Minutes - 1 === date2Minutes ||
			date1Minutes === date2Minutes - 1 ||
			date1Minutes + 1 === date2Minutes ||
			date1Minutes === date2Minutes + 1 ||
			date1Minutes - 2 === date2Minutes ||
			date1Minutes === date2Minutes - 2 ||
			date1Minutes + 2 === date2Minutes ||
			date1Minutes === date2Minutes + 2)
	)
}

export function formatMessageDate(timestamp: number): string {
	const now = Date.now()
	const nowDate = new Date()
	const thenDate = new Date(timestamp)
	const diff = now - timestamp
	const seconds = Math.floor(diff / 1000)
	const nowDay = nowDate.getDate()
	const thenDay = thenDate.getDate()

	if (seconds <= 0) {
		return t("chats.messages.time.now")
	}

	if (seconds < 60) {
		return t(seconds <= 1 ? "chats.messages.time.secondAgo" : "chats.messages.time.secondsAgo", {
			seconds
		})
	}

	if (seconds < 3600) {
		const minutes = Math.floor(seconds / 60)

		return t(minutes <= 1 ? "chats.messages.time.minuteAgo" : "chats.messages.time.minutesAgo", {
			minutes
		})
	}

	if (seconds < 3600 * 4) {
		const hours = Math.floor(seconds / 3600)

		return t(hours <= 1 ? "chats.messages.time.hourAgo" : "chats.messages.time.hoursAgo", {
			hours
		})
	}

	if (nowDay === thenDay) {
		const date = new Date(timestamp)

		return t("chats.messages.time.todayAt", {
			date: simpleDateNoDate(date)
		})
	}

	if (nowDay - 1 === thenDay) {
		const date = new Date(timestamp)

		return t("chats.messages.time.yesterdayAt", {
			date: simpleDateNoDate(date)
		})
	}

	return simpleDate(timestamp)
}

export function findClosestIndexString(sourceString: string, targetString: string, givenIndex: number): number {
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

export function extractLinksFromString(text: string): string[] {
	if (!text) {
		return []
	}

	const urlRegex: RegExp = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,64}\b(?:[-a-zA-Z0-9()@:%_+.~#?&//=]*)/gi
	const matches: IterableIterator<RegExpMatchArray> = text.matchAll(urlRegex)
	const results: string[] = []

	for (const match of matches) {
		if (match[0]) {
			results.push(match[0])
		}
	}

	return results
}

export type MessageLinkType = "youtubeEmbed" | "filenEmbed" | "fetch"

export function getMessageLinkType(link: string): MessageLinkType {
	if (
		link.startsWith("https://") &&
		(link.includes("/youtube.com/watch") ||
			link.includes("/youtube.com/embed") ||
			link.includes("/www.youtube.com/watch") ||
			link.includes("/www.youtube.com/embed") ||
			link.includes("/youtu.be/") ||
			link.includes("/www.youtu.be/"))
	) {
		return "youtubeEmbed"
	} else if (
		link.startsWith("https://") &&
		(link.includes("/localhost:") ||
			link.includes("/filen.io/") ||
			link.includes("/app.filen.io/") ||
			link.includes("/app.filen.dev/") ||
			link.includes("/staging-app.filen.io/") ||
			link.includes("/staging-app.filen.dev/") ||
			link.includes("/staging.filen.io/") ||
			link.includes("/staging.filen.dev/") ||
			link.includes("/www.filen.io/")) &&
		(link.includes("/d/") || link.includes("/f/"))
	) {
		return "filenEmbed"
	}

	return "fetch"
}

export function parseYouTubeVideoId(url: string): string | null {
	const regExp = /(?:\?v=|\/embed\/|\/watch\?v=|\/\w+\/\w+\/|youtu.be\/)([\w-]{11})/
	const match = url.match(regExp)

	if (match && match.length === 2 && match[1]) {
		return match[1]
	}

	return null
}

export function parseFilenPublicLink(url: string): { uuid: string; key: string; type: "file" | "directory" } | null {
	if (!url || url.length === 0) {
		return null
	}

	const filenRegex: RegExp =
		/https?:\/\/(?:app|drive)\.filen\.io\/#\/([df])\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:%23|#)([A-Za-z0-9]{32,})/
	const match = filenRegex.exec(url)

	if (!match || match.length < 4 || !match[1] || !match[2] || !match[3]) {
		return null
	}

	const pathType: string = match[1]
	const uuid: string = match[2]
	let key: string = match[3]

	if (/^[0-9A-Fa-f]{64}$/.test(key)) {
		try {
			key = Buffer.from(key, "hex").toString("utf8")
		} catch {
			return null
		}
	}

	if (Buffer.from(key).length !== 32 || !validateUUID(uuid) || (pathType !== "d" && pathType !== "f")) {
		return null
	}

	return {
		uuid,
		key,
		type: pathType === "d" ? "file" : "directory"
	}
}

export function parseXStatusId(url: string): string {
	const ex = url.split("/")
	const part = ex[ex.length - 1]

	if (!part) {
		return ""
	}

	return part.trim()
}

export function formatSecondsToHHMM(seconds: number): string {
	if (isNaN(seconds) || seconds < 0) {
		return "00:00"
	}

	const hours: number = Math.floor(seconds / 3600)
	const minutes: number = Math.floor((seconds % 3600) / 60)
	const formattedHours: string = hours.toString().padStart(2, "0")
	const formattedMinutes: string = minutes.toString().padStart(2, "0")

	return `${formattedHours}:${formattedMinutes}`
}

export function formatSecondsToMMSS(seconds: number): string {
	if (isNaN(seconds) || seconds < 0) {
		return "00:00"
	}

	const minutes: number = Math.floor(seconds / 60)
	const remainingSeconds: number = Math.floor(seconds % 60)
	const formattedMinutes: string = minutes.toString().padStart(2, "0")
	const formattedSeconds: string = remainingSeconds.toString().padStart(2, "0")

	return `${formattedMinutes}:${formattedSeconds}`
}

export function shuffleArray<T>(array: T[]): T[] {
	if (array.length <= 1) {
		return [...array]
	}

	const shuffled = [...array]

	const getRandomValue = (): number => {
		const randomArray = new Uint32Array(1)

		getRandomValues(randomArray)

		if (!randomArray[0]) {
			return 0
		}

		return randomArray[0] / (0xffffffff + 1)
	}

	for (let i = shuffled.length - 1; i > 0; i--) {
		const randomIndex = Math.floor(getRandomValue() * (i + 1))
		const temp = shuffled[i]

		if (!shuffled[randomIndex] || !temp) {
			continue
		}

		shuffled[i] = shuffled[randomIndex]
		shuffled[randomIndex] = temp
	}

	return shuffled
}

export async function readStreamToBuffer(stream: ReadableStream<Uint8Array>, maxBytes: number = Infinity): Promise<Buffer> {
	const reader = stream.getReader()
	const chunks: Uint8Array[] = []
	let totalBytes = 0

	try {
		while (true) {
			const { done, value } = await reader.read()

			if (done) {
				break
			}

			if (value) {
				if (totalBytes + value.length > maxBytes) {
					const remainingBytes = maxBytes - totalBytes
					const truncatedChunk = value.slice(0, remainingBytes)

					chunks.push(truncatedChunk)

					totalBytes += truncatedChunk.length

					break
				}

				chunks.push(value)

				totalBytes += value.length
			}
		}
	} finally {
		reader.releaseLock()

		await stream.cancel().catch(() => {})
	}

	const result = Buffer.from(new Uint8Array(totalBytes))
	let offset = 0

	for (const chunk of chunks) {
		result.set(chunk, offset)

		offset += chunk.length
	}

	return result
}

export function ratePasswordStrength(password: string): {
	strength: "weak" | "normal" | "strong" | "best"
	uppercase: boolean
	lowercase: boolean
	specialChars: boolean
	length: boolean
} {
	const hasUppercase = /[A-Z]/.test(password)
	const hasLowercase = /[a-z]/.test(password)
	const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password)
	const length = password.length

	let strength: "weak" | "normal" | "strong" | "best" = "weak"

	if (length >= 10 && hasUppercase && hasLowercase && hasSpecialChars) {
		if (length >= 16) {
			strength = "best"
		} else {
			strength = "strong"
		}
	} else if (length >= 10 && ((hasUppercase && hasLowercase) || (hasUppercase && hasSpecialChars) || (hasLowercase && hasSpecialChars))) {
		strength = "normal"
	}

	return {
		strength,
		uppercase: hasUppercase,
		lowercase: hasLowercase,
		specialChars: hasSpecialChars,
		length: length >= 10
	}
}

export function sortAndFilterNotes({ notes, searchTerm, selectedTag }: { notes: Note[]; searchTerm: string; selectedTag: string }): Note[] {
	const lowercaseSearchTerm = (searchTerm ?? "").toLowerCase().trim()
	const filteredBySearchTerm =
		lowercaseSearchTerm.length > 0
			? notes.filter(
					note =>
						note.title.toLowerCase().trim().includes(lowercaseSearchTerm) ||
						note.preview.toLowerCase().trim().includes(lowercaseSearchTerm) ||
						note.type.toLowerCase().trim().includes(lowercaseSearchTerm) ||
						note.tags.some(tag => tag.name.toLowerCase().trim().includes(lowercaseSearchTerm))
				)
			: notes

	const selectedTagIsUUID = validateUUID(selectedTag)

	const filteredByTag =
		selectedTag !== "all" && selectedTag !== undefined && selectedTag !== null
			? filteredBySearchTerm.filter(note => {
					if (selectedTagIsUUID) {
						return note.tags.some(tag => tag.uuid === selectedTag)
					}

					if (selectedTag === "favorited") {
						return note.favorite
					}

					if (selectedTag === "pinned") {
						return note.pinned
					}

					if (selectedTag === "trash") {
						return note.trash
					}

					if (selectedTag === "archived") {
						return note.archive
					}

					if (selectedTag === "shared") {
						return note.isOwner && note.participants.length > 1
					}

					return true
				})
			: filteredBySearchTerm

	return filteredByTag.sort((a, b) => {
		if (a.pinned !== b.pinned) {
			return b.pinned ? 1 : -1
		}

		if (a.trash !== b.trash && a.archive === false) {
			return a.trash ? 1 : -1
		}

		if (a.archive !== b.archive) {
			return a.archive ? 1 : -1
		}

		if (a.trash !== b.trash) {
			return a.trash ? 1 : -1
		}

		return b.editedTimestamp - a.editedTimestamp
	})
}
