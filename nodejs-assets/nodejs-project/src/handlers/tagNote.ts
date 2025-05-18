import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Notes from "@filen/sdk/dist/types/notes"

export default async function tagNote(this: NodeWorker, params: Parameters<Notes["tag"]>[0]) {
	return await sdk.get().notes().tag(params)
}
