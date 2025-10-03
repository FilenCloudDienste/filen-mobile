import { useQuery, type UseQueryOptions, type UseQueryResult } from "@tanstack/react-query"
import { DEFAULT_QUERY_OPTIONS, useDefaultQueryParams, DEFAULT_QUERY_OPTIONS_ETERNAL } from "./client"
import useRefreshOnFocus from "@/hooks/useRefreshOnFocus"
import axios from "axios"

export const BASE_QUERY_KEY = "useChatEmbedYouTubeQuery"

export type YouTubeInfo = {
	title?: string
	author_name?: string
	author_url?: string
	type?: string
	height?: number
	width?: number
	version?: string
	provider_name?: string
	provider_url?: string
	thumbnail_height?: number
	thumbnail_width?: number
	thumbnail_url?: string
	html?: string
}

export type UseChatEmbedYouTubeQueryParams = {
	videoId: string
}

export async function fetchData(params: UseChatEmbedYouTubeQueryParams) {
	if (!params.videoId) {
		throw new Error("No videoId provided.")
	}

	const request = await axios.get(`https://www.youtube.com/oembed?url=https://youtube.com/watch?v=${params.videoId}&format=json`, {
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json"
		},
		timeout: 60000
	})

	if (request.status !== 200 || !request.data || !request.data.title || !request.data.thumbnail_url || !request.data.author_name) {
		throw new Error("Failed to fetch YouTube data.")
	}

	return request.data as unknown as YouTubeInfo
}

export function useChatEmbedYouTubeQuery(
	params: UseChatEmbedYouTubeQueryParams,
	options?: Omit<UseQueryOptions, "queryKey" | "queryFn">
): UseQueryResult<Awaited<ReturnType<typeof fetchData>>, Error> {
	const defaultParams = useDefaultQueryParams(options)

	const query = useQuery({
		...DEFAULT_QUERY_OPTIONS,
		...defaultParams,
		...DEFAULT_QUERY_OPTIONS_ETERNAL,
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

export default useChatEmbedYouTubeQuery
