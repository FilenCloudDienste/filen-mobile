import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Notes from "@filen/sdk/dist/types/notes"

export default async function fetchNoteHistory(this: NodeWorker, params: Parameters<Notes["history"]>[0]) {
	return await sdk.get().notes().history(params)
}
