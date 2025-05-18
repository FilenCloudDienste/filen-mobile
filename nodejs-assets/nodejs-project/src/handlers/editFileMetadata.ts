import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Cloud from "@filen/sdk/dist/types/cloud"

export default async function editFileMetadata(this: NodeWorker, params: Parameters<Cloud["editFileMetadata"]>[0]) {
	return sdk.get().cloud().editFileMetadata(params)
}
