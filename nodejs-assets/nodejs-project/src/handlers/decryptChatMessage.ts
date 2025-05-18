import sdk from "../lib/sdk"
import type NodeWorker from ".."

export default async function decryptChatMessage(
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
