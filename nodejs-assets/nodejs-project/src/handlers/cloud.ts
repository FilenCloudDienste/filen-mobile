import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Cloud from "@filen/sdk/dist/types/cloud"

export async function filePublicLinkInfo(this: NodeWorker, params: Parameters<Cloud["filePublicLinkInfo"]>[0]) {
	return await sdk.get().cloud().filePublicLinkInfo(params)
}

export async function filePublicLinkHasPassword(this: NodeWorker, params: Parameters<Cloud["filePublicLinkHasPassword"]>[0]) {
	return await sdk.get().cloud().filePublicLinkHasPassword(params)
}

export async function directoryPublicLinkInfo(this: NodeWorker, params: Parameters<Cloud["directoryPublicLinkInfo"]>[0]) {
	return await sdk.get().cloud().directoryPublicLinkInfo(params)
}

export async function directorySizePublicLink(this: NodeWorker, params: Parameters<Cloud["directorySizePublicLink"]>[0]) {
	return await sdk.get().cloud().directorySizePublicLink(params)
}
