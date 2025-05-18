import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type User from "@filen/sdk/dist/types/user"

export default async function fetchUserPublicKey(this: NodeWorker, params: Parameters<User["publicKey"]>[0]) {
	return await sdk.get().user().publicKey(params)
}
