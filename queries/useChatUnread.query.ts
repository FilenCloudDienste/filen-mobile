import { useQuery, type UseQueryOptions, type UseQueryResult } from "@tanstack/react-query"
import { DEFAULT_QUERY_OPTIONS, queryClient, useDefaultQueryParams } from "./client"
import queryUpdater from "./updater"
import nodeWorker from "@/lib/nodeWorker"
import useRefreshOnFocus from "@/hooks/useRefreshOnFocus"

export const BASE_QUERY_KEY = "useChatUnreadQuery"

export async function fetchData() {
	return await nodeWorker.proxy("chatUnread", undefined)
}

export function useChatUnreadQuery(
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

export function chatUnreadQueryUpdate({
	updater
}: {
	updater:
		| Awaited<ReturnType<typeof fetchData>>
		| ((prev: Awaited<ReturnType<typeof fetchData>>) => Awaited<ReturnType<typeof fetchData>>)
}) {
	queryUpdater.set<Awaited<ReturnType<typeof fetchData>>>([BASE_QUERY_KEY], prev => {
		return typeof updater === "function" ? updater(prev ?? 0) : updater
	})
}

export async function chatUnreadQueryRefetch(): Promise<void> {
	return await queryClient.refetchQueries({
		queryKey: [BASE_QUERY_KEY]
	})
}

export function chatUnreadQueryGet() {
	return queryUpdater.get<Awaited<ReturnType<typeof fetchData>>>([BASE_QUERY_KEY])
}

export default useChatUnreadQuery
