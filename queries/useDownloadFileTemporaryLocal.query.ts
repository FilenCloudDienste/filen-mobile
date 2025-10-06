import { useQuery, type UseQueryOptions, type UseQueryResult } from "@tanstack/react-query"
import { DEFAULT_QUERY_OPTIONS, useDefaultQueryParams } from "./client"
import useRefreshOnFocus from "@/hooks/useRefreshOnFocus"
import * as FileSystemLegacy from "expo-file-system/legacy"
import * as FileSystem from "expo-file-system"
import paths from "@/lib/paths"
import { xxHash32 } from "js-xxhash"
import pathModule from "path"
import { sortParams } from "@/lib/utils"

export const BASE_QUERY_KEY = "useDownloadFileTemporaryLocalQuery"

export type UseDownloadFileTemporaryLocalQueryParams = {
	url: string
}

export async function fetchData(params: UseDownloadFileTemporaryLocalQueryParams) {
	if (!params.url) {
		return null
	}

	if (!(params.url.startsWith("http://") || params.url.startsWith("https://"))) {
		const file = new FileSystem.File(pathModule.posix.join(paths.temporaryDownloads(), `${xxHash32(params.url).toString(16)}.pdf`))

		if (file.exists) {
			return file.uri
		}

		return null
	}

	const file = new FileSystem.File(pathModule.posix.join(paths.temporaryDownloads(), `${xxHash32(params.url).toString(16)}.pdf`))

	if (file.exists) {
		return file.uri
	}

	await FileSystemLegacy.downloadAsync(params.url, file.uri, {
		sessionType: FileSystemLegacy.FileSystemSessionType.BACKGROUND
	})

	return file.uri
}

export function useDownloadFileTemporaryLocalQuery(
	params: UseDownloadFileTemporaryLocalQueryParams,
	options?: Omit<UseQueryOptions, "queryKey" | "queryFn">
): UseQueryResult<Awaited<ReturnType<typeof fetchData>>, Error> {
	params = sortParams(params)

	const defaultParams = useDefaultQueryParams(options)

	const query = useQuery({
		...DEFAULT_QUERY_OPTIONS,
		...defaultParams,
		...options,
		queryKey: [BASE_QUERY_KEY, params],
		queryFn: () => fetchData(params)
	})

	useRefreshOnFocus({
		isEnabled: query.isEnabled,
		refetch: query.refetch
	})

	return query as UseQueryResult<Awaited<ReturnType<typeof fetchData>>, Error>
}

export default useDownloadFileTemporaryLocalQuery
