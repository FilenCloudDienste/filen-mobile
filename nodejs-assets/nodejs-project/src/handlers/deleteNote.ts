import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Notes from "@filen/sdk/dist/types/notes"

export default async function deleteNote(this: NodeWorker, params: Parameters<Notes["delete"]>[0]) {
	return await sdk.get().notes().delete(params)
}
