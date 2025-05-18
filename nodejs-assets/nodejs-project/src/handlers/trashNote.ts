import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Notes from "@filen/sdk/dist/types/notes"

export default async function trashNote(this: NodeWorker, params: Parameters<Notes["trash"]>[0]) {
	return await sdk.get().notes().trash(params)
}
