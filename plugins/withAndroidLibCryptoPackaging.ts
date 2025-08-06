import { type ConfigPlugin } from "@expo/config-plugins"
import { withDangerousMod } from "@expo/config-plugins/build/plugins/withDangerousMod"
import * as fs from "fs"
import * as path from "path"

export const withAndroidLibCryptoPackaging: ConfigPlugin = config => {
	return withDangerousMod(config, [
		"android",
		async config => {
			const buildGradlePath = path.join(config.modRequest.platformProjectRoot, "app", "build.gradle")

			if (!fs.existsSync(buildGradlePath)) {
				throw new Error(`build.gradle not found at ${buildGradlePath}`)
			}

			let buildGradleContent = fs.readFileSync(buildGradlePath, "utf8")

			// Check if libcrypto packaging options are already present
			if (buildGradleContent.includes("libcrypto.so")) {
				console.log("libcrypto.so packaging options already present in build.gradle")

				return config
			}

			// Find the existing packagingOptions block
			const packagingOptionsRegex = /android\s*\{[^}]*packagingOptions\s*\{([^}]*)\}/s
			const match = buildGradleContent.match(packagingOptionsRegex)

			if (match && match[1]) {
				// Add libcrypto options to existing packagingOptions
				const existingOptions = match[1]
				const newOptions =
					existingOptions +
					`
        pickFirst 'lib/x86/libcrypto.so'
        pickFirst 'lib/x86_64/libcrypto.so'
        pickFirst 'lib/armeabi-v7a/libcrypto.so'
        pickFirst 'lib/arm64-v8a/libcrypto.so'`

				buildGradleContent = buildGradleContent.replace(match[1], newOptions)
			} else {
				// If no packagingOptions block exists, add one inside the android block
				const androidBlockRegex = /(android\s*\{)/
				const androidMatch = buildGradleContent.match(androidBlockRegex)

				if (androidMatch) {
					const insertionPoint = androidMatch.index! + androidMatch[0].length
					const newPackagingOptions = `
    packagingOptions {
        pickFirst 'lib/x86/libcrypto.so'
        pickFirst 'lib/x86_64/libcrypto.so'
        pickFirst 'lib/armeabi-v7a/libcrypto.so'
        pickFirst 'lib/arm64-v8a/libcrypto.so'
    }`

					buildGradleContent =
						buildGradleContent.slice(0, insertionPoint) + newPackagingOptions + buildGradleContent.slice(insertionPoint)
				} else {
					throw new Error("Could not find android block in build.gradle")
				}
			}

			fs.writeFileSync(buildGradlePath, buildGradleContent)

			console.log("Added libcrypto.so packaging options to build.gradle")

			return config
		}
	])
}

export default withAndroidLibCryptoPackaging
