import sdk from "../lib/sdk"
import type NodeWorker from ".."
import Decrypt from "@filen/sdk/dist/types/crypto/decrypt"

export default async function decryptDirectoryPublicLinkKey(this: NodeWorker, params: Parameters<Decrypt["folderLinkKey"]>[0]) {
	return await sdk.get().crypto().decrypt().folderLinkKey(params)
}
