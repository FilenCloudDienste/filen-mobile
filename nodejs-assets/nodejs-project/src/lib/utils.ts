import net from "net"

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

export function normalizeTransferProgress(size: number, bytes: number): number {
	const result = parseInt(((bytes / size) * 100).toFixed(0))

	if (isNaN(result)) {
		return 0
	}

	return result
}

export async function sleep(ms: number = 1000): Promise<void> {
	await new Promise<void>(resolve => setTimeout(resolve, ms))
}

export function calcSpeed(now: number, started: number, bytes: number): number {
	now = Date.now() - 1000

	const secondsDiff = (now - started) / 1000
	const bps = Math.floor((bytes / secondsDiff) * 1)

	return bps > 0 ? bps : 0
}

export function calcTimeLeft(loadedBytes: number, totalBytes: number, started: number): number {
	const elapsed = Date.now() - started
	const speed = loadedBytes / (elapsed / 1000)
	const remaining = (totalBytes - loadedBytes) / speed

	return remaining > 0 ? remaining : 0
}

export function getTimeRemaining(endTimestamp: number): {
	total: number
	days: number
	hours: number
	minutes: number
	seconds: number
} {
	const total = endTimestamp - Date.now()
	const seconds = Math.floor((total / 1000) % 60)
	const minutes = Math.floor((total / 1000 / 60) % 60)
	const hours = Math.floor((total / (1000 * 60 * 60)) % 24)
	const days = Math.floor(total / (1000 * 60 * 60 * 24))

	return {
		total,
		days,
		hours,
		minutes,
		seconds
	}
}

/**
 * Parse the requested byte range from the header.
 *
 * @export
 * @param {string} range
 * @param {number} totalLength
 * @returns {({ start: number; end: number } | null)}
 */
export function parseByteRange(range: string, totalLength: number): { start: number; end: number } | null {
	const [unit, rangeValue] = range.split("=")

	if (unit !== "bytes" || !rangeValue) {
		return null
	}

	const [startStr, endStr] = rangeValue.split("-")

	if (!startStr) {
		return null
	}

	const start = parseInt(startStr, 10)
	const end = endStr ? parseInt(endStr, 10) : totalLength - 1

	if (isNaN(start) || isNaN(end) || start < 0 || end >= totalLength || start > end) {
		return null
	}

	return {
		start,
		end
	}
}

export async function isPortFree(port: number): Promise<boolean> {
	return new Promise(resolve => {
		const server = net.createServer()

		server.once("error", () => {
			resolve(false)
		})

		server.once("listening", () => {
			server.close(err => {
				resolve(err ? false : true)
			})
		})

		server.listen(port, "127.0.0.1")
	})
}

export async function findFreePort(ports: number[]): Promise<number | null> {
	for (const port of ports) {
		const isFree = await isPortFree(port)

		if (isFree) {
			return port
		}
	}

	return null
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
