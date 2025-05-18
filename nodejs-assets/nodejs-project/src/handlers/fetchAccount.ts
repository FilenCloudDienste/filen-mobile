import sdk from "../lib/sdk"
import type NodeWorker from ".."

export default async function fetchAccount(this: NodeWorker) {
	const [account, settings] = await Promise.all([sdk.get().user().account(), sdk.get().user().settings()])

	return {
		account,
		settings
	}
}
