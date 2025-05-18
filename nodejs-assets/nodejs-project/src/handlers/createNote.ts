import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Notes from "@filen/sdk/dist/types/notes"

export default async function createNote(this: NodeWorker, params: Parameters<Notes["create"]>[0]) {
	return await sdk.get().notes().create(params)
}
