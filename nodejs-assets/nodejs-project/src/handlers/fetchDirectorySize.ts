import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Cloud from "@filen/sdk/dist/types/cloud"

export default async function fetchDirectorySize(this: NodeWorker, params: Parameters<Cloud["directorySize"]>[0]) {
	return await sdk.get().cloud().directorySize(params)
}
