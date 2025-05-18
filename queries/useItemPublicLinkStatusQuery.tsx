import { useQuery } from "@tanstack/react-query"
import nodeWorker from "@/lib/nodeWorker"
import useRefreshOnFocus from "@/hooks/useRefreshOnFocus"
import useFocusNotifyOnChangeProps from "@/hooks/useFocusNotifyOnChangeProps"
import useQueryFocusAware from "@/hooks/useQueryFocusAware"
import { DEFAULT_QUERY_OPTIONS } from "@/queries/client"
import { type PublicLinkExpiration } from "@filen/sdk"

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
	const isFocused = useQueryFocusAware()
	const notifyOnChangeProps = useFocusNotifyOnChangeProps()
	const query = useQuery({
		queryKey: ["useItemPublicLinkStatusQuery", item],
		queryFn: () =>
			item.type === "file"
				? new Promise<UseItemPublicLinkStatusQuery>((resolve, reject) => {
						nodeWorker
							.proxy("filePublicLinkStatus", {
								uuid: item.uuid
							})
							.then(result => {
								if (!result.enabled || !result.uuid) {
									resolve({
										item,
										enabled: false
									})

									return
								}

								resolve({
									item,
									enabled: result.enabled,
									password: result.password,
									expiration: result.expiration,
									downloadButton: result.downloadBtn === 1,
									expirationText: result.expirationText as PublicLinkExpiration,
									uuid: result.uuid,
									key: item.key
								})
							})
							.catch(reject)
				  })
				: new Promise<UseItemPublicLinkStatusQuery>((resolve, reject) => {
						nodeWorker
							.proxy("directoryPublicLinkStatus", {
								uuid: item.uuid
							})
							.then(result => {
								if (!result.exists || !result.uuid) {
									resolve({
										item,
										enabled: false
									})

									return
								}

								resolve({
									item,
									enabled: result.exists,
									password: result.exists ? result.password : null,
									expiration: result.exists ? result.expiration : null,
									downloadButton: result.exists ? result.downloadBtn === 1 : false,
									expirationText: result.exists ? (result.expirationText as PublicLinkExpiration) : null,
									uuid: result.uuid,
									key: result.key
								})
							})
							.catch(reject)
				  }),
		notifyOnChangeProps,
		enabled: typeof enabled === "boolean" ? enabled : isFocused,
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
