import { ConfigPlugin } from "@expo/config-plugins"
import { withAndroidManifest } from "@expo/config-plugins/build/plugins/android-plugins"
import { withDangerousMod } from "@expo/config-plugins/build/plugins/withDangerousMod"
import fs from "fs"
import path from "path"

function generateLocaleConfigXml(locales: string[]): string {
	return `<?xml version="1.0" encoding="utf-8"?>
<locale-config xmlns:android="http://schemas.android.com/apk/res/android">
${locales.map(l => `	<locale android:name="${l}"/>`).join("\n")}
</locale-config>
`
}

function normalizeLocaleTag(tag: string): string {
	return tag.replace(/_/g, "-") // allow en_US.json -> en-US
}

/**
 * Expo Config Plugin to enable per-app language support on Android.
 *
 * This plugin does two things:
 * 1. Adds the `android:localeConfig="@xml/locales_config"` attribute
 *    to the <application> tag in the generated AndroidManifest.xml.
 * 2. Generates `res/xml/locales_config.xml` during prebuild by reading
 *    the `./locales` folder and creating <locale> entries for each language,
 *    ignoring any file named "index". Defaults to ["en"] if none are found.
 *
 * With this plugin, Android 13+ devices can show the app in the system
 * per-app language settings.
 */
const withAndroidLocaleConfig: ConfigPlugin = config => {
	// 1) Add android:localeConfig attribute to <application>
	config = withAndroidManifest(config, cfg => {
		const manifest = cfg.modResults.manifest
		const application = manifest.application?.[0]
		if (application) {
			application.$ = application.$ || {}
			application.$["android:localeConfig"] = "@xml/locales_config"
		}
		return cfg
	})

	// 2) Write res/xml/locales_config.xml during prebuild
	config = withDangerousMod(config, [
		"android",
		async cfg => {
			const projectRoot = cfg.modRequest.projectRoot
			const localesDir = path.join(projectRoot, "locales")

			let localeTags: string[] = ["en"] // default

			try {
				const files = await fs.promises.readdir(localesDir)

				localeTags = Array.from(
					new Set(
						files
							.filter(f => !f.startsWith(".") && f.includes("."))
							.map(f => f.replace(/\.[^.]+$/, "")) // remove extension
							.filter(name => name && name.toLowerCase() !== "index") // ignore empty & index
							.map(normalizeLocaleTag) // normalize en_US -> en-US
					)
				)
			} catch {
				console.log('withAndroidLocaleConfig: could not read ./locales, defaulting to ["en"]')
			}

			// fallback to default if folder is empty
			if (localeTags.length === 0) localeTags = ["en"]

			const xml = generateLocaleConfigXml(localeTags)
			const resXmlDir = path.join(cfg.modRequest.platformProjectRoot, "app", "src", "main", "res", "xml")
			await fs.promises.mkdir(resXmlDir, { recursive: true })
			const outPath = path.join(resXmlDir, "locales_config.xml")
			await fs.promises.writeFile(outPath, xml, "utf8")

			return cfg
		}
	])

	return config
}

export default withAndroidLocaleConfig
