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
	babelTransformerPath: require.resolve("react-native-svg-transformer/expo"),
	inlineRequires: true,
	minifierConfig: {
		...transformer.minifierConfig,
		ecma: 2022,
		keep_fnames: false,
		compress: {
			...transformer.minifierConfig.compress,
			drop_console: false,
			passes: 3
		},
		mangle: {
			...transformer.minifierConfig.mangle,
			keep_fnames: false,
			safari10: false
		},
		output: {
			...transformer.minifierConfig.output,
			ascii_only: false,
			beautify: false
		}
	}
}

config.resolver = {
	...resolver,
	assetExts: resolver.assetExts.filter(ext => ext !== "svg"),
	sourceExts: [...resolver.sourceExts, "svg"],
	unstable_enablePackageExports: true,
	experimentalImportSupport: true,
	enablePackageExports: true,
	//unstable_conditionNames: ["browser", "require", "react-native", "default"],
	extraNodeModules: {
		...nodeStdlibBrowser,
		buffer: require.resolve("@craftzdog/react-native-buffer"),
		crypto: require.resolve("react-native-quick-crypto"),
		fs: require.resolve("memfs")
	}
}

module.exports = withNativeWind(config, {
	input: "./global.css",
	inlineRem: 16
})
