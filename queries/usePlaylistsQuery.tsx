import { useQuery } from "@tanstack/react-query"
import nodeWorker from "@/lib/nodeWorker"
import useRefreshOnFocus from "@/hooks/useRefreshOnFocus"
import useFocusNotifyOnChangeProps from "@/hooks/useFocusNotifyOnChangeProps"
import useQueryFocusAware from "@/hooks/useQueryFocusAware"
import { DEFAULT_QUERY_OPTIONS } from "./client"
import { promiseAllChunked } from "@/lib/utils"
import { validate as validateUUID } from "uuid"
import { type } from "arktype"
import authService from "@/services/auth.service"
import * as FileSystem from "expo-file-system"
import { randomUUID } from "expo-crypto"
import paths from "@/lib/paths"
import useNetInfo from "@/hooks/useNetInfo"
import upload from "@/lib/upload"
import download from "@/lib/download"
import alerts from "@/lib/alerts"
import pathModule from "path"

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

export async function updatePlaylist(playlist: Playlist): Promise<void> {
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

		await upload.file.foreground({
			parent: playlistsDirectoryUUID,
			localPath: tmpFile.uri,
			name: `${playlist.uuid}.json`,
			id: randomUUID(),
			size: tmpFile.size,
			isShared: false,
			deleteAfterUpload: true,
			dontEmitProgress: true
		})
	} finally {
		if (tmpFile && tmpFile.exists) {
			tmpFile.delete()
		}
	}
}

export async function fetchPlaylists(): Promise<(Playlist & { fileUUID: string })[]> {
	const playlistsDirectoryUUID = await findPlaylistDirectoryUUID()

	const playlists = await nodeWorker.proxy("fetchCloudItems", {
		parent: playlistsDirectoryUUID,
		of: "drive",
		receiverId: 0
	})

	return (
		await promiseAllChunked(
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

export function usePlaylistsQuery({
	refetchOnMount = DEFAULT_QUERY_OPTIONS.refetchOnMount,
	refetchOnReconnect = DEFAULT_QUERY_OPTIONS.refetchOnReconnect,
	refetchOnWindowFocus = DEFAULT_QUERY_OPTIONS.refetchOnWindowFocus,
	staleTime = DEFAULT_QUERY_OPTIONS.staleTime,
	gcTime = DEFAULT_QUERY_OPTIONS.gcTime,
	enabled
}: {
	refetchOnMount?: boolean | "always"
	refetchOnReconnect?: boolean | "always"
	refetchOnWindowFocus?: boolean | "always"
	staleTime?: number
	gcTime?: number
	enabled?: boolean
}) {
	const { hasInternet } = useNetInfo()
	const isFocused = useQueryFocusAware()
	const notifyOnChangeProps = useFocusNotifyOnChangeProps()
	const query = useQuery({
		queryKey: ["usePlaylistsQuery"],
		queryFn: () => fetchPlaylists(),
		throwOnError(err) {
			console.error(err)
			alerts.error(err.message)

			return false
		},
		notifyOnChangeProps,
		enabled: !hasInternet ? false : typeof enabled === "boolean" ? enabled : isFocused,
		refetchOnMount,
		refetchOnReconnect,
		refetchOnWindowFocus,
		staleTime,
		gcTime,
		experimental_prefetchInRender: true
	})

	useRefreshOnFocus(query.refetch, enabled)

	return query
}

export default usePlaylistsQuery
