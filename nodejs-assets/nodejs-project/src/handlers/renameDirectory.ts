import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Cloud from "@filen/sdk/dist/types/cloud"

export default async function renameDirectory(this: NodeWorker, params: Parameters<Cloud["renameDirectory"]>[0]) {
	return sdk.get().cloud().renameDirectory(params)
}
