import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Cloud from "@filen/sdk/dist/types/cloud"

export default async function restoreDirectory(this: NodeWorker, params: Parameters<Cloud["restoreDirectory"]>[0]) {
	return sdk.get().cloud().restoreDirectory(params)
}
