import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Cloud from "@filen/sdk/dist/types/cloud"

export default async function getDirectory(this: NodeWorker, params: Parameters<Cloud["getDirectory"]>[0]) {
	return await sdk.get().cloud().getDirectory(params)
}
