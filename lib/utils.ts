import { TURBO_IMAGE_SUPPORTED_EXTENSIONS, EXPO_VIDEO_SUPPORTED_EXTENSIONS, EXPO_AUDIO_SUPPORTED_EXTENSIONS } from "./constants"
import type { PreviewType } from "@/stores/gallery.store"
import pathModule from "path"
import { t, translateMemoized } from "@/lib/i18n"
import { validate as validateUUID } from "uuid"
import { Buffer } from "buffer"
import { getRandomValues } from "expo-crypto"
import mimeTypes from "mime-types"
import type { Note } from "@filen/sdk/dist/types/api/v3/notes"
import * as ExpoLocalization from "expo-localization"
import events from "./events"

let intlLanguage: string = "de-DE"

try {
	intlLanguage =
		ExpoLocalization.getLocales()
			.filter(lang => lang.languageTag)
			.at(0)?.languageTag ?? "de-DE"
} catch (e) {
	console.error(e)
}

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
	error.message = serializedError.message

	return error
}

export function convertTimestampToMs(timestamp: number): number {
	// Optimized: avoid two Math.abs calls
	// Timestamps in seconds are < 10^10, in ms are > 10^12
	// Simple threshold check is much faster
	if (timestamp < 10000000000) {
		// Less than year 2286 in seconds
		return timestamp * 1000
	}

	return timestamp
}

export const simpleDateFormatter = new Intl.DateTimeFormat(intlLanguage, {
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
	hour: "2-digit",
	minute: "2-digit",
	second: "2-digit"
})

export function simpleDate(timestamp: number | Date): string {
	if (typeof timestamp === "number") {
		return simpleDateFormatter.format(convertTimestampToMs(timestamp))
	}

	return simpleDateFormatter.format(timestamp)
}

export const simpleDateNoTimeFormatter = new Intl.DateTimeFormat(intlLanguage, {
	year: "numeric",
	month: "2-digit",
	day: "2-digit"
})

export function simpleDateNoTime(timestamp: number | Date): string {
	if (typeof timestamp === "number") {
		return simpleDateNoTimeFormatter.format(convertTimestampToMs(timestamp))
	}

	return simpleDateNoTimeFormatter.format(timestamp)
}

export const simpleDateNoDateFormatter = new Intl.DateTimeFormat(intlLanguage, {
	hour: "2-digit",
	minute: "2-digit",
	second: "2-digit"
})

export function simpleDateNoDate(timestamp: number | Date): string {
	if (typeof timestamp === "number") {
		return simpleDateNoDateFormatter.format(convertTimestampToMs(timestamp))
	}

	return simpleDateNoDateFormatter.format(timestamp)
}

export const formatBytesSizes = [
	translateMemoized("formatBytes.b"),
	translateMemoized("formatBytes.kib"),
	translateMemoized("formatBytes.mib"),
	translateMemoized("formatBytes.gib"),
	translateMemoized("formatBytes.tib"),
	translateMemoized("formatBytes.pib"),
	translateMemoized("formatBytes.eib"),
	translateMemoized("formatBytes.zib"),
	translateMemoized("formatBytes.yib")
]

export const POWERS_1024 = [1, 1024, 1048576, 1073741824, 1099511627776, 1125899906842624] as const

export function formatBytes(bytes: number, decimals: number = 2): string {
	if (bytes === 0) {
		return "0 Bytes"
	}

	const dm = decimals < 0 ? 0 : decimals
	let i = 0

	if (bytes >= POWERS_1024[5]) {
		i = 5
	} else if (bytes >= POWERS_1024[4]) {
		i = 4
	} else if (bytes >= POWERS_1024[3]) {
		i = 3
	} else if (bytes >= POWERS_1024[2]) {
		i = 2
	} else if (bytes >= POWERS_1024[1]) {
		i = 1
	}

	const value = bytes / POWERS_1024[i]!
	const multiplier = Math.pow(10, dm)
	const rounded = Math.round(value * multiplier) / multiplier

	return rounded + " " + formatBytesSizes[i]
}

export function parseNumbersFromString(string: string): number {
	if (!string) {
		return 0
	}

	const len = string.length

	if (len < 10) {
		let result = 0
		let hasDigit = false

		for (let i = 0; i < len; i++) {
			const code = string.charCodeAt(i)

			if (code >= 48 && code <= 57) {
				result = result * 10 + (code - 48)
				hasDigit = true
			}
		}

		return hasDigit ? result : 0
	}

	let result = 0
	let digitCount = 0
	const maxDigits = 16

	for (let i = 0; i < len && digitCount < maxDigits; i++) {
		const code = string.charCodeAt(i)

		if (code >= 48 && code <= 57) {
			result = result * 10 + (code - 48)

			digitCount++
		}
	}

	return result
}

export function normalizeTransferProgress(size: number, bytes: number): number {
	if (size <= 0 || bytes <= 0) {
		return 0
	}

	if (bytes >= size) {
		return 100
	}

	const result = ((bytes / size) * 100) | 0

	return result
}

export const bpsToReadableUnits = [
	translateMemoized("bpsToReadable.kib"),
	translateMemoized("bpsToReadable.mib"),
	translateMemoized("bpsToReadable.gib"),
	translateMemoized("bpsToReadable.tib"),
	translateMemoized("bpsToReadable.pib"),
	translateMemoized("bpsToReadable.eib"),
	translateMemoized("bpsToReadable.zib"),
	translateMemoized("bpsToReadable.yib")
]

export function bpsToReadable(bps: number): string {
	if (!(bps > 0 && bps < 1099511627776)) {
		return "0.1 B/s"
	}

	let i = 0
	let value = bps

	if (value >= 1024) {
		value /= 1024
		i = 1

		if (value >= 1024) {
			value /= 1024
			i = 2

			if (value >= 1024) {
				value /= 1024
				i = 3

				if (value >= 1024) {
					value /= 1024
					i = 4
				}
			}
		}
	}

	if (value < 0.1) {
		value = 0.1
	}

	return value.toFixed(1) + " " + bpsToReadableUnits[i]
}

export function getPreviewType(name: string): PreviewType {
	const extname = pathModule.posix.extname(name.trim().toLowerCase())

	if (TURBO_IMAGE_SUPPORTED_EXTENSIONS.includes(extname)) {
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
		case ".ini":
		case ".log":
		case ".makefile":
		case ".mk":
		case ".gradle":
		case ".lua":
		case ".h":
		case ".hpp":
		case ".rs":
		case ".sh":
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
	if (value.length !== (length >= 6 ? 7 : 4) && value.length !== 7) {
		return false
	}

	if (value.charCodeAt(0) !== 35) {
		return false
	}

	const len = value.length

	for (let i = 1; i < len; i++) {
		const code = value.charCodeAt(i)

		if (!((code >= 48 && code <= 57) || (code >= 65 && code <= 70) || (code >= 97 && code <= 102))) {
			return false
		}
	}

	return true
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

export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
	const chunks: T[][] = []

	for (let i = 0; i < array.length; i += chunkSize) {
		chunks.push(array.slice(i, i + chunkSize))
	}

	return chunks
}

export function sanitizeFileName(filename: string, replacement: string = "_"): string {
	// Normalize to UTF-8 NFC form (canonical decomposition followed by canonical composition)
	let sanitizedFilename = filename.normalize("NFC")

	// Remove or replace problematic Unicode characters
	// Remove zero-width characters and other invisible/control characters
	// eslint-disable-next-line no-control-regex
	sanitizedFilename = sanitizedFilename.replace(/[\u200B-\u200D\uFEFF\u00AD\u0000-\u001F\u007F-\u009F]/g, "")

	// Replace non-ASCII characters that might cause issues
	// eslint-disable-next-line no-control-regex
	sanitizedFilename = sanitizedFilename.replace(/[^\x00-\x7F]/g, replacement)

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

	sanitizedFilename = sanitizedFilename.replace(illegalCharsWindows, replacement)
	sanitizedFilename = sanitizedFilename.replace(illegalCharsUnix, replacement)
	sanitizedFilename = sanitizedFilename.replace(/[. ]+$/, "")
	sanitizedFilename = sanitizedFilename.replace(/\s+/g, replacement)

	if (reservedNamesWindows.has(sanitizedFilename.toUpperCase())) {
		sanitizedFilename += replacement
	}

	// Calculate byte length for UTF-8 to respect filesystem limits
	const maxByteLength = 255
	let byteLength = new TextEncoder().encode(sanitizedFilename).length

	while (byteLength > maxByteLength && sanitizedFilename.length > 0) {
		sanitizedFilename = sanitizedFilename.slice(0, -1)
		byteLength = new TextEncoder().encode(sanitizedFilename).length
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
	const diff = timestamp1 - timestamp2

	if (diff >= -86400000 && diff <= 86400000) {
		const day1 = Math.floor(timestamp1 / 86400000)
		const day2 = Math.floor(timestamp2 / 86400000)

		if (day1 === day2) {
			return true
		}
	}

	const date1 = new Date(timestamp1)
	const date2 = new Date(timestamp2)

	return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth() && date1.getDate() === date2.getDate()
}

export function isTimestampSameMinute(timestamp1: number, timestamp2: number): boolean {
	const diff = Math.abs(timestamp1 - timestamp2)

	if (diff > 120000) {
		return false
	}

	const date1 = new Date(timestamp1)
	const date2 = new Date(timestamp2)

	if (
		date1.getFullYear() !== date2.getFullYear() ||
		date1.getMonth() !== date2.getMonth() ||
		date1.getDate() !== date2.getDate() ||
		date1.getHours() !== date2.getHours()
	) {
		return false
	}

	const minuteDiff = Math.abs(date1.getMinutes() - date2.getMinutes())

	return minuteDiff <= 2
}

export function formatMessageDate(timestamp: number): string {
	const now = Date.now()
	const diff = now - timestamp

	if (diff <= 0) {
		return translateMemoized("chats.messages.time.now")
	}

	const seconds = (diff / 1000) | 0

	if (seconds < 60) {
		return t(seconds <= 1 ? "chats.messages.time.secondAgo" : "chats.messages.time.secondsAgo", {
			seconds
		})
	}

	if (seconds < 3600) {
		const minutes = (seconds / 60) | 0
		return t(minutes <= 1 ? "chats.messages.time.minuteAgo" : "chats.messages.time.minutesAgo", {
			minutes
		})
	}

	if (seconds < 14400) {
		const hours = (seconds / 3600) | 0
		return t(hours <= 1 ? "chats.messages.time.hourAgo" : "chats.messages.time.hoursAgo", {
			hours
		})
	}

	const nowDate = new Date(now)
	const thenDate = new Date(timestamp)
	const nowDay = nowDate.getDate()
	const thenDay = thenDate.getDate()

	if (nowDay === thenDay) {
		return t("chats.messages.time.todayAt", {
			date: simpleDateNoDate(thenDate)
		})
	}

	if (nowDay - 1 === thenDay) {
		return t("chats.messages.time.yesterdayAt", {
			date: simpleDateNoDate(thenDate)
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
	if (seconds < 0 || seconds !== seconds) {
		return "00:00"
	}

	const hours = (seconds / 3600) | 0
	const minutes = ((seconds % 3600) / 60) | 0
	const h1 = (hours / 10) | 0
	const h2 = hours % 10
	const m1 = (minutes / 10) | 0
	const m2 = minutes % 10

	return String(h1) + h2 + ":" + m1 + m2
}

export function formatSecondsToMMSS(seconds: number): string {
	if (seconds < 0 || seconds !== seconds) {
		return "00:00"
	}

	const minutes = (seconds / 60) | 0
	const remainingSeconds = seconds % 60 | 0
	const m1 = (minutes / 10) | 0
	const m2 = minutes % 10
	const s1 = (remainingSeconds / 10) | 0
	const s2 = remainingSeconds % 10

	return String(m1) + m2 + ":" + s1 + s2
}

export function shuffleArray<T>(array: T[]): T[] {
	const len = array.length

	if (len <= 1) {
		return [...array]
	}

	const shuffled = [...array]
	const randomCount = len - 1
	const randomArray = new Uint32Array(randomCount)

	getRandomValues(randomArray)

	const MAX_UINT32_PLUS_ONE = 4294967296

	for (let i = len - 1; i > 0; i--) {
		const randomValue = randomArray[len - 1 - i]

		if (!randomValue) {
			continue
		}

		const randomIndex = ((randomValue / MAX_UINT32_PLUS_ONE) * (i + 1)) | 0
		const temp = shuffled[i]
		const rand = shuffled[randomIndex]

		if (!temp || !rand) {
			continue
		}

		shuffled[i] = rand
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
	const hasSearchTerm = lowercaseSearchTerm.length > 0
	const selectedTagIsUUID = selectedTag !== "all" && selectedTag !== undefined && selectedTag !== null ? validateUUID(selectedTag) : false
	const hasTagFilter = selectedTag !== "all" && selectedTag !== undefined && selectedTag !== null
	const filtered: Note[] = []
	const notesLen = notes.length

	for (let i = 0; i < notesLen; i++) {
		const note = notes[i]

		if (!note) {
			continue
		}

		if (hasSearchTerm) {
			let matchesSearch = false

			if (note.title.toLowerCase().includes(lowercaseSearchTerm)) {
				matchesSearch = true
			} else if (note.preview.toLowerCase().includes(lowercaseSearchTerm)) {
				matchesSearch = true
			} else if (note.type.toLowerCase().includes(lowercaseSearchTerm)) {
				matchesSearch = true
			} else {
				const tagsLen = note.tags.length

				for (let j = 0; j < tagsLen; j++) {
					const tag = note.tags[j]

					if (!tag) {
						continue
					}

					if (tag.name.toLowerCase().includes(lowercaseSearchTerm)) {
						matchesSearch = true
						break
					}
				}
			}

			if (!matchesSearch) {
				continue
			}
		}

		if (hasTagFilter) {
			let matchesTag = false

			if (selectedTagIsUUID) {
				const tagsLen = note.tags.length

				for (let j = 0; j < tagsLen; j++) {
					const tag = note.tags[j]

					if (!tag) {
						continue
					}

					if (tag.uuid === selectedTag) {
						matchesTag = true
						break
					}
				}
			} else if (selectedTag === "favorited") {
				matchesTag = note.favorite
			} else if (selectedTag === "pinned") {
				matchesTag = note.pinned
			} else if (selectedTag === "trash") {
				matchesTag = note.trash
			} else if (selectedTag === "archived") {
				matchesTag = note.archive
			} else if (selectedTag === "shared") {
				matchesTag = note.isOwner && note.participants.length > 1
			} else {
				matchesTag = true
			}

			if (!matchesTag) {
				continue
			}
		}

		filtered.push(note)
	}

	return filtered.sort((a, b) => {
		if (a.pinned !== b.pinned) {
			return a.pinned ? -1 : 1
		}

		if (a.trash !== b.trash && !a.archive) {
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

export function getTimeRemaining(endTimestamp: number): {
	total: number
	days: number
	hours: number
	minutes: number
	seconds: number
} {
	const total = endTimestamp - Date.now()
	const totalSeconds = (total / 1000) | 0
	const days = (totalSeconds / 86400) | 0
	const hours = ((totalSeconds % 86400) / 3600) | 0
	const minutes = ((totalSeconds % 3600) / 60) | 0
	const seconds = totalSeconds % 60

	return {
		total,
		days,
		hours,
		minutes,
		seconds
	}
}

export function sortParams<T extends Record<string, unknown>>(params: T): T {
	const keys = Object.keys(params)
	const len = keys.length

	keys.sort()

	const result = {} as T

	for (let i = 0; i < len; i++) {
		const key = keys[i] as keyof T

		result[key] = params[key]
	}

	return result
}

export async function hideSearchBarWithDelay(clearText: boolean): Promise<void> {
	const promise = new Promise<void>(resolve => {
		const sub = events.subscribe("searchBarHidden", () => {
			sub.remove()

			resolve()
		})
	})

	events.emit("hideSearchBar", {
		clearText
	})

	await promise
}

export function jsonBigIntReplacer(_: string, value: unknown) {
	if (typeof value === "bigint") {
		return `$bigint:${value.toString()}n`
	}

	return value
}

export function jsonBigIntReviver(_: string, value: unknown) {
	if (typeof value === "string" && value.startsWith("$bigint:") && value.endsWith("n")) {
		return BigInt(value.substring(8, -1))
	}

	return value
}

export function createExecutableTimeout(callback: () => void, delay?: number) {
	const timeoutId = globalThis.window.setTimeout(callback, delay)

	return {
		id: timeoutId,
		execute: () => {
			globalThis.window.clearTimeout(timeoutId)

			callback()
		},
		cancel: () => globalThis.window.clearTimeout(timeoutId)
	}
}
