import nodejs from "nodejs-mobile-react-native"
import { Item } from "../../types"
import eventListener from "../eventListener"
import { UploadFile } from "../services/upload"
import { CurrentDownloads, CurrentUploads, TransferItem } from "../../screens/TransfersScreen"
import type { CameraUploadItems } from "../services/cameraUpload"

nodejs.start("main.js")

const resolves: Record<number, (value: any) => void> = {}
const rejects: Record<number, (reason?: any) => void> = {}
let currentId: number = 0

declare global {
	var nodeThread: {
		ready: boolean
		pingPong: (callback: (status: boolean) => boolean) => void
		encryptData: (params: { base64: string; key: string }) => Promise<string>
		decryptData: (params: { base64: string; key: string; version: number }) => Promise<string>
		downloadAndDecryptChunk: (params: { url: string; timeout: number; key: string; version: number }) => Promise<any>
		deriveKeyFromPassword: (params: {
			password: string
			salt: string
			iterations: number
			hash: string
			bitLength: number
			returnHex: boolean
		}) => Promise<any>
		encryptMetadata: (params: { data: string; key: string }) => Promise<any>
		decryptMetadata: (params: { data: string; key: string }) => Promise<any>
		encryptMetadataPublicKey: (params: { data: string; publicKey: string }) => Promise<any>
		decryptMetadataPrivateKey: (params: { data: string; privateKey: string }) => Promise<any>
		generateKeypair: () => Promise<any>
		hashPassword: (params: { password: string }) => Promise<string>
		hashFn: (params: { string: string }) => Promise<string>
		apiRequest: (params: { method: string; url: string; timeout: number; data: any }) => Promise<any>
		encryptAndUploadChunk: (params: { base64: string; key: string; url: string; timeout: number }) => Promise<any>
		generateRandomString: (params: { charLength?: number }) => Promise<string>
		uuidv4: () => Promise<string>
		ping: () => Promise<any>
		uploadAvatar: (params: { base64: string; url: string; timeout: number }) => Promise<any>
		encryptAndUploadFileChunk: (params: {
			path: string
			key: string
			queryParams: string
			chunkIndex: number
			chunkSize: number
			apiKey: string
		}) => Promise<any>
		getDataDir: () => Promise<string>
		appendFileToFile: (params: { first: string; second: string }) => Promise<boolean>
		downloadDecryptAndWriteFileChunk: (params: {
			destPath: string
			uuid: string
			region: string
			bucket: string
			index: number
			key: string
			version: number
		}) => Promise<string>
		getFileHash: (params: { path: string; hashName: string }) => Promise<string>
		convertHeic: (params: { input: string; output: string; format: "JPEG" | "PNG" }) => Promise<string>
		createHashHexFromString: (params: { name: string; data: string }) => Promise<string>
		downloadFile: (params: {
			destination: string
			tempDir: string
			file: Item
			showProgress: boolean
			maxChunks: number
		}) => Promise<string>
		uploadFile: (params: {
			uuid: string
			file: UploadFile
			includeFileHash: boolean | string
			masterKeys: string[]
			apiKey: string
			version: number
			showProgress: boolean
			parent: string
		}) => Promise<{
			item: Item
			nameEncrypted: string
			nameHashed: string
			mimeEncrypted: string
			sizeEncrypted: string
			metadataEncrypted: string
			uploadKey: string
		}>
		uploadDone: (params: { uuid: string }) => Promise<void>
		uploadFailed: (params: { uuid: string; reason: string }) => Promise<void>
		removeTransfer: (params: { uuid: string }) => Promise<void>
		stopTransfer: (params: { uuid: string }) => Promise<void>
		pauseTransfer: (params: { uuid: string }) => Promise<void>
		resumeTransfer: (params: { uuid: string }) => Promise<void>
		getCurrentTransfers: () => Promise<{
			currentUploads: CurrentUploads
			currentDownloads: CurrentDownloads
			transfers: TransferItem
			currentUploadsCount: number
			currentDownloadsCount: number
			progress: number
		}>
		initSDK: (params: {
			email: string
			password: string
			twoFactorCode: string
			masterKeys: string[]
			apiKey: string
			publicKey: string
			privateKey: string
			authVersion: 1 | 2
			baseFolderUUID: string
			userId: number
			metadataCache: boolean
			tmpPath: string
		}) => Promise<void>
		loadItems: (params: {
			url: string
			offlinePath: string
			thumbnailPath: string
			uuid: string
			receiverId: number
			sortBy?: Record<string, string>
			platform: string
			platformVersion: number
		}) => Promise<Item[]>
		getCameraUploadRemote: (params: { uuid: string }) => Promise<CameraUploadItems>
	}
}

const isNodeInitialized = async (): Promise<boolean> => {
	return true
}

global.nodeThread = {
	ready: false,
	pingPong: callback => {
		isNodeInitialized().then(() => {
			let dead = false

			const timeout = setTimeout(() => {
				dead = true

				return callback(true)
			}, 5000)

			global.nodeThread
				.ping()
				.then(() => {
					clearTimeout(timeout)

					setTimeout(() => {
						if (!dead) {
							global.nodeThread.pingPong(callback)
						}
					}, 5000)
				})
				.catch(err => {
					clearTimeout(timeout)

					console.log(err)

					dead = true

					return callback(true)
				})
		})
	},
	encryptData: ({ base64, key }) => {
		const id = (currentId += 1)

		return new Promise((resolve, reject) => {
			if (typeof base64 !== "string") {
				return resolve("")
			}

			if (base64.length == 0) {
				return resolve("")
			}

			isNodeInitialized().then(() => {
				resolves[id] = resolve
				rejects[id] = reject

				return nodejs.channel.send({
					id,
					type: "encryptData",
					base64,
					key
				})
			})
		})
	},
	decryptData: ({ base64, key, version }) => {
		const id = (currentId += 1)

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
				resolves[id] = resolve
				rejects[id] = reject

				return nodejs.channel.send({
					id,
					type: "decryptData",
					base64,
					key,
					version
				})
			})
		})
	},
	downloadAndDecryptChunk: ({ url, timeout, key, version }) => {
		const id = (currentId += 1)

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
				resolves[id] = resolve
				rejects[id] = reject

				return nodejs.channel.send({
					id,
					type: "downloadAndDecryptChunk",
					url,
					timeout,
					key,
					version
				})
			})
		})
	},
	deriveKeyFromPassword: ({ password, salt, iterations, hash, bitLength, returnHex }) => {
		const id = (currentId += 1)

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
				resolves[id] = resolve
				rejects[id] = reject

				return nodejs.channel.send({
					id,
					type: "deriveKeyFromPassword",
					password,
					salt,
					iterations,
					hash,
					bitLength,
					returnHex
				})
			})
		})
	},
	encryptMetadata: ({ data, key }) => {
		const id = (currentId += 1)

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
				resolves[id] = resolve
				rejects[id] = reject

				return nodejs.channel.send({
					id,
					type: "encryptMetadata",
					data,
					key
				})
			})
		})
	},
	decryptMetadata: ({ data, key }) => {
		const id = (currentId += 1)

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
				resolves[id] = resolve
				rejects[id] = reject

				return nodejs.channel.send({
					id,
					type: "decryptMetadata",
					data,
					key
				})
			})
		})
	},
	encryptMetadataPublicKey: ({ data, publicKey }) => {
		const id = (currentId += 1)

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
				resolves[id] = resolve
				rejects[id] = reject

				return nodejs.channel.send({
					id,
					type: "encryptMetadataPublicKey",
					data,
					publicKey
				})
			})
		})
	},
	decryptMetadataPrivateKey: ({ data, privateKey }) => {
		const id = (currentId += 1)

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
				resolves[id] = resolve
				rejects[id] = reject

				return nodejs.channel.send({
					id,
					type: "decryptMetadataPrivateKey",
					data,
					privateKey
				})
			})
		})
	},
	generateKeypair: () => {
		const id = (currentId += 1)

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
				resolves[id] = resolve
				rejects[id] = reject

				return nodejs.channel.send({
					id,
					type: "generateKeypair"
				})
			})
		})
	},
	hashPassword: ({ password }) => {
		const id = (currentId += 1)

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
				resolves[id] = resolve
				rejects[id] = reject

				return nodejs.channel.send({
					id,
					type: "hashPassword",
					string: password
				})
			})
		})
	},
	hashFn: ({ string }) => {
		const id = (currentId += 1)

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
				resolves[id] = resolve
				rejects[id] = reject

				return nodejs.channel.send({
					id,
					type: "hashFn",
					string
				})
			})
		})
	},
	apiRequest: ({ method, url, timeout, data }) => {
		const id = (currentId += 1)

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
				resolves[id] = resolve
				rejects[id] = reject

				return nodejs.channel.send({
					id,
					type: "apiRequest",
					method,
					url,
					timeout,
					data
				})
			})
		})
	},
	encryptAndUploadChunk: ({ base64, key, url, timeout }) => {
		const id = (currentId += 1)

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
				resolves[id] = resolve
				rejects[id] = reject

				return nodejs.channel.send({
					id,
					type: "encryptAndUploadChunk",
					base64,
					key,
					url,
					timeout
				})
			})
		})
	},
	generateRandomString: ({ charLength = 32 }) => {
		const id = (currentId += 1)

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
				resolves[id] = resolve
				rejects[id] = reject

				return nodejs.channel.send({
					id,
					type: "generateRandomString",
					charLength
				})
			})
		})
	},
	uuidv4: () => {
		const id = (currentId += 1)

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
				resolves[id] = resolve
				rejects[id] = reject

				return nodejs.channel.send({
					id,
					type: "uuidv4"
				})
			})
		})
	},
	ping: () => {
		const id = (currentId += 1)

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
				resolves[id] = resolve
				rejects[id] = reject

				return nodejs.channel.send({
					id,
					type: "ping"
				})
			})
		})
	},
	uploadAvatar: ({ base64, url, timeout }) => {
		const id = (currentId += 1)

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
				resolves[id] = resolve
				rejects[id] = reject

				return nodejs.channel.send({
					id,
					type: "uploadAvatar",
					base64,
					url,
					timeout
				})
			})
		})
	},
	encryptAndUploadFileChunk: ({ path, key, queryParams, chunkIndex, chunkSize, apiKey }) => {
		const id = (currentId += 1)

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
				resolves[id] = resolve
				rejects[id] = reject

				return nodejs.channel.send({
					id,
					type: "encryptAndUploadFileChunk",
					path,
					key,
					queryParams,
					chunkIndex,
					chunkSize,
					apiKey
				})
			})
		})
	},
	getDataDir: () => {
		const id = (currentId += 1)

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
				resolves[id] = resolve
				rejects[id] = reject

				return nodejs.channel.send({
					id,
					type: "getDataDir"
				})
			})
		})
	},
	appendFileToFile: ({ first, second }) => {
		const id = (currentId += 1)

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
				resolves[id] = resolve
				rejects[id] = reject

				return nodejs.channel.send({
					id,
					type: "appendFileToFile",
					first,
					second
				})
			})
		})
	},
	downloadDecryptAndWriteFileChunk: ({ destPath, uuid, region, bucket, index, key, version }) => {
		const id = (currentId += 1)

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
				resolves[id] = resolve
				rejects[id] = reject

				return nodejs.channel.send({
					id,
					type: "downloadDecryptAndWriteFileChunk",
					destPath,
					uuid,
					region,
					bucket,
					index,
					key,
					version
				})
			})
		})
	},
	getFileHash: ({ path, hashName }) => {
		const id = (currentId += 1)

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
				resolves[id] = resolve
				rejects[id] = reject

				return nodejs.channel.send({
					id,
					type: "getFileHash",
					path,
					hashName
				})
			})
		})
	},
	convertHeic: ({ input, output, format }) => {
		const id = (currentId += 1)

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
				resolves[id] = resolve
				rejects[id] = reject

				return nodejs.channel.send({
					id,
					type: "convertHeic",
					input,
					output,
					format
				})
			})
		})
	},
	createHashHexFromString: ({ name, data }) => {
		const id = (currentId += 1)

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
				resolves[id] = resolve
				rejects[id] = reject

				return nodejs.channel.send({
					id,
					type: "createHashHexFromString",
					name,
					data
				})
			})
		})
	},
	downloadFile: ({ destination, file, showProgress, maxChunks, tempDir }) => {
		const id = (currentId += 1)

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
				resolves[id] = resolve
				rejects[id] = reject

				return nodejs.channel.send({
					id,
					type: "downloadFile",
					destination,
					file,
					showProgress,
					maxChunks,
					tempDir
				})
			})
		})
	},
	uploadFile: ({ file, includeFileHash, masterKeys, apiKey, version, showProgress, parent, uuid }) => {
		const id = (currentId += 1)

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
				resolves[id] = resolve
				rejects[id] = reject

				return nodejs.channel.send({
					id,
					type: "uploadFile",
					file,
					includeFileHash,
					masterKeys,
					apiKey,
					version,
					showProgress,
					parent,
					uuid
				})
			})
		})
	},
	uploadDone: ({ uuid }) => {
		const id = (currentId += 1)

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
				resolves[id] = resolve
				rejects[id] = reject

				return nodejs.channel.send({
					id,
					type: "uploadDone",
					uuid
				})
			})
		})
	},
	uploadFailed: ({ uuid, reason }) => {
		const id = (currentId += 1)

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
				resolves[id] = resolve
				rejects[id] = reject

				return nodejs.channel.send({
					id,
					type: "uploadFailed",
					uuid,
					reason
				})
			})
		})
	},
	removeTransfer: ({ uuid }) => {
		const id = (currentId += 1)

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
				resolves[id] = resolve
				rejects[id] = reject

				return nodejs.channel.send({
					id,
					type: "removeTransfer",
					uuid
				})
			})
		})
	},
	stopTransfer: ({ uuid }) => {
		const id = (currentId += 1)

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
				resolves[id] = resolve
				rejects[id] = reject

				return nodejs.channel.send({
					id,
					type: "stopTransfer",
					uuid
				})
			})
		})
	},
	pauseTransfer: ({ uuid }) => {
		const id = (currentId += 1)

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
				resolves[id] = resolve
				rejects[id] = reject

				return nodejs.channel.send({
					id,
					type: "pauseTransfer",
					uuid
				})
			})
		})
	},
	resumeTransfer: ({ uuid }) => {
		const id = (currentId += 1)

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
				resolves[id] = resolve
				rejects[id] = reject

				return nodejs.channel.send({
					id,
					type: "resumeTransfer",
					uuid
				})
			})
		})
	},
	getCurrentTransfers: () => {
		const id = (currentId += 1)

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
				resolves[id] = resolve
				rejects[id] = reject

				return nodejs.channel.send({
					id,
					type: "getCurrentTransfers"
				})
			})
		})
	},
	initSDK: ({
		email,
		password,
		twoFactorCode,
		masterKeys,
		apiKey,
		publicKey,
		privateKey,
		authVersion,
		baseFolderUUID,
		userId,
		metadataCache,
		tmpPath
	}) => {
		const id = (currentId += 1)

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
				resolves[id] = resolve
				rejects[id] = reject

				return nodejs.channel.send({
					id,
					type: "initSDK",
					email,
					password,
					twoFactorCode,
					masterKeys,
					apiKey,
					publicKey,
					privateKey,
					authVersion,
					baseFolderUUID,
					userId,
					metadataCache,
					tmpPath
				})
			})
		})
	},
	loadItems: ({ url, offlinePath, thumbnailPath, uuid, receiverId, sortBy, platform, platformVersion }) => {
		const id = (currentId += 1)

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
				resolves[id] = resolve
				rejects[id] = reject

				return nodejs.channel.send({
					id,
					type: "loadItems",
					url,
					offlinePath,
					thumbnailPath,
					uuid,
					receiverId,
					sortBy,
					platform,
					platformVersion
				})
			})
		})
	},
	getCameraUploadRemote: ({ uuid }) => {
		const id = (currentId += 1)

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
				resolves[id] = resolve
				rejects[id] = reject

				return nodejs.channel.send({
					id,
					type: "getCameraUploadRemote",
					uuid
				})
			})
		})
	}
}

nodejs.channel.addListener(
	"message",
	(message: { id: number; err?: string; response: unknown; nodeError?: boolean; type?: string; data?: any } | "ready") => {
		if (message === "ready") {
			global.nodeThread.ready = true

			return
		}

		if (typeof message.nodeError !== "undefined") {
			console.error("NODE SIDE ERROR")
			console.error(message.err)

			return
		}

		if (typeof message.type === "string") {
			if (message.type === "transfersUpdate" && message.data) {
				eventListener.emit("transfersUpdate", message.data)

				return
			}
		}

		const { id, err, response } = message

		if (err) {
			const reject = rejects[id]

			if (typeof reject === "function") {
				console.error(err)

				reject(err)
			}
		} else {
			const resolve = resolves[id]

			if (typeof resolve === "function") {
				resolve(response)
			}
		}

		delete rejects[id]
		delete resolves[id]
	}
)
