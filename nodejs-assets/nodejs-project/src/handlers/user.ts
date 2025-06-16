import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type User from "@filen/sdk/dist/types/user"
import fs from "fs-extra"

export async function updatePersonalInformation(this: NodeWorker, params: Parameters<User["updatePersonalInformation"]>[0]) {
	return await sdk.get().user().updatePersonalInformation(params)
}

export async function deleteAllVersionedFiles(this: NodeWorker) {
	return await sdk.get().user().deleteAllVersionedFiles()
}

export async function deleteEverything(this: NodeWorker) {
	return await sdk.get().user().deleteEverything()
}

export async function updateNickname(this: NodeWorker, params: Parameters<User["updateNickname"]>[0]) {
	return await sdk.get().user().updateNickname(params)
}

export async function fetchGDPR(this: NodeWorker) {
	return await sdk.get().user().gdpr()
}

export async function toggleVersioning(this: NodeWorker, params: Parameters<User["versioning"]>[0]) {
	return await sdk.get().user().versioning(params)
}

export async function toggleLoginAlerts(this: NodeWorker, params: Parameters<User["loginAlerts"]>[0]) {
	return await sdk.get().user().loginAlerts(params)
}

export async function deleteAccount(this: NodeWorker, params: Parameters<User["delete"]>[0]) {
	return await sdk.get().user().delete(params)
}

export async function enableTwoFactorAuthentication(this: NodeWorker, params: Parameters<User["enableTwoFactorAuthentication"]>[0]) {
	return await sdk.get().user().enableTwoFactorAuthentication(params)
}

export async function disableTwoFactorAuthentication(this: NodeWorker, params: Parameters<User["disableTwoFactorAuthentication"]>[0]) {
	return await sdk.get().user().disableTwoFactorAuthentication(params)
}

export async function changeEmail(this: NodeWorker, params: Parameters<User["changeEmail"]>[0]) {
	return await sdk.get().user().changeEmail(params)
}

export async function changePassword(this: NodeWorker, params: Parameters<User["changePassword"]>[0]) {
	return await sdk.get().user().changePassword(params)
}

export async function fetchEvents(this: NodeWorker, params: Parameters<User["events"]>[0]) {
	return await sdk.get().user().events(params)
}

export async function fetchEvent(this: NodeWorker, params: Parameters<User["event"]>[0]) {
	return await sdk.get().user().event(params)
}

export async function uploadAvatar(
	this: NodeWorker,
	params: {
		uri: string
	}
) {
	if (!(await fs.exists(params.uri))) {
		throw new Error("File does not exist.")
	}

	const buffer = await fs.readFile(params.uri)

	return await sdk.get().user().uploadAvatar({
		buffer
	})
}
