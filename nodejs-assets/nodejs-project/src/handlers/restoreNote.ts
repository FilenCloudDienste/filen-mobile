import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Notes from "@filen/sdk/dist/types/notes"

export default async function restoreNote(this: NodeWorker, params: Parameters<Notes["restore"]>[0]) {
	return await sdk.get().notes().restore(params)
}
