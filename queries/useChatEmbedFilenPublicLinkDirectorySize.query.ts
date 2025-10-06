import { useQuery, type UseQueryOptions, type UseQueryResult } from "@tanstack/react-query"
import { DEFAULT_QUERY_OPTIONS, useDefaultQueryParams } from "./client"
import nodeWorker from "@/lib/nodeWorker"
import useRefreshOnFocus from "@/hooks/useRefreshOnFocus"
import type { PublicLinkInfo } from "@/components/chats/chat/messages/embeds/filen"
import { sortParams } from "@/lib/utils"

export const BASE_QUERY_KEY = "useChatEmbedFilenPublicLinkDirectorySizeQuery"

export type UseChatEmbedFilenPublicLinkDirectorySizeQueryParams = {
	info: PublicLinkInfo
	link: string
	parsedLink: {
		uuid: string
		key: string
		type: "file" | "directory"
	}
}

export async function fetchData(params: UseChatEmbedFilenPublicLinkDirectorySizeQueryParams) {
	if (!params.info || params.info.type === "file" || params.parsedLink.type === "file") {
		throw new Error("No directory provided.")
	}

	return await nodeWorker.proxy("directorySizePublicLink", {
		uuid: params.info.data.info.parent,
		linkUUID: params.parsedLink.uuid
	})
}

export function useChatEmbedFilenPublicLinkDirectorySizeQuery(
	params: UseChatEmbedFilenPublicLinkDirectorySizeQueryParams,
	options?: Omit<UseQueryOptions, "queryKey" | "queryFn">
): UseQueryResult<Awaited<ReturnType<typeof fetchData>>, Error> {
	params = sortParams(params)

	const defaultParams = useDefaultQueryParams(options)

	const query = useQuery({
		...DEFAULT_QUERY_OPTIONS,
		...defaultParams,
		throwOnError: err => {
			console.error(err)

			return false
		},
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

export default useChatEmbedFilenPublicLinkDirectorySizeQuery
