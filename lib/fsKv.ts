import * as FileSystem from "expo-file-system/next"
import { xxHash32 } from "js-xxhash"

export const VERSION = 2

export type FileContent = {
	key: string
	value: string
}

export class FSKV {
	private readonly cache = new Map<string, unknown>()
	private readonly basePath: string
	private parentDirectoriesCreated: boolean = false

	public constructor(prefix: string = "default") {
		this.basePath = FileSystem.Paths.join(FileSystem.Paths.document.uri, "fsKv", `v${VERSION}`, prefix)

		console.log("fsKv path", this.basePath)
	}

	private keyToFilePath(key: string): string {
		const b64 = btoa(key)

		return FileSystem.Paths.join(
			this.basePath,
			b64.replaceAll("=", "").substring(b64.length - 16, b64.length) + xxHash32(key, 0).toString(16)
		)
	}

	public set(key: string, value: unknown): void {
		const file = new FileSystem.File(this.keyToFilePath(key))

		if (!this.parentDirectoriesCreated) {
			if (!file.parentDirectory.parentDirectory.parentDirectory.exists) {
				file.parentDirectory.parentDirectory.parentDirectory.create()
			}

			if (!file.parentDirectory.parentDirectory.exists) {
				file.parentDirectory.parentDirectory.create()
			}

			if (!file.parentDirectory.exists) {
				file.parentDirectory.create()
			}

			this.parentDirectoriesCreated = true
		}

		file.write(
			JSON.stringify({
				key,
				value
			})
		)

		this.cache.set(key, value)
	}

	public get<T>(key: string): T | null {
		if (this.cache.has(key)) {
			return this.cache.get(key) as T
		}

		const file = new FileSystem.File(this.keyToFilePath(key))

		if (!file.exists) {
			return null
		}

		try {
			const content = JSON.parse(file.text()) as FileContent

			this.cache.set(content.key, content.value)

			return content.key as T
		} catch {
			return null
		}
	}

	public delete(key: string): void {
		const file = new FileSystem.File(this.keyToFilePath(key))

		if (file.exists) {
			file.delete()
		}

		this.cache.delete(key)
	}

	public keys(): string[] {
		const dir = new FileSystem.Directory(this.basePath)

		if (!dir.exists) {
			return []
		}

		return dir
			.list()
			.map(file => {
				if (!(file instanceof FileSystem.File) || !file.exists) {
					return null
				}

				const content = JSON.parse(file.text()) as FileContent

				this.cache.set(content.key, content.value)

				return content.key
			})
			.filter(entry => entry !== null)
	}

	public clear(): void {
		const dir = new FileSystem.Directory(this.basePath)

		if (dir.exists) {
			dir.delete()
		}
	}
}

export const fsKv = {
	default: new FSKV("default")
}

export default fsKv
