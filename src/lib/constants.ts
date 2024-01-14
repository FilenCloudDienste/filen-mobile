import { documentDirectory } from "../lib/fs"

export const THUMBNAIL_BASE_PATH: string =
	(documentDirectory().endsWith("/") ? documentDirectory() : documentDirectory() + "/") + "thumbnailCache/"
export const MISC_BASE_PATH: string = (documentDirectory().endsWith("/") ? documentDirectory() : documentDirectory() + "/") + "misc/"
export const MB = 1024 * 1024
export const GB = MB * 1024
export const MAX_CAMERA_UPLOAD_QUEUE = 10
export const MAX_THUMBNAIL_ERROR_COUNT = 3
export const ONLINE_TIMEOUT = 900000
export const MAX_NOTE_SIZE = 1024 * 1024 - 1
export const SOCKET = "https://socket.filen.io"
