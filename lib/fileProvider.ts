import * as FileSystem from "expo-file-system/next"
import paths from "@/lib/paths"
import { type FilenSDKConfig } from "@filen/sdk"

export type AuthFileSchema = {
	providerEnabled: boolean
	sdkConfig: Required<FilenSDKConfig> | null
}

export class FileProvider {
	public read(): AuthFileSchema | null {
		const file = new FileSystem.File(paths.fileProviderAuthFile())

		if (!file.exists) {
			return null
		}

		try {
			return JSON.parse(file.text()) as AuthFileSchema
		} catch {
			return null
		}
	}

	public enabled(): boolean {
		const data = this.read()

		return data?.providerEnabled ?? false
	}

	public disable(): void {
		this.write({
			providerEnabled: false,
			sdkConfig: null
		} satisfies AuthFileSchema)
	}

	public enable(sdkConfig: Required<FilenSDKConfig>): void {
		this.write({
			providerEnabled: true,
			sdkConfig
		} satisfies AuthFileSchema)
	}

	public write(data: AuthFileSchema): void {
		const file = new FileSystem.File(paths.fileProviderAuthFile())

		file.write(JSON.stringify(data))
	}
}

export const fileProvider = new FileProvider()

export default fileProvider
