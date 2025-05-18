import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Cloud from "@filen/sdk/dist/types/cloud"

export default async function trashFile(this: NodeWorker, params: Parameters<Cloud["trashFile"]>[0]) {
	return sdk.get().cloud().trashFile(params)
}
