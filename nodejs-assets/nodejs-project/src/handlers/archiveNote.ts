import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Notes from "@filen/sdk/dist/types/notes"

export default async function archiveNote(this: NodeWorker, params: Parameters<Notes["archive"]>[0]) {
	return await sdk.get().notes().archive({
		uuid: params.uuid
	})
}
