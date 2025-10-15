import { useQuery, type UseQueryOptions, type UseQueryResult } from "@tanstack/react-query"
import { DEFAULT_QUERY_OPTIONS, useDefaultQueryParams } from "./client"
import nodeWorker from "@/lib/nodeWorker"
import useRefreshOnFocus from "@/hooks/useRefreshOnFocus"
import { sortParams } from "@/lib/utils"

export const BASE_QUERY_KEY = "useFileVersionsQuery"

export type UseFileVersionsQueryParams = {
	uuid: string
}

export async function fetchData(params: UseFileVersionsQueryParams) {
	return await nodeWorker.proxy("fetchFileVersions", params)
}

export function useFileVersionsQuery(
	params: UseFileVersionsQueryParams,
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

export default useFileVersionsQuery
