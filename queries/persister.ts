import sqlite from "@/lib/sqlite"

export const VERSION = 2
export const queryClientPersisterPrefix = `reactQuery_v${VERSION}`

export function createKvPersister() {
	return {
		getItem: async <T>(key: string): Promise<T | null> => {
			return await sqlite.kvAsync.get(`${queryClientPersisterPrefix}:${key}`)
		},
		setItem: async (key: string, value: unknown): Promise<void> => {
			await sqlite.kvAsync.set(`${queryClientPersisterPrefix}:${key}`, value)
		},
		removeItem: async (key: string): Promise<void> => {
			return await sqlite.kvAsync.remove(`${queryClientPersisterPrefix}:${key}`)
		},
		keys: async (): Promise<string[]> => {
			return (await sqlite.kvAsync.keys()).map(key => key.replace(`${queryClientPersisterPrefix}:`, ""))
		},
		clear: async (): Promise<void> => {
			return sqlite.kvAsync.clear()
		}
	}
}

export const queryClientPersisterKv = createKvPersister()

export default queryClientPersisterKv
