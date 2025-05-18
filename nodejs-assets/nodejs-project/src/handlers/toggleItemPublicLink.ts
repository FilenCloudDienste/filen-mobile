import sdk from "../lib/sdk"
import type NodeWorker from ".."

export default async function toggleItemPublicLink(
	this: NodeWorker,
	params: {
		item: {
			type: "directory" | "file"
			uuid: string
		}
		enable: boolean
		linkUUID: string
	}
) {
	switch (params.item.type) {
		case "directory": {
			switch (params.enable) {
				case true: {
					return await sdk
						.get()
						.cloud()
						.enablePublicLink({
							type: "directory",
							uuid: params.item.uuid,
							onProgress: (linked, total) => {
								this.bridge.channel.send({
									type: "toggleItemPublicLinkProgress",
									data: {
										linked,
										total
									}
								})
							}
						})
				}

				case false: {
					await sdk.get().cloud().disablePublicLink({
						type: "directory",
						itemUUID: params.item.uuid
					})

					return ""
				}
			}
		}

		case "file": {
			switch (params.enable) {
				case true: {
					return await sdk
						.get()
						.cloud()
						.enablePublicLink({
							type: "file",
							uuid: params.item.uuid,
							onProgress: (linked, total) => {
								this.bridge.channel.send({
									type: "toggleItemPublicLinkProgress",
									data: {
										linked,
										total
									}
								})
							}
						})
				}

				case false: {
					await sdk.get().cloud().disablePublicLink({
						type: "file",
						itemUUID: params.item.uuid,
						linkUUID: params.linkUUID
					})

					return ""
				}
			}
		}
	}
}
