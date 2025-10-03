import { useQuery, type UseQueryOptions, type UseQueryResult } from "@tanstack/react-query"
import { DEFAULT_QUERY_OPTIONS, useDefaultQueryParams } from "./client"
import * as MediaLibrary from "expo-media-library"
import useRefreshOnFocus from "@/hooks/useRefreshOnFocus"

export const BASE_QUERY_KEY = "useLocalAlbumsQuery"

export async function fetchData() {
	const permissions = await MediaLibrary.getPermissionsAsync(false)

	if (!permissions.granted) {
		return []
	}

	const albums = await MediaLibrary.getAlbumsAsync({
		includeSmartAlbums: true
	})

	return albums
}

export function useLocalAlbumsQuery(
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

export default useLocalAlbumsQuery
