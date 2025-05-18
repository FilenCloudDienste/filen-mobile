import queryClientPersisterKv, { queryClientPersisterPrefix } from "./persister"
import { experimental_createQueryPersister, type PersistedQuery } from "@tanstack/query-persist-client-core"
import { QueryClient } from "@tanstack/react-query"
import { shouldPersistQuery } from "@/lib/utils"

export const queryClientPersister = experimental_createQueryPersister({
	storage: queryClientPersisterKv,
	maxAge: 86400 * 1000 * 7,
	buster: "",
	serialize: query => {
		if (query.state.status !== "success" || !shouldPersistQuery(query.queryKey as unknown[])) {
			return undefined
		}

		return query
	},
	deserialize: query => query as PersistedQuery,
	prefix: queryClientPersisterPrefix
})

export const DEFAULT_QUERY_OPTIONS: {
	refetchOnMount: "always"
	refetchOnReconnect: "always"
	refetchOnWindowFocus: "always"
	staleTime: number
	gcTime: number
	refetchInterval: number | false
} = {
	refetchOnMount: "always",
	refetchOnReconnect: "always",
	refetchOnWindowFocus: "always",
	staleTime: 86400 * 1000 * 7,
	gcTime: 86400 * 1000 * 7,
	refetchInterval: false
}

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			...DEFAULT_QUERY_OPTIONS,
			persister: queryClientPersister.persisterFn
		}
	}
})

export async function restoreQueries(): Promise<void> {
	const keys = await queryClientPersisterKv.keys()

	await Promise.all(
		keys.map(async key => {
			if (key.startsWith(queryClientPersisterPrefix)) {
				const persistedQuery = (await queryClientPersisterKv.getItem(key)) as unknown as PersistedQuery

				if (!persistedQuery || !persistedQuery.state) {
					await queryClientPersisterKv.removeItem(key)

					return
				}

				const shouldNotPersist = !shouldPersistQuery(persistedQuery.queryKey as unknown[])

				if (persistedQuery.state.dataUpdatedAt + 86400 * 1000 * 7 < Date.now()) {
					await queryClientPersisterKv.removeItem(key)

					return
				}

				if (persistedQuery.state.status === "success") {
					if (!shouldNotPersist) {
						queryClient.setQueryData(persistedQuery.queryKey, persistedQuery.state.data, {
							updatedAt: persistedQuery.state.dataUpdatedAt
						})
					} else {
						await queryClientPersisterKv.removeItem(key)
					}
				}
			}
		})
	)
}

export default queryClient
