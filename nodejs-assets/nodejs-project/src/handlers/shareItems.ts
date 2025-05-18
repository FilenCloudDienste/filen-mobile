import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Cloud from "@filen/sdk/dist/types/cloud"

export default async function shareItems(this: NodeWorker, params: Parameters<Cloud["shareItemsToUser"]>[0]) {
	return await sdk
		.get()
		.cloud()
		.shareItemsToUser({
			...params,
			onProgress: (shared, total) => {
				this.bridge.channel.send({
					type: "shareItemsProgress",
					data: {
						shared,
						total
					}
				})
			}
		})
}
