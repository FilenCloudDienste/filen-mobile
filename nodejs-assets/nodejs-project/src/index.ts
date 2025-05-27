import { serializeError, sleep, calcSpeed, calcTimeLeft, normalizeTransferProgress, promiseAllChunked } from "./lib/utils"
import * as handlers from "./handlers"
import { PauseSignal } from "@filen/sdk"
import transfersStore from "./stores/transfers.store"
import { Semaphore } from "./lib/semaphore"
import HTTP from "./lib/http"

export class NodeWorker {
	public readonly bridge: NodeBridge
	public readonly transfersAbortControllers: Record<string, AbortController> = {}
	public readonly transfersPauseSignals: Record<string, PauseSignal> = {}
	public transfersProgressStarted: number = -1
	public transfersAllBytes: number = 0
	public transfersBytesSent: number = 0
	private transfersPausedOnLock: string[] = []
	private readonly pauseMutex = new Semaphore(1)
	public readonly http: HTTP
	private state: "paused" | "running" = "running"
	public foregroundServiceActive: boolean = false

	public constructor(bridge: NodeBridge) {
		this.bridge = bridge
		this.http = new HTTP()

		this.initialize().catch(console.error)
	}

	private async initialize(): Promise<void> {
		try {
			this.bridge.channel.on("message", message => {
				this.handleMessage(message)
			})

			this.bridge.app.on("pause", async pauseLock => {
				if (!pauseLock || !pauseLock.release || typeof pauseLock.release !== "function") {
					return
				}

				try {
					await this.pause()
				} catch (e) {
					console.error(e)
				}

				pauseLock.release()
			})

			this.bridge.app.on("resume", async () => {
				try {
					await this.resume()
				} catch (e) {
					console.error(e)
				}
			})

			transfersStore.subscribe(
				state => ({
					transfers: state.transfers,
					finishedTransfers: state.finishedTransfers
				}),
				({ transfers, finishedTransfers }) => {
					const ongoingTransfers = transfers.filter(
						transfer => transfer.state === "queued" || transfer.state === "started" || transfer.state === "paused"
					)

					if (ongoingTransfers.length === 0) {
						this.transfersProgressStarted = -1
						this.transfersAllBytes = 0
						this.transfersBytesSent = 0

						this.bridge.channel.send({
							type: "transfers",
							data: {
								transfers,
								finishedTransfers,
								speed: 0,
								remaining: 0,
								progress: 0
							}
						})

						return
					}

					const now = Date.now()
					let remaining =
						ongoingTransfers.length > 0 ? calcTimeLeft(now, this.transfersProgressStarted, this.transfersBytesSent) : 0

					if (ongoingTransfers.length > 0) {
						// TODO
						// Quick "hack" to better calculate remaining time when a lot of small files are being transferred (not really accurate, needs better solution)
						remaining = remaining + Math.floor(ongoingTransfers.length / 2)
					}

					const progress = normalizeTransferProgress(this.transfersAllBytes, this.transfersBytesSent)
					const speed = calcSpeed(now, this.transfersProgressStarted, this.transfersBytesSent)

					this.bridge.channel.send({
						type: "transfers",
						data: {
							transfers,
							finishedTransfers,
							speed,
							remaining,
							progress
						}
					})
				}
			)

			const http = await this.http.start()

			this.bridge.channel.send({
				type: "ready",
				data: {
					success: true,
					httpPort: http.port,
					httpAuthToken: http.authToken
				}
			})
		} catch (e) {
			this.bridge.channel.send({
				type: "ready",
				data: {
					success: false,
					error: serializeError(e instanceof Error ? serializeError(e as Error) : new Error("Unknown error"))
				}
			})
		}
	}

	private async pause(): Promise<void> {
		await this.pauseMutex.acquire()

		try {
			if (this.state !== "running" || this.foregroundServiceActive) {
				return
			}

			const start = Date.now()
			const promises: Promise<void>[] = []

			promises.push(this.http.stop(true))

			this.transfersPausedOnLock = []

			for (const id in this.transfersPauseSignals) {
				promises.push(
					new Promise<void>((resolve, reject) => {
						this.handlers
							.transferAction({
								action: "pause",
								id
							})
							.then(paused => {
								if (paused) {
									this.transfersPausedOnLock.push(id)
								}

								resolve()
							})
							.catch(reject)
					})
				)
			}

			await promiseAllChunked(promises)

			const timeTaken = Date.now() - start
			const sleepWait = 2500 - timeTaken

			if (sleepWait > 0) {
				// We roughly have 3-5 seconds on iOS and 5-10 seconds on Android to suspend.
				// The pause signals do not kick in immediately, that's why we wait for another second until we tell the OS that we've paused everything.
				await sleep(sleepWait)
			}

			this.state = "paused"
		} finally {
			this.pauseMutex.release()
		}
	}

	private async resume(): Promise<void> {
		await this.pauseMutex.acquire()

		try {
			if (this.state !== "paused") {
				return
			}

			const promises: Promise<boolean>[] = []

			promises.push(
				(async () => {
					const { port, authToken } = await this.http.start()

					this.bridge.channel.send({
						type: "httpServer",
						data: {
							port,
							authToken
						}
					})

					return true
				})()
			)

			for (const id in this.transfersPausedOnLock) {
				promises.push(
					this.handlers.transferAction({
						action: "resume",
						id
					})
				)
			}

			this.transfersPausedOnLock = []

			await promiseAllChunked(promises)

			this.state = "running"
		} finally {
			this.pauseMutex.release()
		}
	}

	public async exit(): Promise<void> {
		await this.pause()

		process.exit(0)
	}

	private async handleMessage(message: NodeBridgeMessage): Promise<void> {
		if (message.type !== "request") {
			return
		}

		const fnName = message.data.function as keyof typeof this.handlers
		const fn = this.handlers[fnName]

		if (typeof fn !== "function") {
			this.bridge.channel.send({
				type: "response",
				id: message.id,
				data: {
					function: message.data.function,
					success: false,
					error: serializeError(new Error(`Handler for function "${message.data.function}" not found.`))
				}
			})

			return
		}

		try {
			const result = await fn(message.data.params)

			this.bridge.channel.send({
				type: "response",
				id: message.id,
				data: {
					function: message.data.function,
					success: true,
					result
				}
			})
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				this.bridge.channel.send({
					type: "response",
					id: message.id,
					data: {
						function: message.data.function as unknown as any,
						success: false,
						error: serializeError(e)
					}
				})
			} else {
				this.bridge.channel.send({
					type: "response",
					id: message.id,
					data: {
						function: message.data.function as unknown as any,
						success: false,
						error: serializeError(new Error(`Request function "${message.data.function}" returned an unknown error.`))
					}
				})
			}
		}
	}

	public handlers = {
		ping: handlers.ping.bind(this),
		login: handlers.login.bind(this),
		reinitSDK: handlers.reinitSDK.bind(this),
		fetchCloudItems: handlers.fetchCloudItems.bind(this),
		uploadFile: handlers.uploadFile.bind(this),
		downloadFile: handlers.downloadFile.bind(this),
		transferAction: handlers.transferAction.bind(this),
		fetchNotes: handlers.fetchNotes.bind(this),
		fetchChats: handlers.fetchChats.bind(this),
		renameFile: handlers.renameFile.bind(this),
		renameDirectory: handlers.renameDirectory.bind(this),
		editFileMetadata: handlers.editFileMetadata.bind(this),
		editDirectoryMetadata: handlers.editDirectoryMetadata.bind(this),
		fileUUIDToPath: handlers.fileUUIDToPath.bind(this),
		directoryUUIDToPath: handlers.directoryUUIDToPath.bind(this),
		changeDirectoryColor: handlers.changeDirectoryColor.bind(this),
		favoriteDirectory: handlers.favoriteDirectory.bind(this),
		favoriteFile: handlers.favoriteFile.bind(this),
		shareItems: handlers.shareItems.bind(this),
		fetchContacts: handlers.fetchContacts.bind(this),
		trashFile: handlers.trashFile.bind(this),
		trashDirectory: handlers.trashDirectory.bind(this),
		fetchDirectorySize: handlers.fetchDirectorySize.bind(this),
		moveFile: handlers.moveFile.bind(this),
		moveDirectory: handlers.moveDirectory.bind(this),
		createDirectory: handlers.createDirectory.bind(this),
		toggleItemPublicLink: handlers.toggleItemPublicLink.bind(this),
		filePublicLinkStatus: handlers.filePublicLinkStatus.bind(this),
		directoryPublicLinkStatus: handlers.directoryPublicLinkStatus.bind(this),
		editItemPublicLink: handlers.editItemPublicLink.bind(this),
		decryptDirectoryPublicLinkKey: handlers.decryptDirectoryPublicLinkKey.bind(this),
		getDirectoryTree: handlers.getDirectoryTree.bind(this),
		uploadDirectory: handlers.uploadDirectory.bind(this),
		downloadDirectory: handlers.downloadDirectory.bind(this),
		queryGlobalSearch: handlers.queryGlobalSearch.bind(this),
		fetchFileVersions: handlers.fetchFileVersions.bind(this),
		restoreFileVersion: handlers.restoreFileVersion.bind(this),
		getFile: handlers.getFile.bind(this),
		getDirectory: handlers.getDirectory.bind(this),
		deleteFile: handlers.deleteFile.bind(this),
		deleteDirectory: handlers.deleteDirectory.bind(this),
		fetchTransfers: handlers.fetchTransfers.bind(this),
		fetchAccount: handlers.fetchAccount.bind(this),
		fetchNoteContent: handlers.fetchNoteContent.bind(this),
		editNote: handlers.editNote.bind(this),
		fileExists: handlers.fileExists.bind(this),
		directoryExists: handlers.directoryExists.bind(this),
		favoriteNote: handlers.favoriteNote.bind(this),
		pinNote: handlers.pinNote.bind(this),
		duplicateNote: handlers.duplicateNote.bind(this),
		changeNoteType: handlers.changeNoteType.bind(this),
		trashNote: handlers.trashNote.bind(this),
		deleteNote: handlers.deleteNote.bind(this),
		archiveNote: handlers.archiveNote.bind(this),
		restoreNote: handlers.restoreNote.bind(this),
		fetchNotesTags: handlers.fetchNotesTags.bind(this),
		tagNote: handlers.tagNote.bind(this),
		untagNote: handlers.untagNote.bind(this),
		changeNoteParticipantPermissions: handlers.changeNoteParticipantPermissions.bind(this),
		fetchUserPublicKey: handlers.fetchUserPublicKey.bind(this),
		addNoteParticipant: handlers.addNoteParticipant.bind(this),
		removeNoteParticipant: handlers.removeNoteParticipant.bind(this),
		fetchNoteHistory: handlers.fetchNoteHistory.bind(this),
		restoreNoteHistory: handlers.restoreNoteHistory.bind(this),
		createNote: handlers.createNote.bind(this),
		renameNoteTag: handlers.renameNoteTag.bind(this),
		favoriteNoteTag: handlers.favoriteNoteTag.bind(this),
		deleteNoteTag: handlers.deleteNoteTag.bind(this),
		createNoteTag: handlers.createNoteTag.bind(this),
		renameNote: handlers.renameNote.bind(this),
		restoreFile: handlers.restoreFile.bind(this),
		restoreDirectory: handlers.restoreDirectory.bind(this),
		removeSharedItem: handlers.removeSharedItem.bind(this),
		stopSharingItem: handlers.stopSharingItem.bind(this),
		createChat: handlers.createChat.bind(this),
		leaveChat: handlers.leaveChat.bind(this),
		deleteChat: handlers.deleteChat.bind(this),
		deleteChatMessage: handlers.deleteChatMessage.bind(this),
		sendChatMessage: handlers.sendChatMessage.bind(this),
		sendChatTyping: handlers.sendChatTyping.bind(this),
		disableChatMessageEmbeds: handlers.disableChatMessageEmbeds.bind(this),
		editChatMessage: handlers.editChatMessage.bind(this),
		editChatName: handlers.editChatName.bind(this),
		chatMarkAsRead: handlers.chatMarkAsRead.bind(this),
		chatUnreadCount: handlers.chatUnreadCount.bind(this),
		chatOnline: handlers.chatOnline.bind(this),
		chatUnread: handlers.chatUnread.bind(this),
		removeChatParticipant: handlers.removeChatParticipant.bind(this),
		addChatParticipant: handlers.addChatParticipant.bind(this),
		fetchChatMessages: handlers.fetchChatMessages.bind(this),
		decryptChatMessage: handlers.decryptChatMessage.bind(this),
		exit: handlers.exit.bind(this),
		httpStatus: handlers.httpStatus.bind(this),
		fetchChatsLastFocus: handlers.fetchChatsLastFocus.bind(this),
		updateChatsLastFocus: handlers.updateChatsLastFocus.bind(this),
		filePublicLinkInfo: handlers.filePublicLinkInfo.bind(this),
		filePublicLinkHasPassword: handlers.filePublicLinkHasPassword.bind(this),
		directoryPublicLinkInfo: handlers.directoryPublicLinkInfo.bind(this),
		directorySizePublicLink: handlers.directorySizePublicLink.bind(this),
		readFileAsString: handlers.readFileAsString.bind(this),
		writeFileAsString: handlers.writeFileAsString.bind(this),
		parseAudioMetadata: handlers.parseAudioMetadata.bind(this),
		foregroundServiceActive: handlers.foregroundServiceActive.bind(this)
	}
}

export type NodeWorkerHandlers = typeof NodeWorker.prototype.handlers
export type NodeWorkerHandlersFunctionName = keyof NodeWorkerHandlers

export default NodeWorker
