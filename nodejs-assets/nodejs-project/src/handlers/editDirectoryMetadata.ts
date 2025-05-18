import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Cloud from "@filen/sdk/dist/types/cloud"

export default async function editDirectoryMetadata(this: NodeWorker, params: Parameters<Cloud["editDirectoryMetadata"]>[0]) {
	return sdk.get().cloud().editDirectoryMetadata(params)
}
