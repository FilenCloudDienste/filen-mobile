/* eslint-disable @typescript-eslint/no-require-imports */

const { withAndroidManifest, withDangerousMod, AndroidConfig } = require("@expo/config-plugins")
const fs = require("fs")
const pathModule = require("path")

const isDevelopment = process.env.APP_ENV === "development" || process.env.NODE_ENV === "development"
const networkSecurityConfigContent = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
	<domain-config cleartextTrafficPermitted="true">
		<domain includeSubdomains="true">127.0.0.1</domain>
	</domain-config>
	${
		isDevelopment
			? `<domain-config cleartextTrafficPermitted="true">
		<domain includeSubdomains="true">192.168.178.39</domain>
	</domain-config>
	<domain-config cleartextTrafficPermitted="true">
		<domain includeSubdomains="true">192.168.178.51</domain>
	</domain-config>
	<domain-config cleartextTrafficPermitted="true">
		<domain includeSubdomains="true">192.168.178.79</domain>
	</domain-config>
	<domain-config cleartextTrafficPermitted="true">
		<domain includeSubdomains="true">192.168.178.82</domain>
	</domain-config>
	<domain-config cleartextTrafficPermitted="true">
		<domain includeSubdomains="true">192.168.100.124</domain>
	</domain-config>
	<domain-config cleartextTrafficPermitted="true">
		<domain includeSubdomains="true">192.168.178.103</domain>
	</domain-config>
	<domain-config cleartextTrafficPermitted="true">
		<domain includeSubdomains="true">10.0.2.2</domain>
	</domain-config>
	<domain-config cleartextTrafficPermitted="true">
		<domain includeSubdomains="true">192.168.178.80</domain>
	</domain-config>`
			: ""
	}
</network-security-config>`

/**
 * @param {import('@expo/config-plugins').AndroidConfig.Manifest.AndroidManifest} androidManifest
 * @returns {import('@expo/config-plugins').AndroidConfig.Manifest.AndroidManifest}
 */
function setNetworkSecurityConfig(androidManifest) {
	const application = AndroidConfig.Manifest.getMainApplicationOrThrow(androidManifest)

	// Add or modify the android:networkSecurityConfig attribute
	application.$["android:networkSecurityConfig"] = "@xml/network_security_config"

	return androidManifest
}

/**
 * @type {import('@expo/config-plugins').ConfigPlugin}
 */
const withAndroidNetworkSecurityConfig = config => {
	config = withAndroidManifest(config, async config => {
		config.modResults = setNetworkSecurityConfig(config.modResults)

		return config
	})

	return withDangerousMod(config, [
		"android",
		async config => {
			const networkSecurityConfigPath = pathModule.join(
				config.modRequest.platformProjectRoot,
				"app/src/main/res/xml/network_security_config.xml"
			)

			fs.mkdirSync(pathModule.dirname(networkSecurityConfigPath), {
				recursive: true
			})

			fs.writeFileSync(networkSecurityConfigPath, networkSecurityConfigContent)

			return config
		}
	])
}

module.exports = withAndroidNetworkSecurityConfig
