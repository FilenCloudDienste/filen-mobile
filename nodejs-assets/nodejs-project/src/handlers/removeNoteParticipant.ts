import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Notes from "@filen/sdk/dist/types/notes"

export default async function removeNoteParticipant(this: NodeWorker, params: Parameters<Notes["removeParticipant"]>[0]) {
	return await sdk.get().notes().removeParticipant(params)
}
