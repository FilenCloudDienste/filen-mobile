import sdk from "../lib/sdk"
import type NodeWorker from ".."

export default async function fetchNotes(this: NodeWorker) {
	return await sdk.get().notes().all()
}
