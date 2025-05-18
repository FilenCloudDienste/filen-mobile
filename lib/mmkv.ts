import { MMKV, Mode } from "react-native-mmkv"
import { MMKV_VERSION } from "./constants"

export const mmkvInstance = new MMKV({
	id: `iofilenapp_mmkv_v${MMKV_VERSION}`,
	mode: Mode.MULTI_PROCESS
})

export default mmkvInstance
