import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Notes from "@filen/sdk/dist/types/notes"

export default async function duplicateNote(this: NodeWorker, params: Parameters<Notes["duplicate"]>[0]) {
	return await sdk.get().notes().duplicate(params)
}
