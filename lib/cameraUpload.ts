import * as MediaLibrary from "expo-media-library"
import { getCameraUploadState } from "@/hooks/useCameraUpload"
import { validate as validateUUID } from "uuid"
import Semaphore from "./semaphore"
import nodeWorker from "./nodeWorker"
import { convertTimestampToMs, normalizeFilePathForExpo, promiseAllChunked } from "./utils"
import { useAppStateStore } from "@/stores/appState.store"
import { randomUUID } from "expo-crypto"
import * as FileSystem from "expo-file-system/next"
import paths from "./paths"
import { useCameraUploadStore } from "@/stores/cameraUpload.store"
import { getNetInfoState } from "@/hooks/useNetInfo"
import * as Battery from "expo-battery"
import { EXPO_IMAGE_MANIPULATOR_SUPPORTED_EXTENSIONS } from "./constants"
import { ImageManipulator, SaveFormat } from "expo-image-manipulator"
import { type FileMetadata } from "@filen/sdk"
import { getSDK } from "./sdk"
import upload from "@/lib/upload"
import queryUtils from "@/queries/utils"

export type TreeItem = (
	| {
			type: "local"
			asset: MediaLibrary.Asset
	  }
	| {
			type: "remote"
			uuid: string
	  }
) & {
	name: string
	creation: number
	lastModified: number
	path: string
}

export type Tree = Record<string, TreeItem>

export type Delta = {
	type: "upload"
	item: TreeItem
}

export type CameraUploadType = "foreground" | "background"

const runMutex: Semaphore = new Semaphore(1)
const processDeltaSemaphore: Semaphore = new Semaphore(8)
let nextRunTimeout: number = 0

export class CameraUpload {
	private readonly type: CameraUploadType
	private readonly maxUploads: number
	private readonly mediaTypes: MediaLibrary.MediaTypeValue[]
	private readonly maxSize: number
	private readonly useCameraUploadStore = {
		setSyncState: useCameraUploadStore.getState().setSyncState,
		setRunning: useCameraUploadStore.getState().setRunning
	}
	private readonly deltaErrors: Record<string, number> = {}

	public constructor({
		type,
		maxUploads,
		mediaTypes,
		maxSize
	}: {
		type: CameraUploadType
		maxUploads: number
		mediaTypes: MediaLibrary.MediaTypeValue[]
		maxSize: number
	}) {
		this.type = type
		this.maxUploads = maxUploads
		this.mediaTypes = mediaTypes
		this.maxSize = maxSize
	}

	private isAuthed(): boolean {
		const apiKey = getSDK().config.apiKey

		return typeof apiKey === "string" && apiKey.length > 0 && apiKey !== "anonymous"
	}

	public async canRun({
		checkPermissions,
		checkBattery,
		checkNetwork,
		checkAppState
	}: {
		checkPermissions: boolean
		checkBattery: boolean
		checkNetwork: boolean
		checkAppState: boolean
	}): Promise<boolean> {
		if (!this.isAuthed()) {
			return false
		}

		if (this.type === "background") {
			// Background tasks will only run if these conditions are met anyways, so we can safely skip
			checkAppState = false
			checkBattery = false
			checkNetwork = false
		}

		if (checkAppState) {
			if (this.type === "foreground" && useAppStateStore.getState().appState !== "active") {
				return false
			}
		}

		const state = getCameraUploadState()

		if (
			(this.type === "background" && !state.background) ||
			!state.enabled ||
			state.albums.length === 0 ||
			!state.remote ||
			!validateUUID(state.remote.uuid)
		) {
			return false
		}

		const [nodeWorkerPing, permissions, netInfoState, powerState] = await Promise.all([
			this.type === "foreground" ? nodeWorker.proxy("ping", undefined) : Promise.resolve("pong"),
			checkPermissions
				? MediaLibrary.getPermissionsAsync(false, this.type === "background" ? ["photo"] : ["photo", "video"])
				: Promise.resolve({
						status: MediaLibrary.PermissionStatus.GRANTED
				  }),
			checkNetwork
				? getNetInfoState()
				: Promise.resolve({
						hasInternet: true,
						isWifiEnabled: true,
						cellular: false
				  }),
			checkBattery
				? Battery.getPowerStateAsync()
				: Promise.resolve({
						lowPowerMode: false,
						batteryLevel: 1,
						batteryState: Battery.BatteryState.FULL
				  })
		])

		if (
			nodeWorkerPing !== "pong" ||
			permissions.status === MediaLibrary.PermissionStatus.DENIED ||
			!netInfoState.hasInternet ||
			(!state.cellular && !netInfoState.isWifiEnabled) ||
			(!state.lowBattery && powerState.lowPowerMode) ||
			(!state.lowBattery &&
				powerState.batteryLevel >= 0 &&
				powerState.batteryLevel <= 0.15 &&
				(powerState.batteryState === Battery.BatteryState.UNPLUGGED || powerState.batteryState === Battery.BatteryState.UNKNOWN))
		) {
			return false
		}

		return true
	}

	public normalizePath(path: string): string {
		return path.startsWith("/") ? path.slice(1) : path
	}

	public normalizeModificationTimestampForComparison(timestamp: number): number {
		return Math.floor(timestamp / 1000)
	}

	public async fetchLocalItems(): Promise<Tree> {
		const state = getCameraUploadState()
		const items: Tree = {}

		await Promise.all(
			state.albums.map(async album => {
				const assets: MediaLibrary.Asset[] = []

				const fetch = async (after: MediaLibrary.AssetRef | undefined = undefined) => {
					const result = await MediaLibrary.getAssetsAsync({
						mediaType: this.mediaTypes.includes("video") && !state.videos ? ["photo"] : this.mediaTypes,
						album: album.id,
						first: 1024,
						after
					})

					assets.push(...result.assets)

					if (result.hasNextPage) {
						await fetch(result.endCursor)
					}
				}

				await fetch()

				for (const asset of assets) {
					const path = this.normalizePath(FileSystem.Paths.join(album.title, asset.filename))

					items[path] = {
						type: "local",
						asset,
						name: asset.filename,
						creation: convertTimestampToMs(Math.floor(asset.creationTime)),
						lastModified: convertTimestampToMs(Math.floor(asset.modificationTime)),
						path
					}
				}
			})
		)

		return items
	}

	public async fetchRemoteItems(): Promise<Tree> {
		const state = getCameraUploadState()

		if (!state.remote || !validateUUID(state.remote.uuid)) {
			return {}
		}

		const items: Tree = {}
		const tree =
			this.type === "foreground"
				? await nodeWorker.proxy("getDirectoryTree", {
						uuid: state.remote.uuid,
						type: "normal"
				  })
				: await getSDK().cloud().getDirectoryTree({
						uuid: state.remote.uuid,
						type: "normal"
				  })

		for (const path in tree) {
			const file = tree[path]

			if (!file || file.type !== "file") {
				continue
			}

			const pathNormalized = this.normalizePath(path)

			items[pathNormalized] = {
				type: "remote",
				name: file.name,
				uuid: file.uuid,
				creation: file.creation ?? file.lastModified ?? file.timestamp,
				lastModified: file.lastModified,
				path: pathNormalized
			}
		}

		return items
	}

	public async deltas({ localItems, remoteItems }: { localItems: Tree; remoteItems: Tree }): Promise<Delta[]> {
		const deltas: Delta[] = []

		for (const path in localItems) {
			const localItem = localItems[path]
			const remoteItem = remoteItems[path]

			/*
					||
						(localItem &&
							remoteItem &&
							this.normalizeModificationTimestampForComparison(localItem.lastModified) >
								this.normalizeModificationTimestampForComparison(remoteItem.lastModified))
					*/

			// If the local item exists and the remote item does not, we need to upload it
			if (localItem && !remoteItem) {
				const delta: Delta = {
					type: "upload",
					item: localItem
				}

				deltas.push(delta)
			}
		}

		return deltas.sort((a, b) => {
			return a.item.creation - b.item.creation
		})
	}

	public async compress({ item, file }: { item: TreeItem; file: FileSystem.File }): Promise<void> {
		const extname = FileSystem.Paths.extname(item.name.trim().toLowerCase())

		if (!EXPO_IMAGE_MANIPULATOR_SUPPORTED_EXTENSIONS.includes(extname)) {
			return
		}

		const manipulated = await ImageManipulator.manipulate(normalizeFilePathForExpo(file.uri)).renderAsync()
		const result = await manipulated.saveAsync({
			compress: 0.8,
			format: SaveFormat.JPEG,
			base64: false
		})

		const manipulatedFile = new FileSystem.File(result.uri)

		if (!manipulatedFile.exists) {
			throw new Error(`Generated file at ${manipulatedFile.uri} does not exist.`)
		}

		if (!manipulatedFile.size || !file.size || manipulatedFile.size >= file.size) {
			// If the manipulated file is larger than the original, delete it
			if (manipulatedFile.exists) {
				manipulatedFile.delete()
			}

			return
		}

		if (file.exists) {
			file.delete()
		}

		manipulatedFile.move(file)
	}

	public async processDelta(delta: Delta, abortSignal?: AbortSignal): Promise<void> {
		await processDeltaSemaphore.acquire()

		try {
			const errorKey = `${delta.type}:${delta.item.path}`

			if (this.deltaErrors[errorKey] && this.deltaErrors[errorKey] >= 3) {
				return
			}

			if (abortSignal?.aborted) {
				throw new Error("Aborted")
			}

			const state = getCameraUploadState()

			if (!state.remote || !validateUUID(state.remote.uuid)) {
				return
			}

			if (abortSignal?.aborted) {
				throw new Error("Aborted")
			}

			const uploadId = randomUUID()

			try {
				if (delta.type === "upload") {
					if (delta.item.type !== "local") {
						return
					}

					if (abortSignal?.aborted) {
						throw new Error("Aborted")
					}

					const parentName = FileSystem.Paths.dirname(delta.item.path)
					const parentUUID =
						!parentName || parentName.length === 0 || parentName === "."
							? state.remote.uuid
							: this.type === "foreground"
							? await nodeWorker.proxy("createDirectory", {
									name: parentName,
									parent: state.remote.uuid
							  })
							: await getSDK().cloud().createDirectory({
									name: parentName,
									parent: state.remote.uuid
							  })

					if (abortSignal?.aborted) {
						throw new Error("Aborted")
					}

					const tmpFile = new FileSystem.File(
						FileSystem.Paths.join(paths.temporaryUploads(), `${randomUUID()}${FileSystem.Paths.extname(delta.item.name)}`)
					)

					if (abortSignal?.aborted) {
						throw new Error("Aborted")
					}

					try {
						if (tmpFile.exists) {
							tmpFile.delete()
						}

						if (abortSignal?.aborted) {
							throw new Error("Aborted")
						}

						const stat = await MediaLibrary.getAssetInfoAsync(delta.item.asset, {
							shouldDownloadFromNetwork: true
						})

						if (!stat.localUri) {
							return
						}

						if (abortSignal?.aborted) {
							throw new Error("Aborted")
						}

						const localFile = new FileSystem.File(stat.localUri)

						if (!localFile.exists || !localFile.size || localFile.size > this.maxSize) {
							return
						}

						if (abortSignal?.aborted) {
							throw new Error("Aborted")
						}

						localFile.copy(tmpFile)

						if (!tmpFile.exists || !tmpFile.size) {
							throw new Error(`Could not get size of file at "${tmpFile.uri}".`)
						}

						if (abortSignal?.aborted) {
							throw new Error("Aborted")
						}

						if (state.compress) {
							await this.compress({
								item: delta.item,
								file: tmpFile
							})
						}

						if (abortSignal?.aborted) {
							throw new Error("Aborted")
						}

						const item =
							this.type === "foreground"
								? await upload.file.foreground({
										parent: parentUUID,
										localPath: tmpFile.uri,
										name: delta.item.name,
										id: uploadId,
										size: tmpFile.size,
										isShared: false,
										deleteAfterUpload: true,
										creation: delta.item.creation,
										lastModified: delta.item.lastModified
								  })
								: await upload.file.background({
										parent: parentUUID,
										localPath: tmpFile.uri,
										name: delta.item.name,
										id: uploadId,
										size: tmpFile.size,
										isShared: false,
										deleteAfterUpload: true,
										creation: delta.item.creation,
										lastModified: delta.item.lastModified,
										abortSignal
								  })

						if (item.type !== "file") {
							throw new Error("Invalid response from uploadFile.")
						}

						const newFileMetadata: FileMetadata = {
							name: item.name,
							creation: delta.item.creation,
							lastModified: delta.item.lastModified,
							mime: item.mime,
							size: item.size,
							hash: item.hash,
							key: item.key
						} satisfies FileMetadata

						if (this.type === "foreground") {
							await nodeWorker.proxy("editFileMetadata", {
								uuid: item.uuid,
								metadata: newFileMetadata
							})
						} else {
							await getSDK().cloud().editFileMetadata({
								uuid: item.uuid,
								metadata: newFileMetadata
							})
						}

						if (this.type === "foreground") {
							queryUtils.useCloudItemsQuerySet({
								receiverId: 0,
								of: "photos",
								parent: state.remote.uuid,
								updater: prev => [
									...prev.filter(i => i.uuid !== item.uuid),
									{
										...item,
										...newFileMetadata
									}
								]
							})
						}
					} finally {
						if (tmpFile.exists) {
							tmpFile.delete()
						}
					}
				}

				delete this.deltaErrors[errorKey]
			} catch (e) {
				console.error(e)

				if (this.deltaErrors[errorKey]) {
					this.deltaErrors[errorKey]++
				} else {
					this.deltaErrors[errorKey] = 1
				}
			}
		} finally {
			processDeltaSemaphore.release()
		}
	}

	public async run(params?: { abortController: AbortController }): Promise<void> {
		const now = Date.now()

		if (runMutex.count() > 0 && this.type === "foreground") {
			return
		}

		const abortController = params?.abortController ?? new AbortController()

		if (abortController.signal.aborted) {
			throw new Error("Aborted")
		}

		if (nextRunTimeout > now && this.type === "foreground") {
			return
		}

		if (this.type === "foreground") {
			await runMutex.acquire()
		}

		this.useCameraUploadStore.setRunning(true)

		let stateCheckInterval: ReturnType<typeof setInterval> | undefined = undefined

		if (this.type === "foreground") {
			// Copy instead of referencing to avoid issues with stale state
			const startingState = JSON.parse(JSON.stringify(getCameraUploadState())) as ReturnType<typeof getCameraUploadState>

			stateCheckInterval = setInterval(() => {
				const currentState = getCameraUploadState()

				if (currentState.version !== startingState.version) {
					if (!abortController.signal.aborted) {
						abortController.abort()
					}

					clearInterval(stateCheckInterval)
				}
			}, 1000)
		}

		try {
			if (abortController.signal.aborted) {
				throw new Error("Aborted")
			}

			if (
				!(await this.canRun({
					checkPermissions: true,
					checkBattery: true,
					checkNetwork: true,
					checkAppState: true
				}))
			) {
				return
			}

			if (abortController.signal.aborted) {
				throw new Error("Aborted")
			}

			const state = getCameraUploadState()

			if (!state.remote || !validateUUID(state.remote.uuid)) {
				return
			}

			if (abortController.signal.aborted) {
				throw new Error("Aborted")
			}

			const exists =
				this.type === "foreground"
					? await nodeWorker.proxy("directoryExists", {
							name: state.remote.name,
							parent: state.remote.parent
					  })
					: await getSDK().cloud().directoryExists({
							name: state.remote.name,
							parent: state.remote.parent
					  })

			if (!exists.exists || exists.uuid !== state.remote.uuid) {
				return
			}

			if (abortController.signal.aborted) {
				throw new Error("Aborted")
			}

			const [localItems, remoteItems] = await Promise.all([this.fetchLocalItems(), this.fetchRemoteItems()])

			if (abortController.signal.aborted) {
				throw new Error("Aborted")
			}

			const deltas = await this.deltas({
				localItems,
				remoteItems
			})

			if (deltas.length === 0) {
				return
			}

			if (abortController.signal.aborted) {
				throw new Error("Aborted")
			}

			this.useCameraUploadStore.setSyncState({
				done: 0,
				count: deltas.length
			})

			try {
				let added = 0
				let done = 0

				await promiseAllChunked(
					deltas.map(async delta => {
						if (added >= this.maxUploads) {
							return
						}

						added++

						await this.processDelta(delta, abortController.signal)

						done++

						this.useCameraUploadStore.setSyncState({
							done,
							count: deltas.length
						})
					})
				)
			} finally {
				this.useCameraUploadStore.setSyncState({
					done: 0,
					count: 0
				})
			}
		} finally {
			clearInterval(stateCheckInterval)

			this.useCameraUploadStore.setRunning(false)

			if (this.type === "foreground") {
				runMutex.release()

				nextRunTimeout = Date.now() + 1000 * 15
			}
		}
	}
}

export const foregroundCameraUpload = new CameraUpload({
	type: "foreground",
	maxUploads: Infinity,
	mediaTypes: ["photo", "video"],
	maxSize: Infinity
})

export const backgroundCameraUpload = new CameraUpload({
	type: "background",
	maxUploads: 1,
	mediaTypes: ["photo"],
	maxSize: 16 * 1024 * 1024
})
