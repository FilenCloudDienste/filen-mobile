import { useQuery, type UseQueryOptions, type UseQueryResult } from "@tanstack/react-query"
import { DEFAULT_QUERY_OPTIONS, useDefaultQueryParams } from "./client"
import useRefreshOnFocus from "@/hooks/useRefreshOnFocus"
import * as FileSystem from "expo-file-system"
import paths from "@/lib/paths"
import queryClient from "./client"

export const BASE_QUERY_KEY = "useSettingsAdvancedCacheQuery"

export async function fetchData() {
	const thumbnailsSize = new FileSystem.Directory(paths.thumbnails())
		.list()
		.map(entry => (entry instanceof FileSystem.File ? entry.size ?? 0 : 0))
		.reduce((a, b) => a + b, 0)

	const exportsSize = new FileSystem.Directory(paths.exports())
		.list()
		.map(entry => (entry instanceof FileSystem.File ? entry.size ?? 0 : 0))
		.reduce((a, b) => a + b, 0)

	const offlineFilesSize = new FileSystem.Directory(paths.offlineFiles())
		.list()
		.map(entry => (entry instanceof FileSystem.File ? entry.size ?? 0 : 0))
		.reduce((a, b) => a + b, 0)

	const temporaryDownloadsSize = new FileSystem.Directory(paths.temporaryDownloads())
		.list()
		.map(entry => (entry instanceof FileSystem.File ? entry.size ?? 0 : 0))
		.reduce((a, b) => a + b, 0)

	const temporaryUploadsSize = new FileSystem.Directory(paths.temporaryUploads())
		.list()
		.map(entry => (entry instanceof FileSystem.File ? entry.size ?? 0 : 0))
		.reduce((a, b) => a + b, 0)

	const trackPlayerSize = new FileSystem.Directory(paths.trackPlayer())
		.list()
		.map(entry => (entry instanceof FileSystem.File ? entry.size ?? 0 : 0))
		.reduce((a, b) => a + b, 0)

	const trackPlayerPicturesSize = new FileSystem.Directory(paths.trackPlayerPictures())
		.list()
		.map(entry => (entry instanceof FileSystem.File ? entry.size ?? 0 : 0))
		.reduce((a, b) => a + b, 0)

	return {
		thumbnailsSize,
		exportsSize,
		offlineFilesSize,
		temporaryDownloadsSize,
		temporaryUploadsSize,
		trackPlayerSize,
		trackPlayerPicturesSize
	}
}

export function useSettingsAdvancedCacheQuery(
	options?: Omit<UseQueryOptions, "queryKey" | "queryFn">
): UseQueryResult<Awaited<ReturnType<typeof fetchData>>, Error> {
	const defaultParams = useDefaultQueryParams(options)

	const query = useQuery({
		...DEFAULT_QUERY_OPTIONS,
		...defaultParams,
		...options,
		enabled: options?.enabled ?? true,
		queryKey: [BASE_QUERY_KEY],
		queryFn: () => fetchData()
	})

	useRefreshOnFocus({
		isEnabled: query.isEnabled,
		refetch: query.refetch
	})

	return query as UseQueryResult<Awaited<ReturnType<typeof fetchData>>, Error>
}

export async function settingsAdvancedCacheQueryRefetch(): Promise<void> {
	return await queryClient.refetchQueries({
		queryKey: [BASE_QUERY_KEY]
	})
}

export default useSettingsAdvancedCacheQuery
