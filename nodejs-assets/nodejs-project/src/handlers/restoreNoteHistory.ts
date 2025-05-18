import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Notes from "@filen/sdk/dist/types/notes"

export default async function restoreNoteHistory(this: NodeWorker, params: Parameters<Notes["restoreHistory"]>[0]) {
	return await sdk.get().notes().restoreHistory(params)
}
