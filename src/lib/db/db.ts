import SQLite from "react-native-sqlite-storage"
import { Asset } from "expo-media-library"
import { getAssetId } from "../helpers"
import memoryCache from "../memoryCache"
import { Semaphore } from "../helpers"
import storage from "../storage"
import { memoize } from "lodash"
import * as fs from "../fs"
import { getDownloadPath } from "../services/download"

SQLite.enablePromise(true)

const readSemaphore = new Semaphore(256)
const writeSemaphore = new Semaphore(128)
const PREFIX = "kv:"

const keyValueTableSQL = `CREATE TABLE IF NOT EXISTS key_value (\
    key TEXT, \
    value TEXT \
)`
const keyValueTableIndexesSQL = `CREATE INDEX key_index ON key_value (key)`

const cameraUploadLastModifiedSQL = `CREATE TABLE IF NOT EXISTS camera_upload_last_modified (\
    asset_id TEXT, \
    last_modified INTEGER \
)`
const cameraUploadLastModifiedIndexesSQL = `CREATE INDEX asset_id_index ON camera_upload_last_modified (asset_id)`

const cameraUploadLastModifiedStatSQL = `CREATE TABLE IF NOT EXISTS camera_upload_last_modified_stat (\
    asset_id TEXT, \
    last_modified INTEGER \
)`
const cameraUploadLastModifiedStatIndexesSQL = `CREATE INDEX asset_id_index ON camera_upload_last_modified_stat (asset_id)`

const cameraUploadLastSizeSQL = `CREATE TABLE IF NOT EXISTS camera_upload_last_size (\
    asset_id TEXT, \
    size INTEGER \
)`
const cameraUploadLastSizeIndexesSQL = `CREATE INDEX asset_id_index ON camera_upload_last_size (asset_id)`

export let db: SQLite.SQLiteDatabase | null = null

export const query = async (stmt: string, params: any[] | undefined = undefined) => {
	const semaphore = stmt.toLowerCase().indexOf("select ") !== -1 ? readSemaphore : writeSemaphore

	try {
		await semaphore.acquire()

		if (!db) {
			throw new Error("DB not initialized")
		}

		const res = await db.executeSql(stmt, params)

		semaphore.release()

		return res
	} catch (e) {
		semaphore.release()

		throw e
	}
}

export const get = async <T>(key: string): Promise<any> => {
	try {
		const value = storage.getString(PREFIX + key)

		if (typeof value == "undefined") {
			return null
		}

		return JSON.parse(value) as any as T
	} catch (e) {
		console.error(e)

		return null
	}
}

export const has = async (key: string): Promise<boolean> => {
	try {
		return storage.contains(PREFIX + key)
	} catch (e) {
		console.error(e)

		return false
	}
}

export const remove = async (key: string): Promise<void> => {
	try {
		storage.delete(PREFIX + key)
	} catch (e) {
		console.error(e)
	}
}

export const set = async (key: string, value: any) => {
	try {
		storage.set(PREFIX + key, JSON.stringify(value))
	} catch (e) {
		console.error(e)
	}
}

export const hashDbFsKey = memoize(async (key: string): Promise<string> => {
	return await nodeThread.hashFn({ string: key })
})

export const dbFs = {
	get: async <T>(key: string) => {
		if (memoryCache.has(PREFIX + key)) {
			return memoryCache.get(PREFIX + key) as any as T
		}

		const keyHashed = await hashDbFsKey(key)
		const path = (await getDownloadPath({ type: "db" })) + keyHashed
		const stat = await fs.stat(path)

		if (!stat.exists) {
			return null
		}

		const value = JSON.parse(await fs.readAsString(path, "utf8"))

		if (!value) {
			return null
		}

		if (!value.value || !value.key) {
			return null
		}

		return value.value as any as T
	},
	set: async (key: string, value: any) => {
		const keyHashed = await hashDbFsKey(key)
		const path = (await getDownloadPath({ type: "db" })) + keyHashed

		await fs.writeAsString(
			path,
			JSON.stringify({
				key,
				value
			}),
			{
				encoding: "utf8"
			}
		)

		memoryCache.set(PREFIX + key, value)
	},
	has: async (key: string) => {
		if (memoryCache.has(PREFIX + key)) {
			return true
		}

		const keyHashed = await hashDbFsKey(key)
		const path = (await getDownloadPath({ type: "db" })) + keyHashed
		const stat = await fs.stat(path)

		if (!stat.exists) {
			return false
		}

		return true
	},
	remove: async (key: string) => {
		const keyHashed = await hashDbFsKey(key)
		const path = (await getDownloadPath({ type: "db" })) + keyHashed
		const stat = await fs.stat(path)

		if (!stat.exists) {
			return
		}

		await fs.unlink(path)

		memoryCache.delete(PREFIX + key)
	},
	warmUp: async () => {
		const path = await getDownloadPath({ type: "db" })
		const dir = await fs.readDirectory(path)
		const keyHashed = await hashDbFsKey("warmUp")

		for (const file of dir) {
			if (file.length === keyHashed.length) {
				const read = await fs.readAsString(path + file, "utf8")

				if (read.slice(0, 64).indexOf("loadItems:") == -1) {
					continue
				}

				const value = JSON.parse(read)

				if (!value) {
					continue
				}

				if (!value.value || !value.key) {
					continue
				}

				if (value.key.indexOf("loadItems:") == -1) {
					continue
				}

				memoryCache.set(PREFIX + value.key, value.value)
			}
		}
	}
}

export const cameraUpload = {
	getLastModified: async (asset: Asset): Promise<number> => {
		const assetId = getAssetId(asset)
		const [result] = await query(
			"SELECT last_modified FROM camera_upload_last_modified WHERE asset_id = ? ORDER BY rowid DESC LIMIT 1",
			[assetId]
		)

		if (result.rows.length !== 1) {
			return -1
		}

		return parseInt(result.rows.item(0)["last_modified"])
	},
	getLastModifiedAll: async (): Promise<Record<string, number>> => {
		const [result] = await query("SELECT asset_id, last_modified FROM camera_upload_last_modified")

		const allObj: Record<string, number> = {}
		const rows = result.rows

		for (let i = 0; i < rows.length; i++) {
			const row = rows.item(i)

			allObj[row["asset_id"]] = parseInt(row["last_modified"])
		}

		return allObj
	},
	setLastModified: async (asset: Asset, lastModified: number): Promise<void> => {
		const assetId = getAssetId(asset)
		const [result] = await query(
			"SELECT rowid FROM camera_upload_last_modified WHERE asset_id = ? ORDER BY rowid DESC LIMIT 1",
			[assetId]
		)
		const hasRow = result.rows.length == 1

		await (hasRow
			? query("UPDATE camera_upload_last_modified SET last_modified = ? WHERE asset_id = ?", [
					lastModified,
					assetId
			  ])
			: query("INSERT INTO camera_upload_last_modified (asset_id, last_modified) VALUES (?, ?)", [
					assetId,
					lastModified
			  ]))
	},
	getLastModifiedStat: async (asset: Asset): Promise<number> => {
		const assetId = getAssetId(asset)
		const [result] = await query(
			"SELECT last_modified FROM camera_upload_last_modified_stat WHERE asset_id = ? ORDER BY rowid DESC LIMIT 1",
			[assetId]
		)

		if (result.rows.length !== 1) {
			return -1
		}

		return parseInt(result.rows.item(0)["last_modified"])
	},
	setLastModifiedStat: async (asset: Asset, lastModified: number): Promise<void> => {
		const assetId = getAssetId(asset)
		const [result] = await query(
			"SELECT rowid FROM camera_upload_last_modified_stat WHERE asset_id = ? ORDER BY rowid DESC LIMIT 1",
			[assetId]
		)
		const hasRow = result.rows.length == 1

		await (hasRow
			? query("UPDATE camera_upload_last_modified_stat SET last_modified = ? WHERE asset_id = ?", [
					lastModified,
					assetId
			  ])
			: query("INSERT INTO camera_upload_last_modified_stat (asset_id, last_modified) VALUES (?, ?)", [
					assetId,
					lastModified
			  ]))
	},
	getLastSize: async (asset: Asset): Promise<number> => {
		const assetId = getAssetId(asset)
		const [result] = await query(
			"SELECT size FROM camera_upload_last_size WHERE asset_id = ? ORDER BY rowid DESC LIMIT 1",
			[assetId]
		)

		if (result.rows.length !== 1) {
			return -1
		}

		return parseInt(result.rows.item(0)["size"])
	},
	setLastSize: async (asset: Asset, size: number): Promise<void> => {
		const assetId = getAssetId(asset)
		const [result] = await query(
			"SELECT rowid FROM camera_upload_last_size WHERE asset_id = ? ORDER BY rowid DESC LIMIT 1",
			[assetId]
		)
		const hasRow = result.rows.length == 1

		await (hasRow
			? query("UPDATE camera_upload_last_size SET size = ? WHERE asset_id = ?", [size, assetId])
			: query("INSERT INTO camera_upload_last_size (asset_id, size) VALUES (?, ?)", [assetId, size]))
	}
}

export const init = async () => {
	db = await SQLite.openDatabase({
		name: "db",
		location: "default"
	})

	await query(keyValueTableSQL)
	await query(keyValueTableIndexesSQL).catch(() => {})

	await query(cameraUploadLastModifiedSQL)
	await query(cameraUploadLastModifiedIndexesSQL).catch(() => {})

	await query(cameraUploadLastModifiedStatSQL)
	await query(cameraUploadLastModifiedStatIndexesSQL).catch(() => {})

	await query(cameraUploadLastSizeSQL)
	await query(cameraUploadLastSizeIndexesSQL).catch(() => {})
}
