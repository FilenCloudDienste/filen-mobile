/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable no-undef */

// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config")
const { withNativeWind } = require("nativewind/metro")
const nodeLibsExpo = require("node-libs-expo")

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname)

const { transformer, resolver } = config

config.transformer = {
	...transformer,
	babelTransformerPath: require.resolve("react-native-svg-transformer/expo")
}

config.resolver = {
	...resolver,
	assetExts: resolver.assetExts.filter(ext => ext !== "svg"),
	sourceExts: [...resolver.sourceExts, "svg"],
	unstable_enablePackageExports: true,
	unstable_conditionNames: ["browser", "require", "react-native", "default"],
	extraNodeModules: {
		...nodeLibsExpo,
		buffer: require.resolve("@craftzdog/react-native-buffer")
	}
}

module.exports = withNativeWind(config, {
	input: "./global.css",
	inlineRem: 16
})
