import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Cloud from "@filen/sdk/dist/types/cloud"

export default async function editItemPublicLink(this: NodeWorker, params: Parameters<Cloud["editPublicLink"]>[0]) {
	return await sdk.get().cloud().editPublicLink(params)
}
