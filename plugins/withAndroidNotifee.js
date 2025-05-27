/* eslint-disable quotes */
/* eslint-disable @typescript-eslint/no-require-imports */

const { withProjectBuildGradle } = require("@expo/config-plugins")

/**
 * Expo config plugin to add Maven repositories to android/build.gradle (project-level)
 * This modifies the PROJECT-LEVEL build.gradle, not the app-level one
 * @param {Object} config - The expo config
 */
const withAndroidNotifee = config => {
	return withProjectBuildGradle(config, config => {
		if (config.modResults.language === "groovy") {
			let { contents } = config.modResults

			// Find the allprojects block and its repositories section
			const allProjectsRegex = /allprojects\s*{\s*repositories\s*{([\s\S]*?)}\s*}/
			const match = contents.match(allProjectsRegex)

			if (match) {
				const repositoriesContent = match[1]
				let newRepositoriesContent = repositoriesContent
				const needsNotifee = !repositoriesContent.includes("@notifee/react-native")

				if (needsNotifee) {
					// Find the last closing brace position within repositories
					// We'll insert new repositories before the closing brace
					let insertPosition = repositoriesContent.lastIndexOf("\n")
					if (insertPosition === -1) {
						insertPosition = repositoriesContent.length
					}

					let reposToAdd = ""

					if (needsNotifee) {
						reposToAdd += `\n\n    // Notifee repository\n    maven { url(new File(['node', '--print', "require.resolve('@notifee/react-native/package.json')"].execute(null, rootDir).text.trim(), '../android/libs')) }`
					}

					// Insert the new repositories
					newRepositoriesContent =
						repositoriesContent.slice(0, insertPosition) + reposToAdd + repositoriesContent.slice(insertPosition)

					// Replace the old repositories block with the new one
					const newAllProjectsBlock = `allprojects {\n    repositories {${newRepositoriesContent}\n    }\n}`
					contents = contents.replace(allProjectsRegex, newAllProjectsBlock)
				}
			}

			config.modResults.contents = contents
		}

		return config
	})
}

module.exports = withAndroidNotifee
