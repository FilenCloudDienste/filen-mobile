import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Cloud from "@filen/sdk/dist/types/cloud"

export default async function favoriteDirectory(this: NodeWorker, params: Parameters<Cloud["favoriteDirectory"]>[0]) {
	return await sdk.get().cloud().favoriteDirectory(params)
}
