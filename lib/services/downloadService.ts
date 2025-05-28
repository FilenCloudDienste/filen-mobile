import nodeWorker from "@/lib/nodeWorker"
import * as FileSystem from "expo-file-system/next"
import paths from "@/lib/paths"
import { randomUUID } from "expo-crypto"
import { getSDK } from "@/lib/sdk"
import Semaphore from "../semaphore"
import { type FileEncryptionVersion } from "@filen/sdk"

export class DownloadService {
	private isAuthed(): boolean {
		const apiKey = getSDK().config.apiKey

		return typeof apiKey === "string" && apiKey.length > 0 && apiKey !== "anonymous"
	}

	public async foreground(
		params: {
			id?: string
			uuid: string
			destinationURI?: string
			name: string
			size: number
			dontEmitProgress?: boolean
		} & (
			| {
					type: "file"
					bucket: string
					region: string
					chunks: number
					version: FileEncryptionVersion
					key: string
					end?: number
					start?: number
			  }
			| {
					type: "directory"
			  }
		)
	): Promise<void> {
		if (!this.isAuthed()) {
			throw new Error("You must be authenticated to download files.")
		}

		const destination =
			params.type === "file"
				? new FileSystem.File(
						params.destinationURI ??
							FileSystem.Paths.join(paths.temporaryDownloads(), `${randomUUID()}${FileSystem.Paths.extname(params.name)}`)
				  )
				: new FileSystem.Directory(params.destinationURI ?? FileSystem.Paths.join(paths.temporaryDownloads(), randomUUID()))

		if (!destination.parentDirectory.exists) {
			destination.parentDirectory.create({
				intermediates: true
			})
		}

		if (destination.exists) {
			destination.delete()
		}

		if (params.type === "file" && destination instanceof FileSystem.File) {
			await nodeWorker.proxy("downloadFile", {
				id: params.id ?? randomUUID(),
				uuid: params.uuid,
				bucket: params.bucket,
				region: params.region,
				chunks: params.chunks,
				version: params.version,
				key: params.key,
				destination: destination.uri,
				size: params.size,
				name: params.name,
				dontEmitProgress: params.dontEmitProgress
			})
		} else {
			await nodeWorker.proxy("downloadDirectory", {
				id: params.id ?? randomUUID(),
				uuid: params.uuid,
				destination: destination.uri,
				size: params.size,
				name: params.name,
				dontEmitProgress: params.dontEmitProgress
			})
		}
	}

	public async background(
		params: {
			uuid: string
			destinationURI?: string
			name: string
			size: number
			dontEmitProgress?: boolean
		} & (
			| {
					type: "file"
					bucket: string
					region: string
					chunks: number
					version: FileEncryptionVersion
					key: string
					end?: number
					start?: number
			  }
			| {
					type: "directory"
			  }
		)
	): Promise<void> {
		if (!this.isAuthed()) {
			throw new Error("You must be authenticated to download files.")
		}

		const destination =
			params.type === "file"
				? new FileSystem.File(
						params.destinationURI ??
							FileSystem.Paths.join(paths.temporaryDownloads(), `${randomUUID()}${FileSystem.Paths.extname(params.name)}`)
				  )
				: new FileSystem.Directory(params.destinationURI ?? FileSystem.Paths.join(paths.temporaryDownloads(), randomUUID()))

		if (!destination.parentDirectory.exists) {
			destination.parentDirectory.create({
				intermediates: true
			})
		}

		if (destination.exists) {
			destination.delete()
		}

		const sdk = getSDK()

		if (params.type === "file" && destination instanceof FileSystem.File) {
			destination.create()

			await sdk
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
		} else {
			const tree = await sdk.cloud().getDirectoryTree({
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

							await sdk
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
}

export const downloadService = new DownloadService()

export default downloadService
