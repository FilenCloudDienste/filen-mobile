import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Notes from "@filen/sdk/dist/types/notes"

export default async function deleteNoteTag(this: NodeWorker, params: Parameters<Notes["deleteTag"]>[0]) {
	return await sdk.get().notes().deleteTag(params)
}
