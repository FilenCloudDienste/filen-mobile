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
import { decryptChatMessage } from "./src/lib/crypto"
import { dbFs } from "./src/lib/db"

if (!__DEV__) {
	console.log = () => {}
	console.error = () => {}
	console.warn = () => {}
} else {
	LogBox.ignoreLogs(["new NativeEventEmitter", "Module AssetExporter", "DEPRECATED", "messaging()"])
}

let foregroundServiceRegistered = false
let foregroundServiceRegisteredMutex = new Semaphore(1)
let transfersNotificationMutex = new Semaphore(1)
let transfersNotificationId = null
let foregroundServiceChannelId = null
let transfersNotification = null
let lastTransfersNotificationProgress = -1
let currentDownloadsCountGlobal = 0
let currentUploadsCountGlobal = 0
let nextHasPermissionsQuery = 0
let lastHasPermissions = false
let normalNotificationsChannelId = null
let normalNotificationMutex = new Semaphore(1)
let backgroundNotificationMutex = new Semaphore(1)
let cameraUploadNotificationMutex = new Semaphore(1)
let nextAllowedCameraUploadNotification = 0

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
	await foregroundServiceRegisteredMutex.acquire()

	try {
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
							.then(() => resolve())
							.catch(err => {
								console.error(err)

								resolve()
							})
							.finally(() => {
								foregroundServiceRegistered = false
							})
					}
				}, 2500)
			})
		})
	} catch (e) {
		throw e
	} finally {
		foregroundServiceRegisteredMutex.release()
	}
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

			await registerForegroundService()

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

const increaseBadgeCount = async by => {
	const current = await notifee.getBadgeCount()
	const newCount = current + by > 0 ? current + by : 1

	await notifee.setBadgeCount(newCount)
}

const resetBadgeCount = async () => {
	await notifee.setBadgeCount(0)
}

const onCameraUploadNotification = async () => {
	await cameraUploadNotificationMutex.acquire()

	const now = Date.now()

	try {
		if (nextAllowedCameraUploadNotification > now) {
			return
		}

		nextAllowedCameraUploadNotification = now + 60000

		await runCameraUpload(1, true)
	} catch (e) {
		throw e
	} finally {
		cameraUploadNotificationMutex.release()
	}
}

const buildNotification = async (payload, channelId) => {
	const lang = storage.getString("lang") || "en"
	let notification = {
		title: "Filen",
		body: i18n(lang, "newNotification"),
		android: {
			channelId,
			pressAction: {
				id: "open",
				launchActivity: "default"
			},
			groupSummary: true,
			groupId: "notifications",
			timestamp: Date.now()
		},
		data: {
			payload
		}
	}

	if (payload.type === "chatMessageNew") {
		const userId = storage.getNumber("userId")

		if (userId === parseInt(payload.senderId)) {
			return
		}

		const cache = await dbFs.get("chatConversations")
		const hasCache = cache && Array.isArray(cache)

		const senderName =
			typeof payload.senderNickName === "string" && payload.senderNickName.length > 0
				? payload.senderNickName
				: typeof payload.senderEmail === "string" && payload.senderEmail.length > 0
				? payload.senderEmail
				: i18n(lang, "aUser")

		notification = {
			...notification,
			title: senderName,
			body: i18n(lang, "chatMessageNewBody"),
			android: {
				...notification.android,
				pressAction: {
					...notification.android.pressAction,
					id: "openChats"
				}
			}
		}

		if (hasCache) {
			const conversations = cache.filter(conversation => conversation.uuid === payload.conversation)

			if (conversations.length > 0) {
				const conversation = conversations[0]
				const participants = conversation.participants.filter(participant => participant.userId === userId)

				if (participants.length > 0) {
					const participant = participants[0]
					const privateKey = storage.getString("privateKey")
					const messageDecrypted = await decryptChatMessage(payload.message, participant.metadata, privateKey)

					if (messageDecrypted.length > 0) {
						notification = {
							...notification,
							title: senderName,
							body: messageDecrypted,
							android: {
								...notification.android,
								pressAction: {
									...notification.android.pressAction,
									id: "openChat:" + payload.conversation
								}
							}
						}
					}
				}
			}
		}
	}

	if (payload.type === "contactRequestReceived") {
		const senderName =
			typeof payload.senderNickName === "string" && payload.senderNickName.length > 0
				? payload.senderNickName
				: typeof payload.senderEmail === "string" && payload.senderEmail.length > 0
				? payload.senderEmail
				: i18n(lang, "aUser")

		notification = {
			...notification,
			title: senderName,
			body: i18n(lang, "contactRequestReceivedBody"),
			android: {
				...notification.android,
				pressAction: {
					...notification.android.pressAction,
					id: "openContacts"
				}
			}
		}
	}

	return notification
}

const onBackgroundNotification = async (payload, completion) => {
	const isLoggedIn = storage.getBoolean("isLoggedIn")

	if (!isLoggedIn) {
		return
	}

	if (payload.type === "cameraUpload") {
		completion(NotificationBackgroundFetchResult.NEW_DATA)

		onCameraUploadNotification().catch(console.error)

		return
	}

	if (Platform.OS === "ios") {
		return
	}

	await backgroundNotificationMutex.acquire()

	try {
		if (!normalNotificationsChannelId) {
			normalNotificationsChannelId = await notifee.createChannel({
				id: "notifications",
				name: "Notifications",
				vibration: false,
				sound: undefined
			})
		}

		const notification = await buildNotification(payload, normalNotificationsChannelId)

		await notifee.displayNotification(notification)
		await increaseBadgeCount(1)
	} catch (e) {
		completion(NotificationBackgroundFetchResult.FAILED)

		throw e
	} finally {
		backgroundNotificationMutex.release()

		completion(NotificationBackgroundFetchResult.NEW_DATA)
	}
}

const onForegroundNotification = async (payload, completion) => {
	const isLoggedIn = storage.getBoolean("isLoggedIn")

	if (!isLoggedIn) {
		return
	}

	if (payload.type === "cameraUpload") {
		completion({ alert: false, sound: false, badge: false })

		return
	}

	if (Platform.OS === "ios") {
		completion({ alert: false, sound: false, badge: false })

		return
	}

	return

	await normalNotificationMutex.acquire()

	try {
		if (!normalNotificationsChannelId) {
			normalNotificationsChannelId = await notifee.createChannel({
				id: "notifications",
				name: "Notifications",
				vibration: false,
				sound: undefined
			})
		}

		const notification = await buildNotification(payload, normalNotificationsChannelId)

		await notifee.displayNotification(notification)
		await increaseBadgeCount(1)
	} catch (e) {
		throw e
	} finally {
		normalNotificationMutex.release()

		completion({ alert: false, sound: false, badge: false })
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

	try {
		await onForegroundNotification(notification.payload, completion)
	} catch (e) {
		console.error(e)
	}
})

Notifications.events().registerNotificationOpened((notification, completion, action) => {
	console.log(Platform.OS, "Notification opened by device user", notification)
	console.log(Platform.OS, `Notification opened with an action identifier: ${action.identifier} and response text: ${action.text}`)

	completion()
})

Notifications.events().registerNotificationReceivedBackground(async (notification, completion) => {
	console.log(Platform.OS, "Notification Received - Background", notification.payload)

	try {
		await onBackgroundNotification(notification.payload, completion)
	} catch (e) {
		console.error(e)
	}
})

Notifications.events().registerRemoteNotificationsRegistrationDenied(() => {
	storage.delete("pushToken")
})

Notifications.events().registerRemoteNotificationsRegistrationFailed(err => {
	console.error(err)

	storage.delete("pushToken")
})

const initPushNotifications = async () => {
	const permissions = await hasNotifyPermissions(true)

	if (!permissions) {
		return
	}

	try {
		Notifications.registerRemoteNotifications()
	} catch (e) {
		throw e
	}
}

initPushNotifications().catch(console.error)

setTimeout(() => {
	runCameraUpload()
}, 5000)

AppRegistry.registerComponent(appName, () => App)
