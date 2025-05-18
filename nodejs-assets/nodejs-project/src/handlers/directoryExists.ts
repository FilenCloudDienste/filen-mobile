import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Cloud from "@filen/sdk/dist/types/cloud"

export default async function directoryExists(this: NodeWorker, params: Parameters<Cloud["directoryExists"]>[0]) {
	return await sdk.get().cloud().directoryExists(params)
}
