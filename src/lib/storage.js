import { MMKV } from "react-native-mmkv"
import RNFS from "react-native-fs"

const STORAGE_ID = "filen_v2"

export const storage = new MMKV({
    id: STORAGE_ID,
    path: RNFS.DocumentDirectoryPath + (RNFS.DocumentDirectoryPath.slice(-1) == "/" ? "" : "/") + "storage"
})