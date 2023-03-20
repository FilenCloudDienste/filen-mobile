import SQLite from "react-native-sqlite-storage"
import { Asset } from "expo-media-library"
import { getAssetId } from "../helpers"
import memoryCache from "../memoryCache"
import { Semaphore } from "../helpers"

SQLite.enablePromise(true)

const readSemaphore = new Semaphore(256)
const writeSemaphore = new Semaphore(128)

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

    await semaphore.acquire()

    if(!db){
        throw new Error("DB not initialized")
    }

    const res = await db.executeSql(stmt, params)

    semaphore.release()

    return res
}

export const get = async <T>(key: string): Promise<any> => {
    try{
        const [ result ] = await query("SELECT value FROM key_value WHERE key = ? ORDER BY rowid DESC LIMIT 1", [key])

        if(result.rows.length !== 1){
            return null
        }

        return JSON.parse(result.rows.item(0)['value']) as any as T
    }
    catch(e){
        console.error(e)

        return null
    }
}

export const has = async (key: string): Promise<boolean> => {
    try{
        const [ result ] = await query("SELECT rowid FROM key_value WHERE key = ? ORDER BY rowid DESC LIMIT 1", [key])

        if(result.rows.length !== 1){
            return false
        }

        return true
    }
    catch(e){
        console.error(e)

        return false
    }
}

export const remove = async (key: string): Promise<void> => {
    try{
        await query("DELETE FROM key_value WHERE key = ?", [key])
    }
    catch(e){
        console.error(e)
    }
}

export const set = async (key: string, value: any) => {
    try{
        const hasKey = await has(key)
    
        await (hasKey ? query("UPDATE key_value SET value = ? WHERE key = ?", [JSON.stringify(value), key]) : query("INSERT INTO key_value (key, value) VALUES (?, ?)", [key, JSON.stringify(value)]))
    }
    catch(e){
        console.error(e)
    }
}

export const cameraUpload = {
    getLastModified: async (asset: Asset): Promise<number> => {
        const assetId = getAssetId(asset)
        const [ result ] = await query("SELECT last_modified FROM camera_upload_last_modified WHERE asset_id = ? ORDER BY rowid DESC LIMIT 1", [assetId])
    
        if(result.rows.length !== 1){
            return -1
        }
    
        return parseInt(result.rows.item(0)['last_modified'])
    },
    getLastModifiedAll: async (): Promise<Record<string, number>> => {
        const [ result ] = await query("SELECT asset_id, last_modified FROM camera_upload_last_modified")

        const allObj: Record<string, number> = {}
        const rows = result.rows

        for(let i = 0; i < rows.length; i++){
            const row = rows.item(i)

            allObj[row['asset_id']] = parseInt(row['last_modified'])
        }
    
        return allObj
    },
    setLastModified: async (asset: Asset, lastModified: number): Promise<void> => {
        const assetId = getAssetId(asset)
        const [ result ] = await query("SELECT rowid FROM camera_upload_last_modified WHERE asset_id = ? ORDER BY rowid DESC LIMIT 1", [assetId])
        const hasRow = result.rows.length == 1
    
        await (hasRow ? query("UPDATE camera_upload_last_modified SET last_modified = ? WHERE asset_id = ?", [lastModified, assetId]) : query("INSERT INTO camera_upload_last_modified (asset_id, last_modified) VALUES (?, ?)", [assetId, lastModified]))
    },
    getLastModifiedStat: async (asset: Asset): Promise<number> => {
        const assetId = getAssetId(asset)
        const [ result ] = await query("SELECT last_modified FROM camera_upload_last_modified_stat WHERE asset_id = ? ORDER BY rowid DESC LIMIT 1", [assetId])
    
        if(result.rows.length !== 1){
            return -1
        }
    
        return parseInt(result.rows.item(0)['last_modified'])
    },
    setLastModifiedStat: async (asset: Asset, lastModified: number): Promise<void> => {
        const assetId = getAssetId(asset)
        const [ result ] = await query("SELECT rowid FROM camera_upload_last_modified_stat WHERE asset_id = ? ORDER BY rowid DESC LIMIT 1", [assetId])
        const hasRow = result.rows.length == 1
    
        await (hasRow ? query("UPDATE camera_upload_last_modified_stat SET last_modified = ? WHERE asset_id = ?", [lastModified, assetId]) : query("INSERT INTO camera_upload_last_modified_stat (asset_id, last_modified) VALUES (?, ?)", [assetId, lastModified]))
    },
    getLastSize: async (asset: Asset): Promise<number> => {
        const assetId = getAssetId(asset)
        const [ result ] = await query("SELECT size FROM camera_upload_last_size WHERE asset_id = ? ORDER BY rowid DESC LIMIT 1", [assetId])
    
        if(result.rows.length !== 1){
            return -1
        }
    
        return parseInt(result.rows.item(0)['size'])
    },
    setLastSize: async (asset: Asset, size: number): Promise<void> => {
        const assetId = getAssetId(asset)
        const [ result ] = await query("SELECT rowid FROM camera_upload_last_size WHERE asset_id = ? ORDER BY rowid DESC LIMIT 1", [assetId])
        const hasRow = result.rows.length == 1
    
        await (hasRow ? query("UPDATE camera_upload_last_size SET size = ? WHERE asset_id = ?", [size, assetId]) : query("INSERT INTO camera_upload_last_size (asset_id, size) VALUES (?, ?)", [assetId, size]))
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

export const warmupDbCache = async () => {
    const [
        [ loadItemsResult ],
        [ itemCacheResult ],
        [ folderSizeCacheResult ]
    ] = await Promise.all([
        query("SELECT * FROM key_value WHERE key LIKE '%loadItems:%'"),
        query("SELECT * FROM key_value WHERE key LIKE '%itemCache:%'"),
        query("SELECT * FROM key_value WHERE key LIKE '%folderSizeCache:%'")
    ])

    for(let i = 0; i < loadItemsResult.rows.length; i++){
        const row = loadItemsResult.rows.item(i)

        memoryCache.set(row['key'], JSON.parse(row['value']))
    }

    for(let i = 0; i < itemCacheResult.rows.length; i++){
        const row = itemCacheResult.rows.item(i)

        memoryCache.set(row['key'], JSON.parse(row['value']))
    }

    for(let i = 0; i < folderSizeCacheResult.rows.length; i++){
        const row = folderSizeCacheResult.rows.item(i)

        memoryCache.set(row['key'], JSON.parse(row['value']))
    }
}