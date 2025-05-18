import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Cloud from "@filen/sdk/dist/types/cloud"

export default async function renameFile(this: NodeWorker, params: Parameters<Cloud["renameFile"]>[0]) {
	return sdk.get().cloud().renameFile(params)
}
