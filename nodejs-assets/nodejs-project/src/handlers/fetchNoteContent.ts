import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Notes from "@filen/sdk/dist/types/notes"

export default async function fetchNoteContent(this: NodeWorker, params: Parameters<Notes["content"]>[0]) {
	return await sdk.get().notes().content(params)
}
