import { Buffer } from "buffer"
import process from "process"
import { btoa, atob } from "react-native-quick-base64"
import BlobPolyfill from "./blob"
import RNQuickCrypto from "react-native-quick-crypto"
import { URL, URLSearchParams } from "react-native-url-polyfill"
// @ts-expect-error Polyfills
import { TextDecoder, TextEncoder } from "text-encoding"
import { Readable } from "stream"
import { Packr } from "msgpackr"
import "web-streams-polyfill/polyfill"

// @ts-expect-error For the TS SDK
global.IS_EXPO_REACT_NATIVE = true
// @ts-expect-error For the TS SDK
globalThis.IS_EXPO_REACT_NATIVE = true

// @ts-expect-error For the TS SDK
global.IS_REACT_NATIVE = true
// @ts-expect-error For the TS SDK
globalThis.IS_REACT_NATIVE = true

global.Buffer = Buffer
globalThis.Buffer = Buffer
global.process = process
globalThis.process = process

global.atob = atob
global.btoa = btoa
globalThis.atob = atob
globalThis.btoa = btoa

global.Blob = BlobPolyfill
globalThis.Blob = BlobPolyfill

// @ts-expect-error Polyfills
global.URL = URL
// @ts-expect-error Polyfills
global.URL = URL
// @ts-expect-error Polyfills
globalThis.URLSearchParams = URLSearchParams
// @ts-expect-error Polyfills
globalThis.URLSearchParams = URLSearchParams

global.TextDecoder = TextDecoder
globalThis.TextDecoder = TextDecoder
global.TextEncoder = TextEncoder
globalThis.TextEncoder = TextEncoder

if (typeof EventTarget === "undefined") {
	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		require("event-target-polyfill")
	} catch {
		// Noop
	}
}

if (!global.structuredClone) {
	try {
		const packr = new Packr({
			structuredClone: true
		})

		global.structuredClone = val => packr.unpack(packr.pack(val))
	} catch {
		// Noop
	}
}

// @ts-expect-error Polyfills
global.location = {
	protocol: "http:",
	href: "http://localhost",
	hash: "",
	host: "",
	hostname: "localhost",
	pathname: "/",
	port: "80",
	search: "",
	origin: ""
}

// @ts-expect-error Polyfills
globalThis.location = {
	protocol: "http:",
	href: "http://localhost",
	hash: "",
	host: "",
	hostname: "localhost",
	pathname: "/",
	port: "80",
	search: "",
	origin: ""
}

global.navigator.userAgent =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
globalThis.navigator.userAgent =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"

global.crypto = {
	...global.crypto,
	// @ts-expect-error Polyfills
	getRandomValues: RNQuickCrypto.getRandomValues,
	// @ts-expect-error Polyfills
	randomUUID: RNQuickCrypto.randomUUID,
	randomBytes: RNQuickCrypto.randomBytes
}

globalThis.crypto = {
	...global.crypto,
	// @ts-expect-error Polyfills
	getRandomValues: RNQuickCrypto.getRandomValues,
	// @ts-expect-error Polyfills
	randomUUID: RNQuickCrypto.randomUUID,
	randomBytes: RNQuickCrypto.randomBytes
}

// @ts-expect-error We need to manually polyfill this, stream-browserify doesn't do it for us
Readable.fromWeb = function <T = Uint8Array>(webStream: ReadableStream<T>): Readable {
	if (!(webStream instanceof ReadableStream)) {
		throw new TypeError("Expected a ReadableStream")
	}

	const reader: ReadableStreamDefaultReader<T> = webStream.getReader()
	let reading: boolean = false

	return new Readable({
		async read(): Promise<void> {
			if (reading) {
				return
			}

			reading = true

			try {
				const result: ReadableStreamReadResult<T> = await reader.read()

				reading = false

				if (result.done) {
					this.push(null)
				} else {
					// Handle different types of data
					if (result.value instanceof Uint8Array) {
						this.push(Buffer.from(result.value))
					} else if (typeof result.value === "string") {
						this.push(Buffer.from(result.value, "utf8"))
					} else {
						// For other types, try to convert to string then buffer
						this.push(Buffer.from(String(result.value), "utf8"))
					}
				}
			} catch (error: unknown) {
				reading = false

				this.destroy(error instanceof Error ? error : new Error(String(error)))
			}
		},
		destroy(error: Error | null, callback: (error?: Error | null) => void): void {
			reader
				.cancel()
				.then(() => callback(error))
				.catch((cancelError: unknown) => {
					callback(error || (cancelError instanceof Error ? cancelError : new Error(String(cancelError))))
				})
		}
	})
}
