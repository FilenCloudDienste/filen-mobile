/* eslint-disable @typescript-eslint/no-require-imports */

// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config")
const { withNativeWind } = require("nativewind/metro")
const nodeStdlibBrowser = require("node-stdlib-browser")

const defaultConfig = getDefaultConfig(__dirname)

/** @type {import('expo/metro-config').MetroConfig} */
const config = {
	...defaultConfig,
	transformer: {
		...defaultConfig.transformer,
		babelTransformerPath: require.resolve("react-native-svg-transformer/expo")
	},
	resolver: {
		...defaultConfig.resolver,
		assetExts: defaultConfig.resolver.assetExts.filter(ext => ext !== "svg"),
		sourceExts: [...defaultConfig.resolver.sourceExts, "svg"],
		unstable_enablePackageExports: true,
		experimentalImportSupport: true,
		enablePackageExports: true,
		// unstable_conditionNames: ["browser", "require", "react-native", "default"],
		extraNodeModules: {
			...nodeStdlibBrowser,
			buffer: require.resolve("@craftzdog/react-native-buffer"),
			crypto: require.resolve("react-native-quick-crypto"),
			fs: require.resolve("memfs")
		}
	}
}

module.exports = withNativeWind(config, {
	input: "./global.css",
	inlineRem: 16
})
