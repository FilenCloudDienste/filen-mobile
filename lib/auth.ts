import mmkvInstance from "./mmkv"
import { AUTHED_STORAGE_KEY, SDK_CONFIG_STORAGE_KEY, ANONYMOUS_SDK_CONFIG } from "./constants"
import { type FilenSDKConfig } from "@filen/sdk"

export function setIsAuthed(authed: boolean): void {
	mmkvInstance.set(AUTHED_STORAGE_KEY, authed)
}

export function getIsAuthed(): boolean {
	return mmkvInstance.getBoolean(AUTHED_STORAGE_KEY) ?? false
}

export function setSDKConfig(config: Required<FilenSDKConfig>): void {
	mmkvInstance.set(SDK_CONFIG_STORAGE_KEY, JSON.stringify(config))
}

export function getSDKConfig(): Required<FilenSDKConfig> {
	try {
		const config = mmkvInstance.getString(SDK_CONFIG_STORAGE_KEY)

		if (!config) {
			return ANONYMOUS_SDK_CONFIG
		}

		return JSON.parse(config) as Required<FilenSDKConfig>
	} catch {
		return ANONYMOUS_SDK_CONFIG
	}
}

export function logout(): void {
	mmkvInstance.delete(SDK_CONFIG_STORAGE_KEY)
	mmkvInstance.delete(AUTHED_STORAGE_KEY)
}
