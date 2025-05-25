import { type FilenSDKConfig } from "@filen/sdk"

export const AUTHED_VERSION: number = 1
export const SDK_CONFIG_VERSION: number = 1
export const MMKV_VERSION: number = 1

export const AUTHED_STORAGE_KEY: string = `authed:${AUTHED_VERSION}:${SDK_CONFIG_VERSION}`
export const SDK_CONFIG_STORAGE_KEY: string = `sdkConfig:${AUTHED_VERSION}:${SDK_CONFIG_VERSION}`

export const ANONYMOUS_SDK_CONFIG: Required<FilenSDKConfig> = {
	email: "anonymous",
	password: "anonymous",
	masterKeys: ["anonymous"],
	connectToSocket: false,
	metadataCache: true,
	twoFactorCode: "anonymous",
	publicKey: "anonymous",
	privateKey: "anonymous",
	apiKey: "anonymous",
	authVersion: 3,
	baseFolderUUID: "anonymous",
	userId: 1,
	tmpPath: "/tmp"
} satisfies Required<FilenSDKConfig>

export const UNCACHED_QUERY_KEYS: string[] = [
	"useIsHTTPServerOnlineQuery",
	"useTextEditorItemContentQuery",
	"useItemToPathQuery",
	"useItemPublicLinkStatusQuery",
	"useFileBufferQuery",
	"useFileBase64Query"
]

export const WEB_APP_BASE_URL: string = "https://app.filen.io"
export const FILE_PUBLIC_LINK_BASE_URL: string = `${WEB_APP_BASE_URL}/#/d/`
export const DIRECTORY_PUBLIC_LINK_BASE_URL: string = `${WEB_APP_BASE_URL}/#/f/`

export const BACKGROUND_TASK_IDENTIFIER: string = "background-task"
export const CAMERA_UPLOAD_INTERVAL: number = 60 * 1000

export const SILENT_1H_AUDIO_FILE: string = "silent_1h.mp3"
