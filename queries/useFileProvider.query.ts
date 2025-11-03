import { useQuery, type UseQueryOptions, type UseQueryResult } from "@tanstack/react-query"
import queryClient, { DEFAULT_QUERY_OPTIONS, useDefaultQueryParams } from "./client"
import useRefreshOnFocus from "@/hooks/useRefreshOnFocus"
import fileProvider from "@/lib/fileProvider"

export const BASE_QUERY_KEY = "useFileProviderQuery"

export async function fetchData() {
	const enabled = await fileProvider.enabled()
	const cacheBudget = await fileProvider.cacheBudget()

	return {
		enabled,
		cacheBudget
	}
}

export function useFileProviderQuery(
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

export async function fileProviderQueryRefetch(): Promise<void> {
	return await queryClient.refetchQueries({
		queryKey: [BASE_QUERY_KEY]
	})
}

export default useFileProviderQuery
