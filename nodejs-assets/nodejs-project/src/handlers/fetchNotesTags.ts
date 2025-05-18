import sdk from "../lib/sdk"
import type NodeWorker from ".."

export default async function fetchNotesTags(this: NodeWorker) {
	return await sdk.get().notes().tags()
}
