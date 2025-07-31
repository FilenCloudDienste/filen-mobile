import nodeWorker from "@/lib/nodeWorker"
import * as FileSystem from "expo-file-system/next"
import paths from "@/lib/paths"
import { randomUUID } from "expo-crypto"
import { getSDK } from "@/lib/sdk"
import Semaphore from "@/lib/semaphore"
import { type NodeWorkerHandlers } from "nodeWorker"
import type Cloud from "@filen/sdk/dist/types/cloud"
import { useTransfersStore } from "@/stores/transfers.store"

export class Download {
	private readonly setHiddenTransfers = useTransfersStore.getState().setHiddenTransfers

	private isAuthed(): boolean {
		const apiKey = getSDK().config.apiKey

		return typeof apiKey === "string" && apiKey.length > 0 && apiKey !== "anonymous"
	}

	public directory = {
		foreground: async (
			params: Parameters<NodeWorkerHandlers["downloadDirectory"]>[0] & {
				dontEmitProgress?: boolean
			}
		): Promise<void> => {
			if (!this.isAuthed()) {
				throw new Error("You must be authenticated to download files.")
			}

			const destination = new FileSystem.Directory(
				params.destination ?? FileSystem.Paths.join(paths.temporaryDownloads(), randomUUID())
			)

			if (!destination.parentDirectory.exists) {
				destination.parentDirectory.create({
					intermediates: true
				})
			}

			if (destination.exists) {
				destination.delete()
			}

			if (params.dontEmitProgress) {
				this.setHiddenTransfers(hidden => ({
					...hidden,
					[params.id]: params.id
				}))
			}

			await nodeWorker.proxy("downloadDirectory", {
				id: params.id ?? randomUUID(),
				uuid: params.uuid,
				destination: destination.uri,
				size: params.size,
				name: params.name
			})
		},
		background: async (params: Parameters<NodeWorkerHandlers["downloadDirectory"]>[0]): Promise<void> => {
			if (!this.isAuthed()) {
				throw new Error("You must be authenticated to download files.")
			}

			const destination = new FileSystem.Directory(
				params.destination ?? FileSystem.Paths.join(paths.temporaryDownloads(), randomUUID())
			)

			if (!destination.parentDirectory.exists) {
				destination.parentDirectory.create({
					intermediates: true
				})
			}

			if (destination.exists) {
				destination.delete()
			}

			const tree = await getSDK().cloud().getDirectoryTree({
				uuid: params.uuid,
				type: "normal"
			})

			const files: DriveCloudItem[] = []

			for (const path in tree) {
				const file = tree[path]

				if (!file || file.type !== "file") {
					continue
				}

				files.push({
					type: "file",
					uuid: file.uuid,
					bucket: file.bucket,
					region: file.region,
					chunks: file.chunks,
					version: file.version,
					key: file.key,
					size: file.size,
					name: file.name,
					isShared: false,
					selected: false,
					favorited: false,
					lastModified: file.lastModified,
					timestamp: file.timestamp,
					parent: file.parent,
					mime: file.mime,
					rm: "",
					path
				})
			}

			if (files.length === 0) {
				return
			}

			const semaphore = new Semaphore(10)

			await Promise.all(
				files
					.sort((a, b) => (a.path ?? "").split("/").length - (b.path ?? "").split("/").length)
					.map(async file => {
						if (file.type !== "file" || !file.path) {
							throw new Error("Expected file type for download.")
						}

						await semaphore.acquire()

						try {
							const uri = FileSystem.Paths.join(destination.uri, file.path)
							const entry = new FileSystem.File(uri)

							if (!entry.parentDirectory.exists) {
								entry.parentDirectory.create({
									intermediates: true
								})
							}

							if (entry.exists) {
								entry.delete()
							}

							entry.create()

							await getSDK()
								.cloud()
								.downloadFileToReadableStream({
									uuid: file.uuid,
									bucket: file.bucket,
									region: file.region,
									chunks: file.chunks,
									version: file.version,
									key: file.key,
									size: file.size
								})
								.pipeThrough(
									new TransformStream({
										transform(chunk, controller) {
											controller.enqueue(new Uint8Array(chunk))
										}
									})
								)
								.pipeTo(entry.writableStream())
						} finally {
							semaphore.release()
						}
					})
			)
		}
	}

	public file = {
		foreground: async (
			params: Parameters<NodeWorkerHandlers["downloadFile"]>[0] & {
				dontEmitProgress?: boolean
			}
		): Promise<void> => {
			if (!this.isAuthed()) {
				throw new Error("You must be authenticated to download files.")
			}

			const destination = new FileSystem.File(
				params.destination ??
					FileSystem.Paths.join(paths.temporaryDownloads(), `${randomUUID()}${FileSystem.Paths.extname(params.name)}`)
			)

			if (!destination.parentDirectory.exists) {
				destination.parentDirectory.create({
					intermediates: true
				})
			}

			if (destination.exists) {
				destination.delete()
			}

			if (params.dontEmitProgress) {
				this.setHiddenTransfers(hidden => ({
					...hidden,
					[params.id]: params.id
				}))
			}

			await nodeWorker.proxy("downloadFile", params)
		},
		background: async (params: Parameters<NodeWorkerHandlers["downloadFile"]>[0]): Promise<void> => {
			if (!this.isAuthed()) {
				throw new Error("You must be authenticated to download files.")
			}

			const destination = new FileSystem.File(
				params.destination ??
					FileSystem.Paths.join(paths.temporaryDownloads(), `${randomUUID()}${FileSystem.Paths.extname(params.name)}`)
			)

			if (!destination.parentDirectory.exists) {
				destination.parentDirectory.create({
					intermediates: true
				})
			}

			if (destination.exists) {
				destination.delete()
			}

			destination.create()

			await getSDK()
				.cloud()
				.downloadFileToReadableStream({
					uuid: params.uuid,
					bucket: params.bucket,
					region: params.region,
					chunks: params.chunks,
					version: params.version,
					key: params.key,
					size: params.size
				})
				.pipeThrough(
					new TransformStream({
						transform(chunk, controller) {
							controller.enqueue(new Uint8Array(chunk))
						}
					})
				)
				.pipeTo(destination.writableStream())
		},
		stream: (params: Parameters<Cloud["downloadFileToReadableStream"]>[0]) => {
			if (!this.isAuthed()) {
				throw new Error("You must be authenticated to download files.")
			}

			return getSDK().cloud().downloadFileToReadableStream(params)
		}
	}
}

export const download = new Download()

export default download
