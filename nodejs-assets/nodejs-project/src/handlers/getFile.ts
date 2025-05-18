import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Cloud from "@filen/sdk/dist/types/cloud"

export default async function getFile(this: NodeWorker, params: Parameters<Cloud["getFile"]>[0]) {
	return await sdk.get().cloud().getFile(params)
}
