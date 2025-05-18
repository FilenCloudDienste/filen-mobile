import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Notes from "@filen/sdk/dist/types/notes"

export default async function changeNoteType(this: NodeWorker, params: Parameters<Notes["changeType"]>[0]) {
	return await sdk.get().notes().changeType(params)
}
