import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Cloud from "@filen/sdk/dist/types/cloud"

export default async function fileExists(this: NodeWorker, params: Parameters<Cloud["fileExists"]>[0]) {
	return await sdk.get().cloud().fileExists(params)
}
