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
	private readonly rwSemaphore = new Semaphore(3)

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

	public offlineFiles = {
		contains: async (uuid: string): Promise<boolean> => {
			await this.rwSemaphore.acquire()

			try {
				const db = await this.openAsync()

				const result = await db.getFirstAsync<{
					uuid: string
				} | null>("SELECT uuid FROM offline_files WHERE uuid = ?", [uuid])

				return !!result
			} finally {
				this.rwSemaphore.release()
			}
		},
		get: async (uuid: string): Promise<DriveCloudItem | null> => {
			await this.rwSemaphore.acquire()

			try {
				const db = await this.openAsync()

				const result = await db.getFirstAsync<{
					item: string
				} | null>("SELECT item FROM offline_files WHERE uuid = ?", [uuid])

				if (!result) {
					return null
				}

				return JSON.parse(result.item)
			} finally {
				this.rwSemaphore.release()
			}
		},
		add: async (item: DriveCloudItem): Promise<number> => {
			await this.rwSemaphore.acquire()

			try {
				const db = await this.openAsync()

				const result = await db.runAsync("INSERT OR REPLACE INTO offline_files (uuid, item) VALUES (?, ?)", [
					item.uuid,
					JSON.stringify(item)
				])

				return result.lastInsertRowId
			} finally {
				this.rwSemaphore.release()
			}
		},
		remove: async (item: DriveCloudItem): Promise<void> => {
			await this.rwSemaphore.acquire()

			try {
				const db = await this.openAsync()

				await db.runAsync("DELETE FROM offline_files WHERE uuid = ?", [item.uuid])
			} finally {
				this.rwSemaphore.release()
			}
		},
		list: async (): Promise<DriveCloudItem[]> => {
			await this.rwSemaphore.acquire()

			try {
				const db = await this.openAsync()

				return (
					await db.getAllAsync<{
						item: string
					}>("SELECT item FROM offline_files")
				).map(row => JSON.parse(row.item))
			} finally {
				this.rwSemaphore.release()
			}
		},
		clear: async (): Promise<void> => {
			await this.rwSemaphore.acquire()

			try {
				const db = await this.openAsync()

				await db.runAsync("DELETE FROM offline_files")
			} finally {
				this.rwSemaphore.release()
			}
		},
		find: async (input: string): Promise<DriveCloudItem[]> => {
			await this.rwSemaphore.acquire()

			try {
				const db = await this.openAsync()
				const searchTerm = input.trim().toLowerCase()

				return (
					await db.getAllAsync<{
						item: string
					}>("SELECT item FROM offline_files WHERE json_extract(item, '$.name') LIKE ? COLLATE NOCASE", [`%${searchTerm}%`])
				).map(row => JSON.parse(row.item))
			} finally {
				this.rwSemaphore.release()
			}
		},
		verify: async (): Promise<void> => {
			await this.rwSemaphore.acquire()

			try {
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
			} finally {
				this.rwSemaphore.release()
			}
		}
	}

	public kvAsync = {
		get: async <T>(key: string): Promise<T | null> => {
			await this.rwSemaphore.acquire()

			try {
				const db = await this.openAsync()

				const result = await db.getFirstAsync<{
					value: string
				} | null>("SELECT value FROM kv WHERE key = ?", [key])

				if (!result) {
					return null
				}

				return JSON.parse(result.value) as T
			} finally {
				this.rwSemaphore.release()
			}
		},
		set: async <T>(key: string, value: T): Promise<number> => {
			await this.rwSemaphore.acquire()

			try {
				const db = await this.openAsync()
				const result = await db.runAsync("INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)", [key, JSON.stringify(value)])

				return result.lastInsertRowId
			} finally {
				this.rwSemaphore.release()
			}
		},
		keys: async (): Promise<string[]> => {
			await this.rwSemaphore.acquire()

			try {
				const db = await this.openAsync()

				return (
					await db.getAllAsync<{
						key: string
					}>("SELECT key FROM kv")
				).map(row => row.key)
			} finally {
				this.rwSemaphore.release()
			}
		},
		clear: async (): Promise<void> => {
			await this.rwSemaphore.acquire()

			try {
				const db = await this.openAsync()

				await db.runAsync("DELETE FROM kv")
			} finally {
				this.rwSemaphore.release()
			}
		},
		contains: async (key: string): Promise<boolean> => {
			await this.rwSemaphore.acquire()

			try {
				const db = await this.openAsync()

				const result = await db.getFirstAsync<{
					key: string
				} | null>("SELECT key FROM kv WHERE key = ?", [key])

				return !!result
			} finally {
				this.rwSemaphore.release()
			}
		},
		remove: async (key: string): Promise<void> => {
			await this.rwSemaphore.acquire()

			try {
				const db = await this.openAsync()

				await db.runAsync("DELETE FROM kv WHERE key = ?", [key])
			} finally {
				this.rwSemaphore.release()
			}
		}
	}
}

export const sqlite = new SQLite(`filen_sqlite_v${SQLITE_VERSION}.db`)

export default sqlite
