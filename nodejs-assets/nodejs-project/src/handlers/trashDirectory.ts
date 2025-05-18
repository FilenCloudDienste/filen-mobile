import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Cloud from "@filen/sdk/dist/types/cloud"

export default async function trashDirectory(this: NodeWorker, params: Parameters<Cloud["trashDirectory"]>[0]) {
	return sdk.get().cloud().trashDirectory(params)
}
