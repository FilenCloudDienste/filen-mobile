module.exports = function (api) {
	api.cache(false)

	return {
		presets: ["module:metro-react-native-babel-preset"],
		env: {
			production: {
				plugins: ["transform-remove-console"]
			}
		}
	}
}
