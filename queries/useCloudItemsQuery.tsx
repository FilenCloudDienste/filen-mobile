import { useQuery } from "@tanstack/react-query"
import nodeWorker from "@/lib/nodeWorker"
import useRefreshOnFocus from "@/hooks/useRefreshOnFocus"
import useFocusNotifyOnChangeProps from "@/hooks/useFocusNotifyOnChangeProps"
import useQueryFocusAware from "@/hooks/useQueryFocusAware"
import { DEFAULT_QUERY_OPTIONS } from "./client"
import sqlite from "@/lib/sqlite"
import { getCameraUploadState } from "@/hooks/useCameraUpload"
import { validate as validateUUID } from "uuid"
import cache from "@/lib/cache"
import useNetInfo from "@/hooks/useNetInfo"

export const FETCH_CLOUD_ITEMS_POSSIBLE_OF: string[] = [
	"drive",
	"favorites",
	"recents",
	"sharedIn",
	"sharedOut",
	"trash",
	"links",
	"photos",
	"offline"
]

export default function useCloudItemsQuery({
	parent,
	of,
	receiverId,
	refetchOnMount = DEFAULT_QUERY_OPTIONS.refetchOnMount,
	refetchOnReconnect = DEFAULT_QUERY_OPTIONS.refetchOnReconnect,
	refetchOnWindowFocus = DEFAULT_QUERY_OPTIONS.refetchOnWindowFocus,
	staleTime = DEFAULT_QUERY_OPTIONS.staleTime,
	gcTime = DEFAULT_QUERY_OPTIONS.gcTime,
	enabled
}: FetchCloudItemsParams & {
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
		queryKey: ["useCloudItemsQuery", parent, of, receiverId],
		queryFn: async () => {
			if (of === "offline") {
				const items = (await sqlite.offlineFiles.list()).map(item => ({
					...item,
					thumbnail: cache.availableThumbnails.get(item.uuid)
				}))

				for (const item of items) {
					if (item.type === "directory") {
						cache.directoryUUIDToName.set(item.uuid, item.name)
					}
				}

				return items
			}

			if (of === "photos") {
				const state = getCameraUploadState()

				if (!state.remote || !validateUUID(state.remote.uuid)) {
					return []
				}

				const directoryExists = await nodeWorker.proxy("directoryExists", {
					name: state.remote.name,
					parent: state.remote.parent
				})

				if (!directoryExists.exists || directoryExists.uuid !== state.remote.uuid) {
					return []
				}
			}

			const items = (
				await nodeWorker.proxy("fetchCloudItems", {
					parent,
					of,
					receiverId
				})
			).map(item => ({
				...item,
				thumbnail: cache.availableThumbnails.get(item.uuid)
			}))

			for (const item of items) {
				if (item.type === "directory") {
					cache.directoryUUIDToName.set(item.uuid, item.name)
				}
			}

			return items
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
