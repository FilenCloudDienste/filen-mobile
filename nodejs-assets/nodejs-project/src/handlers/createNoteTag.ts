import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Notes from "@filen/sdk/dist/types/notes"

export default async function createNoteTag(this: NodeWorker, params: Parameters<Notes["createTag"]>[0]) {
	return await sdk.get().notes().createTag(params)
}
