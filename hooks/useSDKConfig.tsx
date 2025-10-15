import { mmkvInstance } from "@/lib/mmkv"
import { useMMKVString } from "react-native-mmkv"
import { SDK_CONFIG_STORAGE_KEY, ANONYMOUS_SDK_CONFIG } from "@/lib/constants"
import { useMemo } from "react"
import type { FilenSDKConfig } from "@filen/sdk"

export type UseSDKConfig = [
	Required<FilenSDKConfig>,
	(value: string | ((current: string | undefined) => string | undefined) | undefined) => void
]

export default function useSDKConfig(): UseSDKConfig {
	const [sdkConfig, setSDKConfig] = useMMKVString(SDK_CONFIG_STORAGE_KEY, mmkvInstance)

	const sdkConfigParsed = useMemo(() => {
		if (!sdkConfig) {
			return ANONYMOUS_SDK_CONFIG
		}

		try {
			return JSON.parse(sdkConfig) as Required<FilenSDKConfig>
		} catch {
			return ANONYMOUS_SDK_CONFIG
		}
	}, [sdkConfig])

	return [sdkConfigParsed as Required<FilenSDKConfig>, setSDKConfig]
}
