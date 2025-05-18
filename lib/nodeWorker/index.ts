import nodejs from "nodejs-mobile-react-native"
import { deserializeError } from "@/lib/utils"
import { Semaphore } from "@/lib/semaphore"
import { randomUUID } from "expo-crypto"
import events from "../events"
import { httpHealthCheck } from "./utils"
import { useTransfersStore } from "@/stores/transfers.store"
import { type NodeWorkerHandlers } from "nodeWorker"

export const nodeChannel: NodeClientChannel = nodejs.channel

export class NodeWorker {
	protected ready: boolean = false
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private readonly resolves: Map<string, (value: any | PromiseLike<any>) => void> = new Map<
		string,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(value: any | PromiseLike<any>) => void
	>()
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private readonly rejects: Map<string, (reason?: any) => void> = new Map<string, (reason?: any) => void>()
	private readonly startMutex: Semaphore = new Semaphore(1)
	public httpServerPort: number | null = null
	public httpAuthToken: string | null = null
	private currentStartType: "background" | "foreground" | null = null
	private readonly setTransfers = useTransfersStore.getState().setTransfers
	private readonly setFinishedTransfers = useTransfersStore.getState().setFinishedTransfers
	private readonly setProgress = useTransfersStore.getState().setProgress
	private readonly setRemaining = useTransfersStore.getState().setRemaining
	private readonly setSpeed = useTransfersStore.getState().setSpeed

	public constructor() {
		nodejs.channel.addListener("message", (message: NodeBridgeMessage) => {
			switch (message.type) {
				case "response":
					console.log("Node worker response", message.data.function, message.data.success)

					if (message.data.success) {
						const fn = this.resolves.get(message.id)

						if (fn) {
							fn(message.data.result)
						}
					} else {
						const fn = this.rejects.get(message.id)

						if (fn) {
							fn(deserializeError(message.data.error))
						}
					}

					this.resolves.delete(message.id)
					this.rejects.delete(message.id)

					break

				case "socketEvent":
					events.emit("socketEvent", message.event)

					break

				case "transfers":
					this.setTransfers(message.data.transfers)
					this.setFinishedTransfers(message.data.finishedTransfers)
					this.setProgress(message.data.progress)
					this.setRemaining(message.data.remaining)
					this.setSpeed(message.data.speed)

					break

				case "shareItemsProgress":
					events.emit("shareItemsProgress", message.data)

					break

				case "toggleItemPublicLinkProgress":
					events.emit("toggleItemPublicLinkProgress", message.data)

					break

				case "httpServer":
					console.log("[MSGGG] Node worker http server", message.data)

					this.httpServerPort = message.data.port
					this.httpAuthToken = message.data.authToken

					break

				case "debug":
					console.log("[DEBUG] Node worker debug", message.data)

					break
			}
		})
	}

	private async waitForReady(): Promise<void> {
		if (this.ready) {
			return
		}

		await new Promise<void>(resolve => {
			const interval = setInterval(() => {
				if (this.ready) {
					clearInterval(interval)

					resolve()
				}
			}, 10)
		})
	}

	public async proxy<T extends keyof NodeWorkerHandlers>(
		functionName: T,
		params: Parameters<NodeWorkerHandlers[T]>[0]
	): Promise<Awaited<ReturnType<NodeWorkerHandlers[T]>>> {
		await this.waitForReady()

		return await new Promise<ReturnType<NodeWorkerHandlers[T]>>((resolve, reject) => {
			const id = randomUUID()

			this.resolves.set(id, resolve)
			this.rejects.set(id, reject)

			nodeChannel.send({
				id,
				type: "request",
				data: {
					function: functionName,
					params
				}
			})
		})
	}

	public async httpServerAlive(): Promise<boolean> {
		if (
			!this.httpServerPort ||
			!this.httpAuthToken ||
			!this.ready ||
			this.currentStartType === "background" ||
			this.httpAuthToken.length === 0 ||
			this.httpServerPort <= 0
		) {
			return false
		}

		return await httpHealthCheck({
			url: `http://127.0.0.1:${this.httpServerPort}/ping`,
			method: "GET",
			expectedStatusCode: 200,
			timeout: 3000,
			headers: {
				Authorization: `Bearer ${this.httpAuthToken}`
			}
		})
	}

	public async start(type: "background" | "foreground"): Promise<void> {
		await this.startMutex.acquire()

		try {
			if (this.ready && this.currentStartType === type) {
				return
			}

			await new Promise<void>((resolve, reject) => {
				nodejs.channel.addListener("message", (message: NodeBridgeMessage) => {
					if (message.type === "ready") {
						if (message.data.success) {
							console.log("Node worker ready.")

							this.httpServerPort = message.data.httpPort
							this.httpAuthToken = message.data.httpAuthToken

							resolve()

							return
						}

						reject(deserializeError(message.data.error))
					}
				})

				nodejs.startWithArgs(`main.js --type=${type}`, {
					redirectOutputToLogcat: true
				})
			})

			this.ready = true
			this.currentStartType = type
		} finally {
			this.startMutex.release()
		}
	}

	public async stop(): Promise<void> {
		await this.startMutex.acquire()

		try {
			if (!this.ready) {
				return
			}

			await this.proxy("exit", undefined)

			this.ready = false
			this.currentStartType = null
			this.httpServerPort = null
			this.httpAuthToken = null

			this.setTransfers([])
			this.setFinishedTransfers([])
			this.setProgress(0)
			this.setRemaining(0)
			this.setSpeed(0)

			for (const id in this.rejects) {
				this.rejects.get(id)?.(new Error("Node worker stopped"))
				this.rejects.delete(id)
			}

			for (const id in this.resolves) {
				this.resolves.delete(id)
			}
		} finally {
			this.startMutex.release()
		}
	}

	public async updateTransfers(): Promise<void> {
		const { transfers, finishedTransfers, speed, remaining, progress } = await this.proxy("fetchTransfers", undefined)

		this.setTransfers(transfers)
		this.setFinishedTransfers(finishedTransfers)
		this.setSpeed(speed)
		this.setRemaining(remaining)
		this.setProgress(progress)
	}
}

export const nodeWorker = new NodeWorker()

export default nodeWorker
