import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Notes from "@filen/sdk/dist/types/notes"

export default async function editNote(this: NodeWorker, params: Parameters<Notes["edit"]>[0]) {
	return await sdk.get().notes().edit(params)
}
