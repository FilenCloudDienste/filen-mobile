import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Cloud from "@filen/sdk/dist/types/cloud"

export default async function changeDirectoryColor(this: NodeWorker, params: Parameters<Cloud["changeDirectoryColor"]>[0]) {
	return await sdk.get().cloud().changeDirectoryColor(params)
}
