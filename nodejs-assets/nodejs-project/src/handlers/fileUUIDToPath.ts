import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Cloud from "@filen/sdk/dist/types/cloud"

export default async function fileUUIDToPath(this: NodeWorker, params: Parameters<Cloud["fileUUIDToPath"]>[0]) {
	return sdk.get().cloud().fileUUIDToPath(params)
}
