import { type ConfigPlugin } from "@expo/config-plugins"
import { withAppBuildGradle } from "@expo/config-plugins/build/plugins/android-plugins"
import fs from "fs"
import path from "path"

export const withAndroidSigning: ConfigPlugin = config => {
	return withAppBuildGradle(config, config => {
		const { modResults } = config
		const credentialsFile = path.join(config.modRequest.platformProjectRoot, "..", "credentials.json")

		if (fs.existsSync(credentialsFile)) {
			const credentials = JSON.parse(fs.readFileSync(credentialsFile, "utf-8"))
			const { keystorePath, keystorePassword, keyAlias, keyPassword } = credentials.android.keystore || {}

			if (!keystorePath || !keystorePassword || !keyAlias || !keyPassword) {
				throw new Error("Incomplete Android keystore credentials. Please check your credentials.json file.")
			}

			const keystoreDestination = path.join(config.modRequest.platformProjectRoot, "app", "release.keystore")

			if (fs.existsSync(keystoreDestination)) {
				fs.rmSync(keystoreDestination, {
					recursive: true,
					force: true
				})
			}

			fs.copyFileSync(keystorePath, keystoreDestination)

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
			// Replace signingConfig in buildTypes.release
			modResults.contents = modResults.contents
				.split("signingConfig signingConfigs.release")
				.join("signingConfig signingConfigs.debug")
		}

		return config
	})
}

export default withAndroidSigning
