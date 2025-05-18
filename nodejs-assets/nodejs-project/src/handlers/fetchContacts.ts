import sdk from "../lib/sdk"

export default async function fetchContacts(params: { type: "all" | "blocked" }) {
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
