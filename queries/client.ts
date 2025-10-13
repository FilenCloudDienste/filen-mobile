import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister"
import { QueryClient, type UseQueryOptions, type Query } from "@tanstack/react-query"
import cache from "@/lib/cache"
import alerts from "@/lib/alerts"
import type { PersistedClient } from "@tanstack/query-persist-client-core"
import { useMemo } from "react"
import useFocusNotifyOnChangeProps from "@/hooks/useFocusNotifyOnChangeProps"
import useQueryFocusAware from "@/hooks/useQueryFocusAware"
import useNetInfo from "@/hooks/useNetInfo"
import * as FileSystem from "expo-file-system"
import paths from "@/lib/paths"
import pathModule from "path"
import { pack, unpack } from "msgpackr"

export const VERSION = 3
export const QUERY_CLIENT_PERSISTER_PREFIX = `reactQuery_v${VERSION}`
export const QUERY_CLIENT_CACHE_TIME = 86400 * 365 * 1000

export const UNCACHED_QUERY_KEYS: string[] = [
	"useTextEditorItemContentQuery",
	"useFileBase64Query",
	"useDownloadFileTemporaryLocalQuery",
	"useFileProviderEnabledQuery",
	"useLocalAlbumsQuery",
	"useLocalAuthenticationQuery",
	"useSettingsAdvancedCacheQuery"
]

export const shouldPersistQuery = (query: Query<unknown, Error, unknown, readonly unknown[]>): boolean => {
	const shouldNotPersist = (query.queryKey as unknown[]).some(
		queryKey => typeof queryKey === "string" && UNCACHED_QUERY_KEYS.includes(queryKey)
	)

	return !shouldNotPersist && query.state.status === "success"
}

export const queryClientPersister = createAsyncStoragePersister({
	storage: {
		getItem: async <T>(key: string): Promise<T | null> => {
			const file = new FileSystem.File(pathModule.posix.join(paths.db(), `${key}_${QUERY_CLIENT_PERSISTER_PREFIX}.bin`))

			if (!file.exists) {
				return null
			}

			return unpack(await file.bytes()) as T
		},
		setItem: async (key: string, value: unknown): Promise<void> => {
			const file = new FileSystem.File(pathModule.posix.join(paths.db(), `${key}_${QUERY_CLIENT_PERSISTER_PREFIX}.bin`))

			file.write(pack(value), {})
		},
		removeItem: async (key: string): Promise<void> => {
			const file = new FileSystem.File(pathModule.posix.join(paths.db(), `${key}_${QUERY_CLIENT_PERSISTER_PREFIX}.bin`))

			if (file.exists) {
				file.delete()
			}
		}
	},
	serialize: client => {
		return client as unknown as string
	},
	deserialize: client => {
		const unpacked = client as unknown as { clientState?: { queries?: Query[] } }
		const queries = unpacked?.clientState?.queries as Query[]

		if (queries && Array.isArray(queries) && queries.length > 0) {
			for (const query of queries) {
				if (query.state.status !== "success" || !query.state.data) {
					continue
				}

				if (query.queryKey.at(0) === "useCloudItemsQuery") {
					for (const item of (query.state.data as DriveCloudItem[]).filter(item => item.type === "directory")) {
						cache.directoryUUIDToName.set(item.uuid, item.name)
					}
				}
			}
		}

		return unpacked as unknown as PersistedClient
	},
	key: QUERY_CLIENT_PERSISTER_PREFIX,
	throttleTime: 5000
})

export const DEFAULT_QUERY_OPTIONS: Pick<
	UseQueryOptions,
	| "refetchOnMount"
	| "refetchOnReconnect"
	| "refetchOnWindowFocus"
	| "staleTime"
	| "gcTime"
	| "refetchInterval"
	| "throwOnError"
	| "retryOnMount"
	| "experimental_prefetchInRender"
	| "refetchIntervalInBackground"
	| "retry"
	| "retryDelay"
	| "networkMode"
	| "notifyOnChangeProps"
> = {
	refetchOnMount: "always",
	refetchOnReconnect: "always",
	refetchOnWindowFocus: "always",
	staleTime: 0,
	gcTime: QUERY_CLIENT_CACHE_TIME,
	refetchInterval: false,
	experimental_prefetchInRender: false,
	refetchIntervalInBackground: false,
	retry: true,
	retryDelay: 1000,
	retryOnMount: true,
	networkMode: "always",
	throwOnError(err) {
		console.error(err)

		if (err instanceof Error) {
			alerts.error(err.message)
		}

		return false
	}
} as Omit<UseQueryOptions, "queryKey" | "queryFn">

export const DEFAULT_QUERY_OPTIONS_ETERNAL: Pick<
	UseQueryOptions,
	| "refetchOnMount"
	| "refetchOnReconnect"
	| "refetchOnWindowFocus"
	| "staleTime"
	| "gcTime"
	| "refetchInterval"
	| "throwOnError"
	| "retryOnMount"
	| "experimental_prefetchInRender"
	| "refetchIntervalInBackground"
	| "retry"
	| "retryDelay"
	| "networkMode"
	| "notifyOnChangeProps"
> = {
	notifyOnChangeProps: undefined,
	refetchOnMount: false,
	refetchOnReconnect: false,
	refetchOnWindowFocus: false,
	staleTime: Infinity,
	gcTime: Infinity,
	refetchInterval: false,
	experimental_prefetchInRender: false,
	refetchIntervalInBackground: false,
	retry: true,
	retryDelay: 1000,
	retryOnMount: true,
	networkMode: "always",
	throwOnError(err) {
		console.error(err)

		if (err instanceof Error) {
			alerts.error(err.message)
		}

		return false
	}
} as Omit<UseQueryOptions, "queryKey" | "queryFn">

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			...DEFAULT_QUERY_OPTIONS,
			queryKeyHashFn: queryKey => pack(queryKey).toString("base64")
		}
	}
})

export function useDefaultQueryParams(
	options?: Omit<UseQueryOptions, "queryKey" | "queryFn">
): Omit<UseQueryOptions, "queryKey" | "queryFn"> {
	const { hasInternet } = useNetInfo()
	const isFocused = useQueryFocusAware()
	const notifyOnChangeProps = useFocusNotifyOnChangeProps()

	const enabled = useMemo(() => {
		if (!hasInternet) {
			return false
		}

		if (typeof options?.enabled === "boolean") {
			return options.enabled
		}

		return isFocused()
	}, [hasInternet, isFocused, options?.enabled])

	return {
		notifyOnChangeProps,
		enabled
	}
}

export default queryClient
