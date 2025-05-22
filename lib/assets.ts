import paths from "./paths"
import * as FileSystem from "expo-file-system/next"
import { Asset } from "expo-asset"

export class Assets {
	private readonly copied: Record<string, { uri: string; name: string }> = {}

	public async copy(): Promise<void> {
		const assets = [require("../assets/audio/silent_1h.mp3")]

		await Promise.all(
			assets.map(async asset => {
				const assetPath = Asset.fromModule(asset)
				const destination = new FileSystem.File(FileSystem.Paths.join(paths.assets(), `${assetPath.name}.${assetPath.type}`))

				if (destination.exists) {
					this.copied[assetPath.name] = {
						name: assetPath.name,
						uri: destination.uri
					}

					return
				}

				if (!assetPath.localUri) {
					await assetPath.downloadAsync()
				}

				if (!assetPath.localUri) {
					throw new Error("Asset local URI is not available.")
				}

				const source = new FileSystem.File(assetPath.localUri)

				if (!source.exists) {
					throw new Error("Asset source does not exist.")
				}

				source.copy(destination)

				if (!destination.exists) {
					throw new Error("Asset destination does not exist.")
				}

				this.copied[assetPath.name] = {
					name: assetPath.name,
					uri: destination.uri
				}
			})
		)

		console.log("Assets copied.")
	}

	public uri = {
		audio: {
			silent_1h: () => {
				return this.copied["silent_1h"]?.uri ?? null
			}
		}
	}
}

export const assets = new Assets()

export default assets
