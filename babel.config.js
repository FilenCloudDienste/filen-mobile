module.exports = function (api) {
	api.cache(false)

	return {
		presets: ["module:metro-react-native-babel-preset"],
		plugins: ["react-native-reanimated/plugin"],
		env: {
			production: {
				plugins: ["transform-remove-console"]
			}
		}
	}
}
