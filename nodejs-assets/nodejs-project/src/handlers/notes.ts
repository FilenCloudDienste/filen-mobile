import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Notes from "@filen/sdk/dist/types/notes"

export async function fetchNoteContent(this: NodeWorker, params: Parameters<Notes["content"]>[0]) {
	return await sdk.get().notes().content(params)
}

export async function fetchNoteHistory(this: NodeWorker, params: Parameters<Notes["history"]>[0]) {
	return await sdk.get().notes().history(params)
}

export async function fetchNotes(this: NodeWorker) {
	return await sdk.get().notes().all()
}

export async function fetchNotesTags(this: NodeWorker) {
	return await sdk.get().notes().tags()
}

export async function favoriteNote(this: NodeWorker, params: Parameters<Notes["favorite"]>[0]) {
	return await sdk.get().notes().favorite(params)
}

export async function favoriteNoteTag(this: NodeWorker, params: Parameters<Notes["tagFavorite"]>[0]) {
	return await sdk.get().notes().tagFavorite(params)
}

export async function editNote(this: NodeWorker, params: Parameters<Notes["edit"]>[0]) {
	return await sdk.get().notes().edit(params)
}

export async function duplicateNote(this: NodeWorker, params: Parameters<Notes["duplicate"]>[0]) {
	return await sdk.get().notes().duplicate(params)
}

export async function deleteNote(this: NodeWorker, params: Parameters<Notes["delete"]>[0]) {
	return await sdk.get().notes().delete(params)
}

export async function createNoteTag(this: NodeWorker, params: Parameters<Notes["createTag"]>[0]) {
	return await sdk.get().notes().createTag(params)
}

export async function deleteNoteTag(this: NodeWorker, params: Parameters<Notes["deleteTag"]>[0]) {
	return await sdk.get().notes().deleteTag(params)
}

export async function changeNoteType(this: NodeWorker, params: Parameters<Notes["changeType"]>[0]) {
	return await sdk.get().notes().changeType(params)
}

export async function pinNote(this: NodeWorker, params: Parameters<Notes["pin"]>[0]) {
	return await sdk.get().notes().pin(params)
}

export async function createNote(this: NodeWorker, params: Parameters<Notes["create"]>[0]) {
	return await sdk.get().notes().create(params)
}

export async function archiveNote(this: NodeWorker, params: Parameters<Notes["archive"]>[0]) {
	return await sdk.get().notes().archive({
		uuid: params.uuid
	})
}

export async function addNoteParticipant(this: NodeWorker, params: Parameters<Notes["addParticipant"]>[0]) {
	return await sdk.get().notes().addParticipant(params)
}

export async function changeNoteParticipantPermissions(this: NodeWorker, params: Parameters<Notes["participantPermissions"]>[0]) {
	return await sdk.get().notes().participantPermissions(params)
}

export async function removeNoteParticipant(this: NodeWorker, params: Parameters<Notes["removeParticipant"]>[0]) {
	return await sdk.get().notes().removeParticipant(params)
}

export async function renameNote(this: NodeWorker, params: Parameters<Notes["editTitle"]>[0]) {
	return await sdk.get().notes().editTitle(params)
}

export async function renameNoteTag(this: NodeWorker, params: Parameters<Notes["renameTag"]>[0]) {
	return await sdk.get().notes().renameTag(params)
}

export async function restoreNote(this: NodeWorker, params: Parameters<Notes["restore"]>[0]) {
	return await sdk.get().notes().restore(params)
}

export async function restoreNoteHistory(this: NodeWorker, params: Parameters<Notes["restoreHistory"]>[0]) {
	return await sdk.get().notes().restoreHistory(params)
}

export async function tagNote(this: NodeWorker, params: Parameters<Notes["tag"]>[0]) {
	return await sdk.get().notes().tag(params)
}

export async function trashNote(this: NodeWorker, params: Parameters<Notes["trash"]>[0]) {
	return await sdk.get().notes().trash(params)
}

export async function untagNote(this: NodeWorker, params: Parameters<Notes["untag"]>[0]) {
	return await sdk.get().notes().untag(params)
}
