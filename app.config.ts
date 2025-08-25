import "ts-node/register"
import { type ExpoConfig, type ConfigContext } from "expo/config"

export const VERSION: string = "3.0.13"

export const APPLE_TEAM_ID: string = "7YTW5D2K7P"
export const IOS_APP_GROUP_ID: string = "group.io.filen.app"
export const JS_ENGINE: "hermes" | "jsc" = "hermes"
export const NEW_ARCH_ENABLED: boolean = true
export const ANDROID_MIN_SDK_VERSION: number = 31
export const ANDROID_TARGET_SDK_VERSION: number = 35
export const ANDROID_COMPILE_SDK_VERSION: number = 35
export const ANDROID_BUILD_TOOLS_VERSION: string = "35.0.0"
export const IOS_DEPLOYMENT_TARGET: string = "16.0"
export const NAME: string = "Filen"
export const IDENTIFIER: string = "io.filen.app"

export function semverToNumber(version: string): number {
	const parts = version.replace(/^v/, "").split(".").map(Number)

	while (parts.length < 3) {
		parts.push(0)
	}

	const [major, minor, patch] = parts

	if (
		typeof major !== "number" ||
		typeof minor !== "number" ||
		typeof patch !== "number" ||
		parts.some(part => isNaN(part) || part < 0 || part > 999)
	) {
		throw new Error(`Invalid semver format: ${version}`)
	}

	return major * 1000000 + minor * 1000 + patch
}

export const BUILD_NUMBER: number = semverToNumber(VERSION)

export default ({ config }: ConfigContext): ExpoConfig => ({
	...config,
	name: NAME,
	slug: "filen-mobile",
	version: VERSION,
	orientation: "default",
	icon: "./assets/images/icon.png",
	scheme: "iofilenapp",
	userInterfaceStyle: "automatic",
	newArchEnabled: NEW_ARCH_ENABLED,
	jsEngine: JS_ENGINE,
	platforms: ["ios", "android"],
	githubUrl: "https://github.com/FilenCloudDienste/filen-mobile",
	ios: {
		buildNumber: BUILD_NUMBER.toString(),
		version: VERSION,
		supportsTablet: true,
		bundleIdentifier: IDENTIFIER,
		requireFullScreen: true,
		usesIcloudStorage: true,
		newArchEnabled: NEW_ARCH_ENABLED,
		jsEngine: JS_ENGINE,
		appleTeamId: APPLE_TEAM_ID,
		entitlements: {
			"com.apple.security.application-groups": [IOS_APP_GROUP_ID]
		},
		config: {
			usesNonExemptEncryption: false
		},
		infoPlist: {
			UIBackgroundModes: ["audio", "fetch", "processing"],
			NSAppTransportSecurity: {
				NSAllowsLocalNetworking: true,
				NSAllowsArbitraryLoads: false
			},
			LSApplicationCategoryType: "public.app-category.productivity",
			CFBundleDisplayName: NAME,
			UIRequiredDeviceCapabilities: ["arm64"]
		},
		icon: {
			dark: "./assets/images/ios-dark.png",
			light: "./assets/images/ios-light.png",
			tinted: "./assets/images/ios-tinted.png"
		},
		privacyManifests: {
			NSPrivacyTracking: false
		}
	},
	android: {
		version: VERSION,
		versionCode: BUILD_NUMBER,
		edgeToEdgeEnabled: true,
		newArchEnabled: NEW_ARCH_ENABLED,
		jsEngine: JS_ENGINE,
		allowBackup: false,
		adaptiveIcon: {
			foregroundImage: "./assets/images/adaptive-icon.png",
			backgroundColor: "#ffffff"
		},
		package: IDENTIFIER,
		permissions: [
			"INTERNET",
			"ACCESS_NETWORK_STATE",
			"ACCESS_WIFI_STATE",
			"READ_EXTERNAL_STORAGE",
			"WRITE_EXTERNAL_STORAGE",
			"CAMERA",
			"RECORD_AUDIO",
			"READ_MEDIA_IMAGES",
			"READ_MEDIA_VIDEO",
			"READ_MEDIA_AUDIO",
			"ACCESS_MEDIA_LOCATION",
			"WAKE_LOCK",
			"RECEIVE_BOOT_COMPLETED",
			"VIBRATE",
			"POST_NOTIFICATIONS",
			"FOREGROUND_SERVICE",
			"USE_FINGERPRINT",
			"USE_BIOMETRIC",
			"SYSTEM_ALERT_WINDOW",
			"ACTION_OPEN_DOCUMENT",
			"ACTION_OPEN_DOCUMENT_TREE"
		]
	},
	plugins: [
		"expo-router",
		"react-native-bottom-tabs",
		[
			"expo-build-properties",
			{
				android: {
					compileSdkVersion: ANDROID_COMPILE_SDK_VERSION,
					targetSdkVersion: ANDROID_TARGET_SDK_VERSION,
					minSdkVersion: ANDROID_MIN_SDK_VERSION,
					buildToolsVersion: ANDROID_BUILD_TOOLS_VERSION,
					enableProguardInReleaseBuilds: false,
					enableShrinkResourcesInReleaseBuilds: false,
					enableBundleCompression: false,
					useLegacyPackaging: false,
					enablePngCrunchInReleaseBuilds: false,
					packagingOptions: {
						pickFirst: ["**/libcrypto.so"]
					}
				},
				ios: {
					deploymentTarget: IOS_DEPLOYMENT_TARGET,
					useFrameworks: "static"
				}
			}
		],
		"expo-localization",
		[
			"expo-screen-orientation",
			{
				initialOrientation: "DEFAULT"
			}
		],
		[
			"expo-audio",
			{
				microphonePermission: "Please allow access to your microphone so that Filen can capture audio when recording videos."
			}
		],
		[
			"expo-media-library",
			{
				photosPermission: "Please allow access to your camera so that Filen can upload photos you take inside the app.",
				savePhotosPermission: "Please allow access to your photo library so that Filen can save photos on your device.",
				isAccessMediaLocationEnabled: true
			}
		],
		[
			"expo-document-picker",
			{
				iCloudContainerEnvironment: "Production"
			}
		],
		[
			"expo-image-picker",
			{
				photosPermission: "Please allow access to your photos so that Filen can back them up automatically.",
				cameraPermission: "Please allow access to your camera so that Filen can take photos.",
				microphonePermission: "Please allow access to your microphone so that Filen can capture audio when recording videos."
			}
		],
		[
			"expo-local-authentication",
			{
				faceIDPermission: "Please allow Filen to use FaceID or TouchID to lock itself."
			}
		],
		[
			"expo-sqlite",
			{
				enableFTS: true,
				useSQLCipher: true
			}
		],
		"expo-background-task",
		"@config-plugins/react-native-blob-util",
		"./plugins/withAndroidNetworkSecurityConfig",
		"./plugins/withAndroidLargeHeapAndHardwareAcceleration",
		[
			"./plugins/withAndroidArchitectures",
			{
				architectures: "arm64-v8a,x86_64"
			}
		],
		[
			"expo-share-intent",
			{
				iosActivationRules: {
					NSExtensionActivationSupportsWebURLWithMaxCount: 0,
					NSExtensionActivationSupportsWebPageWithMaxCount: 0,
					NSExtensionActivationSupportsImageWithMaxCount: 10000,
					NSExtensionActivationSupportsMovieWithMaxCount: 10000,
					NSExtensionActivationSupportsFileWithMaxCount: 10000,
					NSExtensionActivationSupportsText: false
				},
				androidIntentFilters: ["*/*"],
				androidMultiIntentFilters: ["*/*"],
				iosShareExtensionName: "FilenShareIntentExtension",
				iosAppGroupIdentifier: IOS_APP_GROUP_ID,
				developmentTeamId: APPLE_TEAM_ID
			}
		],
		"expo-font",
		[
			"expo-splash-screen",
			{
				backgroundColor: "#FFFFFF",
				image: "./assets/images/splash-icon.png",
				dark: {
					image: "./assets/images/splash-icon-dark.png",
					backgroundColor: "#000000"
				},
				imageWidth: 128
			}
		],
		[
			"./plugins/withFileProvider.ts",
			{
				crateName: "filen-mobile-native-cache",
				libName: "filen_mobile_native_cache",
				targets: ["aarch64-apple-ios", "aarch64-apple-ios-sim"],
				developmentTeamId: APPLE_TEAM_ID,
				iosAppGroupIdentifier: IOS_APP_GROUP_ID
			}
		],
		[
			"./plugins/withAndroidRustBuild.ts",
			{
				crateName: "filen-mobile-native-cache",
				libName: "filen_mobile_native_cache",
				targets: ["x86_64", "arm64-v8a"]
			}
		],
		"./plugins/withAndroidSigning",
		"./plugins/withGradleMemory",
		"react-native-video"
	],
	experiments: {
		typedRoutes: true,
		reactCompiler: true
	},
	extra: {
		eas: {
			projectId: "fbb9c3db-70ea-4b27-99c3-fbef432ceb2d"
		},
		router: {
			origin: false
		}
	}
})
