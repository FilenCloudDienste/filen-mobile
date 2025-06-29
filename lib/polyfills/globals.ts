import { Buffer } from "buffer"
import process from "process"
import { btoa, atob } from "react-native-quick-base64"
import BlobPolyfill from "./blob"
import RNQuickCrypto from "react-native-quick-crypto"
import { URL, URLSearchParams } from "react-native-url-polyfill"
// @ts-expect-error Polyfills
import { TextDecoder, TextEncoder } from "text-encoding"

import "web-streams-polyfill/polyfill"

if (!__DEV__) {
	globalThis.console = {
		...globalThis.console,
		log: () => {},
		info: () => {},
		warn: () => {},
		error: () => {},
		debug: () => {},
		trace: () => {},
		group: () => {},
		groupCollapsed: () => {},
		groupEnd: () => {},
		time: () => {},
		timeEnd: () => {},
		timeLog: () => {},
		assert: () => {},
		clear: () => {},
		count: () => {},
		countReset: () => {},
		table: () => {},
		dir: () => {},
		dirxml: () => {},
		profile: () => {},
		profileEnd: () => {},
		timeStamp: () => {}
	}
}

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
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		global.structuredClone = require("realistic-structured-clone")
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
