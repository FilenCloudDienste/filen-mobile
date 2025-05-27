/* eslint-disable @typescript-eslint/no-require-imports */
const { withAndroidManifest, AndroidConfig } = require("@expo/config-plugins")

/**
 * Expo config plugin to add Android permissions and foreground service configuration for Notifee
 * @param {Object} config - The expo config
 * @param {Object} props - Plugin configuration
 * @param {string[]} props.permissions - Array of Android permissions to add
 * @param {Object} props.foregroundService - Foreground service configuration
 * @param {string[]} props.foregroundService.serviceTypes - Array of foreground service types
 */
const withNotifee = (config, props = {}) => {
	const { permissions = [], foregroundService = {} } = props

	// Add permissions
	config = withAndroidManifest(config, config => {
		const androidManifest = config.modResults
		const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(androidManifest)

		// Add custom permissions
		if (!androidManifest.manifest["uses-permission"]) {
			androidManifest.manifest["uses-permission"] = []
		}

		// Common foreground service related permissions
		const foregroundPermissions = []
		if (foregroundService.serviceTypes) {
			// Add foreground service permission if service types are specified
			foregroundPermissions.push("android.permission.FOREGROUND_SERVICE")

			// Add specific foreground service type permissions based on Android 14+ requirements
			foregroundService.serviceTypes.forEach(type => {
				switch (type) {
					case "location":
						foregroundPermissions.push("android.permission.FOREGROUND_SERVICE_LOCATION")
						break
					case "camera":
						foregroundPermissions.push("android.permission.FOREGROUND_SERVICE_CAMERA")
						break
					case "microphone":
						foregroundPermissions.push("android.permission.FOREGROUND_SERVICE_MICROPHONE")
						break
					case "phoneCall":
						foregroundPermissions.push("android.permission.FOREGROUND_SERVICE_PHONE_CALL")
						break
					case "dataSync":
						foregroundPermissions.push("android.permission.FOREGROUND_SERVICE_DATA_SYNC")
						break
					case "mediaPlayback":
						foregroundPermissions.push("android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK")
						break
					case "mediaProjection":
						foregroundPermissions.push("android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION")
						break
					case "connectedDevice":
						foregroundPermissions.push("android.permission.FOREGROUND_SERVICE_CONNECTED_DEVICE")
						break
					case "systemExempted":
						foregroundPermissions.push("android.permission.FOREGROUND_SERVICE_SYSTEM_EXEMPTED")
						break
					case "remoteMessaging":
						foregroundPermissions.push("android.permission.FOREGROUND_SERVICE_REMOTE_MESSAGING")
						break
					case "health":
						foregroundPermissions.push("android.permission.FOREGROUND_SERVICE_HEALTH")
						break
					case "specialUse":
						foregroundPermissions.push("android.permission.FOREGROUND_SERVICE_SPECIAL_USE")
						break
				}
			})
		}

		// Combine all permissions
		const allPermissions = [...permissions, ...foregroundPermissions]

		// Add permissions to manifest
		allPermissions.forEach(permission => {
			const permissionName = permission.startsWith("android.permission.") ? permission : `android.permission.${permission}`

			const existingPermission = androidManifest.manifest["uses-permission"].find(p => p.$["android:name"] === permissionName)

			if (!existingPermission) {
				androidManifest.manifest["uses-permission"].push({
					$: {
						"android:name": permissionName
					}
				})
			}
		})

		// Add Notifee foreground service configuration
		if (foregroundService.serviceTypes && foregroundService.serviceTypes.length > 0) {
			// Add service declaration if needed
			if (!mainApplication.service) {
				mainApplication.service = []
			}

			// Check if Notifee's foreground service already exists
			const notifeeServiceName = "app.notifee.core.ForegroundService"
			let notifeeService = mainApplication.service.find(s => s.$["android:name"] === notifeeServiceName)

			if (!notifeeService) {
				// Create new Notifee foreground service declaration
				notifeeService = {
					$: {
						"android:name": notifeeServiceName,
						"android:foregroundServiceType": foregroundService.serviceTypes.join("|")
					}
				}
				mainApplication.service.push(notifeeService)
			} else {
				// Update existing service with foreground service types
				notifeeService.$["android:foregroundServiceType"] = foregroundService.serviceTypes.join("|")
			}
		}

		return config
	})

	return config
}

module.exports = withNotifee
