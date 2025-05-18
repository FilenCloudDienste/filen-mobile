import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Notes from "@filen/sdk/dist/types/notes"

export default async function renameNoteTag(this: NodeWorker, params: Parameters<Notes["renameTag"]>[0]) {
	return await sdk.get().notes().renameTag(params)
}
