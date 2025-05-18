import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Cloud from "@filen/sdk/dist/types/cloud"

export default async function directoryUUIDToPath(this: NodeWorker, params: Parameters<Cloud["directoryUUIDToPath"]>[0]) {
	return sdk.get().cloud().directoryUUIDToPath(params)
}
