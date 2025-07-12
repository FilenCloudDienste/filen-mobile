module.exports = function (api) {
	api.cache(true)

	return {
		presets: [
			[
				"babel-preset-expo",
				{
					jsxImportSource: "nativewind"
				}
			],
			"nativewind/babel"
		],
		plugins: [
			[
				"react-native-boost/plugin",
				{
					verbose: true,
					ignores: ["node_modules/**"],
					optimizations: {
						text: true,
						view: true
					}
				}
			],
			["react-native-worklets-core/plugin"],
			["react-native-reanimated/plugin"]
		]
	}
}
