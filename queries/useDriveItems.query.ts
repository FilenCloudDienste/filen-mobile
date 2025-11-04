import { useQuery, type UseQueryOptions, type UseQueryResult } from "@tanstack/react-query"
import { DEFAULT_QUERY_OPTIONS, queryClient, useDefaultQueryParams } from "./client"
import { getCameraUploadState } from "@/hooks/useCameraUpload"
import cache from "@/lib/cache"
import queryUpdater from "./updater"
import nodeWorker from "@/lib/nodeWorker"
import { validate as validateUUID } from "uuid"
import sqlite from "@/lib/sqlite"
import useRefreshOnFocus from "@/hooks/useRefreshOnFocus"
import { sortParams } from "@/lib/utils"

export const BASE_QUERY_KEY = "useDriveItemsQuery"
export const FETCH_DRIVE_ITEMS_POSSIBLE_OF: string[] = [
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

export type UseDriveItemsQueryParams = FetchCloudItemsParams

export async function fetchData(params: UseDriveItemsQueryParams): Promise<DriveCloudItem[]> {
	if (params.of === "offline") {
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

	if (params.of === "photos") {
		const state = getCameraUploadState()

		if (!state.remote || !validateUUID(state.remote.uuid)) {
			return []
		}

		const remotePath = await nodeWorker.proxy("directoryUUIDToPath", {
			uuid: state.remote.uuid
		})

		if (!remotePath || remotePath !== state.remote.path) {
			return []
		}
	}

	const items = (await nodeWorker.proxy("fetchCloudItems", params)).map(item => ({
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

export function useDriveItemsQuery(
	params: UseDriveItemsQueryParams,
	options?: Omit<UseQueryOptions, "queryKey" | "queryFn">
): UseQueryResult<Awaited<ReturnType<typeof fetchData>>, Error> {
	const sortedParams = sortParams(params)
	const defaultParams = useDefaultQueryParams(options)

	const query = useQuery({
		...DEFAULT_QUERY_OPTIONS,
		...defaultParams,
		...options,
		queryKey: [BASE_QUERY_KEY, sortedParams],
		queryFn: () => fetchData(sortedParams)
	})

	useRefreshOnFocus({
		isEnabled: query.isEnabled,
		refetch: query.refetch
	})

	return query as UseQueryResult<Awaited<ReturnType<typeof fetchData>>, Error>
}

export function driveItemsQueryUpdate({
	updater,
	params
}: {
	params: Parameters<typeof fetchData>[0]
} & {
	updater:
		| Awaited<ReturnType<typeof fetchData>>
		| ((prev: Awaited<ReturnType<typeof fetchData>>) => Awaited<ReturnType<typeof fetchData>>)
}) {
	const sortedParams = sortParams(params)

	queryUpdater.set<Awaited<ReturnType<typeof fetchData>>>([BASE_QUERY_KEY, sortedParams], prev => {
		return typeof updater === "function" ? updater(prev ?? []) : updater
	})
}

export async function driveItemsQueryRefetch(params: Parameters<typeof fetchData>[0]): Promise<void> {
	const sortedParams = sortParams(params)

	return await queryClient.refetchQueries({
		queryKey: [BASE_QUERY_KEY, sortedParams]
	})
}

export function driveItemsQueryGet(params: Parameters<typeof fetchData>[0]) {
	const sortedParams = sortParams(params)

	return queryUpdater.get<Awaited<ReturnType<typeof fetchData>>>([BASE_QUERY_KEY, sortedParams])
}

export default useDriveItemsQuery
