import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Cloud from "@filen/sdk/dist/types/cloud"

export default async function deleteDirectory(this: NodeWorker, params: Parameters<Cloud["deleteDirectory"]>[0]) {
	return sdk.get().cloud().deleteDirectory(params)
}
