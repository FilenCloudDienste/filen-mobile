import { useQuery, type UseQueryOptions, type UseQueryResult } from "@tanstack/react-query"
import { DEFAULT_QUERY_OPTIONS, queryClient, useDefaultQueryParams } from "./client"
import queryUpdater from "./updater"
import nodeWorker from "@/lib/nodeWorker"
import useRefreshOnFocus from "@/hooks/useRefreshOnFocus"
import { validate as validateUUID } from "uuid"
import { type } from "arktype"
import authService from "@/services/auth.service"
import * as FileSystem from "expo-file-system"
import { randomUUID } from "expo-crypto"
import paths from "@/lib/paths"
import upload from "@/lib/upload"
import download from "@/lib/download"
import pathModule from "path"

export const BASE_QUERY_KEY = "usePlaylistsQuery"

export const PlaylistFileSchema = type({
	uuid: "string",
	name: "string",
	mime: "string",
	size: "number",
	bucket: "string",
	key: "string",
	version: "number",
	chunks: "number",
	region: "string",
	playlist: "string"
})

export const PlaylistSchema = type({
	uuid: "string",
	name: "string",
	created: "number",
	updated: "number",
	files: PlaylistFileSchema.array()
})

export type Playlist = typeof PlaylistSchema.infer
export type PlaylistFile = typeof PlaylistFileSchema.infer

export async function findPlaylistDirectoryUUID(): Promise<string> {
	const { baseFolderUUID } = authService.getSDKConfig()

	if (!baseFolderUUID) {
		throw new Error("Base folder UUID is not set.")
	}

	const rootFolderList = await nodeWorker.proxy("fetchCloudItems", {
		parent: baseFolderUUID,
		of: "drive",
		receiverId: 0
	})

	let filenDirectory = rootFolderList.filter(item => item.type === "directory").find(item => item.name === ".filen")

	if (!filenDirectory) {
		await nodeWorker.proxy("createDirectory", {
			parent: baseFolderUUID,
			name: ".filen"
		})

		const rootFolderList = await nodeWorker.proxy("fetchCloudItems", {
			parent: baseFolderUUID,
			of: "drive",
			receiverId: 0
		})

		filenDirectory = rootFolderList.filter(item => item.type === "directory").find(item => item.name === ".filen")
	}

	if (!filenDirectory) {
		throw new Error("Filen directory not found.")
	}

	const filenDirectoryList = await nodeWorker.proxy("fetchCloudItems", {
		parent: filenDirectory.uuid,
		of: "drive",
		receiverId: 0
	})

	let playlistsDirectory = filenDirectoryList.filter(item => item.type === "directory").find(item => item.name === "playlists")

	if (!playlistsDirectory) {
		await nodeWorker.proxy("createDirectory", {
			parent: filenDirectory.uuid,
			name: "playlists"
		})

		const filenDirectoryList = await nodeWorker.proxy("fetchCloudItems", {
			parent: filenDirectory.uuid,
			of: "drive",
			receiverId: 0
		})

		playlistsDirectory = filenDirectoryList.filter(item => item.type === "directory").find(item => item.name === "playlists")
	}

	if (!playlistsDirectory) {
		throw new Error("Playlists directory not found.")
	}

	return playlistsDirectory.uuid
}

export async function updatePlaylist(playlist: Playlist): Promise<{
	fileUuid: string
}> {
	const playlistsDirectoryUUID = await findPlaylistDirectoryUUID()
	let tmpFile: FileSystem.File | null = null

	try {
		tmpFile = new FileSystem.File(pathModule.posix.join(paths.temporaryUploads(), `${randomUUID()}.json`))

		if (tmpFile.exists) {
			tmpFile.delete()
		}

		tmpFile.write(JSON.stringify(playlist), {
			encoding: "utf8"
		})

		if (!tmpFile.size) {
			throw new Error("Temporary upload file is empty.")
		}

		const item = await upload.file.foreground({
			parent: playlistsDirectoryUUID,
			localPath: tmpFile.uri,
			name: `${playlist.uuid}.json`,
			id: randomUUID(),
			size: tmpFile.size,
			isShared: false,
			deleteAfterUpload: true,
			dontEmitProgress: true
		})

		return {
			fileUuid: item.uuid
		}
	} finally {
		if (tmpFile && tmpFile.exists) {
			tmpFile.delete()
		}
	}
}

export async function fetchData(): Promise<(Playlist & { fileUUID: string })[]> {
	const playlistsDirectoryUUID = await findPlaylistDirectoryUUID()

	const playlists = await nodeWorker.proxy("fetchCloudItems", {
		parent: playlistsDirectoryUUID,
		of: "drive",
		receiverId: 0
	})

	return (
		await Promise.all(
			playlists
				.filter(
					item =>
						item.type === "file" && validateUUID(item.name.split(".")?.[0]) && item.name.trim().toLowerCase().endsWith(".json")
				)
				.map(async item => {
					let tmpFile: FileSystem.File | null = null

					try {
						tmpFile = new FileSystem.File(pathModule.posix.join(paths.temporaryDownloads(), randomUUID()))

						if (tmpFile.exists) {
							tmpFile.delete()
						}

						await download.file.foreground({
							id: randomUUID(),
							uuid: item.uuid,
							bucket: item.type === "file" ? item.bucket : "",
							region: item.type === "file" ? item.region : "",
							chunks: item.type === "file" ? item.chunks : 0,
							version: item.type === "file" ? item.version : 1,
							key: item.type === "file" ? item.key : "",
							destination: tmpFile.uri,
							size: item.size,
							name: item.name,
							dontEmitProgress: true
						})

						if (!tmpFile.exists) {
							throw new Error("Temporary file does not exist.")
						}

						const result = PlaylistSchema(JSON.parse(await tmpFile.text()))

						if (result instanceof type.errors) {
							throw new Error("Invalid playlist file format.")
						}

						return {
							...result,
							fileUUID: item.uuid
						}
					} catch {
						return null
					} finally {
						if (tmpFile && tmpFile.exists) {
							tmpFile.delete()
						}
					}
				})
		)
	).filter(playlist => playlist !== null)
}

export function usePlaylistsQuery(
	options?: Omit<UseQueryOptions, "queryKey" | "queryFn">
): UseQueryResult<Awaited<ReturnType<typeof fetchData>>, Error> {
	const defaultParams = useDefaultQueryParams(options)

	const query = useQuery({
		...DEFAULT_QUERY_OPTIONS,
		...defaultParams,
		...options,
		queryKey: [BASE_QUERY_KEY],
		queryFn: () => fetchData()
	})

	useRefreshOnFocus({
		isEnabled: query.isEnabled,
		refetch: query.refetch
	})

	return query as UseQueryResult<Awaited<ReturnType<typeof fetchData>>, Error>
}

export function playlistsQueryUpdate({
	updater
}: {
	updater:
		| Awaited<ReturnType<typeof fetchData>>
		| ((prev: Awaited<ReturnType<typeof fetchData>>) => Awaited<ReturnType<typeof fetchData>>)
}) {
	queryUpdater.set<Awaited<ReturnType<typeof fetchData>>>([BASE_QUERY_KEY], prev => {
		return typeof updater === "function" ? updater(prev ?? []) : updater
	})
}

export async function playlistsQueryRefetch(): Promise<void> {
	return await queryClient.refetchQueries({
		queryKey: [BASE_QUERY_KEY]
	})
}

export function playlistsQueryGet() {
	return queryUpdater.get<Awaited<ReturnType<typeof fetchData>>>([BASE_QUERY_KEY])
}

export default usePlaylistsQuery
