import * as FileSystem from "expo-file-system"
import paths from "@/lib/paths"
import { type FilenSDKConfig } from "@filen/sdk"

export type AuthFileSchema = {
	providerEnabled: boolean
	sdkConfig: Required<FilenSDKConfig> | null
}

export class FileProvider {
	public async read(): Promise<AuthFileSchema | null> {
		const authFilePath = await paths.fileProviderAuthFile()

		if (!(await FileSystem.getInfoAsync(authFilePath)).exists) {
			return null
		}

		try {
			return JSON.parse(
				await FileSystem.readAsStringAsync(authFilePath, {
					encoding: FileSystem.EncodingType.UTF8
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

		if ((await FileSystem.getInfoAsync(authFilePath)).exists) {
			await FileSystem.deleteAsync(authFilePath)
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

		if ((await FileSystem.getInfoAsync(authFilePath)).exists) {
			await FileSystem.deleteAsync(authFilePath)
		}

		await FileSystem.writeAsStringAsync(authFilePath, JSON.stringify(data), {
			encoding: FileSystem.EncodingType.UTF8
		})
	}
}

export const fileProvider = new FileProvider()

export default fileProvider
