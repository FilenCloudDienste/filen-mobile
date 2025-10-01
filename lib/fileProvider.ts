import * as FileSystemLegacy from "expo-file-system/legacy"
import paths from "@/lib/paths"
import { type FilenSDKConfig } from "@filen/sdk"

export type AuthFileSchema = {
	providerEnabled: boolean
	sdkConfig: Required<FilenSDKConfig> | null
}

export class FileProvider {
	public async read(): Promise<AuthFileSchema | null> {
		const authFilePath = await paths.fileProviderAuthFile()

		if (!(await FileSystemLegacy.getInfoAsync(authFilePath)).exists) {
			return null
		}

		try {
			return JSON.parse(
				await FileSystemLegacy.readAsStringAsync(authFilePath, {
					encoding: FileSystemLegacy.EncodingType.UTF8
				})
			) as AuthFileSchema
		} catch {
			return null
		}
	}

	public async enabled(): Promise<boolean> {
		const data = await this.read()

		return data?.providerEnabled ?? false
	}

	public async disable(): Promise<void> {
		const authFilePath = await paths.fileProviderAuthFile()

		if ((await FileSystemLegacy.getInfoAsync(authFilePath)).exists) {
			await FileSystemLegacy.deleteAsync(authFilePath)
		}
	}

	public async enable(sdkConfig: Required<FilenSDKConfig>): Promise<void> {
		return await this.write({
			providerEnabled: true,
			sdkConfig
		} satisfies AuthFileSchema)
	}

	public async write(data: AuthFileSchema): Promise<void> {
		const authFilePath = await paths.fileProviderAuthFile()

		if ((await FileSystemLegacy.getInfoAsync(authFilePath)).exists) {
			await FileSystemLegacy.deleteAsync(authFilePath)
		}

		await FileSystemLegacy.writeAsStringAsync(authFilePath, JSON.stringify(data), {
			encoding: FileSystemLegacy.EncodingType.UTF8
		})
	}
}

export const fileProvider = new FileProvider()

export default fileProvider
