import * as FileSystem from "expo-file-system/next"
import paths from "./paths"
import { SILENT_AUDIO_BASE64 } from "@/assets/base64/silentAudio"
import { AUDIO_FALLBACK_IMAGE_BASE64 } from "@/assets/base64/audioFallbackImage"

export class Assets {
	private readonly silentAudioFile: FileSystem.File
	private readonly audioFallbackImageFile: FileSystem.File

	public constructor() {
		this.silentAudioFile = new FileSystem.File(FileSystem.Paths.join(paths.assets(), "silentAudio.mp3"))
		this.audioFallbackImageFile = new FileSystem.File(FileSystem.Paths.join(paths.assets(), "audioFallbackImage.png"))
	}

	public async initialize(): Promise<void> {
		if (!this.silentAudioFile.exists) {
			this.silentAudioFile.write(new Uint8Array(Buffer.from(SILENT_AUDIO_BASE64, "base64")))
		}

		if (!this.audioFallbackImageFile.exists) {
			this.audioFallbackImageFile.write(new Uint8Array(Buffer.from(AUDIO_FALLBACK_IMAGE_BASE64, "base64")))
		}

		console.log("Assets initialized.")
	}

	public uri = {
		audio: {
			silent: () => (this.silentAudioFile.exists ? this.silentAudioFile.uri : null)
		},
		images: {
			audio_fallback: () => (this.audioFallbackImageFile.exists ? this.audioFallbackImageFile.uri : null)
		}
	}
}

export const assets = new Assets()

export default assets
