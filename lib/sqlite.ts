import * as ExpoSQLite from "expo-sqlite"
import { Semaphore } from "./semaphore"
import paths from "./paths"
import { Paths, Directory } from "expo-file-system/next"

export const SQLITE_VERSION: number = 1

export const INIT = `
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL; 
PRAGMA temp_store = MEMORY;
PRAGMA mmap_size = 30000000;
PRAGMA cache_size = -10000;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 60000;
PRAGMA page_size = 4096;
PRAGMA analysis_limit = 1000;
PRAGMA auto_vacuum = INCREMENTAL;
PRAGMA optimize;
PRAGMA encoding = "UTF-8";
PRAGMA legacy_file_format = OFF;
PRAGMA secure_delete = OFF;

CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS kv_key ON kv (key);
CREATE UNIQUE INDEX IF NOT EXISTS kv_key_unique ON kv (key);

CREATE TABLE IF NOT EXISTS thumbnails (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, uuid TEXT NOT NULL, path TEXT NOT NULL, size INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS thumbnails_uuid ON thumbnails (uuid);
CREATE INDEX IF NOT EXISTS thumbnails_path ON thumbnails (path);
CREATE UNIQUE INDEX IF NOT EXISTS thumbnails_uuid_unqiue ON thumbnails (uuid);

CREATE TABLE IF NOT EXISTS offline_files (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, uuid TEXT NOT NULL, item TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS offline_files_uuid ON offline_files (uuid);
CREATE INDEX IF NOT EXISTS offline_files_json_name ON offline_files(json_extract(item, '$.name'));
CREATE UNIQUE INDEX IF NOT EXISTS offline_files_uuid_unique ON offline_files (uuid);
`

export class SQLite {
	private db: ExpoSQLite.SQLiteDatabase | null = null
	private readonly dbName: string
	private readonly openMutex = new Semaphore(1)

	public constructor(dbName: string) {
		this.dbName = dbName
	}

	public async openAsync(): Promise<ExpoSQLite.SQLiteDatabase> {
		await this.openMutex.acquire()

		try {
			if (this.db) {
				return this.db
			}

			this.db = await ExpoSQLite.openDatabaseAsync(
				this.dbName,
				{
					enableChangeListener: false,
					useNewConnection: true
				},
				paths.db()
			)

			await this.db.execAsync(INIT)

			console.log("sqlite path", Paths.join(paths.db(), this.dbName))

			return this.db
		} finally {
			this.openMutex.release()
		}
	}

	public openSync(): ExpoSQLite.SQLiteDatabase {
		if (this.db) {
			return this.db
		}

		this.db = ExpoSQLite.openDatabaseSync(
			this.dbName,
			{
				enableChangeListener: false,
				useNewConnection: true
			},
			paths.db()
		)

		this.db.execSync(INIT)

		console.log("sqlite path", Paths.join(paths.db(), this.dbName))

		return this.db
	}

	public offlineFiles = {
		contains: async (uuid: string): Promise<boolean> => {
			const db = await this.openAsync()

			const result = await db.getFirstAsync<{
				uuid: string
			} | null>("SELECT uuid FROM offline_files WHERE uuid = ?", [uuid])

			return !!result
		},
		get: async (uuid: string): Promise<DriveCloudItem | null> => {
			const db = await this.openAsync()

			const result = await db.getFirstAsync<{
				item: string
			} | null>("SELECT item FROM offline_files WHERE uuid = ?", [uuid])

			if (!result) {
				return null
			}

			return JSON.parse(result.item)
		},
		add: async (item: DriveCloudItem): Promise<number> => {
			const db = await this.openAsync()

			const result = await db.runAsync("INSERT OR REPLACE INTO offline_files (uuid, item) VALUES (?, ?)", [
				item.uuid,
				JSON.stringify(item)
			])

			return result.lastInsertRowId
		},
		remove: async (item: DriveCloudItem): Promise<void> => {
			const db = await this.openAsync()

			await db.runAsync("DELETE FROM offline_files WHERE uuid = ?", [item.uuid])
		},
		list: async (): Promise<DriveCloudItem[]> => {
			const db = await this.openAsync()

			return (
				await db.getAllAsync<{
					item: string
				}>("SELECT item FROM offline_files")
			).map(row => JSON.parse(row.item))
		},
		clear: async (): Promise<void> => {
			const db = await this.openAsync()

			await db.runAsync("DELETE FROM offline_files")
		},
		find: async (input: string): Promise<DriveCloudItem[]> => {
			const db = await this.openAsync()
			const searchTerm = input.trim().toLowerCase()

			return (
				await db.getAllAsync<{
					item: string
				}>("SELECT item FROM offline_files WHERE json_extract(item, '$.name') LIKE ? COLLATE NOCASE", [`%${searchTerm}%`])
			).map(row => JSON.parse(row.item))
		},
		verify: async (): Promise<void> => {
			const db = await this.openAsync()

			const list = (
				await db.getAllAsync<{
					uuid: string
				}>("SELECT uuid FROM offline_files")
			).map(row => row.uuid)

			if (list.length === 0) {
				return
			}

			const offlineFilesDir = new Directory(paths.offlineFiles())

			if (!offlineFilesDir.exists) {
				offlineFilesDir.create()

				await db.runAsync("DELETE FROM offline_files")

				return
			}

			const existingOfflineFiles = offlineFilesDir.listAsRecords().map(entry => Paths.basename(entry.uri).split(".")[0])

			if (existingOfflineFiles.length === 0) {
				await db.runAsync("DELETE FROM offline_files")

				return
			}

			await Promise.all(
				list.map(async uuid => {
					if (existingOfflineFiles.includes(uuid)) {
						return
					}

					await db.runAsync("DELETE FROM offline_files WHERE uuid = ?", [uuid])
				})
			)
		}
	}

	public kvAsync = {
		get: async <T>(key: string): Promise<T | null> => {
			const db = await this.openAsync()

			const result = await db.getFirstAsync<{
				value: string
			} | null>("SELECT value FROM kv WHERE key = ?", [key])

			if (!result) {
				return null
			}

			return JSON.parse(result.value) as T
		},
		set: async <T>(key: string, value: T): Promise<number> => {
			const db = await this.openAsync()
			const result = await db.runAsync("INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)", [key, JSON.stringify(value)])

			return result.lastInsertRowId
		},
		keys: async (): Promise<string[]> => {
			const db = await this.openAsync()

			return (
				await db.getAllAsync<{
					key: string
				}>("SELECT key FROM kv")
			).map(row => row.key)
		},
		clear: async (): Promise<void> => {
			const db = await this.openAsync()

			await db.runAsync("DELETE FROM kv")
		},
		contains: async (key: string): Promise<boolean> => {
			const db = await this.openAsync()

			const result = await db.getFirstAsync<{
				key: string
			} | null>("SELECT key FROM kv WHERE key = ?", [key])

			return !!result
		},
		remove: async (key: string): Promise<void> => {
			const db = await this.openAsync()

			await db.runAsync("DELETE FROM kv WHERE key = ?", [key])
		}
	}

	public kvSync = {
		get: <T>(key: string): T | null => {
			const db = this.openSync()

			const result = db.getFirstSync<{
				value: string
			} | null>("SELECT value FROM kv WHERE key = ?", [key])

			if (!result) {
				return null
			}

			return JSON.parse(result.value) as T
		},
		set: <T>(key: string, value: T): number => {
			const db = this.openSync()
			const result = db.runSync("INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)", [key, JSON.stringify(value)])

			return result.lastInsertRowId
		},
		keys: (): string[] => {
			const db = this.openSync()

			return db
				.getAllSync<{
					key: string
				}>("SELECT key FROM kv")
				.map(row => row.key)
		},
		clear: (): void => {
			const db = this.openSync()

			db.runSync("DELETE FROM kv")
		},
		contains: (key: string): boolean => {
			const db = this.openSync()

			const result = db.getFirstSync<{
				key: string
			} | null>("SELECT key FROM kv WHERE key = ?", [key])

			return !!result
		},
		remove: (key: string): void => {
			const db = this.openSync()

			db.runSync("DELETE FROM kv WHERE key = ?", [key])
		}
	}
}

export const sqlite = new SQLite(`filen_sqlite_v${SQLITE_VERSION}.db`)

export default sqlite
