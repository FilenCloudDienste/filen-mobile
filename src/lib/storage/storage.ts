import { MMKV } from "react-native-mmkv"

export const STORAGE_ID: string = "filen_v2"

export const mmkv = new MMKV({
    id: STORAGE_ID
})

export const storage: MMKV = mmkv

export default mmkv