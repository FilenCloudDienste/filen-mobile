import { useQuery } from "@tanstack/react-query"
import useRefreshOnFocus from "@/hooks/useRefreshOnFocus"
import useFocusNotifyOnChangeProps from "@/hooks/useFocusNotifyOnChangeProps"
import useQueryFocusAware from "@/hooks/useQueryFocusAware"
import { DEFAULT_QUERY_OPTIONS } from "./client"
import sqlite from "@/lib/sqlite"
import pathModule from "path"
import paths from "@/lib/paths"
import alerts from "@/lib/alerts"
import Semaphore from "@/lib/semaphore"

export const offlineFilesSemaphore = new Semaphore(1)

export type UseFileOfflineStatusQuery =
	| {
			exists: false
	  }
	| {
			exists: true
			path: string
	  }

export async function fetchFileOfflineStatus(uuid: string): Promise<UseFileOfflineStatusQuery> {
	await offlineFilesSemaphore.acquire()

	try {
		const item = await sqlite.offlineFiles.get(uuid)

		if (!item) {
			return {
				exists: false
			}
		}

		return {
			exists: true,
			path: pathModule.posix.join(paths.offlineFiles(), `${uuid}${pathModule.posix.extname(item.name)}`)
		}
	} finally {
		offlineFilesSemaphore.release()
	}
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
		queryFn: () => fetchFileOfflineStatus(uuid),
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
