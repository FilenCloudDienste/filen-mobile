import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Cloud from "@filen/sdk/dist/types/cloud"

export default async function createDirectory(this: NodeWorker, params: Parameters<Cloud["createDirectory"]>[0]) {
	return await sdk.get().cloud().createDirectory(params)
}
