import { ExpoConfig, ConfigContext } from "expo/config"
import "ts-node/register"

export default ({ config }: ConfigContext): ExpoConfig => ({
	...config,
	name: "Filen",
	slug: "filen-mobile",
	version: "3.0.0",
	orientation: "portrait",
	icon: "./assets/images/icon.png",
	scheme: "iofilenapp",
	userInterfaceStyle: "automatic",
	newArchEnabled: true,
	jsEngine: "hermes",
	ios: {
		buildNumber: "3001",
		supportsTablet: true,
		bundleIdentifier: "io.filen.app",
		requireFullScreen: true,
		usesIcloudStorage: true,
		entitlements: {
			"com.apple.security.application-groups": ["group.io.filen.app"]
		},
		config: {
			usesNonExemptEncryption: false
		},
		infoPlist: {
			UIBackgroundModes: ["audio", "fetch", "processing"],
			NSAppTransportSecurity: {
				NSAllowsLocalNetworking: true
			}
		},
		icon: {
			dark: "./assets/images/ios-dark.png",
			light: "./assets/images/ios-light.png",
			tinted: "./assets/images/ios-tinted.png"
		}
	},
	android: {
		versionCode: 3001,
		edgeToEdgeEnabled: true,
		adaptiveIcon: {
			foregroundImage: "./assets/images/adaptive-icon.png",
			backgroundColor: "#ffffff"
		},
		package: "io.filen.app"
	},
	web: {
		bundler: "metro",
		output: "static",
		favicon: "./assets/images/favicon.png"
	},
	plugins: [
		"expo-router",
		"react-native-bottom-tabs",
		[
			"expo-build-properties",
			{
				android: {
					compileSdkVersion: 35,
					targetSdkVersion: 35,
					minSdkVersion: 31,
					enableProguardInReleaseBuilds: true,
					enableShrinkResourcesInReleaseBuilds: true,
					enableBundleCompression: false,
					extraProguardRules: `
# Proguard rules for Filen
# Ignore missing AWT classes
-dontwarn java.awt.**

# Keep JNA classes
-keep class com.sun.jna.** { *; }
-keepnames class com.sun.jna.** { *; }

# Keep ALL UniFFI generated classes completely unobfuscated
-keep class uniffi.filen_mobile_native_cache.** { *; }
-keepclassmembers class uniffi.filen_mobile_native_cache.** { *; }
-keepnames class uniffi.filen_mobile_native_cache.** { *; }

# Keep your other generated classes
-keep class filen_mobile_native_cache.** { *; }
-keepclassmembers class filen_mobile_native_cache.** { *; }
-keepnames class filen_mobile_native_cache.** { *; }

# Keep Structure classes
-keep class * extends com.sun.jna.Structure { *; }
-keepclassmembers class * extends com.sun.jna.Structure { *; }
-keepnames class * extends com.sun.jna.Structure { *; }
`
				},
				ios: {
					deploymentTarget: "16.0",
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
				microphonePermission: "Allow $(PRODUCT_NAME) to access your microphone."
			}
		],
		[
			"expo-media-library",
			{
				photosPermission: "Allow $(PRODUCT_NAME) to access your photos.",
				savePhotosPermission: "Allow $(PRODUCT_NAME) to save photos.",
				isAccessMediaLocationEnabled: true
			}
		],
		[
			"expo-video",
			{
				supportsBackgroundPlayback: true,
				supportsPictureInPicture: true
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
				photosPermission: "Allow $(PRODUCT_NAME) to access your photos.",
				cameraPermission: "Allow $(PRODUCT_NAME) to access your camera.",
				microphonePermission: "Allow $(PRODUCT_NAME) to access your microphone."
			}
		],
		[
			"expo-local-authentication",
			{
				faceIDPermission: "Allow $(PRODUCT_NAME) to use Face ID."
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
		"@config-plugins/react-native-pdf",
		"./plugins/withAndroidNetworkSecurityConfig",
		"./plugins/withAndroidLargeHeapAndHardwareAcceleration",
		[
			"./plugins/withAndroidArchitectures",
			{
				architectures: "armeabi-v7a,arm64-v8a,x86_64"
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
				iosAppGroupIdentifier: "group.io.filen.app"
			}
		],
		[
			"expo-asset",
			{
				assets: ["./assets/images/avatar_fallback.png", "./assets/audio/silent_1h.mp3", "./assets/images/audio_fallback.png"]
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
				repoUrl: "https://github.com/FilenCloudDienste/filen-rs.git",
				targetPath: "rust",
				crateName: "filen-mobile-native-cache",
				libName: "filen_mobile_native_cache",
				targets: ["aarch64-apple-ios", "aarch64-apple-ios-sim"]
			}
		],
		[
			"./plugins/withAndroidRustBuild.ts",
			{
				repoUrl: "https://github.com/FilenCloudDienste/filen-rs.git",
				targetPath: "rust",
				crateName: "filen-mobile-native-cache",
				libName: "filen_mobile_native_cache",
				targets: ["x86_64", "arm64-v8a"]
			}
		]
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
