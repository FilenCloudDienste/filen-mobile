import sdk from "../lib/sdk"
import type NodeWorker from ".."

export default async function filePublicLinkStatus(
	this: NodeWorker,
	params: {
		uuid: string
	}
) {
	return await sdk.get().cloud().publicLinkStatus({
		type: "file",
		uuid: params.uuid
	})
}
