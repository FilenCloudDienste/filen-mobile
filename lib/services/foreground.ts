import { Platform } from "react-native"
import Semaphore from "../semaphore"
import { useTransfersStore } from "@/stores/transfers.store"
import notifee, { type Notification, AndroidImportance, AuthorizationStatus } from "@notifee/react-native"
import nodeWorker from "../nodeWorker"

export class ForegroundService {
	private isRegistered: boolean = false
	private readonly mutex: Semaphore = new Semaphore(1)
	private startCount: number = 0
	private notificationId: string | null = null
	private channelId: string | null = null
	private notification: Notification | null = null

	public constructor() {
		if (Platform.OS === "android") {
			useTransfersStore.subscribe(({ progress }) => {
				if (!this.isRegistered || this.startCount <= 0 || !this.notificationId || !this.notification) {
					this.stop().catch(console.error)

					return
				}

				notifee
					.displayNotification({
						...this.notification,
						id: this.notificationId,
						title: "Transfers in progress",
						android: {
							...this.notification.android,
							progress: {
								...(this.notification.android ?? {}).progress,
								max: 100,
								current: progress >= 100 ? 100 : progress <= 0 ? 0 : progress,
								indeterminate: progress >= 100 || progress <= 0
							}
						}
					})
					.catch(console.error)
			})
		}
	}

	public async register(): Promise<void> {
		if (Platform.OS !== "android") {
			return
		}

		await this.mutex.acquire()

		try {
			if (this.isRegistered) {
				return
			}

			this.channelId = await notifee.createChannel({
				id: "foregroundService",
				name: "Foreground Service",
				vibration: false,
				sound: undefined
			})

			notifee.registerForegroundService(
				() =>
					new Promise(resolve => {
						const wait = setInterval(() => {
							if (!this.isRegistered || this.startCount <= 0 || !this.notificationId || !this.notification) {
								clearInterval(wait)

								notifee
									.stopForegroundService()
									.then(() => {
										console.log(
											"Foreground service stopping",
											this.isRegistered,
											this.startCount,
											this.notificationId,
											this.notification
										)
									})
									.catch(console.error)
									.finally(() => {
										nodeWorker
											.proxy("foregroundServiceActive", {
												active: false
											})
											.catch(console.error)
											.finally(() => {
												resolve()
											})
									})
							} else {
								nodeWorker.proxy("ping", undefined).catch(console.error)
							}
						}, 3000)
					})
			)

			console.log("Foreground service registered with channel ID:", this.channelId)

			this.isRegistered = true
		} catch (e) {
			console.error("Error registering foreground service:", e)

			this.isRegistered = false
			this.channelId = null
			this.notificationId = null
			this.notification = null
			this.startCount = 0
		} finally {
			this.mutex.release()
		}
	}

	public async start(): Promise<void> {
		if (Platform.OS !== "android") {
			return
		}

		await this.mutex.acquire()

		try {
			if (!this.isRegistered || !this.channelId) {
				return
			}

			const permissions = await notifee.requestPermission()

			if (permissions.authorizationStatus !== AuthorizationStatus.AUTHORIZED) {
				console.warn("Foreground service not started, notification permissions not granted")

				return
			}

			if (!this.notificationId || !this.notification) {
				const { progress } = useTransfersStore.getState()

				this.notification = {
					title: "Transfers in progress",
					android: {
						channelId: this.channelId,
						asForegroundService: true,
						localOnly: true,
						ongoing: true,
						importance: AndroidImportance.HIGH,
						onlyAlertOnce: false,
						loopSound: false,
						autoCancel: false,
						progress: {
							max: 100,
							current: progress >= 100 ? 100 : progress <= 0 ? 0 : progress,
							indeterminate: progress >= 100 || progress <= 0
						},
						pressAction: {
							id: "foregroundService",
							launchActivity: "default"
						},
						groupId: "foregroundService",
						timestamp: Date.now(),
						//smallIcon: "ic_small_icon",
						color: "#ffffff"
					},
					data: {
						type: "foregroundService"
					}
				} satisfies Notification

				try {
					this.notificationId = await notifee.displayNotification(this.notification)

					await nodeWorker.proxy("foregroundServiceActive", {
						active: true
					})
				} catch {
					await nodeWorker.proxy("foregroundServiceActive", {
						active: false
					})
				}
			}

			this.startCount += 1
		} finally {
			this.mutex.release()
		}
	}

	public async stop(): Promise<void> {
		if (Platform.OS !== "android") {
			return
		}

		await this.mutex.acquire()

		try {
			if (!this.isRegistered || !this.notificationId || !this.notification || this.startCount <= 0 || !this.channelId) {
				return
			}

			if (this.startCount-- > 0) {
				return
			}

			this.notificationId = null
			this.notification = null
			this.startCount = 0
		} finally {
			this.mutex.release()
		}
	}
}

const foregroundService = new ForegroundService()

export default foregroundService
