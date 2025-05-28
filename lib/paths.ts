import * as FileSystem from "expo-file-system/next"

export const PREFIX: string = "filenv3_"
export const THUMBNAILS_VERSION: number = 1
export const BASE_DIR: string = FileSystem.Paths.document.uri // TODO: FileSystem.Paths.appleSharedContainers["group.io.filen.app"]?.uri
export const TEMPORARY_DOWNLOADS_BASE_PATH: string = FileSystem.Paths.join(BASE_DIR, `${PREFIX}temporaryDownloads`)
export const TEMPORARY_UPLOADS_BASE_PATH: string = FileSystem.Paths.join(BASE_DIR, `${PREFIX}temporaryUploads`)
export const THUMBNAILS_BASE_PATH: string = FileSystem.Paths.join(BASE_DIR, `${PREFIX}thumbnails_v${THUMBNAILS_VERSION}`)
export const DB_BASE_PATH: string = FileSystem.Paths.join(BASE_DIR, `${PREFIX}databases`)
export const EXPORTS_BASE_PATH: string = FileSystem.Paths.join(BASE_DIR, `${PREFIX}exportedFiles`)
export const OFFLINE_FILES_BASE_PATH: string = FileSystem.Paths.join(BASE_DIR, `${PREFIX}offlineAvailableFiles`)
export const ASSETS_BASE_PATH: string = FileSystem.Paths.join(BASE_DIR, `${PREFIX}assets`)
export const TRACK_PLAYER_BASE_PATH: string = FileSystem.Paths.join(BASE_DIR, `${PREFIX}trackPlayer`)
export const TRACK_PLAYER_PICTURES_BASE_PATH: string = FileSystem.Paths.join(BASE_DIR, `${PREFIX}trackPlayerPictures`)

console.log({
	PREFIX,
	THUMBNAILS_VERSION,
	BASE_DIR,
	TEMPORARY_DOWNLOADS_BASE_PATH,
	TEMPORARY_UPLOADS_BASE_PATH,
	THUMBNAILS_BASE_PATH,
	DB_BASE_PATH,
	EXPORTS_BASE_PATH,
	OFFLINE_FILES_BASE_PATH,
	ASSETS_BASE_PATH,
	TRACK_PLAYER_BASE_PATH,
	TRACK_PLAYER_PICTURES_BASE_PATH
})

export class Paths {
	private readonly created = {
		temporaryDownloads: false,
		temporaryUploads: false,
		thumbnails: false,
		db: false,
		exports: false,
		offlineFiles: false,
		assets: false,
		trackPlayer: false,
		trackPlayerPictures: false
	}

	public clearTempDirectories(): void {
		const tempDownloads = new FileSystem.Directory(TEMPORARY_DOWNLOADS_BASE_PATH)
		const tempUploads = new FileSystem.Directory(TEMPORARY_UPLOADS_BASE_PATH)
		const exportsDir = new FileSystem.Directory(EXPORTS_BASE_PATH)

		if (tempDownloads.exists) {
			tempDownloads.delete()
		}

		if (tempUploads.exists) {
			tempUploads.delete()
		}

		if (exportsDir.exists) {
			exportsDir.delete()
		}

		this.created.temporaryDownloads = false
		this.created.temporaryUploads = false
		this.created.exports = false
	}

	public db(): string {
		if (this.created.db) {
			return DB_BASE_PATH
		}

		const dir = new FileSystem.Directory(DB_BASE_PATH)

		if (!dir.exists) {
			dir.create()
		}

		this.created.db = true

		return DB_BASE_PATH
	}

	public temporaryDownloads(): string {
		if (this.created.temporaryDownloads) {
			return TEMPORARY_DOWNLOADS_BASE_PATH
		}

		const dir = new FileSystem.Directory(TEMPORARY_DOWNLOADS_BASE_PATH)

		if (!dir.exists) {
			dir.create()
		}

		this.created.temporaryDownloads = true

		return TEMPORARY_DOWNLOADS_BASE_PATH
	}

	public temporaryUploads(): string {
		if (this.created.temporaryUploads) {
			return TEMPORARY_UPLOADS_BASE_PATH
		}

		const dir = new FileSystem.Directory(TEMPORARY_UPLOADS_BASE_PATH)

		if (!dir.exists) {
			dir.create()
		}

		this.created.temporaryUploads = true

		return TEMPORARY_UPLOADS_BASE_PATH
	}

	public thumbnails(): string {
		if (this.created.thumbnails) {
			return THUMBNAILS_BASE_PATH
		}

		const dir = new FileSystem.Directory(THUMBNAILS_BASE_PATH)

		if (!dir.exists) {
			dir.create()
		}

		this.created.thumbnails = true

		return THUMBNAILS_BASE_PATH
	}

	public exports(): string {
		if (this.created.exports) {
			return EXPORTS_BASE_PATH
		}

		const dir = new FileSystem.Directory(EXPORTS_BASE_PATH)

		if (!dir.exists) {
			dir.create()
		}

		this.created.exports = true

		return EXPORTS_BASE_PATH
	}

	public offlineFiles(): string {
		if (this.created.offlineFiles) {
			return OFFLINE_FILES_BASE_PATH
		}

		const dir = new FileSystem.Directory(OFFLINE_FILES_BASE_PATH)

		if (!dir.exists) {
			dir.create()
		}

		this.created.offlineFiles = true

		return OFFLINE_FILES_BASE_PATH
	}

	public assets(): string {
		if (this.created.assets) {
			return ASSETS_BASE_PATH
		}

		const dir = new FileSystem.Directory(ASSETS_BASE_PATH)

		if (!dir.exists) {
			dir.create()
		}

		this.created.assets = true

		return ASSETS_BASE_PATH
	}

	public trackPlayer(): string {
		if (this.created.trackPlayer) {
			return TRACK_PLAYER_BASE_PATH
		}

		const dir = new FileSystem.Directory(TRACK_PLAYER_BASE_PATH)

		if (!dir.exists) {
			dir.create()
		}

		this.created.trackPlayer = true

		return TRACK_PLAYER_BASE_PATH
	}

	public trackPlayerPictures(): string {
		if (this.created.trackPlayerPictures) {
			return TRACK_PLAYER_PICTURES_BASE_PATH
		}

		const dir = new FileSystem.Directory(TRACK_PLAYER_PICTURES_BASE_PATH)

		if (!dir.exists) {
			dir.create()
		}

		this.created.trackPlayerPictures = true

		return TRACK_PLAYER_PICTURES_BASE_PATH
	}
}

export const paths = new Paths()

export default paths
