import { MMKV } from "react-native-mmkv"
import { memoryCache } from "./memoryCache"

export const STORAGE_ID = "filen_v2"

const mmkv = new MMKV({
    id: STORAGE_ID
})

export const storage = {
    set: (key, value) => {
        mmkv.set(key, value)
        memoryCache.set("mmkv:" + key, value)
    
        return true
    },
    getString: (key) => {
        if(memoryCache.has("mmkv:" + key)){
            return memoryCache.get("mmkv:" + key)
        }
    
        const res = mmkv.getString(key)

        memoryCache.set("mmkv:" + key, res)

        return res
    },
    getBoolean: (key) => {
        if(memoryCache.has("mmkv:" + key)){
            return memoryCache.get("mmkv:" + key)
        }
    
        const res = mmkv.getBoolean(key)

        memoryCache.set("mmkv:" + key, res)

        return res
    },
    getNumber: (key) => {
        if(memoryCache.has("mmkv:" + key)){
            return memoryCache.get("mmkv:" + key)
        }
    
        const res = mmkv.getNumber(key)

        memoryCache.set("mmkv:" + key, res)

        return res
    },
    getAllKeys: () => {
        return mmkv.getAllKeys()
    },
    delete: (key) => {
        mmkv.delete(key)
        memoryCache.delete("mmkv:" + key)

        return true
    },
    clearAll: () => {
        mmkv.clearAll()
            
        memoryCache.cache.forEach((value, key) => {
            if(key.indexOf("mmkv:") !== -1){
                memoryCache.delete(key)
            }
        })

        return true
    },
    contains: (key) => {
        return mmkv.contains(key)
    },
    addOnValueChangedListener: (key) => {
        return mmkv.addOnValueChangedListener(key)
    }
}