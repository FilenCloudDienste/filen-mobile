import { AppRegistry, Platform, LogBox } from "react-native"
import { name as appName } from "./app.json"
import "./src/lib/globals"
import "./src/lib/node"
import "./src/lib/services/socket/socket"
import { App } from "./src/App"
import { runCameraUpload } from "./src/lib/services/cameraUpload"
import notifee, { AndroidImportance } from "@notifee/react-native"
import eventListener from "./src/lib/eventListener"
import { i18n } from "./src/i18n"
import storage from "./src/lib/storage"
import { Notifications, NotificationBackgroundFetchResult } from "react-native-notifications"
import { hasNotificationPermissions } from "./src/lib/permissions"
import { Semaphore } from "./src/lib/helpers"

if (!__DEV__) {
	console.log = () => {}
	console.error = () => {}
	console.warn = () => {}
} else {
	LogBox.ignoreLogs(["new NativeEventEmitter", "Module AssetExporter", "DEPRECATED", "messaging()"])
}

let foregroundServiceRegistered = false
let transfersNotificationMutex = new Semaphore(1)
let transfersNotificationId = null
let foregroundServiceChannelId = null
let transfersNotification = null
let lastTransfersNotificationProgress = -1
let currentDownloadsCountGlobal = 0
let currentUploadsCountGlobal = 0
let nextHasPermissionsQuery = 0
let lastHasPermissions = false

const hasNotifyPermissions = async () => {
	const now = Date.now()

	if (nextHasPermissionsQuery > now) {
		return lastHasPermissions
	}

	nextHasPermissionsQuery = now + 300000

	const permissions = await hasNotificationPermissions(false)

	lastHasPermissions = permissions

	return lastHasPermissions
}

const registerForegroundService = async () => {
	if (foregroundServiceRegistered) {
		return
	}

	foregroundServiceRegistered = true

	notifee.registerForegroundService(() => {
		return new Promise(resolve => {
			const wait = setInterval(() => {
				if (currentDownloadsCountGlobal + currentUploadsCountGlobal <= 0) {
					clearInterval(wait)

					notifee
						.stopForegroundService()
						.then(() => {
							foregroundServiceRegistered = false

							resolve()
						})
						.catch(err => {
							console.error(err)

							foregroundServiceRegistered = false

							resolve()
						})
				}
			}, 2500)
		})
	})
}

if (Platform.OS === "android") {
	eventListener.on("transfersUpdate", async ({ progress, currentDownloadsCount, currentUploadsCount }) => {
		currentDownloadsCountGlobal = currentDownloadsCount
		currentUploadsCountGlobal = currentUploadsCount

		await transfersNotificationMutex.acquire()

		try {
			if (currentDownloadsCount + currentUploadsCount <= 0) {
				transfersNotificationId = null
				foregroundServiceChannelId = null
				transfersNotification = null
				lastTransfersNotificationProgress = -1

				return
			}

			if (currentDownloadsCount + currentUploadsCount <= 0) {
				return
			}

			if (!foregroundServiceRegistered) {
				registerForegroundService()
			}

			const permissions = await hasNotifyPermissions()

			if (!permissions) {
				return
			}

			if (!foregroundServiceChannelId) {
				foregroundServiceChannelId = await notifee.createChannel({
					id: "foregroundService",
					name: "Foreground Service",
					vibration: false,
					sound: undefined
				})
			}

			const lang = storage.getString("lang") || "en"

			progress = Math.round(progress)
			progress = progress <= 0 ? 0 : progress
			progress = progress >= 100 ? 100 : progress

			transfersNotification = {
				title: i18n(lang, "transferringFiles", true, ["__NUM__"], [(currentDownloadsCount + currentUploadsCount).toString()]),
				android: {
					channelId: foregroundServiceChannelId,
					asForegroundService: true,
					localOnly: true,
					ongoing: true,
					importance: AndroidImportance.HIGH,
					onlyAlertOnce: false,
					loopSound: false,
					autoCancel: false,
					progress: {
						max: 100,
						current: progress,
						indeterminate: progress >= 100 || progress <= 0
					},
					pressAction: {
						id: "foregroundService",
						launchActivity: "default"
					},
					groupSummary: true,
					groupId: "foregroundService",
					timestamp: Date.now()
				},
				data: {
					type: "foregroundService"
				}
			}

			if (!transfersNotificationId) {
				transfersNotificationId = await notifee.displayNotification(transfersNotification)

				lastTransfersNotificationProgress = progress
			}

			if (progress !== lastTransfersNotificationProgress && transfersNotificationId) {
				await notifee.displayNotification({
					...transfersNotification,
					id: transfersNotificationId,
					title: i18n(lang, "transferringFiles", true, ["__NUM__"], [(currentDownloadsCount + currentUploadsCount).toString()]),
					android: {
						...transfersNotification.android,
						progress: {
							...transfersNotification.android.progress,
							current: progress,
							indeterminate: progress >= 100 || progress <= 0
						}
					}
				})

				lastTransfersNotificationProgress = progress
			}
		} catch (e) {
			console.error(e)
		} finally {
			transfersNotificationMutex.release()
		}
	})
}

if (Platform.OS === "android") {
	notifee.onBackgroundEvent(async () => {})
}

const onPushNotification = async message => {
	console.log(message)

	const int = setInterval(() => {
		console.log(Date.now())
	}, 1000)

	await new Promise(resolve => setTimeout(resolve, 15000))

	clearInterval(int)

	return

	if (!message || !message.data || !message.data.type || !message.sentTime) {
		return
	}

	const type = message.data.type

	if (type === "cameraUploadPing") {
		eventListener.emit("startForegroundService", "cameraUpload")

		await runCameraUpload(1, true).catch(console.error)

		eventListener.emit("stopForegroundService", "cameraUpload")
	}
}

Notifications.events().registerRemoteNotificationsRegistered(event => {
	storage.set("pushToken", event.deviceToken)
})

Notifications.events().registerRemoteNotificationsRegistrationFailed(event => {
	console.error(event)
})

Notifications.events().registerNotificationReceivedForeground(async (notification, completion) => {
	console.log(Platform.OS, "Notification Received - Foreground", notification.payload)

	if (Platform.OS === "ios") {
		completion({ alert: true, sound: false, badge: false })

		return
	}

	const channelId = await notifee.createChannel({
		id: "chat",
		name: "Chat",
		vibration: false
	})

	const res = await nodeThread.encryptMetadata({
		data: "foo",
		key: "bar"
	})

	await notifee.displayNotification({
		title: "filen",
		body: "Foreground: " + res,
		android: {
			channelId,
			pressAction: {
				id: "chat",
				launchActivity: "default"
			},
			groupSummary: true,
			groupId: "chat",
			timestamp: Date.now()
		},
		data: {
			type: "chat"
		}
	})

	completion({ alert: false, sound: false, badge: false })
})

Notifications.events().registerNotificationOpened((notification, completion, action) => {
	console.log(Platform.OS, "Notification opened by device user", notification.payload)
	console.log(Platform.OS, `Notification opened with an action identifier: ${action.identifier} and response text: ${action.text}`)
	completion()
})

Notifications.events().registerNotificationReceivedBackground(async (notification, completion) => {
	console.log(Platform.OS, "Notification Received - Background", notification.payload)

	if (Platform.OS === "ios") {
		return
	}

	const channelId = await notifee.createChannel({
		id: "chat",
		name: "Chat",
		vibration: false
	})

	const res = await nodeThread.encryptMetadata({
		data: "foo",
		key: "bar"
	})

	await notifee.displayNotification({
		title: "filen",
		body: "Background: " + res,
		android: {
			channelId,
			pressAction: {
				id: "chat",
				launchActivity: "default"
			},
			groupSummary: true,
			groupId: "chat",
			timestamp: Date.now()
		},
		data: {
			type: "chat"
		}
	})

	completion(NotificationBackgroundFetchResult.NEW_DATA)
})

const initPushNotifications = async () => {
	const hasPermissions = await hasNotificationPermissions(true)

	if (!hasPermissions) {
		return
	}

	Notifications.registerRemoteNotifications()
}

initPushNotifications().catch(console.error)

setTimeout(() => {
	runCameraUpload()
}, 5000)

AppRegistry.registerComponent(appName, () => App)
