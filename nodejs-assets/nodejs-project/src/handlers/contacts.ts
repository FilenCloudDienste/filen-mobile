import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type Contacts from "@filen/sdk/dist/types/contacts"

export async function fetchIncomingContactRequests(this: NodeWorker) {
	return await sdk.get().contacts().incomingRequests()
}

export async function acceptContactRequest(this: NodeWorker, params: Parameters<Contacts["acceptRequest"]>[0]) {
	return await sdk.get().contacts().acceptRequest(params)
}

export async function denyContactRequest(this: NodeWorker, params: Parameters<Contacts["denyRequest"]>[0]) {
	return await sdk.get().contacts().denyRequest(params)
}

export async function blockContact(this: NodeWorker, params: Parameters<Contacts["block"]>[0]) {
	return await sdk.get().contacts().block(params)
}

export async function unblockContact(this: NodeWorker, params: Parameters<Contacts["unblock"]>[0]) {
	return await sdk.get().contacts().unblock(params)
}

export async function sendContactRequest(this: NodeWorker, params: Parameters<Contacts["sendRequest"]>[0]) {
	return await sdk.get().contacts().sendRequest(params)
}

export async function removeContact(this: NodeWorker, params: Parameters<Contacts["remove"]>[0]) {
	return await sdk.get().contacts().remove(params)
}

export async function fetchOutgoingContactRequests(this: NodeWorker) {
	return await sdk.get().contacts().outgoingRequests()
}

export async function deleteOutgoingContactRequest(this: NodeWorker, params: Parameters<Contacts["deleteOutgoingRequest"]>[0]) {
	return await sdk.get().contacts().deleteOutgoingRequest(params)
}

export async function fetchContacts(params: { type: "all" | "blocked" }) {
	switch (params.type) {
		case "blocked": {
			return (await sdk.get().contacts().blocked()).map(blockedContact => ({
				...blockedContact,
				lastActive: 0
			}))
		}

		default: {
			return await sdk.get().contacts().all()
		}
	}
}
