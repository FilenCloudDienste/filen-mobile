import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Notes from "@filen/sdk/dist/types/notes"

export default async function changeNoteParticipantPermissions(this: NodeWorker, params: Parameters<Notes["participantPermissions"]>[0]) {
	return await sdk.get().notes().participantPermissions(params)
}
