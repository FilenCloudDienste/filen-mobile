import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Notes from "@filen/sdk/dist/types/notes"

export default async function renameNote(this: NodeWorker, params: Parameters<Notes["editTitle"]>[0]) {
	return await sdk.get().notes().editTitle(params)
}
