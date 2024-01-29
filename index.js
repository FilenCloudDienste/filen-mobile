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
let buildNotificationMutex = new Semaphore(1)
let cameraUploadNotificationMutex = new Semaphore(1)
let nextAllowedCameraUploadNotification = 0
let cameraUploadStatusGlobal = "inactive"
let normalNotificationsMutex = new Semaphore(1)
let handleForegroundServiceMutex = new Semaphore(1)

const hasNotifyPermissions = async () => {
	const now = Date.now()

	if (nextHasPermissionsQuery !== 0 && nextHasPermissionsQuery > now) {
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
					handleForegroundServiceMutex.acquire().then(() => {
						if (currentDownloadsCountGlobal + currentUploadsCountGlobal <= 0 && cameraUploadStatusGlobal === "inactive") {
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

									handleForegroundServiceMutex.release()
								})
						} else {
							handleForegroundServiceMutex.release()
						}
					})
				}, 1000)
			})
		})
	} catch (e) {
		throw e
	} finally {
		foregroundServiceRegisteredMutex.release()
	}
}

const handleForegroundService = async progress => {
	await handleForegroundServiceMutex.acquire()

	try {
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
		const transferring =
			currentUploadsCountGlobal + currentDownloadsCountGlobal <= 0 && cameraUploadStatusGlobal !== "inactive"
				? 1
				: currentUploadsCountGlobal + currentDownloadsCountGlobal

		transfersNotification = {
			title:
				transferring <= 1
					? i18n(lang, "transferringDots")
					: i18n(lang, "transferringFiles", true, ["__NUM__"], [transferring.toString()]),
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
				groupId: "foregroundService",
				timestamp: Date.now(),
				smallIcon: "ic_small_icon",
				color: "#ffffff"
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
			const transferring =
				currentUploadsCountGlobal + currentDownloadsCountGlobal <= 0 && cameraUploadStatusGlobal !== "inactive"
					? 1
					: currentUploadsCountGlobal + currentDownloadsCountGlobal

			await notifee.displayNotification({
				...transfersNotification,
				id: transfersNotificationId,
				title:
					transferring <= 1
						? i18n(lang, "transferringDots")
						: i18n(lang, "transferringFiles", true, ["__NUM__"], [transferring.toString()]),
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
		throw e
	} finally {
		handleForegroundServiceMutex.release()
	}
}

if (Platform.OS === "android") {
	eventListener.on("cameraUploadStatus", async status => {
		cameraUploadStatusGlobal = status

		await transfersNotificationMutex.acquire()

		try {
			if (currentDownloadsCountGlobal + currentUploadsCountGlobal <= 0 && cameraUploadStatusGlobal === "inactive") {
				transfersNotificationId = null
				foregroundServiceChannelId = null
				transfersNotification = null
				lastTransfersNotificationProgress = -1
				currentDownloadsCountGlobal = 0
				currentUploadsCountGlobal = 0
				cameraUploadStatusGlobal = "inactive"

				return
			}

			if (cameraUploadStatusGlobal === "inactive") {
				return
			}

			const progress = 0

			await handleForegroundService(progress)
		} catch (e) {
			console.error(e)
		} finally {
			transfersNotificationMutex.release()
		}
	})

	eventListener.on("transfersUpdate", async ({ progress, currentDownloadsCount, currentUploadsCount }) => {
		currentDownloadsCountGlobal = currentDownloadsCount
		currentUploadsCountGlobal = currentUploadsCount

		await transfersNotificationMutex.acquire()

		try {
			if (currentDownloadsCountGlobal + currentUploadsCountGlobal <= 0 && cameraUploadStatusGlobal === "inactive") {
				transfersNotificationId = null
				foregroundServiceChannelId = null
				transfersNotification = null
				lastTransfersNotificationProgress = -1
				currentDownloadsCountGlobal = 0
				currentUploadsCountGlobal = 0
				cameraUploadStatusGlobal = "inactive"

				return
			}

			if (currentDownloadsCountGlobal + currentUploadsCountGlobal <= 0) {
				return
			}

			progress = Math.round(progress)
			progress = progress <= 0 ? 0 : progress
			progress = progress >= 100 ? 100 : progress

			await handleForegroundService(progress)
		} catch (e) {
			console.error(e)
		} finally {
			transfersNotificationMutex.release()
		}
	})
}

const increaseBadgeCount = async by => {
	const current = await notifee.getBadgeCount()
	const newCount = current + by > 0 ? current + by : 1

	await notifee.setBadgeCount(newCount)
}

const onCameraUploadNotification = async () => {
	await cameraUploadNotificationMutex.acquire()

	try {
		eventListener.emit("cameraUploadStatus", "active")

		const now = Date.now()

		if (nextAllowedCameraUploadNotification > now) {
			return
		}

		nextAllowedCameraUploadNotification = now + 60000

		await runCameraUpload(1, true)
	} catch (e) {
		throw e
	} finally {
		cameraUploadNotificationMutex.release()

		eventListener.emit("cameraUploadStatus", "inactive")
	}
}

const buildNotification = async payload => {
	await buildNotificationMutex.acquire()

	try {
		const permissions = await hasNotifyPermissions()

		if (!permissions) {
			return null
		}

		if (!normalNotificationsChannelId) {
			normalNotificationsChannelId = await notifee.createChannel({
				id: "notifications",
				name: "Notifications",
				vibration: false,
				sound: undefined
			})
		}

		const lang = storage.getString("lang") || "en"
		let notification = {
			title: "Filen",
			body: i18n(lang, "newNotification"),
			android: {
				channelId: normalNotificationsChannelId,
				pressAction: {
					id: "open",
					launchActivity: "default"
				},
				groupId: "notifications",
				timestamp: Date.now(),
				smallIcon: "ic_small_icon",
				color: "#ffffff"
			},
			data: {
				payload
			}
		}

		if (payload.type === "chatMessageNew") {
			const userId = storage.getNumber("userId")

			if (userId === parseInt(payload.senderId)) {
				return null
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
					...(typeof payload.senderAvatar === "string" && payload.senderAvatar.startsWith("https://")
						? { largeIcon: payload.senderAvatar }
						: {}),
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

						if (typeof privateKey === "string" && privateKey.length > 0) {
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
					...(typeof payload.senderAvatar === "string" && payload.senderAvatar.startsWith("https://")
						? { largeIcon: payload.senderAvatar }
						: {}),
					pressAction: {
						...notification.android.pressAction,
						id: "openContacts"
					}
				}
			}
		}

		return notification
	} catch (e) {
		throw e
	} finally {
		buildNotificationMutex.release()
	}
}

const onBackgroundNotification = async (payload, completion) => {
	const isLoggedIn = storage.getBoolean("isLoggedIn")

	if (!isLoggedIn) {
		return
	}

	if (payload.type === "cameraUpload") {
		try {
			onCameraUploadNotification().catch(console.error)
		} catch (e) {
			console.error(e)
		}

		completion(NotificationBackgroundFetchResult.NEW_DATA)

		return
	}

	if (Platform.OS === "ios") {
		return
	}

	await normalNotificationsMutex.acquire()

	try {
		const notification = await buildNotification(payload)

		if (notification) {
			await notifee.displayNotification(notification)
			await increaseBadgeCount(1)
		}

		completion(NotificationBackgroundFetchResult.NEW_DATA)
	} catch (e) {
		completion(NotificationBackgroundFetchResult.FAILED)

		throw e
	} finally {
		normalNotificationsMutex.release()
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

	completion({ alert: false, sound: false, badge: false })
}

notifee.onBackgroundEvent(async () => {})

Notifications.events().registerRemoteNotificationsRegistered(event => {
	storage.set("pushToken", event.deviceToken)
})

Notifications.events().registerRemoteNotificationsRegistrationFailed(event => {
	console.error(event)
})

Notifications.events().registerNotificationReceivedForeground(async (notification, completion) => {
	console.log(Platform.OS, "registerNotificationReceivedForeground", notification.payload)

	try {
		await onForegroundNotification(notification.payload, completion)
	} catch (e) {
		console.error(e)
	}
})

Notifications.events().registerNotificationOpened((notification, completion, action) => {
	completion()
})

Notifications.events().registerNotificationReceivedBackground(async (notification, completion) => {
	console.log(Platform.OS, "registerNotificationReceivedBackground", notification.payload)

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
	const permissions = await hasNotificationPermissions(true)

	if (!permissions) {
		return
	}

	try {
		Notifications.registerRemoteNotifications({
			carPlay: false,
			alert: true,
			badge: true,
			sound: true,
			criticalAlert: false,
			provisional: false,
			announcement: false
		})

		Notifications.setNotificationChannel({
			channelId: "notifications",
			name: "Notifications",
			importance: 5,
			description: "Notifications",
			enableVibration: false,
			groupId: "notifications",
			groupName: "Notifications",
			showBadge: true,
			soundFile: undefined,
			vibrationPattern: undefined
		})

		normalNotificationsChannelId = "notifications"
	} catch (e) {
		throw e
	}
}

initPushNotifications().catch(console.error)

setTimeout(() => {
	runCameraUpload()

	global.nodeThread.getCurrentTransfers().catch(console.error)
}, 5000)

AppRegistry.registerComponent(appName, () => App)
