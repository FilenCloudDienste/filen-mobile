import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Cloud from "@filen/sdk/dist/types/cloud"
import { PauseSignal, type FileEncryptionVersion } from "@filen/sdk"
import transfersStore from "../stores/transfers.store"
import { normalizeFilePathForNode } from "../lib/utils"
import fs from "fs-extra"
import { FS_RM_OPTIONS } from "../lib/constants"
import { type CloudItemSharedReceiver } from "@filen/sdk/dist/types/cloud"

export type UploadFileParams = {
	id: string
	localPath: string
	parent: string
	name: string
	size: number
	lastModified?: number
	creation?: number
	deleteAfterUpload?: boolean
	uuid?: string
} & (
	| {
			isShared: false
	  }
	| {
			isShared: true
			receiverEmail: string
			receiverId: number
			sharerEmail: string
			sharerId: number
			receivers: CloudItemSharedReceiver[]
	  }
)

export async function filePublicLinkInfo(this: NodeWorker, params: Parameters<Cloud["filePublicLinkInfo"]>[0]) {
	return await sdk.get().cloud().filePublicLinkInfo(params)
}

export async function filePublicLinkHasPassword(this: NodeWorker, params: Parameters<Cloud["filePublicLinkHasPassword"]>[0]) {
	return await sdk.get().cloud().filePublicLinkHasPassword(params)
}

export async function directoryPublicLinkInfo(this: NodeWorker, params: Parameters<Cloud["directoryPublicLinkInfo"]>[0]) {
	return await sdk.get().cloud().directoryPublicLinkInfo(params)
}

export async function directorySizePublicLink(this: NodeWorker, params: Parameters<Cloud["directorySizePublicLink"]>[0]) {
	return await sdk.get().cloud().directorySizePublicLink(params)
}

export async function changeDirectoryColor(this: NodeWorker, params: Parameters<Cloud["changeDirectoryColor"]>[0]) {
	return await sdk.get().cloud().changeDirectoryColor(params)
}

export async function createDirectory(this: NodeWorker, params: Parameters<Cloud["createDirectory"]>[0]) {
	return await sdk.get().cloud().createDirectory(params)
}

export async function downloadDirectory(
	this: NodeWorker,
	params: {
		id: string
		uuid: string
		destination: string
		name: string
		size: number
	}
) {
	if (!this.transfersAbortControllers[params.id]) {
		this.transfersAbortControllers[params.id] = new AbortController()
	}

	if (!this.transfersPauseSignals[params.id]) {
		this.transfersPauseSignals[params.id] = new PauseSignal()
	}

	const { setTransfers, setFinishedTransfers } = transfersStore.getState()

	await sdk
		.get()
		.cloud()
		.downloadDirectoryToLocal({
			uuid: params.uuid,
			type: "normal",
			to: normalizeFilePathForNode(params.destination),
			abortSignal: this.transfersAbortControllers[params.id]?.signal,
			pauseSignal: this.transfersPauseSignals[params.id],
			onQueued: () => {
				const now = Date.now()

				setTransfers(prev => [
					...prev,
					{
						id: params.id,
						type: "download",
						itemType: "directory",
						uuid: params.uuid,
						state: "queued",
						bytes: 0,
						name: params.name,
						size: 0,
						startedTimestamp: 0,
						queuedTimestamp: now,
						errorTimestamp: 0,
						finishedTimestamp: 0,
						progressTimestamp: 0
					}
				])

				if (this.transfersProgressStarted === -1) {
					this.transfersProgressStarted = now
				} else {
					if (now < this.transfersProgressStarted) {
						this.transfersProgressStarted = now
					}
				}
			},
			onStarted: () => {
				const now = Date.now()

				setTransfers(prev =>
					prev.map(transfer =>
						transfer.id === params.id
							? {
									...transfer,
									state: "started",
									startedTimestamp: now,
									size: params.size
							  }
							: transfer
					)
				)

				this.transfersAllBytes += params.size
			},
			onProgress: transferred => {
				const now = Date.now()

				setTransfers(prev =>
					prev.map(transfer =>
						transfer.id === params.id
							? {
									...transfer,
									bytes: transfer.bytes + transferred,
									progressTimestamp: now
							  }
							: transfer
					)
				)

				this.transfersBytesSent += transferred
			},
			onFinished: () => {
				const now = Date.now()

				setFinishedTransfers(prev => [
					...prev,
					{
						id: params.id,
						type: "download",
						itemType: "directory",
						uuid: params.uuid,
						state: "finished",
						bytes: params.size,
						name: params.name,
						size: params.size,
						startedTimestamp: 0,
						queuedTimestamp: now,
						errorTimestamp: 0,
						finishedTimestamp: now,
						progressTimestamp: 0
					}
				])

				setTransfers(prev => prev.filter(transfer => transfer.id !== params.id))
			},
			onError: () => {
				const now = Date.now()

				setTransfers(prev =>
					prev.map(transfer =>
						transfer.id === params.id
							? {
									...transfer,
									state: "error",
									errorTimestamp: now
							  }
							: transfer
					)
				)

				if (this.transfersAllBytes >= params.size) {
					this.transfersAllBytes -= params.size
				}
			}
		})
}

export async function deleteDirectory(this: NodeWorker, params: Parameters<Cloud["deleteDirectory"]>[0]) {
	return sdk.get().cloud().deleteDirectory(params)
}

export async function deleteFile(this: NodeWorker, params: Parameters<Cloud["deleteFile"]>[0]) {
	return sdk.get().cloud().deleteFile(params)
}

export async function directoryExists(this: NodeWorker, params: Parameters<Cloud["directoryExists"]>[0]) {
	return await sdk.get().cloud().directoryExists(params)
}

export async function directoryPublicLinkStatus(
	this: NodeWorker,
	params: {
		uuid: string
	}
) {
	return await sdk.get().cloud().publicLinkStatus({
		type: "directory",
		uuid: params.uuid
	})
}

export async function directoryUUIDToPath(this: NodeWorker, params: Parameters<Cloud["directoryUUIDToPath"]>[0]) {
	return sdk.get().cloud().directoryUUIDToPath(params)
}

export async function downloadFile(
	this: NodeWorker,
	params: {
		id: string
		uuid: string
		bucket: string
		region: string
		chunks: number
		version: FileEncryptionVersion
		key: string
		end?: number
		start?: number
		destination: string
		size: number
		name: string
	}
) {
	if (!this.transfersAbortControllers[params.id]) {
		this.transfersAbortControllers[params.id] = new AbortController()
	}

	if (!this.transfersPauseSignals[params.id]) {
		this.transfersPauseSignals[params.id] = new PauseSignal()
	}

	const { setTransfers, setFinishedTransfers } = transfersStore.getState()
	const to = normalizeFilePathForNode(params.destination)

	await sdk
		.get()
		.cloud()
		.downloadFileToLocal({
			uuid: params.uuid,
			bucket: params.bucket,
			region: params.region,
			chunks: params.chunks,
			version: params.version,
			key: params.key,
			end: params.end,
			start: params.start,
			to,
			size: params.size,
			abortSignal: this.transfersAbortControllers[params.id]?.signal,
			pauseSignal: this.transfersPauseSignals[params.id],
			onQueued: () => {
				const now = Date.now()

				setTransfers(prev => [
					...prev,
					{
						id: params.id,
						type: "download",
						itemType: "file",
						uuid: params.uuid,
						state: "queued",
						bytes: 0,
						name: params.name,
						size: 0,
						startedTimestamp: 0,
						queuedTimestamp: now,
						errorTimestamp: 0,
						finishedTimestamp: 0,
						progressTimestamp: 0
					}
				])

				if (this.transfersProgressStarted === -1) {
					this.transfersProgressStarted = now
				} else {
					if (now < this.transfersProgressStarted) {
						this.transfersProgressStarted = now
					}
				}
			},
			onStarted: () => {
				const now = Date.now()

				setTransfers(prev =>
					prev.map(transfer =>
						transfer.id === params.id
							? {
									...transfer,
									state: "started",
									startedTimestamp: now,
									size: params.size
							  }
							: transfer
					)
				)

				this.transfersAllBytes += params.size
			},
			onProgress: transferred => {
				const now = Date.now()

				setTransfers(prev =>
					prev.map(transfer =>
						transfer.id === params.id
							? {
									...transfer,
									bytes: transfer.bytes + transferred,
									progressTimestamp: now
							  }
							: transfer
					)
				)

				this.transfersBytesSent += transferred
			},
			onFinished: () => {
				const now = Date.now()

				setFinishedTransfers(prev => [
					...prev,
					{
						id: params.id,
						type: "download",
						itemType: "file",
						uuid: params.uuid,
						state: "finished",
						bytes: params.size,
						name: params.name,
						size: params.size,
						startedTimestamp: 0,
						queuedTimestamp: now,
						errorTimestamp: 0,
						finishedTimestamp: now,
						progressTimestamp: 0
					}
				])

				setTransfers(prev => prev.filter(transfer => transfer.id !== params.id))
			},
			onError: () => {
				const now = Date.now()

				setTransfers(prev =>
					prev.map(transfer =>
						transfer.id === params.id
							? {
									...transfer,
									state: "error",
									errorTimestamp: now
							  }
							: transfer
					)
				)

				if (this.transfersAllBytes >= params.size) {
					this.transfersAllBytes -= params.size
				}
			}
		})

	if ((await fs.stat(to)).size !== params.size) {
		throw new Error("File download failed, file size does not match expected size.")
	}
}

export async function editFileMetadata(this: NodeWorker, params: Parameters<Cloud["editFileMetadata"]>[0]) {
	return sdk.get().cloud().editFileMetadata(params)
}

export async function editDirectoryMetadata(this: NodeWorker, params: Parameters<Cloud["editDirectoryMetadata"]>[0]) {
	return sdk.get().cloud().editDirectoryMetadata(params)
}

export async function editItemPublicLink(this: NodeWorker, params: Parameters<Cloud["editPublicLink"]>[0]) {
	return await sdk.get().cloud().editPublicLink(params)
}

export async function fileExists(this: NodeWorker, params: Parameters<Cloud["fileExists"]>[0]) {
	return await sdk.get().cloud().fileExists(params)
}

export async function fetchCloudItems(params: FetchCloudItemsParams): Promise<DriveCloudItem[]> {
	let items: DriveCloudItem[] = []

	if (params.of === "none") {
		return []
	} else if (params.of === "drive") {
		if (!params.parent || params.parent.length <= 1) {
			throw new Error("No parent specified.")
		}

		items = (
			await sdk.get().cloud().listDirectory({
				uuid: params.parent
			})
		).map(item => ({
			...item,
			isShared: false,
			selected: false
		}))
	} else if (params.of === "favorites") {
		items = (await sdk.get().cloud().listFavorites()).map(item => ({
			...item,
			isShared: false,
			selected: false
		}))
	} else if (params.of === "recents") {
		items = (await sdk.get().cloud().listRecents()).map(item => ({
			...item,
			isShared: false,
			selected: false
		}))
	} else if (params.of === "sharedIn") {
		if (!params.parent || params.parent.length <= 1) {
			throw new Error("No parent specified.")
		}

		items = (
			await sdk.get().cloud().listDirectorySharedIn({
				uuid: params.parent
			})
		).map(item => ({
			...item,
			isShared: true,
			selected: false,
			favorited: false
		}))
	} else if (params.of === "sharedOut") {
		if (!params.parent || params.parent.length <= 1) {
			throw new Error("No parent specified.")
		}

		items = (
			await sdk.get().cloud().listDirectorySharedOut({
				uuid: params.parent,
				receiverId: params.receiverId
			})
		).map(item => ({
			...item,
			isShared: true,
			selected: false,
			favorited: false
		}))
	} else if (params.of === "trash") {
		items = (await sdk.get().cloud().listTrash()).map(item => ({
			...item,
			isShared: false,
			selected: false
		}))
	} else if (params.of === "links") {
		items = (await sdk.get().cloud().listPublicLinks()).map(item => ({
			...item,
			isShared: false,
			selected: false
		}))
	} else if (params.of === "photos") {
		const tree = await sdk.get().cloud().getDirectoryTree({
			uuid: params.parent,
			type: "normal"
		})

		for (const path in tree) {
			const item = tree[path]

			if (!item || item.type === "directory") {
				continue
			}

			items.push({
				name: item.name,
				selected: false,
				key: item.key,
				lastModified: item.lastModified,
				favorited: item.favorited,
				size: item.size,
				mime: item.mime,
				creation: item.creation,
				chunks: item.chunks,
				bucket: item.bucket,
				hash: item.hash,
				timestamp: item.timestamp,
				type: "file",
				uuid: item.uuid,
				parent: item.parent,
				path,
				isShared: false,
				rm: "",
				version: item.version,
				region: item.region
			} satisfies DriveCloudItem)
		}
	}

	return Array.from(new Map(items.map(item => [item.uuid, item])).values())
}

export async function favoriteDirectory(this: NodeWorker, params: Parameters<Cloud["favoriteDirectory"]>[0]) {
	return await sdk.get().cloud().favoriteDirectory(params)
}

export async function favoriteFile(this: NodeWorker, params: Parameters<Cloud["favoriteFile"]>[0]) {
	return await sdk.get().cloud().favoriteFile(params)
}

export async function fetchDirectorySize(this: NodeWorker, params: Parameters<Cloud["directorySize"]>[0]) {
	return await sdk.get().cloud().directorySize(params)
}

export async function fetchFileVersions(this: NodeWorker, params: Parameters<Cloud["fileVersions"]>[0]) {
	return await sdk.get().cloud().fileVersions(params)
}

export async function filePublicLinkStatus(
	this: NodeWorker,
	params: {
		uuid: string
	}
) {
	return await sdk.get().cloud().publicLinkStatus({
		type: "file",
		uuid: params.uuid
	})
}

export async function fileUUIDToPath(this: NodeWorker, params: Parameters<Cloud["fileUUIDToPath"]>[0]) {
	return sdk.get().cloud().fileUUIDToPath(params)
}

export async function renameDirectory(this: NodeWorker, params: Parameters<Cloud["renameDirectory"]>[0]) {
	return sdk.get().cloud().renameDirectory(params)
}

export async function moveDirectory(this: NodeWorker, params: Parameters<Cloud["moveDirectory"]>[0]) {
	return sdk.get().cloud().moveDirectory(params)
}

export async function getDirectory(this: NodeWorker, params: Parameters<Cloud["getDirectory"]>[0]) {
	return await sdk.get().cloud().getDirectory(params)
}

export async function getDirectoryTree(this: NodeWorker, params: Parameters<Cloud["getDirectoryTree"]>[0]) {
	return await sdk.get().cloud().getDirectoryTree(params)
}

export async function getFile(this: NodeWorker, params: Parameters<Cloud["getFile"]>[0]) {
	return await sdk.get().cloud().getFile(params)
}

export async function queryGlobalSearch(this: NodeWorker, params: Parameters<Cloud["queryGlobalSearch"]>[0]) {
	const items = await sdk.get().cloud().queryGlobalSearch(params)

	return Array.from(new Map(items.map(item => [item.uuid, item])).values())
}

export async function moveFile(this: NodeWorker, params: Parameters<Cloud["moveFile"]>[0]) {
	return sdk.get().cloud().moveFile(params)
}

export async function removeSharedItem(this: NodeWorker, params: Parameters<Cloud["removeSharedItem"]>[0]) {
	return await sdk.get().cloud().removeSharedItem(params)
}

export async function restoreDirectory(this: NodeWorker, params: Parameters<Cloud["restoreDirectory"]>[0]) {
	return sdk.get().cloud().restoreDirectory(params)
}

export async function renameFile(this: NodeWorker, params: Parameters<Cloud["renameFile"]>[0]) {
	return sdk.get().cloud().renameFile(params)
}

export async function restoreFile(this: NodeWorker, params: Parameters<Cloud["restoreFile"]>[0]) {
	return sdk.get().cloud().restoreFile(params)
}

export async function restoreFileVersion(this: NodeWorker, params: Parameters<Cloud["restoreFileVersion"]>[0]) {
	return await sdk.get().cloud().restoreFileVersion(params)
}

export async function toggleItemPublicLink(
	this: NodeWorker,
	params: {
		item: {
			type: "directory" | "file"
			uuid: string
		}
		enable: boolean
		linkUUID: string
	}
) {
	switch (params.item.type) {
		case "directory": {
			switch (params.enable) {
				case true: {
					return await sdk
						.get()
						.cloud()
						.enablePublicLink({
							type: "directory",
							uuid: params.item.uuid,
							onProgress: (linked, total) => {
								this.bridge.channel.send({
									type: "toggleItemPublicLinkProgress",
									data: {
										linked,
										total
									}
								})
							}
						})
				}

				case false: {
					await sdk.get().cloud().disablePublicLink({
						type: "directory",
						itemUUID: params.item.uuid
					})

					return ""
				}
			}
		}

		case "file": {
			switch (params.enable) {
				case true: {
					return await sdk
						.get()
						.cloud()
						.enablePublicLink({
							type: "file",
							uuid: params.item.uuid,
							onProgress: (linked, total) => {
								this.bridge.channel.send({
									type: "toggleItemPublicLinkProgress",
									data: {
										linked,
										total
									}
								})
							}
						})
				}

				case false: {
					await sdk.get().cloud().disablePublicLink({
						type: "file",
						itemUUID: params.item.uuid,
						linkUUID: params.linkUUID
					})

					return ""
				}
			}
		}
	}
}

export async function stopSharingItem(this: NodeWorker, params: Parameters<Cloud["stopSharingItem"]>[0]) {
	return await sdk.get().cloud().stopSharingItem(params)
}

export async function shareItems(this: NodeWorker, params: Parameters<Cloud["shareItemsToUser"]>[0]) {
	return await sdk
		.get()
		.cloud()
		.shareItemsToUser({
			...params,
			onProgress: (shared, total) => {
				this.bridge.channel.send({
					type: "shareItemsProgress",
					data: {
						shared,
						total
					}
				})
			}
		})
}

export async function trashDirectory(this: NodeWorker, params: Parameters<Cloud["trashDirectory"]>[0]) {
	return sdk.get().cloud().trashDirectory(params)
}

export async function trashFile(this: NodeWorker, params: Parameters<Cloud["trashFile"]>[0]) {
	return sdk.get().cloud().trashFile(params)
}

export async function uploadDirectory(
	this: NodeWorker,
	params: {
		id: string
		localPath: string
		parent: string
		name: string
		size: number
		deleteAfterUpload?: boolean
		isShared?: boolean
	}
) {
	if (!this.transfersAbortControllers[params.id]) {
		this.transfersAbortControllers[params.id] = new AbortController()
	}

	if (!this.transfersPauseSignals[params.id]) {
		this.transfersPauseSignals[params.id] = new PauseSignal()
	}

	const { setTransfers, setFinishedTransfers } = transfersStore.getState()

	await sdk
		.get()
		.cloud()
		.uploadLocalDirectory({
			source: normalizeFilePathForNode(params.localPath),
			parent: params.parent,
			name: params.name,
			abortSignal: this.transfersAbortControllers[params.id]?.signal,
			pauseSignal: this.transfersPauseSignals[params.id],
			throwOnSingleFileUploadError: false,
			onQueued: () => {
				const now = Date.now()

				setTransfers(prev => [
					...prev,
					{
						id: params.id,
						type: "upload",
						itemType: "directory",
						uuid: params.id,
						state: "queued",
						bytes: 0,
						name: params.name,
						size: 0,
						startedTimestamp: 0,
						queuedTimestamp: now,
						errorTimestamp: 0,
						finishedTimestamp: 0,
						progressTimestamp: 0
					}
				])

				if (this.transfersProgressStarted === -1) {
					this.transfersProgressStarted = now
				} else {
					if (now < this.transfersProgressStarted) {
						this.transfersProgressStarted = now
					}
				}
			},
			onStarted: () => {
				const now = Date.now()

				setTransfers(prev =>
					prev.map(transfer =>
						transfer.id === params.id
							? {
									...transfer,
									state: "started",
									startedTimestamp: now,
									size: params.size
							  }
							: transfer
					)
				)

				this.transfersAllBytes += params.size
			},
			onProgress: transferred => {
				const now = Date.now()

				setTransfers(prev =>
					prev.map(transfer =>
						transfer.id === params.id
							? {
									...transfer,
									bytes: transfer.bytes + transferred,
									progressTimestamp: now
							  }
							: transfer
					)
				)

				this.transfersBytesSent += transferred
			},
			onFinished: () => {
				const now = Date.now()

				setFinishedTransfers(prev => [
					...prev,
					{
						id: params.id,
						type: "upload",
						itemType: "directory",
						uuid: params.id,
						state: "finished",
						bytes: params.size,
						name: params.name,
						size: params.size,
						startedTimestamp: 0,
						queuedTimestamp: now,
						errorTimestamp: 0,
						finishedTimestamp: now,
						progressTimestamp: 0
					}
				])

				setTransfers(prev => prev.filter(transfer => transfer.id !== params.id))
			},
			onError: () => {
				const now = Date.now()

				setTransfers(prev =>
					prev.map(transfer =>
						transfer.id === params.id
							? {
									...transfer,
									state: "error",
									errorTimestamp: now
							  }
							: transfer
					)
				)

				if (this.transfersAllBytes >= params.size) {
					this.transfersAllBytes -= params.size
				}
			}
		})

	if (typeof params.deleteAfterUpload === "boolean" && params.deleteAfterUpload) {
		await fs.rm(normalizeFilePathForNode(params.localPath), FS_RM_OPTIONS)
	}
}

export async function uploadFile(this: NodeWorker, params: UploadFileParams) {
	if (!this.transfersAbortControllers[params.id]) {
		this.transfersAbortControllers[params.id] = new AbortController()
	}

	if (!this.transfersPauseSignals[params.id]) {
		this.transfersPauseSignals[params.id] = new PauseSignal()
	}

	const { setTransfers, setFinishedTransfers } = transfersStore.getState()

	if (params.lastModified) {
		await fs.utimes(normalizeFilePathForNode(params.localPath), new Date(params.lastModified), new Date(params.lastModified))
	}

	const item = await sdk
		.get()
		.cloud()
		.uploadLocalFile({
			source: normalizeFilePathForNode(params.localPath),
			parent: params.parent,
			name: params.name,
			uuid: params.uuid,
			abortSignal: this.transfersAbortControllers[params.id]?.signal,
			pauseSignal: this.transfersPauseSignals[params.id],
			onQueued: () => {
				const now = Date.now()

				setTransfers(prev => [
					...prev,
					{
						id: params.id,
						type: "upload",
						itemType: "file",
						uuid: params.id,
						state: "queued",
						bytes: 0,
						name: params.name,
						size: 0,
						startedTimestamp: 0,
						queuedTimestamp: now,
						errorTimestamp: 0,
						finishedTimestamp: 0,
						progressTimestamp: 0
					}
				])

				if (this.transfersProgressStarted === -1) {
					this.transfersProgressStarted = now
				} else {
					if (now < this.transfersProgressStarted) {
						this.transfersProgressStarted = now
					}
				}
			},
			onStarted: () => {
				const now = Date.now()

				setTransfers(prev =>
					prev.map(transfer =>
						transfer.id === params.id
							? {
									...transfer,
									state: "started",
									startedTimestamp: now,
									size: params.size
							  }
							: transfer
					)
				)

				this.transfersAllBytes += params.size
			},
			onProgress: transferred => {
				const now = Date.now()

				setTransfers(prev =>
					prev.map(transfer =>
						transfer.id === params.id
							? {
									...transfer,
									bytes: transfer.bytes + transferred,
									progressTimestamp: now
							  }
							: transfer
					)
				)

				this.transfersBytesSent += transferred
			},
			onFinished: () => {
				const now = Date.now()

				setFinishedTransfers(prev => [
					...prev,
					{
						id: params.id,
						type: "upload",
						itemType: "file",
						uuid: params.id,
						state: "finished",
						bytes: params.size,
						name: params.name,
						size: params.size,
						startedTimestamp: 0,
						queuedTimestamp: now,
						errorTimestamp: 0,
						finishedTimestamp: now,
						progressTimestamp: 0
					}
				])

				setTransfers(prev => prev.filter(transfer => transfer.id !== params.id))
			},
			onError: () => {
				const now = Date.now()

				setTransfers(prev =>
					prev.map(transfer =>
						transfer.id === params.id
							? {
									...transfer,
									state: "error",
									errorTimestamp: now
							  }
							: transfer
					)
				)

				if (this.transfersAllBytes >= params.size) {
					this.transfersAllBytes -= params.size
				}
			}
		})

	if (typeof params.deleteAfterUpload === "boolean" && params.deleteAfterUpload) {
		await fs.rm(normalizeFilePathForNode(params.localPath), FS_RM_OPTIONS)
	}

	if (item.type === "directory") {
		throw new Error("Unknown SDK error.")
	}

	if (params.isShared) {
		return {
			...item,
			isShared: true,
			type: "file",
			selected: false,
			receiverEmail: params.receiverEmail,
			receiverId: params.receiverId,
			sharerEmail: params.sharerEmail,
			sharerId: params.sharerId,
			receivers: params.receivers
		} satisfies DriveCloudItem
	}

	return {
		...item,
		isShared: false,
		type: "file",
		selected: false
	} satisfies DriveCloudItem
}
