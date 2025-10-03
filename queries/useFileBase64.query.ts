import { useQuery, type UseQueryOptions, type UseQueryResult } from "@tanstack/react-query"
import { DEFAULT_QUERY_OPTIONS, useDefaultQueryParams, DEFAULT_QUERY_OPTIONS_ETERNAL } from "./client"
import axios from "axios"

export const BASE_QUERY_KEY = "useFileBase64Query"

export type UseFileBase64QueryParams = {
	url: string
	maxSize?: number
}

export async function fetchData(params: UseFileBase64QueryParams) {
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
		throw new Error("Failed to fetch file data.")
	}

	return Buffer.from(request.data).toString("base64")
}

export function useFileBase64Query(
	params: UseFileBase64QueryParams,
	options?: Omit<UseQueryOptions, "queryKey" | "queryFn">
): UseQueryResult<Awaited<ReturnType<typeof fetchData>>, Error> {
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

export default useFileBase64Query
