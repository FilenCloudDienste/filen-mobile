import * as MediaLibrary from "expo-media-library"
import { useQuery } from "@tanstack/react-query"
import useRefreshOnFocus from "@/hooks/useRefreshOnFocus"
import useFocusNotifyOnChangeProps from "@/hooks/useFocusNotifyOnChangeProps"
import useQueryFocusAware from "@/hooks/useQueryFocusAware"
import { DEFAULT_QUERY_OPTIONS } from "./client"
import alerts from "@/lib/alerts"

export default function useLocalAlbumsQuery({
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
	const isFocused = useQueryFocusAware()
	const notifyOnChangeProps = useFocusNotifyOnChangeProps()
	const query = useQuery({
		queryKey: ["useLocalAlbumsQuery"],
		queryFn: async () => {
			const permissions = await MediaLibrary.getPermissionsAsync(false, ["video", "photo"])

			if (permissions.status === MediaLibrary.PermissionStatus.DENIED) {
				return []
			}

			const albums = await MediaLibrary.getAlbumsAsync({
				includeSmartAlbums: true
			})

			const withLastAssetURI = await Promise.all(
				albums.map(async album => {
					const { assets } = await MediaLibrary.getAssetsAsync({
						album,
						mediaType: ["photo"],
						first: 1,
						sortBy: [["creationTime", false]]
					})

					return {
						album,
						lastAssetURI: assets[0]?.uri
					}
				})
			)

			return withLastAssetURI
		},
		throwOnError(err) {
			console.error(err)
			alerts.error(err.message)

			return false
		},
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
