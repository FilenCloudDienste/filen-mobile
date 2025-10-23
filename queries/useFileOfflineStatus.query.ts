import { useQuery, type UseQueryOptions, type UseQueryResult } from "@tanstack/react-query"
import { DEFAULT_QUERY_OPTIONS, useDefaultQueryParams, QUERY_CLIENT_CACHE_TIME } from "./client"
import sqlite from "@/lib/sqlite"
import pathModule from "path"
import paths from "@/lib/paths"
import useRefreshOnFocus from "@/hooks/useRefreshOnFocus"
import queryUpdater from "./updater"
import { sortParams } from "@/lib/utils"
import Semaphore from "@/lib/semaphore"

export const BASE_QUERY_KEY = "useFileOfflineStatusQuery"

export type UseFileOfflineStatusQueryParams = {
	uuid: string
}

export type UseFileOfflineStatusQuery =
	| {
			exists: false
	  }
	| {
			exists: true
			path: string
	  }

const mutex = new Semaphore(1)

export async function fetchData(params: UseFileOfflineStatusQueryParams): Promise<UseFileOfflineStatusQuery> {
	await mutex.acquire()

	try {
		const item = await sqlite.offlineFiles.get(params.uuid)

		if (!item) {
			return {
				exists: false
			}
		}

		return {
			exists: true,
			path: pathModule.posix.join(paths.offlineFiles(), `${params.uuid}${pathModule.posix.extname(item.name)}`)
		}
	} finally {
		mutex.release()
	}
}

export function useFileOfflineStatusQuery(
	params: UseFileOfflineStatusQueryParams,
	options?: Omit<UseQueryOptions, "queryKey" | "queryFn">
): UseQueryResult<Awaited<ReturnType<typeof fetchData>>, Error> {
	const sortedParams = sortParams(params)
	const defaultParams = useDefaultQueryParams(options)

	const query = useQuery({
		...DEFAULT_QUERY_OPTIONS,
		...defaultParams,
		...options,
		enabled: options?.enabled ?? true,
		staleTime: QUERY_CLIENT_CACHE_TIME,
		queryKey: [BASE_QUERY_KEY, sortedParams],
		queryFn: () => fetchData(sortedParams)
	})

	useRefreshOnFocus({
		isEnabled: query.isEnabled,
		refetch: query.refetch
	})

	return query as UseQueryResult<Awaited<ReturnType<typeof fetchData>>, Error>
}

export function fileOfflineStatusQueryUpdate({
	updater,
	params
}: {
	params: Parameters<typeof fetchData>[0]
} & {
	updater:
		| Awaited<ReturnType<typeof fetchData>>
		| ((prev: Awaited<ReturnType<typeof fetchData>>) => Awaited<ReturnType<typeof fetchData>>)
}) {
	const sortedParams = sortParams(params)

	queryUpdater.set<Awaited<ReturnType<typeof fetchData>>>([BASE_QUERY_KEY, sortedParams], prev => {
		return typeof updater === "function"
			? updater(
					prev ?? {
						exists: false
					}
			  )
			: updater
	})
}

export default useFileOfflineStatusQuery
