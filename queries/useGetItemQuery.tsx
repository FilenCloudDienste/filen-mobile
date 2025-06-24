import { useQuery } from "@tanstack/react-query"
import nodeWorker from "@/lib/nodeWorker"
import useRefreshOnFocus from "@/hooks/useRefreshOnFocus"
import useFocusNotifyOnChangeProps from "@/hooks/useFocusNotifyOnChangeProps"
import useQueryFocusAware from "@/hooks/useQueryFocusAware"
import { DEFAULT_QUERY_OPTIONS } from "./client"
import useNetInfo from "@/hooks/useNetInfo"

export default function useGetItemQuery({
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
		queryKey: ["useGetItemQuery", item],
		queryFn: async () => {
			if (item.type === "directory") {
				const result = await nodeWorker.proxy("getDirectory", {
					uuid: item.uuid
				})

				return {
					...item,
					...result
				}
			}

			const result = await nodeWorker.proxy("getFile", {
				uuid: item.uuid
			})

			return {
				...item,
				...result
			}
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
