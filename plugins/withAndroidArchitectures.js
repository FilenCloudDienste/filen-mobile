/* eslint-disable @typescript-eslint/no-require-imports */
const { withGradleProperties } = require("@expo/config-plugins")

/**
 * Config plugin to set custom reactNativeArchitectures in gradle.properties
 * @param {import('@expo/config-plugins').ConfigPlugin.ConfigProps} config
 * @param {object} [options]
 * @param {string} [options.architectures="armeabi-v7a,arm64-v8a,x86_64"] - Comma-separated list of architectures to support
 * @returns {import('@expo/config-plugins').ConfigPlugin.ConfigProps}
 */
const withAndroidArchitectures = (config, options = {}) => {
	const architectures = options.architectures || "armeabi-v7a,arm64-v8a,x86_64"

	return withGradleProperties(config, config => {
		config.modResults = config.modResults.filter(item => item.type !== "property" || item.key !== "reactNativeArchitectures")

		config.modResults.push({
			type: "property",
			key: "reactNativeArchitectures",
			value: architectures
		})

		return config
	})
}

module.exports = withAndroidArchitectures
