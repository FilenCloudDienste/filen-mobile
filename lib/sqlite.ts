import paths from "./paths"
import { Directory } from "expo-file-system"
import pathModule from "path"
import { open, type NitroSQLiteConnection } from "react-native-nitro-sqlite"

export const SQLITE_VERSION: number = 2

export const INIT_QUERIES: {
	query: string
	pragma: boolean
}[] = [
	{
		query: "PRAGMA journal_mode = WAL",
		pragma: true
	},
	{
		query: "PRAGMA synchronous = NORMAL",
		pragma: true
	},
	{
		query: "PRAGMA temp_store = FILE", // Use disk instead of memory for temp storage
		pragma: true
	},
	{
		query: "PRAGMA mmap_size = 33554432", // Set memory mapping size to 32MB
		pragma: true
	},
	{
		query: "PRAGMA page_size = 4096", // Must be set before any tables are created
		pragma: true
	},
	{
		query: "PRAGMA cache_size = -8000", // 8MB cache - much smaller for low memory
		pragma: true
	},
	{
		query: "PRAGMA foreign_keys = ON",
		pragma: true
	},
	{
		query: "PRAGMA busy_timeout = 15000", // 5s timeout
		pragma: true
	},
	{
		query: "PRAGMA auto_vacuum = INCREMENTAL",
		pragma: true
	},
	{
		query: "PRAGMA wal_autocheckpoint = 100", // More frequent checkpoints to keep WAL small
		pragma: true
	},
	{
		query: "PRAGMA journal_size_limit = 33554432", // 32MB WAL size limit (small)
		pragma: true
	},
	{
		query: "PRAGMA max_page_count = 107374182300", // Prevent database from growing too large
		pragma: true
	},
	{
		query: "PRAGMA encoding = 'UTF-8'",
		pragma: true
	},
	{
		query: "PRAGMA secure_delete = OFF",
		pragma: true
	},
	{
		query: "PRAGMA cell_size_check = OFF",
		pragma: true
	},
	{
		query: `CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL) WITHOUT ROWID`,
		pragma: false
	},
	{
		query: `CREATE INDEX IF NOT EXISTS kv_key ON kv (key)`,
		pragma: false
	},
	{
		query: `CREATE UNIQUE INDEX IF NOT EXISTS kv_key_unique ON kv (key)`,
		pragma: false
	},
	{
		query: `CREATE TABLE IF NOT EXISTS thumbnails (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, uuid TEXT NOT NULL, path TEXT NOT NULL, size INTEGER NOT NULL)`,
		pragma: false
	},
	{
		query: `CREATE INDEX IF NOT EXISTS thumbnails_uuid ON thumbnails (uuid)`,
		pragma: false
	},
	{
		query: `CREATE INDEX IF NOT EXISTS thumbnails_path ON thumbnails (path)`,
		pragma: false
	},
	{
		query: `CREATE UNIQUE INDEX IF NOT EXISTS thumbnails_uuid_unique ON thumbnails (uuid)`,
		pragma: false
	},
	{
		query: `CREATE TABLE IF NOT EXISTS offline_files (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, uuid TEXT NOT NULL, item TEXT NOT NULL)`,
		pragma: false
	},
	{
		query: `CREATE INDEX IF NOT EXISTS offline_files_uuid ON offline_files (uuid)`,
		pragma: false
	},
	{
		query: `CREATE INDEX IF NOT EXISTS offline_files_json_name ON offline_files(json_extract(item, '$.name'))`,
		pragma: false
	},
	{
		query: `CREATE UNIQUE INDEX IF NOT EXISTS offline_files_uuid_unique ON offline_files (uuid)`,
		pragma: false
	},
	{
		query: "PRAGMA optimize", // Run at the end after schema is created
		pragma: true
	}
]

export class SQLite {
	public db: NitroSQLiteConnection

	public constructor(dbName: string) {
		this.db = open({
			name: dbName
		})

		for (const query of INIT_QUERIES.filter(q => q.pragma)) {
			this.db.execute(query.query)
		}

		this.db.executeBatch(
			INIT_QUERIES.filter(q => !q.pragma).map(q => ({
				query: q.query
			}))
		)
	}

	public async clearAsync(): Promise<void> {
		await this.db.executeAsync("DELETE FROM kv")
		await this.db.executeAsync("DELETE FROM thumbnails")
		await this.db.executeAsync("DELETE FROM offline_files")
	}

	public offlineFiles = {
		contains: async (uuid: string): Promise<boolean> => {
			const { rows } = await this.db.executeAsync("SELECT uuid FROM offline_files WHERE uuid = ?", [uuid])

			if (!rows) {
				return false
			}

			return rows.length > 0
		},
		get: async (uuid: string): Promise<DriveCloudItem | null> => {
			const { rows } = await this.db.executeAsync<{ item: string }>("SELECT item FROM offline_files WHERE uuid = ?", [uuid])

			if (!rows || rows.length === 0) {
				return null
			}

			const row = rows.item(0)

			if (!row) {
				return null
			}

			return JSON.parse(row.item) as DriveCloudItem
		},
		add: async (item: DriveCloudItem): Promise<number | null> => {
			const { insertId } = await this.db.executeAsync("INSERT OR REPLACE INTO offline_files (uuid, item) VALUES (?, ?)", [
				item.uuid,
				JSON.stringify(item)
			])

			return insertId ?? null
		},
		remove: async (item: DriveCloudItem): Promise<void> => {
			await this.db.executeAsync("DELETE FROM offline_files WHERE uuid = ?", [item.uuid])
		},
		list: async (): Promise<DriveCloudItem[]> => {
			const { rows } = await this.db.executeAsync<{ item: string }>("SELECT item FROM offline_files")

			if (!rows) {
				return []
			}

			return rows._array.map(row => JSON.parse(row.item) as DriveCloudItem)
		},
		clear: async (): Promise<void> => {
			await this.db.executeAsync("DELETE FROM offline_files")
		},
		find: async (input: string): Promise<DriveCloudItem[]> => {
			const searchTerm = input.trim().toLowerCase()
			const { rows } = await this.db.executeAsync<{ item: string }>(
				"SELECT item FROM offline_files WHERE json_extract(item, '$.name') LIKE ? COLLATE NOCASE",
				[`%${searchTerm}%`]
			)

			if (!rows) {
				return []
			}

			return rows._array.map(row => JSON.parse(row.item) as DriveCloudItem)
		},
		verify: async (): Promise<void> => {
			const { rows } = await this.db.executeAsync<{ uuid: string }>("SELECT uuid FROM offline_files")

			if (!rows || rows.length === 0) {
				return
			}

			const list = rows._array.map(row => row.uuid)

			if (list.length === 0) {
				return
			}

			const offlineFilesDir = new Directory(paths.offlineFiles())

			if (!offlineFilesDir.exists) {
				offlineFilesDir.create()

				await this.db.executeAsync("DELETE FROM offline_files")

				return
			}

			const existingOfflineFiles = offlineFilesDir.listAsRecords().map(entry => pathModule.posix.basename(entry.uri).split(".")[0])

			if (existingOfflineFiles.length === 0) {
				await this.db.executeAsync("DELETE FROM offline_files")

				return
			}

			await Promise.all(
				list.map(async uuid => {
					if (existingOfflineFiles.includes(uuid)) {
						return
					}

					await this.db.executeAsync("DELETE FROM offline_files WHERE uuid = ?", [uuid])
				})
			)
		}
	}

	public kvAsync = {
		get: async <T>(key: string): Promise<T | null> => {
			const { rows } = await this.db.executeAsync<{ value: string }>("SELECT value FROM kv WHERE key = ?", [key])

			if (!rows || rows.length === 0) {
				return null
			}

			const row = rows.item(0)

			if (!row) {
				return null
			}

			return JSON.parse(row.value) as T
		},
		set: async <T>(key: string, value: T): Promise<number | null> => {
			if (!value) {
				return null
			}

			const { insertId } = await this.db.executeAsync("INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)", [
				key,
				JSON.stringify(value)
			])

			return insertId ?? null
		},
		keys: async (): Promise<string[]> => {
			const { rows } = await this.db.executeAsync<{ key: string }>("SELECT key FROM kv")

			if (!rows || rows.length === 0) {
				return []
			}

			return rows._array.map(row => row.key)
		},
		clear: async (): Promise<void> => {
			await this.db.executeAsync("DELETE FROM kv")
		},
		contains: async (key: string): Promise<boolean> => {
			const { rows } = await this.db.executeAsync<{ key: string }>("SELECT key FROM kv WHERE key = ?", [key])

			if (!rows || rows.length === 0) {
				return false
			}

			return rows.length > 0
		},
		remove: async (key: string): Promise<void> => {
			await this.db.executeAsync("DELETE FROM kv WHERE key = ?", [key])
		}
	}
}

export const sqlite = new SQLite(`filen_sqlite_v${SQLITE_VERSION}.sqlite`)

export default sqlite
