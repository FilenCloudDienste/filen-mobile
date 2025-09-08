import * as LocalAuthentication from "expo-local-authentication"
import { useQuery } from "@tanstack/react-query"
import useRefreshOnFocus from "@/hooks/useRefreshOnFocus"
import useFocusNotifyOnChangeProps from "@/hooks/useFocusNotifyOnChangeProps"
import { DEFAULT_QUERY_OPTIONS } from "./client"
import alerts from "@/lib/alerts"

export default function useLocalAuthenticationQuery({
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
	const notifyOnChangeProps = useFocusNotifyOnChangeProps()
	const query = useQuery({
		queryKey: ["useLocalAuthenticationQuery"],
		queryFn: async () => {
			const [hasHardware, isEnrolled, supportedTypes] = await Promise.all([
				LocalAuthentication.hasHardwareAsync(),
				LocalAuthentication.isEnrolledAsync(),
				LocalAuthentication.supportedAuthenticationTypesAsync()
			])

			return { hasHardware, isEnrolled, supportedTypes }
		},
		throwOnError(err) {
			console.error(err)
			alerts.error(err.message)

			return false
		},
		notifyOnChangeProps,
		enabled,
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
