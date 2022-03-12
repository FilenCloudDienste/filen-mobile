import { MMKV } from "react-native-mmkv"

export const STORAGE_ID = "filen_v2"

export const storage = new MMKV({
    id: STORAGE_ID
})