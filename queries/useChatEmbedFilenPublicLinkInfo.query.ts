import { useQuery, type UseQueryOptions, type UseQueryResult } from "@tanstack/react-query"
import { DEFAULT_QUERY_OPTIONS, useDefaultQueryParams } from "./client"
import nodeWorker from "@/lib/nodeWorker"
import useRefreshOnFocus from "@/hooks/useRefreshOnFocus"
import { getPreviewType, sortParams } from "@/lib/utils"

export const BASE_QUERY_KEY = "useChatEmbedFilenPublicLinkInfoQuery"

export type UseChatEmbedFilenPublicLinkInfoQueryParams = {
	publicLink: {
		uuid: string
		key: string
		type: "file" | "directory"
	} | null
}

export async function fetchData(params: UseChatEmbedFilenPublicLinkInfoQueryParams) {
	if (!params.publicLink) {
		throw new Error("No publicLink provided.")
	}

	if (params.publicLink.type === "directory") {
		const info = await nodeWorker.proxy("directoryPublicLinkInfo", {
			uuid: params.publicLink.uuid,
			key: params.publicLink.key
		})

		return {
			type: "directory",
			data: {
				info
			}
		} as const
	} else {
		const password = await nodeWorker.proxy("filePublicLinkHasPassword", {
			uuid: params.publicLink.uuid
		})

		if (password.hasPassword) {
			return null
		}

		const info = await nodeWorker.proxy("filePublicLinkInfo", {
			uuid: params.publicLink.uuid,
			key: params.publicLink.key
		})

		const previewType = getPreviewType(info.name)

		if (
			previewType === "code" ||
			previewType === "text" ||
			previewType === "image" ||
			previewType === "video" ||
			previewType === "audio" ||
			previewType === "pdf" ||
			previewType === "docx"
		) {
			return {
				type: "file",
				data: {
					info,
					previewType
				}
			} as const
		}
	}

	return null
}

export function useChatEmbedFilenPublicLinkInfoQuery(
	params: UseChatEmbedFilenPublicLinkInfoQueryParams,
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

export default useChatEmbedFilenPublicLinkInfoQuery
