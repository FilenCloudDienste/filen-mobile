import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Notes from "@filen/sdk/dist/types/notes"

export default async function pinNote(this: NodeWorker, params: Parameters<Notes["pin"]>[0]) {
	return await sdk.get().notes().pin(params)
}
