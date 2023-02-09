import ReactNativeBlobUtil from "react-native-blob-util"
import RNFS from "react-native-fs"

export const THUMBNAIL_BASE_PATH: string = ReactNativeBlobUtil.fs.dirs.DocumentDir + "/thumbnailCache/"
export const MISC_BASE_PATH: string = RNFS.DocumentDirectoryPath + (RNFS.DocumentDirectoryPath.slice(-1) == "/" ? "" : "/") + "misc/"
export const MB = 1024 * 1024
export const GB = MB * 1024
export const MAX_CAMERA_UPLOAD_QUEUE = 100
export const MAX_THUMBNAIL_ERROR_COUNT = 5