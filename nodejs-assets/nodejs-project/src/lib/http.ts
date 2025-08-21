import express, { type Express, type Request, type Response } from "express"
import sdk from "./sdk"
import { Semaphore } from "./semaphore"
import { type FileEncryptionVersion } from "@filen/sdk"
import mimeTypes from "mime-types"
import { parseByteRange, findFreePort } from "./utils"
import { Readable, type Duplex } from "stream"
import { type ReadableStream as ReadableStreamWebType } from "stream/web"
import http, { type IncomingMessage, ServerResponse } from "http"
import { type Socket } from "net"
import { randomUUID } from "crypto"
import { POSSIBLE_PORTS } from "./ports"
import crypto from "crypto"

export class HTTP {
	public port: number | null = null
	private server: Express | null = null
	public serverInstance: http.Server<typeof IncomingMessage, typeof ServerResponse> | null = null
	public connections: Record<string, Socket | Duplex> = {}
	private readonly mutex = new Semaphore(1)
	public active: boolean = false
	public authToken: string | null = null

	public async ping(_: Request, res: Response): Promise<void> {
		try {
			res.status(200).set("Content-Length", "4")

			await new Promise<void>(resolve => {
				res.end("pong", () => {
					resolve()
				})
			})
		} catch (e) {
			console.error(e)
		}
	}

	private async stream(req: Request, res: Response): Promise<void> {
		try {
			if (!req || !req.query || !req.query.file) {
				throw new Error("Invalid file.")
			}

			const fileBase64 = decodeURIComponent(req.query.file as string)
			const file = JSON.parse(Buffer.from(fileBase64, "base64").toString("utf-8")) as {
				mime: string
				size: number
				uuid: string
				bucket: string
				key: string
				version: FileEncryptionVersion
				chunks: number
				region: string
			}
			const mimeType = file.mime ?? "application/octet-stream"
			const totalLength = file.size
			const range = req.headers.range || req.headers["content-range"]
			let start = 0
			let end = totalLength - 1

			if (range) {
				const parsedRange = parseByteRange(range, totalLength)

				if (!parsedRange) {
					res.set("Content-Length", "0")
					res.status(400)
					res.end()

					return
				}

				start = parsedRange.start
				end = parsedRange.end

				res.status(206)
				res.set("Content-Range", `bytes ${start}-${end}/${totalLength}`)
				res.set("Content-Length", (end - start + 1).toString())
			} else {
				res.status(200)
				res.set("Content-Length", file.size.toString())
			}

			res.set("Content-Type", mimeType)
			res.set("Accept-Ranges", "bytes")

			const stream = sdk.get().cloud().downloadFileToReadableStream({
				uuid: file.uuid,
				bucket: file.bucket,
				region: file.region,
				version: file.version,
				key: file.key,
				size: file.size,
				chunks: file.chunks,
				start,
				end
			})

			const nodeStream = Readable.fromWeb(stream as unknown as ReadableStreamWebType<Buffer>)

			const cleanup = () => {
				try {
					stream.cancel().catch(() => {})

					if (!nodeStream.closed && !nodeStream.destroyed) {
						nodeStream.destroy()
					}
				} catch {
					// Noop
				}
			}

			res.once("close", () => {
				cleanup()
			})

			res.once("error", () => {
				cleanup()
			})

			res.once("finish", () => {
				cleanup()
			})

			req.once("close", () => {
				cleanup()
			})

			req.once("error", () => {
				cleanup()
			})

			nodeStream.pipe(res)
		} catch (e) {
			console.error(e)

			try {
				res?.status?.(500).end?.()
			} catch {
				// Noop
			}
		}
	}

	public async start(): Promise<{ port: number; authToken: string }> {
		await this.mutex.acquire()

		try {
			if (this.active && this.port && this.authToken) {
				return {
					port: this.port,
					authToken: this.authToken
				}
			}

			if (!this.port) {
				const port = await findFreePort(POSSIBLE_PORTS)

				if (!port) {
					throw new Error("Could not find a free port for the HTTP server.")
				}

				this.port = port
			}

			if (!this.authToken) {
				this.authToken = crypto.randomBytes(32).toString("hex")
			}

			await new Promise<void>(resolve => {
				this.server = express()
				this.connections = {}

				this.server.disable("x-powered-by")

				this.server.use((req, res, next) => {
					const auth = req.headers.authorization?.split("Bearer ").join("") ?? req.query.auth ?? ""

					if (auth !== this.authToken) {
						try {
							res?.status?.(401).end?.()
						} catch {
							// Noop
						}

						return
					}

					next()
				})

				this.server.get("/ping", (req, res) => {
					this.ping(req, res).catch(console.error)
				})

				this.server.get("/stream", (req, res) => {
					this.stream(req, res).catch(console.error)
				})

				this.serverInstance = http
					.createServer(this.server)
					.listen(this.port!, "127.0.0.1", () => {
						resolve()
					})
					.on("connection", socket => {
						const socketId = randomUUID()

						this.connections[socketId] = socket

						socket.once("close", () => {
							delete this.connections[socketId]
						})
					})
			})

			this.active = true

			return {
				port: this.port,
				authToken: this.authToken
			}
		} finally {
			this.mutex.release()
		}
	}

	public async stop(terminate: boolean = true): Promise<void> {
		await this.mutex.acquire()

		try {
			if (!this.active) {
				return
			}

			await new Promise<void>((resolve, reject) => {
				if (!this.serverInstance) {
					resolve()

					return
				}

				if (terminate) {
					for (const socketId in this.connections) {
						try {
							this.connections[socketId]?.destroy()

							delete this.connections[socketId]
						} catch {
							// Noop
						}
					}
				}

				this.serverInstance.close(err => {
					if (err) {
						reject(err)

						return
					}

					resolve()
				})
			})

			this.port = null
			this.authToken = null
			this.serverInstance = null
			this.connections = {}
			this.server = null
			this.active = false
		} finally {
			this.mutex.release()
		}
	}
}

export default HTTP
