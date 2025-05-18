import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Notes from "@filen/sdk/dist/types/notes"

export default async function favoriteNote(this: NodeWorker, params: Parameters<Notes["favorite"]>[0]) {
	return await sdk.get().notes().favorite(params)
}
