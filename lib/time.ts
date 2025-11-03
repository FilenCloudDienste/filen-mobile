import * as ExpoLocalization from "expo-localization"

let intlLanguage: string = "de-DE"

try {
	intlLanguage =
		ExpoLocalization.getLocales()
			.filter(lang => lang.languageTag)
			.at(0)?.languageTag ?? "de-DE"
} catch (e) {
	console.error(e)
}

/**
 * Fast date formatting functions optimized for Hermes JS engine
 * Replaces slow Intl.DateTimeFormat calls with manual implementations
 * Automatically detects and uses user's locale for formatting
 */

/**
 * Detect user's locale and date formatting preferences
 * This is called once and cached for performance
 */
let cachedLocaleInfo: {
	locale: string
	dateFormat: "MDY" | "DMY" | "YMD"
	dateSeparator: string
	timeSeparator: string
	use24Hour: boolean
} | null = null

function detectLocaleInfo() {
	if (cachedLocaleInfo) {
		return cachedLocaleInfo
	}

	// Get user's locale
	const locale = intlLanguage

	// Determine date format based on locale
	// Most European countries: DD/MM/YYYY or DD.MM.YYYY
	// US, Philippines, some others: MM/DD/YYYY
	// China, Japan, Korea, Iran, etc.: YYYY-MM-DD
	let dateFormat: "MDY" | "DMY" | "YMD" = "MDY"
	let dateSeparator = "/"
	const timeSeparator = ":"
	let use24Hour = true
	const lang = locale.toLowerCase()

	// YMD format (YYYY-MM-DD)
	if (
		lang.startsWith("zh") ||
		lang.startsWith("ja") ||
		lang.startsWith("ko") ||
		lang.startsWith("fa") ||
		lang.startsWith("hu") ||
		lang.startsWith("lt") ||
		lang.startsWith("mn")
	) {
		dateFormat = "YMD"
		dateSeparator = "-"
	}
	// MDY format (MM/DD/YYYY) - US and few others
	else if (lang.startsWith("en-us") || lang.startsWith("en-ph") || lang.startsWith("en-ca")) {
		dateFormat = "MDY"
		dateSeparator = "/"
		use24Hour = false // US typically uses 12-hour format
	}
	// DMY format (DD/MM/YYYY) - Most of the world
	else {
		dateFormat = "DMY"
		// Some locales use dots instead of slashes
		if (
			lang.startsWith("de") ||
			lang.startsWith("da") ||
			lang.startsWith("no") ||
			lang.startsWith("fi") ||
			lang.startsWith("ru") ||
			lang.startsWith("cs") ||
			lang.startsWith("sk") ||
			lang.startsWith("sl")
		) {
			dateSeparator = "."
		} else {
			dateSeparator = "/"
		}
	}

	cachedLocaleInfo = {
		locale,
		dateFormat,
		dateSeparator,
		timeSeparator,
		use24Hour
	}

	return cachedLocaleInfo
}

/**
 * Allow manual override of locale detection
 * Useful for testing or explicit locale setting
 */
export function setLocaleFormat(
	dateFormat: "MDY" | "DMY" | "YMD",
	options?: {
		dateSeparator?: string
		timeSeparator?: string
		use24Hour?: boolean
		locale?: string
	}
) {
	const current = detectLocaleInfo()

	cachedLocaleInfo = {
		locale: options?.locale || current.locale,
		dateFormat,
		dateSeparator: options?.dateSeparator || current.dateSeparator,
		timeSeparator: options?.timeSeparator || current.timeSeparator,
		use24Hour: options?.use24Hour ?? current.use24Hour
	}
}

/**
 * Pads a number with leading zero if needed
 */
export function pad2(num: number): string {
	return num < 10 ? "0" + num : "" + num
}

/**
 * Converts various timestamp formats to Date object
 */
export function toDate(timestamp: number | Date): Date {
	if (timestamp instanceof Date) {
		return timestamp
	}

	// Handle both seconds and milliseconds timestamps
	// If timestamp is less than year 2100 in seconds (4102444800), treat as seconds
	if (timestamp < 4102444800) {
		return new Date(timestamp * 1000)
	}

	return new Date(timestamp)
}

/**
 * Format date according to locale preferences
 */
export function formatDatePart(year: number, month: string, day: string): string {
	const info = detectLocaleInfo()

	switch (info.dateFormat) {
		case "YMD": {
			return `${year}${info.dateSeparator}${month}${info.dateSeparator}${day}`
		}

		case "DMY": {
			return `${day}${info.dateSeparator}${month}${info.dateSeparator}${year}`
		}

		case "MDY":
		default: {
			return `${month}${info.dateSeparator}${day}${info.dateSeparator}${year}`
		}
	}
}

/**
 * Format time according to locale preferences (12h vs 24h)
 */
export function formatTimePart(hours: number, minutes: string, seconds: string): string {
	const info = detectLocaleInfo()

	if (info.use24Hour) {
		return `${pad2(hours)}${info.timeSeparator}${minutes}${info.timeSeparator}${seconds}`
	} else {
		// 12-hour format with AM/PM
		const hours12 = hours % 12 || 12
		const ampm = hours < 12 ? "AM" : "PM"

		return `${pad2(hours12)}${info.timeSeparator}${minutes}${info.timeSeparator}${seconds} ${ampm}`
	}
}

/**
 * Fast replacement for Intl.DateTimeFormat with full date and time
 * Automatically uses user's locale for formatting
 *
 * @param timestamp - Unix timestamp (seconds or milliseconds) or Date object
 * @returns Formatted string according to user's locale
 *
 * @example
 * // US locale: "01/15/2025, 02:30:45 PM"
 * // EU locale: "15/01/2025, 14:30:45"
 * // Asian locale: "2025-01-15, 14:30:45"
 */
export function simpleDate(timestamp: number | Date): string {
	const date = toDate(timestamp)
	const year = date.getFullYear()
	const month = pad2(date.getMonth() + 1)
	const day = pad2(date.getDate())
	const hours = date.getHours()
	const minutes = pad2(date.getMinutes())
	const seconds = pad2(date.getSeconds())
	const datePart = formatDatePart(year, month, day)
	const timePart = formatTimePart(hours, minutes, seconds)

	return `${datePart}, ${timePart}`
}

/**
 * Fast replacement for Intl.DateTimeFormat with date only (no time)
 * Automatically uses user's locale for formatting
 *
 * @param timestamp - Unix timestamp (seconds or milliseconds) or Date object
 * @returns Formatted string according to user's locale
 *
 * @example
 * // US locale: "01/15/2025"
 * // EU locale: "15/01/2025"
 * // Asian locale: "2025-01-15"
 */
export function simpleDateNoTime(timestamp: number | Date): string {
	const date = toDate(timestamp)
	const year = date.getFullYear()
	const month = pad2(date.getMonth() + 1)
	const day = pad2(date.getDate())

	return formatDatePart(year, month, day)
}

/**
 * Fast replacement for Intl.DateTimeFormat with time only (no date)
 * Automatically uses user's locale for 12h/24h format
 *
 * @param timestamp - Unix timestamp (seconds or milliseconds) or Date object
 * @returns Formatted string according to user's locale
 *
 * @example
 * // US locale: "02:30:45 PM"
 * // EU locale: "14:30:45"
 */
export function simpleDateNoDate(timestamp: number | Date): string {
	const date = toDate(timestamp)
	const hours = date.getHours()
	const minutes = pad2(date.getMinutes())
	const seconds = pad2(date.getSeconds())

	return formatTimePart(hours, minutes, seconds)
}
