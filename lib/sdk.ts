import FilenSDK, { type FilenSDKConfig } from "@filen/sdk"
import { ANONYMOUS_SDK_CONFIG } from "./constants"

export let sdk = new FilenSDK(ANONYMOUS_SDK_CONFIG)

export function getSDK(): FilenSDK {
	return sdk
}

export function initSDK(config: FilenSDKConfig): void {
	sdk.init(config)
}

export function reinitSDK(config?: FilenSDKConfig): void {
	sdk = new FilenSDK(config ? config : ANONYMOUS_SDK_CONFIG)
}

export default sdk
