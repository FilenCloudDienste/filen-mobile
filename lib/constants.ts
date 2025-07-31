import { type FilenSDKConfig } from "@filen/sdk"
import { Platform } from "react-native"
import { type Stack } from "expo-router"

export const SCREEN_OPTIONS = {
	base: {
		headerShown: false,
		headerBlurEffect: "systemChromeMaterial"
	},
	modal: {
		headerShown: false,
		headerBlurEffect: "systemChromeMaterial",
		presentation: "modal",
		animation: "slide_from_bottom"
	},
	fullscreenModal: {
		headerShown: false,
		headerBlurEffect: "systemChromeMaterial",
		presentation: "fullScreenModal",
		animation: "slide_from_bottom"
	}
} satisfies Record<string, NonNullable<React.ComponentPropsWithoutRef<typeof Stack.Screen>["options"]>>

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
	"useFileBase64Query"
]

export const WEB_APP_BASE_URL: string = "https://app.filen.io"
export const WEB_APP_ACCOUNT_SETTINGS_URL: string = `${WEB_APP_BASE_URL}/#/settings/account`
export const FILE_PUBLIC_LINK_BASE_URL: string = `${WEB_APP_BASE_URL}/#/d/`
export const DIRECTORY_PUBLIC_LINK_BASE_URL: string = `${WEB_APP_BASE_URL}/#/f/`

export const BACKGROUND_TASK_IDENTIFIER: string = "background-task"
export const CAMERA_UPLOAD_INTERVAL: number = 60 * 1000

export const SILENT_1H_AUDIO_FILE: string = "silent_1h.mp3"

export const EXPO_IMAGE_MANIPULATOR_SUPPORTED_EXTENSIONS = Platform.select({
	ios: [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".heic", ".heif", ".webp"],
	android: [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".heic", ".heif"],
	default: [".jpg", ".jpeg", ".png", ".gif", ".bmp"]
}) as string[]

export const EXPO_VIDEO_SUPPORTED_EXTENSIONS = Platform.select({
	ios: [".mp4", ".mov", ".m4v", ".3gp"],
	android: [".mp4", ".webm", ".3gp", ".mkv"],
	default: [".mp4", ".mov", ".3gp"]
}) as string[]

export const EXPO_AUDIO_SUPPORTED_EXTENSIONS = Platform.select({
	ios: [".mp3", ".m4a", ".aac", ".wav", ".aiff", ".caf", ".flac", ".alac"],
	android: [".mp3", ".m4a", ".aac", ".wav", ".ogg", ".3gp", ".flac"],
	default: [".mp3", ".m4a", ".aac", ".wav"]
}) as string[]

export const EXPO_VIDEO_THUMBNAILS_SUPPORTED_EXTENSIONS = Platform.select({
	ios: [".mp4", ".mov", ".m4v", ".3gp"],
	android: [".mp4", ".webm", ".3gp", ".mkv"],
	default: [".mp4", ".mov", ".3gp"]
}) as string[]

export const EXPO_IMAGE_SUPPORTED_EXTENSIONS = Platform.select({
	ios: [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".heic", ".heif", ".webp", ".svg"],
	android: [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg", ".heic", ".heif"],
	default: [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg"]
}) as string[]

export const REACT_NATIVE_AUDIO_PRO_SUPPORTED_EXTENSIONS = Platform.select({
	ios: [".mp3", ".m4a", ".aac", ".wav", ".aiff", ".caf", ".flac", ".alac"],
	android: [".mp3", ".m4a", ".aac", ".wav", ".ogg", ".3gp", ".flac"],
	default: [".mp3", ".m4a", ".aac", ".wav"]
}) as string[]

export const CONTACTS_ONLINE_TIMEOUT: number = 300000
