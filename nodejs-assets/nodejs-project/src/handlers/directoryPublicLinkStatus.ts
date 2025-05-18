import sdk from "../lib/sdk"
import type NodeWorker from ".."

export default async function directoryPublicLinkStatus(
	this: NodeWorker,
	params: {
		uuid: string
	}
) {
	return await sdk.get().cloud().publicLinkStatus({
		type: "directory",
		uuid: params.uuid
	})
}
