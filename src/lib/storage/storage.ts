import { MMKV } from "react-native-mmkv"

export const STORAGE_ID: string = "filen_v2"

const mmkv = new MMKV({
    id: STORAGE_ID
})

const before = new MMKV({
    id: STORAGE_ID
})

// Kept for legacy purposes

export const storage = Object.assign(mmkv, {
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