import sdk from "../lib/sdk"
import type NodeWorker from ".."
import Decrypt from "@filen/sdk/dist/types/crypto/decrypt"

export async function decryptChatMessage(
	this: NodeWorker,
	params: {
		conversation: string
		message: string
	}
) {
	const key = await sdk.get().chats().chatKey({
		conversation: params.conversation
	})

	return await sdk.get().crypto().decrypt().chatMessage({
		message: params.message,
		key
	})
}

export async function decryptDirectoryPublicLinkKey(this: NodeWorker, params: Parameters<Decrypt["folderLinkKey"]>[0]) {
	return await sdk.get().crypto().decrypt().folderLinkKey(params)
}
