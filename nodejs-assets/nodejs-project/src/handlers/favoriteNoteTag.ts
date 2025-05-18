import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Notes from "@filen/sdk/dist/types/notes"

export default async function favoriteNoteTag(this: NodeWorker, params: Parameters<Notes["tagFavorite"]>[0]) {
	return await sdk.get().notes().tagFavorite(params)
}
