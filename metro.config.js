/* eslint-disable @typescript-eslint/no-require-imports */

// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config")
const { withNativeWind } = require("nativewind/metro")
const nodeStdlibBrowser = require("node-stdlib-browser")

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
		...nodeStdlibBrowser,
		buffer: require.resolve("@craftzdog/react-native-buffer"),
		crypto: require.resolve("react-native-quick-crypto"),
		fs: require.resolve("memfs"),
		util: require.resolve("util")
	}
}

module.exports = withNativeWind(config, {
	input: "./global.css",
	inlineRem: 16
})
