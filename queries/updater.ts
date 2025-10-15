import queryClient, { queryClientPersister } from "./client"

export class QueryUpdater {
	public get<T>(queryKey: unknown[]): T | undefined {
		return queryClient.getQueryData<T>(queryKey)
	}

	public set<T>(queryKey: unknown[], updater: T | ((prev?: T) => T)): void {
		queryClient.setQueryData(
			queryKey,
			(oldData: T | undefined) => {
				if (typeof updater === "function") {
					return (updater as (prev: T | undefined) => T)(oldData)
				}

				return updater
			},
			{
				updatedAt: Date.now()
			}
		)

		queryClientPersister.persistQueryByKey(queryKey, queryClient).catch(console.error)
	}
}

export const queryUpdater = new QueryUpdater()

export default queryUpdater
