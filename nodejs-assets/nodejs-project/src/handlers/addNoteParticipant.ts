import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Notes from "@filen/sdk/dist/types/notes"

export default async function addNoteParticipant(this: NodeWorker, params: Parameters<Notes["addParticipant"]>[0]) {
	return await sdk.get().notes().addParticipant(params)
}
