import sdk from "../lib/sdk"

export default async function fetchCloudItems(params: FetchCloudItemsParams): Promise<DriveCloudItem[]> {
	let items: DriveCloudItem[] = []

	if (params.of === "none") {
		return []
	} else if (params.of === "drive") {
		if (!params.parent || params.parent.length <= 1) {
			throw new Error("No parent specified.")
		}

		items = (
			await sdk.get().cloud().listDirectory({
				uuid: params.parent
			})
		).map(item => ({
			...item,
			isShared: false,
			selected: false
		}))
	} else if (params.of === "favorites") {
		items = (await sdk.get().cloud().listFavorites()).map(item => ({
			...item,
			isShared: false,
			selected: false
		}))
	} else if (params.of === "recents") {
		items = (await sdk.get().cloud().listRecents()).map(item => ({
			...item,
			isShared: false,
			selected: false
		}))
	} else if (params.of === "sharedIn") {
		if (!params.parent || params.parent.length <= 1) {
			throw new Error("No parent specified.")
		}

		items = (
			await sdk.get().cloud().listDirectorySharedIn({
				uuid: params.parent
			})
		).map(item => ({
			...item,
			isShared: true,
			selected: false,
			favorited: false
		}))
	} else if (params.of === "sharedOut") {
		if (!params.parent || params.parent.length <= 1) {
			throw new Error("No parent specified.")
		}

		items = (
			await sdk.get().cloud().listDirectorySharedOut({
				uuid: params.parent,
				receiverId: params.receiverId
			})
		).map(item => ({
			...item,
			isShared: true,
			selected: false,
			favorited: false
		}))
	} else if (params.of === "trash") {
		items = (await sdk.get().cloud().listTrash()).map(item => ({
			...item,
			isShared: false,
			selected: false
		}))
	} else if (params.of === "links") {
		items = (await sdk.get().cloud().listPublicLinks()).map(item => ({
			...item,
			isShared: false,
			selected: false
		}))
	} else if (params.of === "photos") {
		const tree = await sdk.get().cloud().getDirectoryTree({
			uuid: params.parent,
			type: "normal"
		})

		for (const path in tree) {
			const item = tree[path]

			if (!item || item.type === "directory") {
				continue
			}

			items.push({
				name: item.name,
				selected: false,
				key: item.key,
				lastModified: item.lastModified,
				favorited: item.favorited,
				size: item.size,
				mime: item.mime,
				creation: item.creation,
				chunks: item.chunks,
				bucket: item.bucket,
				hash: item.hash,
				timestamp: item.timestamp,
				type: "file",
				uuid: item.uuid,
				parent: item.parent,
				path,
				isShared: false,
				rm: "",
				version: item.version,
				region: item.region
			} satisfies DriveCloudItem)
		}
	}

	return Array.from(new Map(items.map(item => [item.uuid, item])).values())
}
