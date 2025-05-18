import { useQuery } from "@tanstack/react-query"
import useRefreshOnFocus from "@/hooks/useRefreshOnFocus"
import useFocusNotifyOnChangeProps from "@/hooks/useFocusNotifyOnChangeProps"
import useQueryFocusAware from "@/hooks/useQueryFocusAware"
import { DEFAULT_QUERY_OPTIONS } from "./client"
import sqlite from "@/lib/sqlite"
import * as FileSystem from "expo-file-system/next"
import paths from "@/lib/paths"

export type UseFileOfflineStatusQuery =
	| {
			exists: false
	  }
	| {
			exists: true
			path: string
	  }

export default function useFileOfflineStatusQuery({
	uuid,
	refetchOnMount = DEFAULT_QUERY_OPTIONS.refetchOnMount,
	refetchOnReconnect = DEFAULT_QUERY_OPTIONS.refetchOnReconnect,
	refetchOnWindowFocus = DEFAULT_QUERY_OPTIONS.refetchOnWindowFocus,
	staleTime = DEFAULT_QUERY_OPTIONS.staleTime,
	gcTime = DEFAULT_QUERY_OPTIONS.gcTime,
	enabled
}: { uuid: string } & {
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
		queryKey: ["useFileOfflineStatusQuery", uuid],
		queryFn: () =>
			new Promise<UseFileOfflineStatusQuery>((resolve, reject) => {
				sqlite.offlineFiles
					.contains(uuid)
					.then(exists => {
						if (!exists) {
							resolve({
								exists: false
							})

							return
						}

						resolve({
							exists: true,
							path: FileSystem.Paths.join(paths.offlineFiles(), uuid)
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
