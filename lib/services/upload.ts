import nodeWorker from "@/lib/nodeWorker"
import * as FileSystem from "expo-file-system/next"
import { getSDK } from "@/lib/sdk"
import foregroundService from "./foreground"
import { Readable } from "stream"
import { type ReadableStream } from "stream/web"
import { type CloudItemSharedReceiver } from "@filen/sdk/dist/types/cloud"

export type UploadFileParams = {
	id: string
	localPath: string
	parent: string
	name: string
	size: number
	lastModified?: number
	creation?: number
	dontEmitProgress?: boolean
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

export class UploadService {
	private isAuthed(): boolean {
		const apiKey = getSDK().config.apiKey

		return typeof apiKey === "string" && apiKey.length > 0 && apiKey !== "anonymous"
	}

	public directory = {
		foreground: async (params: {
			id: string
			localPath: string
			parent: string
			name: string
			size: number
			dontEmitProgress?: boolean
			deleteAfterUpload?: boolean
			isShared?: boolean
		}): Promise<void> => {
			if (!this.isAuthed()) {
				throw new Error("You must be authenticated to upload files.")
			}

			if (!params.dontEmitProgress) {
				await foregroundService.start()
			}

			try {
				const sourceEntry = new FileSystem.Directory(params.localPath)

				if (!sourceEntry.exists) {
					throw new Error(`Source ${params.localPath} does not exist.`)
				}

				return await nodeWorker.proxy("uploadDirectory", params)
			} finally {
				if (!params.dontEmitProgress) {
					await foregroundService.stop()
				}
			}
		},
		background: async (): Promise<void> => {
			throw new Error("Background directory upload is not implemented yet.")
		}
	}

	public file = {
		foreground: async (params: UploadFileParams): Promise<DriveCloudItem> => {
			if (!this.isAuthed()) {
				throw new Error("You must be authenticated to upload files.")
			}

			if (!params.dontEmitProgress) {
				await foregroundService.start()
			}

			try {
				const sourceEntry = new FileSystem.File(params.localPath)

				if (!sourceEntry.exists) {
					throw new Error(`Source ${params.localPath} does not exist.`)
				}

				return await nodeWorker.proxy("uploadFile", params)
			} finally {
				if (!params.dontEmitProgress) {
					await foregroundService.stop()
				}
			}
		},
		background: async (params: UploadFileParams & { abortSignal?: AbortSignal }): Promise<DriveCloudItem> => {
			if (!this.isAuthed()) {
				throw new Error("You must be authenticated to upload files.")
			}

			if (!params.dontEmitProgress) {
				await foregroundService.start()
			}

			const sourceEntry = new FileSystem.File(params.localPath)

			if (!sourceEntry.exists) {
				throw new Error(`Source ${params.localPath} does not exist.`)
			}

			const sourceStream = Readable.fromWeb(sourceEntry.readableStream() as ReadableStream<Uint8Array<ArrayBufferLike>>)

			try {
				const item = await getSDK()
					.cloud()
					.uploadLocalFileStream({
						source: sourceStream,
						parent: params.parent,
						name: params.name ?? sourceEntry.name,
						abortSignal: params.abortSignal
					})

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
			} finally {
				if (!sourceStream.destroyed) {
					sourceStream.destroy()
				}
			}
		}
	}
}

export const uploadService = new UploadService()

export default uploadService
