import * as FileSystem from "expo-file-system"
import paths from "./paths"
import { SILENT_AUDIO_BASE64 } from "@/assets/base64/silentAudio"
import { AUDIO_FALLBACK_IMAGE_BASE64 } from "@/assets/base64/audioFallbackImage"
import { AVATAR_FALLBACK_IMAGE_BASE64 } from "@/assets/base64/avatarFallbackImage"
import pathModule from "path"

export class Assets {
	private readonly silentAudioFile: FileSystem.File
	private readonly audioFallbackImageFile: FileSystem.File
	private readonly avatarFallbackImageFile: FileSystem.File

	public constructor() {
		this.silentAudioFile = new FileSystem.File(pathModule.posix.join(paths.assets(), "silentAudio.mp3"))
		this.audioFallbackImageFile = new FileSystem.File(pathModule.posix.join(paths.assets(), "audioFallbackImage.png"))
		this.avatarFallbackImageFile = new FileSystem.File(pathModule.posix.join(paths.assets(), "avatarFallbackImage.png"))
	}

	public async initialize(): Promise<void> {
		if (!this.silentAudioFile.exists) {
			this.silentAudioFile.write(SILENT_AUDIO_BASE64, {
				encoding: "base64"
			})
		}

		if (!this.audioFallbackImageFile.exists) {
			this.audioFallbackImageFile.write(AUDIO_FALLBACK_IMAGE_BASE64, {
				encoding: "base64"
			})
		}

		if (!this.avatarFallbackImageFile.exists) {
			this.avatarFallbackImageFile.write(AVATAR_FALLBACK_IMAGE_BASE64, {
				encoding: "base64"
			})
		}

		console.log("Assets initialized.")
	}

	public uri = {
		audio: {
			silent: () => (this.silentAudioFile.exists ? this.silentAudioFile.uri : "")
		},
		images: {
			audio_fallback: () => (this.audioFallbackImageFile.exists ? this.audioFallbackImageFile.uri : ""),
			avatar_fallback: () => (this.avatarFallbackImageFile.exists ? this.avatarFallbackImageFile.uri : "")
		}
	}

	public blurhash = {
		images: {
			fallback: "LJOp*|of~qof%MfQWBfQ-;fQIUfQ"
		}
	}
}

export const assets = new Assets()

export default assets
