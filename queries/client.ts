import { QueryClient, type UseQueryOptions } from "@tanstack/react-query"
import cache from "@/lib/cache"
import alerts from "@/lib/alerts"
import { experimental_createQueryPersister, type PersistedQuery } from "@tanstack/query-persist-client-core"
import { useMemo } from "react"
import useFocusNotifyOnChangeProps from "@/hooks/useFocusNotifyOnChangeProps"
import useQueryFocusAware from "@/hooks/useQueryFocusAware"
import useNetInfo from "@/hooks/useNetInfo"
import sqlite from "@/lib/sqlite"
import Semaphore from "@/lib/semaphore"
import { jsonBigIntReplacer, jsonBigIntReviver } from "@/lib/utils"
import authService from "@/services/auth.service"
import { router } from "expo-router"

export const VERSION = 3
export const QUERY_CLIENT_PERSISTER_PREFIX = `reactQuery_v${VERSION}`
export const QUERY_CLIENT_CACHE_TIME = 86400 * 365 * 1000

export const UNCACHED_QUERY_KEYS: string[] = [
	"useTextEditorItemContentQuery",
	"useFileBase64Query",
	"useDownloadFileTemporaryLocalQuery",
	"useSettingsAdvancedCacheQuery"
]

export const shouldPersistQuery = (query: PersistedQuery): boolean => {
	const shouldNotPersist = (query.queryKey as unknown[]).some(
		queryKey => typeof queryKey === "string" && UNCACHED_QUERY_KEYS.includes(queryKey)
	)

	return !shouldNotPersist && query.state.status === "success"
}

const persisterMutex = new Semaphore(1)

export const queryClientPersisterKv = {
	getItem: async <T>(key: string): Promise<T | null> => {
		return await sqlite.kvAsync.get(`${QUERY_CLIENT_PERSISTER_PREFIX}:${key}`)
	},
	setItem: async (key: string, value: unknown): Promise<void> => {
		await persisterMutex.acquire()

		try {
			await sqlite.kvAsync.set(`${QUERY_CLIENT_PERSISTER_PREFIX}:${key}`, value)
		} finally {
			persisterMutex.release()
		}
	},
	removeItem: async (key: string): Promise<void> => {
		await persisterMutex.acquire()

		try {
			return await sqlite.kvAsync.remove(`${QUERY_CLIENT_PERSISTER_PREFIX}:${key}`)
		} finally {
			persisterMutex.release()
		}
	},
	keys: async (): Promise<string[]> => {
		return (await sqlite.kvAsync.keys()).map(key => key.replace(`${QUERY_CLIENT_PERSISTER_PREFIX}:`, ""))
	},
	clear: async (): Promise<void> => {
		return sqlite.kvAsync.clear()
	}
} as const

export const queryClientPersister = experimental_createQueryPersister({
	storage: queryClientPersisterKv,
	maxAge: QUERY_CLIENT_CACHE_TIME,
	serialize: query => {
		if (query.state.status !== "success" || !shouldPersistQuery(query)) {
			return undefined
		}

		return JSON.stringify(query, jsonBigIntReplacer)
	},
	deserialize: query => {
		return JSON.parse(query as unknown as string, jsonBigIntReviver) as unknown as PersistedQuery
	},
	prefix: QUERY_CLIENT_PERSISTER_PREFIX,
	buster: VERSION.toString()
})

export async function restoreQueries(): Promise<void> {
	try {
		const keys = await queryClientPersisterKv.keys()

		await Promise.all(
			keys.map(async key => {
				if (key.startsWith(QUERY_CLIENT_PERSISTER_PREFIX)) {
					const query = (await queryClientPersisterKv.getItem(key)) as unknown as string | null

					if (!query) {
						return
					}

					const persistedQuery = JSON.parse(query, jsonBigIntReviver) as unknown as PersistedQuery

					if (
						!persistedQuery ||
						!persistedQuery.state ||
						!shouldPersistQuery(persistedQuery) ||
						persistedQuery.state.dataUpdatedAt + QUERY_CLIENT_CACHE_TIME < Date.now() ||
						persistedQuery.state.status !== "success"
					) {
						await queryClientPersisterKv.removeItem(key)

						return
					}

					queryClient.setQueryData(persistedQuery.queryKey, persistedQuery.state.data, {
						updatedAt: persistedQuery.state.dataUpdatedAt
					})

					if (persistedQuery.queryKey.at(0) === "useDriveItemsQuery") {
						for (const item of persistedQuery.state.data as unknown as DriveCloudItem[]) {
							if (item.type === "directory") {
								cache.directoryUUIDToName.set(item.uuid, item.name)
							}
						}
					}
				}
			})
		)
	} catch (e) {
		console.error(e)
	}
}

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
			if (err.message.toLowerCase().includes("api key not found") || err.message.toLowerCase().includes("invalid api key")) {
				authService
					.logout({})
					.then(() => {
						router.replace({
							pathname: "/(auth)"
						})
					})
					.catch(console.error)

				return false
			}

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
			persister: queryClientPersister.persisterFn,
			queryKeyHashFn: queryKey => JSON.stringify(queryKey, jsonBigIntReplacer)
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
