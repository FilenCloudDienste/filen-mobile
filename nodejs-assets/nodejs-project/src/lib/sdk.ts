import FilenSDK, { type FilenSDKConfig } from "@filen/sdk"
import { ANONYMOUS_SDK_CONFIG } from "./constants"

let SDK = new FilenSDK(ANONYMOUS_SDK_CONFIG)

export function get(): FilenSDK {
	return SDK
}

export function init(config: FilenSDKConfig): void {
	SDK.init({
		...config,
		connectToSocket: false,
		metadataCache: true
	})
}

export function reinit(config?: FilenSDKConfig): void {
	SDK = new FilenSDK(
		config
			? {
					...config,
					connectToSocket: false,
					metadataCache: true
			  }
			: {
					...ANONYMOUS_SDK_CONFIG,
					connectToSocket: false,
					metadataCache: true
			  }
	)
}

export const sdk = {
	get,
	init,
	reinit,
	ANONYMOUS_SDK_CONFIG
}

export default sdk
