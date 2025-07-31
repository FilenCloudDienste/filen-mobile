import nodeWorker from "@/lib/nodeWorker"
import * as FileSystem from "expo-file-system/next"
import { getSDK } from "@/lib/sdk"
import { Readable } from "stream"
import { type ReadableStream } from "stream/web"
import { type NodeWorkerHandlers } from "nodeWorker"
import thumbnails from "./thumbnails"
import { normalizeFilePathForExpo } from "./utils"
import { useTransfersStore } from "@/stores/transfers.store"

export class Upload {
	private readonly setHiddenTransfers = useTransfersStore.getState().setHiddenTransfers

	private isAuthed(): boolean {
		const apiKey = getSDK().config.apiKey

		return typeof apiKey === "string" && apiKey.length > 0 && apiKey !== "anonymous"
	}

	public directory = {
		foreground: async (
			params: Parameters<NodeWorkerHandlers["uploadDirectory"]>[0] & {
				dontEmitProgress?: boolean
			}
		): Promise<void> => {
			if (!this.isAuthed()) {
				throw new Error("You must be authenticated to upload files.")
			}

			const sourceEntry = new FileSystem.Directory(params.localPath)

			if (!sourceEntry.exists) {
				throw new Error(`Source ${params.localPath} does not exist.`)
			}

			if (params.dontEmitProgress) {
				this.setHiddenTransfers(hidden => ({
					...hidden,
					[params.id]: params.id
				}))
			}

			return await nodeWorker.proxy("uploadDirectory", params)
		},
		background: async (): Promise<void> => {
			throw new Error("Background directory upload is not implemented yet.")
		}
	}

	public file = {
		foreground: async (
			params: Parameters<NodeWorkerHandlers["uploadFile"]>[0] & {
				disableThumbnailGeneration?: boolean
				dontEmitProgress?: boolean
			}
		): Promise<DriveCloudItem> => {
			if (!this.isAuthed()) {
				throw new Error("You must be authenticated to upload files.")
			}

			const sourceEntry = new FileSystem.File(params.localPath)

			if (!sourceEntry.exists) {
				throw new Error(`Source ${params.localPath} does not exist.`)
			}

			if (params.dontEmitProgress) {
				this.setHiddenTransfers(hidden => ({
					...hidden,
					[params.id]: params.id
				}))
			}

			const wantsToDeleteAfterUpload = params.deleteAfterUpload ?? false
			const item = await nodeWorker.proxy("uploadFile", {
				...params,
				deleteAfterUpload: false
			})

			if (!params.disableThumbnailGeneration) {
				await thumbnails
					.generate({
						item,
						originalFilePath: normalizeFilePathForExpo(params.localPath)
					})
					.then(() => {
						console.log("Thumbnail generated successfully for", item.uuid)
					})
					.catch(e => {
						console.error("Failed to generate thumbnail for", item.uuid, e)
						// We don't want to throw an error if thumbnail generation fails
					})
			}

			if (wantsToDeleteAfterUpload) {
				const file = new FileSystem.File(normalizeFilePathForExpo(params.localPath))

				if (file.exists) {
					file.delete()
				}
			}

			return item
		},
		background: async (
			params: Parameters<NodeWorkerHandlers["uploadFile"]>[0] & {
				abortSignal?: AbortSignal
				disableThumbnailGeneration?: boolean
			}
		): Promise<DriveCloudItem> => {
			if (!this.isAuthed()) {
				throw new Error("You must be authenticated to upload files.")
			}

			const sourceFile = new FileSystem.File(params.localPath)

			if (!sourceFile.exists) {
				throw new Error(`Source ${params.localPath} does not exist.`)
			}

			const sourceStream = Readable.fromWeb(sourceFile.readableStream() as ReadableStream<Uint8Array<ArrayBufferLike>>)

			try {
				const item = await getSDK()
					.cloud()
					.uploadLocalFileStream({
						source: sourceStream,
						parent: params.parent,
						name: params.name ?? sourceFile.name,
						abortSignal: params.abortSignal
					})

				if (item.type === "directory") {
					throw new Error("Unknown SDK error.")
				}

				if (!params.disableThumbnailGeneration) {
					await thumbnails
						.generate({
							item: (params.isShared
								? {
										...item,
										isShared: true,
										type: "file",
										selected: false,
										receiverEmail: params.receiverEmail,
										receiverId: params.receiverId,
										sharerEmail: params.sharerEmail,
										sharerId: params.sharerId,
										receivers: params.receivers
									}
								: {
										...item,
										isShared: false,
										type: "file",
										selected: false
									}) satisfies DriveCloudItem,
							originalFilePath: normalizeFilePathForExpo(params.localPath)
						})
						.catch(() => {
							// We don't want to throw an error if thumbnail generation fails
						})
				}

				if (params.deleteAfterUpload) {
					if (sourceFile.exists) {
						sourceFile.delete()
					}
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
			} finally {
				if (!sourceStream.destroyed) {
					sourceStream.destroy()
				}
			}
		}
	}
}

export const upload = new Upload()

export default upload
