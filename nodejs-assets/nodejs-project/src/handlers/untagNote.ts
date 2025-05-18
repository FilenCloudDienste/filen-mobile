import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Notes from "@filen/sdk/dist/types/notes"

export default async function untagNote(this: NodeWorker, params: Parameters<Notes["untag"]>[0]) {
	return await sdk.get().notes().untag(params)
}
