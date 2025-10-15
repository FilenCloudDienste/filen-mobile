import { useQuery, type UseQueryOptions, type UseQueryResult } from "@tanstack/react-query"
import { DEFAULT_QUERY_OPTIONS, useDefaultQueryParams } from "./client"
import nodeWorker from "@/lib/nodeWorker"
import useRefreshOnFocus from "@/hooks/useRefreshOnFocus"
import { sortParams } from "@/lib/utils"

export const BASE_QUERY_KEY = "useItemPathQuery"

export type UseItemPathQueryParams = {
	item: DriveCloudItem
}

export async function fetchData(params: UseItemPathQueryParams) {
	if (params.item.type === "file") {
		return await nodeWorker.proxy("fileUUIDToPath", {
			uuid: params.item.uuid
		})
	}

	return nodeWorker.proxy("directoryUUIDToPath", {
		uuid: params.item.uuid
	})
}

export function useItemPathQuery(
	params: UseItemPathQueryParams,
	options?: Omit<UseQueryOptions, "queryKey" | "queryFn">
): UseQueryResult<Awaited<ReturnType<typeof fetchData>>, Error> {
	params = sortParams(params)

	const defaultParams = useDefaultQueryParams(options)

	const query = useQuery({
		...DEFAULT_QUERY_OPTIONS,
		...defaultParams,
		...options,
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

export default useItemPathQuery
