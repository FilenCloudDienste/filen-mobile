import { AppRegistry, Platform, LogBox } from "react-native"
import { name as appName } from "./app.json"
import "./src/lib/globals"
import "./src/lib/node"
import { App } from "./src/App"
import { runCameraUpload } from "./src/lib/services/cameraUpload"
import notifee, { AndroidImportance } from "@notifee/react-native"
import eventListener from "./src/lib/eventListener"
import { i18n } from "./src/i18n"
import storage from "./src/lib/storage"
import { Notifications, NotificationBackgroundFetchResult } from "react-native-notifications"
import { hasNotificationPermissions } from "./src/lib/permissions"

if (!__DEV__) {
	console.log = () => {}
	console.error = () => {}
	console.warn = () => {}
} else {
	LogBox.ignoreLogs(["new NativeEventEmitter", "Module AssetExporter", "DEPRECATED", "messaging()"])
}

const foregroundServices = {}
let uploadNotification = null
let downloadNotification = null

eventListener.on("startForegroundService", type => {
	if (Platform.OS === "ios") {
		return
	}

	const showNotification = typeof foregroundServices[type] === "boolean" && foregroundServices[type] === false

	foregroundServices[type] = true

	if (showNotification) {
		;(async () => {
			const lang = storage.getString("lang") || "en"
			const channelId = await notifee.createChannel({
				id: "foregroundService",
				name: "Foreground Service"
			})

			const notification = {
				title:
					type === "cameraUpload"
						? i18n(lang, "cameraUploadNotificationTitle")
						: type === "upload"
						? i18n(lang, "uploadNotificationTitle")
						: i18n(lang, "downloadNotificationTitle"),
				android: {
					channelId,
					asForegroundService: true,
					localOnly: true,
					ongoing: true,
					importance: AndroidImportance.HIGH,
					progress: {
						indeterminate: true
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

			const id = await notifee.displayNotification(notification)

			if (type === "upload") {
				uploadNotification = {
					...notification,
					id
				}
			}

			if (type === "download") {
				downloadNotification = {
					...notification,
					id
				}
			}
		})().catch(console.error)
	}
})

eventListener.on("stopForegroundService", type => {
	if (Platform.OS === "ios") {
		return
	}

	foregroundServices[type] = false
})

eventListener.on("foregroundServiceUploadDownloadProgress", progress => {
	if (isNaN(progress) || Platform.OS === "ios") {
		return
	}

	progress = Math.round(progress)
	progress = progress <= 0 ? 0 : progress
	progress = progress >= 100 ? 100 : progress

	if (uploadNotification) {
		notifee
			.displayNotification({
				...uploadNotification,
				android: {
					...uploadNotification.android,
					progress: {
						...uploadNotification.android.progress,
						max: 100,
						current: progress,
						indeterminate: false
					}
				}
			})
			.catch(console.error)
	}

	if (downloadNotification) {
		notifee
			.displayNotification({
				...downloadNotification,
				android: {
					...downloadNotification.android,
					progress: {
						...downloadNotification.android.progress,
						max: 100,
						current: progress,
						indeterminate: false
					}
				}
			})
			.catch(console.error)
	}
})

if (Platform.OS === "android") {
	notifee.onBackgroundEvent(async () => {})

	notifee.registerForegroundService(() => {
		return new Promise(resolve => {
			const wait = setInterval(() => {
				if (Object.keys(foregroundServices).filter(type => foregroundServices[type] === true).length <= 0) {
					clearInterval(wait)

					notifee
						.stopForegroundService()
						.then(() => resolve())
						.catch(err => {
							console.error(err)

							resolve()
						})
				}
			}, 1000)
		})
	})
}

const registerPushToken = async token => {
	console.log("Push token:", token)

	storage.set("pushToken", token)
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
	console.log(Platform.OS, "Device Token Received", event.deviceToken)
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
		name: "Chat"
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
		name: "Chat"
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
