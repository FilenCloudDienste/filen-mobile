import paths from "./paths"
import * as FileSystem from "expo-file-system/next"
import { Asset } from "expo-asset"

export class Assets {
	public async copy(): Promise<void> {
		const assets = [require("../assets/audio/silent_1h.mp3"), require("../assets/images/audio_fallback.png")]

		await Promise.all(
			assets.map(async asset => {
				const assetPath = Asset.fromModule(asset)
				const destination = new FileSystem.File(FileSystem.Paths.join(paths.assets(), `${assetPath.name}.${assetPath.type}`))

				if (destination.exists) {
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
			})
		)

		console.log("Assets copied.")
	}

	public uri = {
		audio: {
			silent_1h: () => {
				const file = new FileSystem.File(FileSystem.Paths.join(paths.assets(), "silent_1h.mp3"))

				return file.exists ? file.uri : null
			}
		},
		images: {
			audio_fallback: () => {
				const file = new FileSystem.File(FileSystem.Paths.join(paths.assets(), "audio_fallback.png"))

				return file.exists ? file.uri : null
			}
		}
	}
}

export const assets = new Assets()

export default assets
