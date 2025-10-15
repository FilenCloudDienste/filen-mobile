import { useQuery, type UseQueryOptions, type UseQueryResult } from "@tanstack/react-query"
import { DEFAULT_QUERY_OPTIONS, useDefaultQueryParams } from "./client"
import * as LocalAuthentication from "expo-local-authentication"
import useRefreshOnFocus from "@/hooks/useRefreshOnFocus"

export const BASE_QUERY_KEY = "useLocalAuthenticationQuery"

export async function fetchData() {
	const [hasHardware, isEnrolled, supportedTypes] = await Promise.all([
		LocalAuthentication.hasHardwareAsync(),
		LocalAuthentication.isEnrolledAsync(),
		LocalAuthentication.supportedAuthenticationTypesAsync()
	])

	return {
		hasHardware,
		isEnrolled,
		supportedTypes
	}
}

export function useLocalAuthenticationQuery(
	options?: Omit<UseQueryOptions, "queryKey" | "queryFn">
): UseQueryResult<Awaited<ReturnType<typeof fetchData>>, Error> {
	const defaultParams = useDefaultQueryParams(options)

	const query = useQuery({
		...DEFAULT_QUERY_OPTIONS,
		...defaultParams,
		...options,
		staleTime: 5000,
		enabled: options?.enabled ?? true,
		queryKey: [BASE_QUERY_KEY],
		queryFn: () => fetchData()
	})

	useRefreshOnFocus({
		isEnabled: query.isEnabled,
		refetch: query.refetch
	})

	return query as UseQueryResult<Awaited<ReturnType<typeof fetchData>>, Error>
}

export default useLocalAuthenticationQuery
