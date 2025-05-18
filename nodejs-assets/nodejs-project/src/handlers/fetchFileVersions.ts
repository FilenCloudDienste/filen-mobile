import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Cloud from "@filen/sdk/dist/types/cloud"

export default async function fetchFileVersions(this: NodeWorker, params: Parameters<Cloud["fileVersions"]>[0]) {
	return await sdk.get().cloud().fileVersions(params)
}
