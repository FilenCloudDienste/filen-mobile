import { useQuery, type UseQueryOptions, type UseQueryResult } from "@tanstack/react-query"
import { DEFAULT_QUERY_OPTIONS, useDefaultQueryParams, queryClient } from "./client"
import nodeWorker from "@/lib/nodeWorker"
import useRefreshOnFocus from "@/hooks/useRefreshOnFocus"
import type { PublicLinkExpiration } from "@filen/sdk"
import { sortParams } from "@/lib/utils"

export const BASE_QUERY_KEY = "useItemPublicLinkStatusQuery"

export type UseItemPublicLinkStatusQueryParams = {
	item: DriveCloudItem
}

export type UseItemPublicLinkStatusQuery =
	| {
			item: DriveCloudItem
			enabled: false
	  }
	| {
			item: DriveCloudItem
			enabled: true
			password: string | null
			expiration: number | null
			downloadButton: boolean
			expirationText: PublicLinkExpiration | null
			uuid: string
			key: string
	  }

export async function fetchData(params: UseItemPublicLinkStatusQueryParams): Promise<UseItemPublicLinkStatusQuery> {
	if (params.item.type === "file") {
		const result = await nodeWorker.proxy("filePublicLinkStatus", {
			uuid: params.item.uuid
		})

		if (!result.enabled || !result.uuid) {
			return {
				item: params.item,
				enabled: false
			}
		}

		return {
			item: params.item,
			enabled: result.enabled,
			password: result.password,
			expiration: result.expiration,
			downloadButton: result.downloadBtn === 1,
			expirationText: result.expirationText as PublicLinkExpiration,
			uuid: result.uuid,
			key: params.item.key
		}
	} else {
		const result = await nodeWorker.proxy("directoryPublicLinkStatus", {
			uuid: params.item.uuid
		})

		if (!result.exists || !result.uuid) {
			return {
				item: params.item,
				enabled: false
			}
		}

		return {
			item: params.item,
			enabled: result.exists,
			password: result.exists ? result.password : null,
			expiration: result.exists ? result.expiration : null,
			downloadButton: result.exists ? result.downloadBtn === 1 : false,
			expirationText: result.exists ? (result.expirationText as PublicLinkExpiration) : null,
			uuid: result.uuid,
			key: result.key
		}
	}
}

export function useItemPublicLinkStatusQuery(
	params: UseItemPublicLinkStatusQueryParams,
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

export async function itemPublicLinkStatusQueryRefetch(params: Parameters<typeof fetchData>[0]): Promise<void> {
	params = sortParams(params)

	return await queryClient.refetchQueries({
		queryKey: [BASE_QUERY_KEY, params]
	})
}

export default useItemPublicLinkStatusQuery
