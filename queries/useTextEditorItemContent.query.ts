import { useQuery, type UseQueryOptions, type UseQueryResult } from "@tanstack/react-query"
import { DEFAULT_QUERY_OPTIONS, useDefaultQueryParams, DEFAULT_QUERY_OPTIONS_ETERNAL } from "./client"
import axios from "axios"
import { sortParams } from "@/lib/utils"

export const BASE_QUERY_KEY = "useTextEditorItemContentQuery"

export type UseTextEditorItemContentQueryParams = {
	url: string
	maxSize?: number
}

export async function fetchData(params: UseTextEditorItemContentQueryParams) {
	const cancelToken = axios.CancelToken.source()
	const request = await axios.get(params.url, {
		timeout: 60000,
		responseType: "arraybuffer",
		cancelToken: cancelToken.token,
		maxContentLength: params.maxSize,
		onDownloadProgress(progressEvent) {
			if (
				params.maxSize &&
				(progressEvent.loaded > params.maxSize || (progressEvent.total && progressEvent.total > params.maxSize))
			) {
				cancelToken.cancel("File size exceeds the maximum limit.")
			}
		}
	})

	if (request.status !== 200) {
		throw new Error("Failed to fetch text data.")
	}

	return Buffer.from(request.data).toString("utf-8")
}

export function useTextEditorItemContentQuery(
	params: UseTextEditorItemContentQueryParams,
	options?: Omit<UseQueryOptions, "queryKey" | "queryFn">
): UseQueryResult<Awaited<ReturnType<typeof fetchData>>, Error> {
	params = sortParams(params)

	const defaultParams = useDefaultQueryParams(options)

	const query = useQuery({
		...DEFAULT_QUERY_OPTIONS,
		...defaultParams,
		...DEFAULT_QUERY_OPTIONS_ETERNAL,
		...options,
		queryKey: [BASE_QUERY_KEY, params],
		queryFn: () => fetchData(params)
	})

	return query as UseQueryResult<Awaited<ReturnType<typeof fetchData>>, Error>
}

export default useTextEditorItemContentQuery
