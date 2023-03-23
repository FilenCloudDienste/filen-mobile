import { MMKV } from "react-native-mmkv"

export const STORAGE_ID: string = "filen_v2"

const mmkv = new MMKV({
    id: STORAGE_ID
})

const before = new MMKV({
    id: STORAGE_ID
})

// Overwrite default methods to fit our codebase

export const storage = Object.assign(mmkv, {
    set: (key: string, value: any) => {
        if(before.contains(key)){
            before.delete(key)
        }

        before.set(key, value)
    },
    delete: (key: string) => {
        if(before.contains(key)){
            before.delete(key)
        }
    },
    getBoolean: (key: string) => {
        const data = before.getBoolean(key)
    
        if(typeof data !== "boolean"){
            return false
        }
    
        return data
    },
    getNumber: (key: string) => {
        const data = before.getNumber(key)
    
        if(typeof data !== "number"){
            return 0
        }
    
        return data
    }
})

export default storage