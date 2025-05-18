import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Cloud from "@filen/sdk/dist/types/cloud"

export default async function stopSharingItem(this: NodeWorker, params: Parameters<Cloud["stopSharingItem"]>[0]) {
	return await sdk.get().cloud().stopSharingItem(params)
}
