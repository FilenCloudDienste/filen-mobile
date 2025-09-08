import { useQuery } from "@tanstack/react-query"
import nodeWorker from "@/lib/nodeWorker"
import useRefreshOnFocus from "@/hooks/useRefreshOnFocus"
import useFocusNotifyOnChangeProps from "@/hooks/useFocusNotifyOnChangeProps"
import useQueryFocusAware from "@/hooks/useQueryFocusAware"
import { DEFAULT_QUERY_OPTIONS } from "./client"
import useNetInfo from "@/hooks/useNetInfo"
import alerts from "@/lib/alerts"

export default function useAccountQuery({
	refetchOnMount = DEFAULT_QUERY_OPTIONS.refetchOnMount,
	refetchOnReconnect = DEFAULT_QUERY_OPTIONS.refetchOnReconnect,
	refetchOnWindowFocus = DEFAULT_QUERY_OPTIONS.refetchOnWindowFocus,
	staleTime = DEFAULT_QUERY_OPTIONS.staleTime,
	gcTime = DEFAULT_QUERY_OPTIONS.gcTime,
	enabled
}: {
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
		queryKey: ["useAccountQuery"],
		queryFn: () => nodeWorker.proxy("fetchAccount", undefined),
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
