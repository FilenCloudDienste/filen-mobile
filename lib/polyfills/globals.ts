import { Buffer } from "buffer"
import process from "process"
import { btoa, atob } from "react-native-quick-base64"
import BlobPolyfill from "./blob"

// @ts-expect-error For the TS SDK
global.IS_EXPO_REACT_NATIVE = true
// @ts-expect-error For the TS SDK
globalThis.IS_EXPO_REACT_NATIVE = true

global.Buffer = Buffer
globalThis.Buffer = Buffer
global.process = process
globalThis.process = process

// @ts-expect-error Polyfills
global.location = {
	protocol: "file:",
	href: "",
	hash: "",
	host: "",
	hostname: "",
	pathname: "",
	port: "",
	search: "",
	origin: ""
}

// @ts-expect-error Polyfills
globalThis.location = {
	protocol: "file:",
	href: "",
	hash: "",
	host: "",
	hostname: "",
	pathname: "",
	port: "",
	search: "",
	origin: ""
}

global.navigator.userAgent =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
globalThis.navigator.userAgent =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"

global.atob = atob
global.btoa = btoa
globalThis.atob = atob
globalThis.btoa = btoa

global.Blob = BlobPolyfill
globalThis.Blob = BlobPolyfill
