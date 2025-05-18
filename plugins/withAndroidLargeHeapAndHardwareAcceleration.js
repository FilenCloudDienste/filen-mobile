/* eslint-disable @typescript-eslint/no-require-imports */

const { withAndroidManifest } = require("@expo/config-plugins")

/**
 * @type {import('@expo/config-plugins').ConfigPlugin}
 */
module.exports = function withAndroidLargeHeapAndHardwareAcceleration(config) {
	return withAndroidManifest(config, async config => {
		const application = config.modResults.manifest.application?.[0]

		if (application) {
			application.$["android:largeHeap"] = "true"
			application.$["android:hardwareAccelerated"] = "true"
		}

		const activity = config.modResults.manifest.application?.[0]?.activity?.[0]

		if (activity) {
			activity.$["android:hardwareAccelerated"] = "true"
		}

		return config
	})
}
