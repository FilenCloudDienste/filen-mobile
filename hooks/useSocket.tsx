import { useEffect, useRef, useState } from "react"
import { AppState, type AppStateStatus } from "react-native"
import { TypedEventEmitter } from "@/lib/events"
import type { SocketEvent, FilenSDKConfig } from "@filen/sdk"
import Semaphore from "@/lib/semaphore"
import mmkvInstance from "@/lib/mmkv"
import { SDK_CONFIG_STORAGE_KEY } from "@/lib/constants"
import useIsAuthed from "./useIsAuthed"

export const SOCKET_URL = "https://socket.filen.io"

export class Socket {
	private connection: WebSocket | null = null
	private pingInterval: ReturnType<typeof setInterval> | undefined = undefined
	private mutex: Semaphore = new Semaphore(1)
	public connected: boolean = false
	public eventEmitter: TypedEventEmitter<{
		socketEvent: SocketEvent
		state: "connected" | "disconnected"
	}> = new TypedEventEmitter()

	private getAPIKey(): string | null {
		const sdkConfig = mmkvInstance.getString(SDK_CONFIG_STORAGE_KEY)

		if (!sdkConfig) {
			return null
		}

		try {
			const parsedConfig = JSON.parse(sdkConfig) as FilenSDKConfig

			return typeof parsedConfig.apiKey === "string" && parsedConfig.apiKey.length > 32 && parsedConfig.apiKey !== "anonymous"
				? parsedConfig.apiKey
				: null
		} catch {
			return null
		}
	}

	private startPingInterval(interval: number): void {
		this.clearPingInterval()

		if (this.connection && this.connection.readyState === WebSocket.OPEN) {
			this.pingInterval = setInterval(() => {
				if (this.connection?.readyState === WebSocket.OPEN) {
					this.connection?.send("2")
					this.connection?.send(`42${JSON.stringify(["authed", Date.now()])}`)
				}
			}, interval)
		} else {
			this.clearPingInterval()

			this.connect().catch(console.error)
		}
	}
	private clearPingInterval(): void {
		if (this.pingInterval) {
			clearInterval(this.pingInterval)

			this.pingInterval = undefined
		}
	}

	public emit(event: string, data?: unknown): void {
		if (this.connection?.readyState === WebSocket.OPEN) {
			this.connection?.send(`42${JSON.stringify(typeof data !== "undefined" ? [event, data] : [event])}`)
		}
	}

	private parseMessage(data: string): {
		authed: boolean
	} {
		const packetType = data.charAt(0)
		const payload = data.substring(1)

		switch (packetType) {
			case "0":
				try {
					const parsed = JSON.parse(payload)
					const pingInterval = parseInt(parsed?.pingInterval ?? 3000) ?? 3000

					if (this.connection?.readyState === WebSocket.OPEN) {
						this.connection?.send("40")
						this.connection?.send(`42${JSON.stringify(["authed", Date.now()])}`)
					}

					this.startPingInterval(pingInterval)
				} catch (e) {
					console.error(e)
				}

				break

			case "4":
				if (payload.startsWith("2")) {
					const eventData = payload.substring(1)

					try {
						const parsed = JSON.parse(eventData)

						if (Array.isArray(parsed) && parsed.length >= 1) {
							const [eventName, ...args] = parsed
							const argsParsed = args[0]

							if (eventName === "authed") {
								if (argsParsed === false) {
									const apiKey = this.getAPIKey()

									if (!apiKey) {
										return {
											authed: false
										}
									}

									this.emit("auth", { apiKey })
								} else if (argsParsed === true) {
									return {
										authed: true
									}
								}
							} else {
								this.eventEmitter.emit("socketEvent", {
									type: eventName,
									data: argsParsed
								})
							}
						}
					} catch (e) {
						console.error(e)
					}
				}

				break
		}

		return {
			authed: false
		}
	}

	public async connect(): Promise<void> {
		await this.mutex.acquire()

		try {
			if (
				this.connection &&
				(this.connection.readyState === WebSocket.OPEN || this.connection.readyState === WebSocket.CONNECTING) &&
				this.connected
			) {
				return
			}

			await new Promise<void>((resolve, reject) => {
				const url = new URL(SOCKET_URL)
				const isSecure = url.protocol === "https:" || url.protocol === "wss:"
				const wsProtocol = isSecure ? "wss:" : "ws:"
				const params = new URLSearchParams({
					EIO: "3",
					transport: "websocket",
					t: Date.now().toString()
				})
				const socketPath = "/socket.io"
				const wsUrl = `${wsProtocol}//${url.host}${socketPath}/?${params.toString()}`
				const ws = new WebSocket(wsUrl)

				this.connection = ws

				this.connection.addEventListener("message", e => {
					const { authed } = this.parseMessage(e.data)

					if (authed) {
						resolve()
					}
				})

				this.connection.addEventListener(
					"error",
					() => {
						reject(new Error("WebSocket connection error."))
					},
					{
						once: true
					}
				)

				this.connection.addEventListener(
					"close",
					() => {
						this.connected = false
						this.connection = null

						this.eventEmitter.emit("state", "disconnected")

						reject(new Error("WebSocket connection closed."))
					},
					{
						once: true
					}
				)
			})

			this.eventEmitter.emit("state", "connected")
			this.connected = true
		} finally {
			this.mutex.release()
		}
	}

	public async disconnect(): Promise<void> {
		await this.mutex.acquire()

		try {
			if (this.connection?.readyState === WebSocket.CLOSED || this.connection?.readyState === WebSocket.CLOSING) {
				return
			}

			this.clearPingInterval()

			this.connection?.close()

			this.connected = false
			this.connection = null

			this.eventEmitter.emit("state", "disconnected")
		} finally {
			this.mutex.release()
		}
	}
}

export const socket = new Socket()
export const appStateMutex = new Semaphore(1)

export default function useSocket() {
	const [isConnected, setIsConnected] = useState<boolean>(false)
	const socketRef = useRef<Socket>(socket)
	const appStateRef = useRef<AppStateStatus>("active")
	const [authed] = useIsAuthed()

	useEffect(() => {
		const handleAppStateChange = (nextAppState: AppStateStatus) => {
			if (appStateRef.current === nextAppState || !authed) {
				return
			}

			appStateRef.current = nextAppState

			appStateMutex
				.acquire()
				.then(() => {
					if (nextAppState === "active") {
						socketRef.current.connect().catch(console.error)
					} else if (nextAppState === "background" || nextAppState === "inactive") {
						socketRef.current.disconnect().catch(console.error)
					}
				})
				.finally(() => {
					appStateMutex.release()
				})
		}

		const subscription = AppState.addEventListener("change", handleAppStateChange)

		return () => {
			subscription.remove()
		}
	}, [authed])

	useEffect(() => {
		if (appStateRef.current === "active" && authed) {
			socketRef.current.connect().catch(console.error)
		}
	}, [authed])

	useEffect(() => {
		const socketEventListener = socketRef.current.eventEmitter.subscribe("state", state => {
			if (state === "connected") {
				setIsConnected(true)
			} else if (state === "disconnected") {
				setIsConnected(false)
			}
		})

		return () => {
			socketEventListener.remove()
		}
	}, [])

	return {
		connected: isConnected,
		socket: socketRef.current,
		emit: socketRef.current.emit,
		events: socketRef.current.eventEmitter
	}
}
