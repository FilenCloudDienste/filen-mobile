import { ConfigPlugin, ExportedConfigWithProps, XcodeProject } from "@expo/config-plugins"
import { withXcodeProject } from "@expo/config-plugins/build/plugins/ios-plugins"
import { withDangerousMod } from "@expo/config-plugins/build/plugins/withDangerousMod"
import { build } from "@expo/plist/build/build.js"
import { execSync } from "child_process"
import fs from "node:fs"
import path from "node:path"

// Rust build functions
export type CloneRepoPluginProps = {
	repoUrl: string
	targetPath: string
	clean?: boolean
	branch?: string
}

export type IOSRustBuildPluginProps = CloneRepoPluginProps & {
	release?: boolean
	libName: string
	crateName: string
	targets: string[]
}

// Main plugin
export type FileProviderPluginProps = IOSRustBuildPluginProps & {
	iosFileProviderName?: string
	iosFileProviderBundleIdentifier?: string
	iosAppGroupIdentifier?: string
	developmentTeamId?: string
}

// Constants
export const fileProviderName = "FilenFileProvider"
export const fileProviderInfoFileName = `${fileProviderName}-Info.plist`
export const fileProviderEntitlementsFileName = `${fileProviderName}.entitlements`

// Helper functions
export const getFileProviderName = (parameters?: FileProviderPluginProps) => {
	if (!parameters?.iosFileProviderName) {
		return fileProviderName
	}

	return parameters.iosFileProviderName.replace(/[^a-zA-Z0-9]/g, "")
}

export const getAppGroup = (identifier: string, parameters: FileProviderPluginProps) => {
	return parameters.iosAppGroupIdentifier || `group.${identifier}`
}

export const getFileProviderBundledIdentifier = (appIdentifier: string, parameters: FileProviderPluginProps) => {
	return parameters.iosFileProviderBundleIdentifier || `${appIdentifier}.FileProvider`
}

// File path helpers
export const getFileProviderEntitlementsFilePath = (platformProjectRoot: string, parameters: FileProviderPluginProps) => {
	return path.join(platformProjectRoot, getFileProviderName(parameters), fileProviderEntitlementsFileName)
}

export const getFileProviderInfoFilePath = (platformProjectRoot: string, parameters: FileProviderPluginProps) => {
	return path.join(platformProjectRoot, getFileProviderName(parameters), fileProviderInfoFileName)
}

export const getFileProviderSwiftFilePath = (platformProjectRoot: string, parameters: FileProviderPluginProps, swiftFileName: string) => {
	return path.join(platformProjectRoot, getFileProviderName(parameters), swiftFileName)
}

export const getPrivacyInfoFilePath = (platformProjectRoot: string, parameters: FileProviderPluginProps) => {
	return path.join(platformProjectRoot, getFileProviderName(parameters), "PrivacyInfo.xcprivacy")
}

// Content generators
export const getFileProviderEntitlements = (appIdentifier: string, parameters: FileProviderPluginProps) => {
	return {
		"com.apple.security.application-groups": [getAppGroup(appIdentifier, parameters)]
	}
}

export const getFileProviderEntitlementsContent = (appIdentifier: string, parameters: FileProviderPluginProps) => {
	return build(getFileProviderEntitlements(appIdentifier, parameters))
}

export const getFileProviderInfoContent = (appName: string, appIdentifier: string, parameters: FileProviderPluginProps) => {
	return build({
		AppGroup: getAppGroup(appIdentifier, parameters),
		NSExtensionFileProviderDocumentGroup: getAppGroup(appIdentifier, parameters),
		CFBundleName: "$(PRODUCT_NAME)",
		CFBundleDisplayName: parameters.iosFileProviderName || `${appName} - File Provider`,
		CFBundleIdentifier: "$(PRODUCT_BUNDLE_IDENTIFIER)",
		CFBundleDevelopmentRegion: "$(DEVELOPMENT_LANGUAGE)",
		CFBundleExecutable: "$(EXECUTABLE_NAME)",
		CFBundleInfoDictionaryVersion: "6.0",
		CFBundlePackageType: "$(PRODUCT_BUNDLE_PACKAGE_TYPE)",
		NSExtension: {
			NSExtensionFileProviderSupportsEnumeration: true,
			NSExtensionFileProviderDocumentGroup: getAppGroup(appIdentifier, parameters),
			NSExtensionPointIdentifier: "com.apple.fileprovider-nonui",
			NSExtensionPrincipalClass: "$(PRODUCT_MODULE_NAME).FileProviderExtension"
		}
	})
}

// File writing function
export const writeFileProviderFiles = async (
	platformProjectRoot: string,
	appIdentifier: string,
	config: ExportedConfigWithProps<XcodeProject>,
	props: IOSRustBuildPluginProps,
	appName: string
) => {
	// FileProvider-Info.plist
	const infoPlistFilePath = getFileProviderInfoFilePath(platformProjectRoot, props)
	const infoPlistContent = getFileProviderInfoContent(appName, appIdentifier, props)

	await fs.promises.mkdir(path.dirname(infoPlistFilePath), {
		recursive: true
	})

	await fs.promises.writeFile(infoPlistFilePath, infoPlistContent)

	// FileProvider.entitlements
	const entitlementsFilePath = getFileProviderEntitlementsFilePath(platformProjectRoot, props)
	const entitlementsContent = getFileProviderEntitlementsContent(appIdentifier, props)

	await fs.promises.writeFile(entitlementsFilePath, entitlementsContent)

	// PrivacyInfo.xcprivacy
	const privacyFilePath = getPrivacyInfoFilePath(platformProjectRoot, props)

	await fs.promises.writeFile(
		privacyFilePath,
		build({
			NSPrivacyAccessedAPITypes: [
				{
					NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
					NSPrivacyAccessedAPITypeReasons: ["CA92.1"]
				}
			],
			NSPrivacyCollectedDataTypes: [],
			NSPrivacyTracking: false
		})
	)

	// Copy Swift files from prebuilds
	const swiftFiles = [
		"FileProviderEnumerator.swift",
		"FileProviderItem.swift",
		"FileProviderExtension.swift",
		"ProgressNotifier.swift",
		"ThumbnailHandler.swift",
		"Utils.swift"
	]

	await fs.promises.mkdir(path.join(platformProjectRoot, getFileProviderName(props)), {
		recursive: true
	})

	for (const swiftFile of swiftFiles) {
		const sourceFilePath = path.join(config.modRequest.projectRoot, "prebuilds", "ios-file-provider", swiftFile)
		const targetFilePath = getFileProviderSwiftFilePath(config.modRequest.platformProjectRoot, props, swiftFile)

		await fs.promises.copyFile(sourceFilePath, targetFilePath)
	}

	const { targetPath } = props

	await fs.promises.copyFile(
		path.join(config.modRequest.projectRoot, targetPath, "target", "uniffi-xcframework-staging", `${props.libName}.swift`),
		getFileProviderSwiftFilePath(config.modRequest.platformProjectRoot, props, `${props.libName}.swift`)
	)
}

export async function cloneRepo(props: CloneRepoPluginProps) {
	const { repoUrl, targetPath, clean = false, branch = "main" } = props

	try {
		const fullTargetPath = path.resolve(targetPath)

		if (!fs.existsSync(fullTargetPath)) {
			fs.mkdirSync(fullTargetPath, {
				recursive: true
			})

			console.log(`Cloning ${repoUrl} to ${fullTargetPath}...`)

			execSync(`git clone --single-branch --branch ${branch} --depth 1 ${repoUrl} ${fullTargetPath}`, {
				stdio: "inherit"
			})
		} else {
			console.log(`Directory ${fullTargetPath} already exists. Updating...`)

			execSync("git stash", {
				cwd: fullTargetPath,
				stdio: "inherit"
			})

			execSync("git pull", {
				cwd: fullTargetPath,
				stdio: "inherit"
			})
		}

		if (clean) {
			execSync("cargo clean", {
				cwd: fullTargetPath,
				stdio: "inherit"
			})
		}

		console.log(`Repository ${repoUrl} cloned successfully!`)
	} catch (error) {
		console.error("Error during Rust repository setup:", error)

		throw error
	}
}

async function buildRustForIOS(props: IOSRustBuildPluginProps) {
	await cloneRepo(props)

	const { targetPath, release = false, libName, targets } = props
	const fullRustPath = path.resolve(targetPath)
	const releaseFlag = release ? " --release" : ""

	execSync(`cargo build --lib --release ${targets.map(t => `--target ${t}`).join(" ")}${releaseFlag} -p ${props.crateName}`, {
		cwd: fullRustPath,
		stdio: "inherit"
	})

	execSync(
		`cargo run -p uniffi-bindgen-swift -- target/${targets[0]!}/release/lib${libName}.a target/uniffi-xcframework-staging --swift-sources --headers --modulemap --module-name ${libName}FFI --modulemap-filename module.modulemap`,
		{
			cwd: fullRustPath,
			stdio: "inherit"
		}
	)

	const iosTargetPath = path.join(fullRustPath, "target", "ios")

	if (fs.existsSync(iosTargetPath)) {
		await fs.promises.rm(iosTargetPath, {
			recursive: true,
			force: true
		})
	}

	execSync(
		`xcodebuild -create-xcframework ${targets
			.map(t => `-library target/${t}/release/lib${libName}.a -headers target/uniffi-xcframework-staging`)
			.join(" ")} -output target/ios/lib${libName}.xcframework`,
		{
			cwd: fullRustPath,
			stdio: "inherit"
		}
	)
}

export const withFileProviderXcodeTarget: ConfigPlugin<FileProviderPluginProps> = (config, props) => {
	const { targets } = props
	const hasX86Target = targets.some(t => t === "x86_64-apple-ios-sim")
	const hasArmTarget = targets.some(t => t === "aarch64-apple-ios-sim" || t === "aarch64-apple-ios")

	if (hasArmTarget && hasX86Target) {
		throw new Error(
			"[file-provider] The iOS FileProvider plugin does not support both x86_64 and arm64 targets at the same time (due to limitations in the xcode node module used by expo). Please choose one of them."
		)
	}

	return withXcodeProject(config, async config => {
		const extensionName = getFileProviderName(props)
		const platformProjectRoot = config.modRequest.platformProjectRoot
		const appIdentifier = config.ios?.bundleIdentifier

		if (!appIdentifier) {
			throw new Error(
				// eslint-disable-next-line quotes
				'[expo-file-provider] The iOS bundle identifier is not set in your app.json/app.config.json file. Please set "ios.bundleIdentifier" to a valid identifier.'
			)
		}

		const fileProviderIdentifier = getFileProviderBundledIdentifier(appIdentifier, props)
		const currentProjectVersion = config.ios!.buildNumber || "1"
		const marketingVersion = config.version!

		// FileProvider-Info.plist
		const infoPlistFilePath = getFileProviderInfoFilePath(platformProjectRoot, props)
		// FileProvider.entitlements
		const entitlementsFilePath = getFileProviderEntitlementsFilePath(platformProjectRoot, props)

		await writeFileProviderFiles(platformProjectRoot, appIdentifier, config, props, config.name)

		const pbxProject = config.modResults

		// Check if the extension target already exists. If so, abort the process since the steps below are already done.
		// eslint-disable-next-line no-extra-boolean-cast
		if (!!pbxProject.pbxTargetByName(extensionName)) {
			return config
		}

		const target = pbxProject.addTarget(extensionName, "app_extension", extensionName)

		// Add a new PBXSourcesBuildPhase for our FileProvider Swift files
		pbxProject.addBuildPhase([], "PBXSourcesBuildPhase", "Sources", target.uuid)

		// Add a new PBXResourcesBuildPhase for the Resources used by the FileProvider
		pbxProject.addBuildPhase([], "PBXResourcesBuildPhase", "Resources", target.uuid)

		// Add a new PBXFrameworksBuildPhase for the FileProvider target
		pbxProject.addBuildPhase([], "PBXFrameworksBuildPhase", "Frameworks", target.uuid)

		// Create a separate PBXGroup for the FileProvider's files
		const pbxGroupKey = pbxProject.pbxCreateGroup(extensionName, extensionName)

		pbxProject.addFramework("UniformTypeIdentifiers.framework", {
			target: target.uuid,
			link: true,
			embed: false // System frameworks shouldn't be embedded
		})

		// Add the xcframework to the FileProvider target
		const xcframeworkPath = path.resolve(props.targetPath, "target", "ios", `lib${props.libName}.xcframework`)

		pbxProject.addFramework(xcframeworkPath, {
			customFramework: true,
			embed: false,
			link: true,
			target: target.uuid
		})

		// Add files which are not part of any build phase (FileProvider-Info.plist)
		pbxProject.addFile(infoPlistFilePath, pbxGroupKey)

		// Add all Swift source files to our PbxGroup and PBXSourcesBuildPhase
		const swiftFiles = [
			"FileProviderEnumerator.swift",
			"FileProviderItem.swift",
			"FileProviderExtension.swift",
			"ProgressNotifier.swift",
			"ThumbnailHandler.swift",
			"Utils.swift",
			`${props.libName}.swift`
		]

		for (const swiftFile of swiftFiles) {
			pbxProject.addSourceFile(
				getFileProviderSwiftFilePath(platformProjectRoot, props, swiftFile),
				{
					target: target.uuid
				},
				pbxGroupKey
			)
		}

		// Add the resource files
		try {
			// PrivacyInfo.xcprivacy
			pbxProject.addResourceFile(
				getPrivacyInfoFilePath(platformProjectRoot, props),
				{
					target: target.uuid
				},
				pbxGroupKey
			)
		} catch (e) {
			if (e instanceof Error && e.message.includes("reading 'path'")) {
				console.error(e)

				throw new Error(
					// eslint-disable-next-line quotes
					'[expo-file-provider] Could not add resource files to the FileProvider, please check your "patch-package" installation for xcode'
				)
			}

			throw e
		}

		const configurations = pbxProject.pbxXCBuildConfigurationSection()

		for (const key in configurations) {
			if (typeof configurations[key].buildSettings !== "undefined") {
				const buildSettingsObj = configurations[key].buildSettings

				if (typeof buildSettingsObj["PRODUCT_NAME"] !== "undefined" && buildSettingsObj["PRODUCT_NAME"] === `"${extensionName}"`) {
					buildSettingsObj["CLANG_ENABLE_MODULES"] = "YES"
					buildSettingsObj["INFOPLIST_FILE"] = `"${infoPlistFilePath}"`
					buildSettingsObj["CODE_SIGN_ENTITLEMENTS"] = `"${entitlementsFilePath}"`
					buildSettingsObj["CODE_SIGN_STYLE"] = "Automatic"
					buildSettingsObj["CURRENT_PROJECT_VERSION"] = `"${currentProjectVersion}"`
					buildSettingsObj["GENERATE_INFOPLIST_FILE"] = "YES"
					buildSettingsObj["MARKETING_VERSION"] = `"${marketingVersion}"`
					buildSettingsObj["PRODUCT_BUNDLE_IDENTIFIER"] = `"${fileProviderIdentifier}"`
					buildSettingsObj["SWIFT_EMIT_LOC_STRINGS"] = "YES"
					buildSettingsObj["SWIFT_VERSION"] = "5.0"
					// eslint-disable-next-line quotes
					buildSettingsObj["TARGETED_DEVICE_FAMILY"] = '"1,2"'
					buildSettingsObj["IPHONEOS_DEPLOYMENT_TARGET"] = "16.0"
				}

				if (props.developmentTeamId) {
					buildSettingsObj["DEVELOPMENT_TEAM"] = `"${props.developmentTeamId}"`
				}

				if (hasX86Target) {
					// there's a bug in the xcode node module that prevents us from correctly specifying EXCLUDED_ARCHS[sdk=iphonesimulator*]
					// so instead we have to exclude it completely
					buildSettingsObj["EXCLUDED_ARCHS"] = "arm64"
				} else {
					buildSettingsObj["EXCLUDED_ARCHS"] = "x86_64"
				}
			}
		}

		return config
	})
}

export const withFileProvider: ConfigPlugin<FileProviderPluginProps> = (config, props) => {
	// First handle the Rust build
	config = withDangerousMod(config, [
		"ios",
		async config => {
			await buildRustForIOS(props)

			return config
		}
	])

	// Then add the FileProvider target (which includes the framework)
	config = withFileProviderXcodeTarget(config, props)

	return config
}

export default withFileProvider
