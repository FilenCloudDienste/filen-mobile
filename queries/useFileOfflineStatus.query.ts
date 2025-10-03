import { useQuery, type UseQueryOptions, type UseQueryResult } from "@tanstack/react-query"
import { DEFAULT_QUERY_OPTIONS, useDefaultQueryParams } from "./client"
import sqlite from "@/lib/sqlite"
import pathModule from "path"
import paths from "@/lib/paths"
import useRefreshOnFocus from "@/hooks/useRefreshOnFocus"
import queryUpdater from "./updater"

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

export async function fetchData(params: UseFileOfflineStatusQueryParams): Promise<UseFileOfflineStatusQuery> {
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
}

export function useFileOfflineStatusQuery(
	params: UseFileOfflineStatusQueryParams,
	options?: Omit<UseQueryOptions, "queryKey" | "queryFn">
): UseQueryResult<Awaited<ReturnType<typeof fetchData>>, Error> {
	const defaultParams = useDefaultQueryParams(options)

	const query = useQuery({
		...DEFAULT_QUERY_OPTIONS,
		...defaultParams,
		...options,
		enabled: options?.enabled ?? true,
		staleTime: 5000,
		queryKey: [BASE_QUERY_KEY, params],
		queryFn: () => fetchData(params)
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
	queryUpdater.set<Awaited<ReturnType<typeof fetchData>>>([BASE_QUERY_KEY, params], prev => {
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
