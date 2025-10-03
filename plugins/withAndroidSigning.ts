import type { ConfigPlugin } from "@expo/config-plugins"
import { withAppBuildGradle } from "@expo/config-plugins/build/plugins/android-plugins"
import fs from "fs"
import path from "path"

export const withAndroidSigning: ConfigPlugin = config => {
	return withAppBuildGradle(config, config => {
		const { modResults } = config
		const credentialsFile = path.join(config.modRequest.platformProjectRoot, "..", "credentials.json")

		if (fs.existsSync(credentialsFile)) {
			const credentials = JSON.parse(fs.readFileSync(credentialsFile, "utf-8"))
			const { keystoreBase64, keystorePassword, keyAlias, keyPassword } = credentials.android.keystore || {}

			if (!keystoreBase64 || !keystorePassword || !keyAlias || !keyPassword) {
				throw new Error("Incomplete Android keystore credentials. Please check your credentials.json file.")
			}

			console.log("Adding Android signing configuration...")

			const keystoreDestination = path.join(config.modRequest.platformProjectRoot, "app", "release.keystore")

			if (!fs.existsSync(keystoreDestination)) {
				fs.writeFileSync(keystoreDestination, Buffer.from(keystoreBase64, "base64"))
			}

			const releaseSigningConfig = `
			release {
				storeFile file('release.keystore')
				storePassword '${keystorePassword}'
				keyAlias '${keyAlias}'
				keyPassword '${keyPassword}'
			}`

			// Find the signingConfigs block and add release config after debug
			const signingConfigsRegex = /(signingConfigs\s*\{[\s\S]*?debug\s*\{[\s\S]*?\}\s*)/
			const match = modResults.contents.match(signingConfigsRegex)

			if (match) {
				// Insert release config after debug config but before closing brace
				modResults.contents = modResults.contents.replace(signingConfigsRegex, match[1] + releaseSigningConfig)
			}

			// Replace signingConfig in buildTypes.release
			modResults.contents = modResults.contents
				.split("signingConfig signingConfigs.debug")
				.join("signingConfig signingConfigs.release")
		} else {
			console.log("No Android signing configuration found. Using debug signing config.")

			// Replace signingConfig in buildTypes.release
			modResults.contents = modResults.contents
				.split("signingConfig signingConfigs.release")
				.join("signingConfig signingConfigs.debug")
		}

		return config
	})
}

export default withAndroidSigning
