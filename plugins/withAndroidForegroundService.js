/* eslint-disable quotes */
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * @typedef {import('@expo/config-plugins').ExpoConfig} ExpoConfig
 * @typedef {import('@expo/config-plugins').ConfigPlugin} ConfigPlugin
 * @typedef {import('@expo/config-plugins').AndroidConfig.Manifest} AndroidManifest
 * @typedef {import('@expo/config-plugins').AndroidConfig.ManifestApplication} AndroidApplication
 */

const fs = require("fs")
const path = require("path")
const { createRunOncePlugin, withAndroidManifest, withDangerousMod } = require("@expo/config-plugins")

/**
 * Merge utility: given an XML string, extract existing tag names.
 *
 * @param {string} xml
 * @param {string} tagName e.g. 'color' or 'item'
 * @param {string} attrName e.g. 'name'
 * @returns {Set<string>} the set of attribute values found
 */
function extractNames(xml, tagName, attrName) {
	const regex = new RegExp(`<${tagName}[^>]*${attrName}="([^"]+)"`, "g")
	const names = new Set()
	let match

	while ((match = regex.exec(xml))) {
		names.add(match[1])
	}

	return names
}

/**
 * A Config Plugin that:
 *   – Injects Android permissions, meta-data, and services for @supersami/rn-foreground-service
 *   – Reads (or creates) res/values/colors.xml and merges in the 'blue' color & androidcolors array
 *
 * @type {ConfigPlugin<{ serviceType?: string }>}
 */
const withAndroidForegroundService = (config, { serviceType = "dataSync" } = {}) => {
	// 1) Manifest edits
	config = withAndroidManifest(config, cfg => {
		const manifest = /** @type {AndroidManifest} */ (cfg.modResults.manifest)
		const app = /** @type {AndroidApplication} */ (manifest.application[0])

		// 1a) Permissions
		manifest["uses-permission"] = manifest["uses-permission"] || []
		for (const name of [
			"android.permission.FOREGROUND_SERVICE",
			"android.permission.WAKE_LOCK",
			`android.permission.FOREGROUND_SERVICE_${serviceType.toUpperCase()}`
		]) {
			if (!manifest["uses-permission"].some(p => p.$["android:name"] === name)) {
				manifest["uses-permission"].push({ $: { "android:name": name } })
			}
		}

		// 1b) Meta-data
		app["meta-data"] = app["meta-data"] || []
		for (const { name, value, resource } of [
			{
				name: "com.supersami.foregroundservice.notification_channel_name",
				value: "Foreground Service"
			},
			{
				name: "com.supersami.foregroundservice.notification_channel_description",
				value: "Background sync"
			},
			{
				name: "com.supersami.foregroundservice.notification_color",
				resource: "@color/blue"
			}
		]) {
			if (!app["meta-data"].some(m => m.$["android:name"] === name)) {
				const attrs = { "android:name": name }
				if (value) attrs["android:value"] = value
				if (resource) attrs["android:resource"] = resource
				app["meta-data"].push({ $: attrs })
			}
		}

		// 1c) Services
		app.service = app.service || []
		for (const svcName of [
			"com.supersami.foregroundservice.ForegroundService",
			"com.supersami.foregroundservice.ForegroundServiceTask"
		]) {
			if (!app.service.some(s => s.$["android:name"] === svcName)) {
				app.service.push({
					$: {
						"android:name": svcName,
						"android:exported": "false",
						"android:foregroundServiceType": serviceType
					}
				})
			}
		}

		cfg.modResults.manifest = manifest
		return cfg
	})

	// 2) colors.xml merge
	config = withDangerousMod(config, [
		"android",
		async cfg => {
			const projectRoot = cfg.modRequest.platformProjectRoot
			const valuesDir = path.join(projectRoot, "app/src/main/res/values")
			const filePath = path.join(valuesDir, "colors.xml")

			// Ensure the values directory exists
			fs.mkdirSync(valuesDir, { recursive: true })

			// Read existing or create a base template
			let xml = ""
			if (fs.existsSync(filePath)) {
				xml = fs.readFileSync(filePath, "utf8")
			} else {
				xml = `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n</resources>\n`
			}

			// Extract existing names
			const existingColors = extractNames(xml, "color", "name")
			const existingItems = extractNames(xml, "item", "name")

			// Prepare additions
			const additions = []

			if (!existingColors.has("blue")) {
				additions.push(`  <item name="blue" type="color">#00C4D1</item>`)
			}
			if (!existingItems.has("androidcolors")) {
				additions.push(`  <integer-array name="androidcolors">\n    <item>@color/blue</item>\n  </integer-array>`)
			}

			// Inject before </resources>
			if (additions.length > 0) {
				xml = xml.replace(/<\/resources>/, additions.map(line => line + "\n").join("") + `</resources>`)
				fs.writeFileSync(filePath, xml, "utf8")
			}

			return cfg
		}
	])

	return config
}

module.exports = createRunOncePlugin(withAndroidForegroundService, "withAndroidForegroundService", "1.0.0")
