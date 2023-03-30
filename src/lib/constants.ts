import { documentDirectory } from "../lib/fs"

export const THUMBNAIL_BASE_PATH: string = (documentDirectory.endsWith("/") ? documentDirectory : documentDirectory + "/") + "thumbnailCache/"
export const MISC_BASE_PATH: string = (documentDirectory.endsWith("/") ? documentDirectory : documentDirectory + "/") + "misc/"
export const MB = 1024 * 1024
export const GB = MB * 1024
export const MAX_CAMERA_UPLOAD_QUEUE = 8
export const MAX_THUMBNAIL_ERROR_COUNT = 5