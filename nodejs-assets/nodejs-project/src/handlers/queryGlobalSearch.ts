import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Cloud from "@filen/sdk/dist/types/cloud"

export default async function queryGlobalSearch(this: NodeWorker, params: Parameters<Cloud["queryGlobalSearch"]>[0]) {
	const items = await sdk.get().cloud().queryGlobalSearch(params)

	return Array.from(new Map(items.map(item => [item.uuid, item])).values())
}
