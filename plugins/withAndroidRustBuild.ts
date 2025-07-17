import { ConfigPlugin, ExportedConfigWithProps } from "@expo/config-plugins"
import { ManifestIntentFilter } from "@expo/config-plugins/build/android/Manifest.js"
import { withAndroidManifest, withAppBuildGradle } from "@expo/config-plugins/build/plugins/android-plugins"
import { withDangerousMod } from "@expo/config-plugins/build/plugins/withDangerousMod"
import { execSync } from "child_process"
import * as fs from "fs"
import * as path from "path"

function getDocumentsProviderFilePath(platformProjectRoot: string, fileName: string): string {
	return path.join(platformProjectRoot, "filen-android-documents-provider", "app", "src", "main", "java", "io", "filen", "app", fileName)
}

export type ManifestProvider = {
	$: {
		"android:name": string
		"android:authorities": string
		"android:exported": boolean
		"android:grantUriPermissions": boolean
		"android:permission": string
	}
	"intent-filter": ManifestIntentFilter[]
}

export type AndroidRustBuildPluginProps = {
	crateName: string
	libName: string
	targets: string[]
}

export const androidTargetsToRustTargets: Record<string, string> = {
	x86_64: "x86_64-linux-android",
	"armeabi-v7a": "armv7-linux-androideabi",
	"arm64-v8a": "aarch64-linux-android",
	x86: "i686-linux-android"
}

export const withAndroidRustBuild: ConfigPlugin<AndroidRustBuildPluginProps> = (config, props) => {
	config = withAndroidManifest(config, async config => {
		const manifest = config.modResults.manifest
		// expo doesn't support providers in the manifest, so we need to add it manually
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const application: any[] = manifest.application || []

		const provider: ManifestProvider = {
			$: {
				"android:name": `${config.android?.package}.FilenDocumentsProvider`,
				"android:authorities": `${config.android?.package}.documentsprovider`,
				"android:exported": true,
				"android:grantUriPermissions": true,
				"android:permission": "android.permission.MANAGE_DOCUMENTS"
			},
			"intent-filter": [
				{
					action: [
						{
							$: {
								"android:name": "android.content.action.DOCUMENTS_PROVIDER"
							}
						}
					]
				}
			]
		}

		const first = application[0] || {}

		if (!first.provider) {
			first.provider = []
		}

		first.provider.push(provider)
		application[0] = first
		manifest.application = application

		return config
	})

	config = withAppBuildGradle(config, async config => {
		config.modResults.contents += `
dependencies {
	implementation 'net.java.dev.jna:jna:5.17.0@aar'
}
android {
	sourceSets {
		main {
			kotlin {
				srcDirs += 'build/generated/kotlin/uniffi/filen_mobile_native_cache'
			}
		}
	}
}
`
		return config
	})

	return withDangerousMod(config, [
		"android",
		async config => {
			await buildRustForAndroid(props, config)

			return config
		}
	])
}

export async function buildRustForAndroid(props: AndroidRustBuildPluginProps, config: ExportedConfigWithProps<unknown>) {
	// first we set up the rust repository

	const { libName, crateName, targets } = props
	const platformRoot = config.modRequest.platformProjectRoot
	const androidBuildDir = path.join(platformRoot, "app", "build")
	const androidSrcDir = path.join(platformRoot, "app", "src", "main")
	const jniLibsDir = path.join(androidSrcDir, "jniLibs")
	const fullRustPath = path.join(config.modRequest.projectRoot, "filen-rs")
	const androidProjectDir = path.join(androidSrcDir, "java", ...config.android!.package!.split("."))

	// build rust library for android targets
	execSync(`cargo ndk${targets.map(t => ` -t ${t}`).join("")} build --release -p ${crateName}`, {
		cwd: fullRustPath,
		stdio: "inherit"
	})

	// generate Kotlin bindings using uniffi-bindgen
	execSync(
		`cargo run --bin uniffi-bindgen generate --library ./target/${androidTargetsToRustTargets[
			targets[0]!
		]!}/release/lib${libName}.so --language kotlin --out-dir ${androidBuildDir}/generated/kotlin -n`,
		{
			cwd: fullRustPath,
			stdio: "inherit"
		}
	)

	// copy the rust library files to the jniLibs directory
	targets.forEach(t => {
		fs.mkdirSync(path.join(jniLibsDir, t), {
			recursive: true
		})
		fs.copyFileSync(
			path.join(fullRustPath, "target", androidTargetsToRustTargets[t]!, "release", `lib${libName}.so`),
			path.join(jniLibsDir, t, `lib${libName}.so`)
		)
	})

	fs.mkdirSync(androidProjectDir, {
		recursive: true
	})

	await fs.promises.copyFile(
		getDocumentsProviderFilePath(config.modRequest.projectRoot, "FilenDocumentsProvider.kt"),
		path.join(androidProjectDir, "FilenDocumentsProvider.kt")
	)
}

export default withAndroidRustBuild
