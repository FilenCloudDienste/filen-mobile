import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Cloud from "@filen/sdk/dist/types/cloud"

export default async function moveFile(this: NodeWorker, params: Parameters<Cloud["moveFile"]>[0]) {
	return sdk.get().cloud().moveFile(params)
}
