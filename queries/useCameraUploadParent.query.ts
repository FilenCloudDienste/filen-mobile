import { useQuery, type UseQueryOptions, type UseQueryResult } from "@tanstack/react-query"
import { DEFAULT_QUERY_OPTIONS, useDefaultQueryParams } from "./client"
import nodeWorker from "@/lib/nodeWorker"
import useRefreshOnFocus from "@/hooks/useRefreshOnFocus"
import { getCameraUploadState } from "@/hooks/useCameraUpload"
import { validate as validateUUID } from "uuid"

export const BASE_QUERY_KEY = "useCameraUploadParentQuery"

export async function fetchData() {
	const state = getCameraUploadState()

	if (!state.remote || !validateUUID(state.remote.uuid)) {
		return null
	}

	const exists = await nodeWorker.proxy("directoryExists", {
		name: state.remote.name,
		parent: state.remote.parent
	})

	if (!exists.exists || exists.uuid !== state.remote.uuid) {
		return null
	}

	return state.remote
}

export function useCameraUploadParentQuery(
	options?: Omit<UseQueryOptions, "queryKey" | "queryFn">
): UseQueryResult<Awaited<ReturnType<typeof fetchData>>, Error> {
	const defaultParams = useDefaultQueryParams(options)

	const query = useQuery({
		...DEFAULT_QUERY_OPTIONS,
		...defaultParams,
		...options,
		queryKey: [BASE_QUERY_KEY],
		queryFn: () => fetchData()
	})

	useRefreshOnFocus({
		isEnabled: query.isEnabled,
		refetch: query.refetch
	})

	return query as UseQueryResult<Awaited<ReturnType<typeof fetchData>>, Error>
}

export default useCameraUploadParentQuery
