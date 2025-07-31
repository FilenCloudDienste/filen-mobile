import { useQuery } from "@tanstack/react-query"
import nodeWorker from "@/lib/nodeWorker"
import useRefreshOnFocus from "@/hooks/useRefreshOnFocus"
import useFocusNotifyOnChangeProps from "@/hooks/useFocusNotifyOnChangeProps"
import useQueryFocusAware from "@/hooks/useQueryFocusAware"
import { DEFAULT_QUERY_OPTIONS } from "@/queries/client"
import { type PublicLinkExpiration } from "@filen/sdk"
import useNetInfo from "@/hooks/useNetInfo"
import alerts from "@/lib/alerts"

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

export async function fetchItemPublicLinkStatus(item: DriveCloudItem): Promise<UseItemPublicLinkStatusQuery> {
	if (item.type === "file") {
		const result = await nodeWorker.proxy("filePublicLinkStatus", {
			uuid: item.uuid
		})

		if (!result.enabled || !result.uuid) {
			return {
				item,
				enabled: false
			}
		}

		return {
			item,
			enabled: result.enabled,
			password: result.password,
			expiration: result.expiration,
			downloadButton: result.downloadBtn === 1,
			expirationText: result.expirationText as PublicLinkExpiration,
			uuid: result.uuid,
			key: item.key
		}
	} else {
		const result = await nodeWorker.proxy("directoryPublicLinkStatus", {
			uuid: item.uuid
		})

		if (!result.exists || !result.uuid) {
			return {
				item,
				enabled: false
			}
		}

		return {
			item,
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

export default function useItemPublicLinkStatusQuery({
	item,
	refetchOnMount = DEFAULT_QUERY_OPTIONS.refetchOnMount,
	refetchOnReconnect = DEFAULT_QUERY_OPTIONS.refetchOnReconnect,
	refetchOnWindowFocus = DEFAULT_QUERY_OPTIONS.refetchOnWindowFocus,
	staleTime = DEFAULT_QUERY_OPTIONS.staleTime,
	gcTime = DEFAULT_QUERY_OPTIONS.gcTime,
	enabled
}: { item: DriveCloudItem } & {
	refetchOnMount?: boolean | "always"
	refetchOnReconnect?: boolean | "always"
	refetchOnWindowFocus?: boolean | "always"
	staleTime?: number
	gcTime?: number
	enabled?: boolean
}) {
	const { hasInternet } = useNetInfo()
	const isFocused = useQueryFocusAware()
	const notifyOnChangeProps = useFocusNotifyOnChangeProps()
	const query = useQuery({
		queryKey: ["useItemPublicLinkStatusQuery", item],
		queryFn: () => fetchItemPublicLinkStatus(item),
		throwOnError(err) {
			console.error(err)
			alerts.error(err.message)

			return false
		},
		notifyOnChangeProps,
		enabled: !hasInternet ? false : typeof enabled === "boolean" ? enabled : isFocused,
		refetchOnMount,
		refetchOnReconnect,
		refetchOnWindowFocus,
		staleTime,
		gcTime,
		experimental_prefetchInRender: true
	})

	useRefreshOnFocus(query.refetch, enabled)

	return query
}
