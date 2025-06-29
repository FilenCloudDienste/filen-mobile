type SerializedError = {
	name: string
	message: string
	stack?: string
	stringified: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never

type Prettify<T> = {
	[K in keyof T]: T[K]
} & {}

type DriveCloudItem = Prettify<
	| ({
			selected: boolean
			thumbnail?: string
			favorited: boolean
			path?: string
	  } & ({
			isShared: true
	  } & import("@filen/sdk").CloudItemShared))
	| ({
			selected: boolean
			thumbnail?: string
			favorited: boolean
			path?: string
	  } & ({
			isShared: false
	  } & import("@filen/sdk").CloudItem))
>

type FetchCloudItemsParams = {
	of: "drive" | "favorites" | "recents" | "sharedIn" | "sharedOut" | "trash" | "links" | "photos" | "none" | "offline"
	parent: string
	receiverId: number
}

type FetchDirectorySizeResult = {
	size: number
	folders: number
	files: number
}

type TransferState = "started" | "queued" | "finished" | "error" | "stopped" | "paused"

type Transfer = {
	id: string
	type: "upload" | "download"
	itemType: "file" | "directory"
	uuid: string
	state: TransferState
	bytes: number
	name: string
	size: number
	startedTimestamp: number
	finishedTimestamp: number
	queuedTimestamp: number
	errorTimestamp: number
	progressTimestamp: number
}

type TransfersStore = {
	transfers: Transfer[]
	finishedTransfers: Transfer[]
	setTransfers: (fn: Transfer[] | ((prev: Transfer[]) => Transfer[])) => void
	setFinishedTransfers: (fn: Transfer[] | ((prev: Transfer[]) => Transfer[])) => void
}

type NodeBridgeTransfersData = {
	transfers: Transfer[]
	finishedTransfers: Transfer[]
	speed: number
	remaining: number
	progress: number
}

type NodeBridgeResponseError = {
	success: false
	error: SerializedError
}

type NodeBridgeResponseSuccess = {
	success: true
}

type NodeBridgeMessage =
	| {
			type: "response"
			id: string
			data: { function: string } & (
				| {
						success: false
						error: SerializedError
				  }
				| {
						success: true
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						result: any
				  }
			)
	  }
	| {
			type: "request"
			id: string
			data: {
				function: string
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				params: any
			}
	  }
	| {
			type: "ready"
			data:
				| {
						success: false
						error: SerializedError
				  }
				| {
						success: true
						httpPort: number
						httpAuthToken: string
				  }
	  }
	| {
			type: "socketEvent"
			event: import("@filen/sdk").SocketEvent
	  }
	| {
			type: "transfers"
			data: NodeBridgeTransfersData
	  }
	| {
			type: "shareItemsProgress"
			data: {
				shared: number
				total: number
			}
	  }
	| {
			type: "toggleItemPublicLinkProgress"
			data: {
				linked: number
				total: number
			}
	  }
	| {
			type: "httpServer"
			data: {
				port: number
				authToken: string
			}
	  }
	| {
			type: "debug"
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			data: any
	  }

declare type NodeBridge = {
	channel: {
		on: (channel: "message", message: (message: NodeBridgeMessage) => void) => void
		send: (message: NodeBridgeMessage) => void
	}
	app: {
		on: (event: "pause" | "resume", fn: (pauseLock?: { release?: () => void }) => void) => void
		datadir: () => string
	}
}

declare type NodeClientChannel = {
	addListener: (channel: "message", message: (message: NodeBridgeMessage) => void) => void
	send: (message: NodeBridgeMessage) => void
}
