import nodeWorker from "@/lib/nodeWorker"
import paths from "@/lib/paths"
import * as FileSystem from "expo-file-system/next"
import { randomUUID } from "expo-crypto"
import * as FileSystemOld from "expo-file-system"
import { type FileMetadata, type FolderMetadata, type ProgressWithTotalCallback } from "@filen/sdk"
import { sanitizeFileName } from "@/lib/utils"

export class ItemActions {
	public async rename({ item, name }: { item: DriveCloudItem; name: string }): Promise<void> {
		if (item.type === "directory") {
			return await nodeWorker.proxy("renameDirectory", {
				uuid: item.uuid,
				name
			})
		}

		return await nodeWorker.proxy("renameFile", {
			uuid: item.uuid,
			name,
			metadata: {
				name,
				mime: item.mime,
				key: item.key,
				hash: item.hash,
				size: item.size,
				creation: item.creation,
				lastModified: item.lastModified
			} satisfies FileMetadata
		})
	}

	public async changeDirectoryColor({ item, color }: { item: DriveCloudItem; color: string }): Promise<void> {
		if (item.type !== "directory") {
			throw new Error("Item not of type directory.")
		}

		return await nodeWorker.proxy("changeDirectoryColor", {
			uuid: item.uuid,
			color
		})
	}

	public async favorite({ item, favorite }: { item: DriveCloudItem; favorite: boolean }): Promise<void> {
		if (item.type === "directory") {
			return await nodeWorker.proxy("favoriteDirectory", {
				uuid: item.uuid,
				favorite
			})
		}

		return await nodeWorker.proxy("favoriteFile", {
			uuid: item.uuid,
			favorite
		})
	}

	public async shareItems(params: {
		files: {
			uuid: string
			parent: string
			metadata: FileMetadata
		}[]
		directories: {
			uuid: string
			parent: string
			metadata: FolderMetadata
		}[]
		email: string
		onProgress?: ProgressWithTotalCallback
	}): Promise<void> {
		return await nodeWorker.proxy("shareItems", params)
	}

	public async trashItem({ item, trash }: { item: DriveCloudItem; trash: boolean }): Promise<void> {
		if (item.type === "directory") {
			if (!trash) {
				return await nodeWorker.proxy("restoreDirectory", {
					uuid: item.uuid
				})
			}

			return await nodeWorker.proxy("trashDirectory", {
				uuid: item.uuid
			})
		}

		if (!trash) {
			return await nodeWorker.proxy("restoreFile", {
				uuid: item.uuid
			})
		}

		return await nodeWorker.proxy("trashFile", {
			uuid: item.uuid
		})
	}

	public async downloadToTemporaryLocation(item: DriveCloudItem): Promise<string> {
		if (item.type !== "file") {
			throw new Error("Item not of type file.")
		}

		const freeDiskSpace = await FileSystemOld.getFreeDiskStorageAsync()

		if (freeDiskSpace <= item.size + 1024 * 1024) {
			throw new Error("Not enough local disk space available.")
		}

		const tempLocation = new FileSystem.File(FileSystem.Paths.join(paths.temporaryDownloads(), sanitizeFileName(item.name)))

		if (tempLocation.exists) {
			tempLocation.delete()
		}

		await nodeWorker.proxy("downloadFile", {
			id: randomUUID(),
			uuid: item.uuid,
			bucket: item.bucket,
			region: item.region,
			chunks: item.chunks,
			version: item.version,
			key: item.key,
			destination: tempLocation.uri,
			size: item.size,
			name: item.name,
			dontEmitProgress: true
		})

		return tempLocation.uri
	}

	public async moveItem({ item, parent }: { item: DriveCloudItem; parent: string }): Promise<void> {
		if (item.type === "directory") {
			return await nodeWorker.proxy("moveDirectory", {
				uuid: item.uuid,
				to: parent,
				metadata: {
					name: item.name
				} satisfies FolderMetadata
			})
		}

		return await nodeWorker.proxy("moveFile", {
			uuid: item.uuid,
			to: parent,
			metadata: {
				name: item.name,
				mime: item.mime,
				key: item.key,
				hash: item.hash,
				size: item.size,
				creation: item.creation,
				lastModified: item.lastModified
			} satisfies FileMetadata
		})
	}
}

export const itemActions = new ItemActions()

export default itemActions
