import { useQuery, type UseQueryOptions, type UseQueryResult } from "@tanstack/react-query"
import { DEFAULT_QUERY_OPTIONS, queryClient, useDefaultQueryParams } from "./client"
import queryUpdater from "./updater"
import nodeWorker from "@/lib/nodeWorker"
import useRefreshOnFocus from "@/hooks/useRefreshOnFocus"
import { sortParams } from "@/lib/utils"

export const BASE_QUERY_KEY = "useChatMessagesQuery"

export type UseChatMessagesQueryParams = {
	conversation: string
	timestamp?: number
}

export async function fetchData(params: UseChatMessagesQueryParams) {
	return await nodeWorker.proxy("fetchChatMessages", params)
}

export function useChatMessagesQuery(
	params: UseChatMessagesQueryParams,
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

export function chatMessagesQueryUpdate({
	updater,
	params
}: {
	params: Parameters<typeof fetchData>[0]
} & {
	updater:
		| Awaited<ReturnType<typeof fetchData>>
		| ((prev: Awaited<ReturnType<typeof fetchData>>) => Awaited<ReturnType<typeof fetchData>>)
}) {
	params = sortParams(params)

	queryUpdater.set<Awaited<ReturnType<typeof fetchData>>>([BASE_QUERY_KEY, params], prev => {
		return typeof updater === "function" ? updater(prev ?? []) : updater
	})
}

export async function chatMessagesQueryRefetch(params: Parameters<typeof fetchData>[0]): Promise<void> {
	params = sortParams(params)

	return await queryClient.refetchQueries({
		queryKey: [BASE_QUERY_KEY, params]
	})
}

export function chatMessagesQueryGet(params: Parameters<typeof fetchData>[0]) {
	params = sortParams(params)

	return queryUpdater.get<Awaited<ReturnType<typeof fetchData>>>([BASE_QUERY_KEY, params])
}

export default useChatMessagesQuery
