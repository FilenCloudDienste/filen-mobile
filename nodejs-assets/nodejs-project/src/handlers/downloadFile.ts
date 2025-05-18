import sdk from "../lib/sdk"
import type NodeWorker from ".."
import { PauseSignal, type FileEncryptionVersion } from "@filen/sdk"
import transfersStore from "../stores/transfers.store"
import { normalizeFilePathForNode } from "../lib/utils"

export default async function downloadFile(
	this: NodeWorker,
	params: {
		id: string
		uuid: string
		bucket: string
		region: string
		chunks: number
		version: FileEncryptionVersion
		key: string
		end?: number
		start?: number
		destination: string
		size: number
		name: string
		dontEmitProgress?: boolean
	}
) {
	if (!this.transfersAbortControllers[params.id]) {
		this.transfersAbortControllers[params.id] = new AbortController()
	}

	if (!this.transfersPauseSignals[params.id]) {
		this.transfersPauseSignals[params.id] = new PauseSignal()
	}

	const { setTransfers, setFinishedTransfers } = transfersStore.getState()

	await sdk
		.get()
		.cloud()
		.downloadFileToLocal({
			uuid: params.uuid,
			bucket: params.bucket,
			region: params.region,
			chunks: params.chunks,
			version: params.version,
			key: params.key,
			end: params.end,
			start: params.start,
			to: normalizeFilePathForNode(params.destination),
			size: params.size,
			abortSignal: this.transfersAbortControllers[params.id]?.signal,
			pauseSignal: this.transfersPauseSignals[params.id],
			onQueued: () => {
				if (params.dontEmitProgress) {
					return
				}

				const now = Date.now()

				setTransfers(prev => [
					...prev,
					{
						id: params.id,
						type: "download",
						itemType: "file",
						uuid: params.uuid,
						state: "queued",
						bytes: 0,
						name: params.name,
						size: 0,
						startedTimestamp: 0,
						queuedTimestamp: now,
						errorTimestamp: 0,
						finishedTimestamp: 0,
						progressTimestamp: 0
					}
				])

				if (this.transfersProgressStarted === -1) {
					this.transfersProgressStarted = now
				} else {
					if (now < this.transfersProgressStarted) {
						this.transfersProgressStarted = now
					}
				}
			},
			onStarted: () => {
				if (params.dontEmitProgress) {
					return
				}

				const now = Date.now()

				setTransfers(prev =>
					prev.map(transfer =>
						transfer.id === params.id
							? {
									...transfer,
									state: "started",
									startedTimestamp: now,
									size: params.size
							  }
							: transfer
					)
				)

				this.transfersAllBytes += params.size
			},
			onProgress: transferred => {
				if (params.dontEmitProgress) {
					return
				}

				const now = Date.now()

				setTransfers(prev =>
					prev.map(transfer =>
						transfer.id === params.id
							? {
									...transfer,
									bytes: transfer.bytes + transferred,
									progressTimestamp: now
							  }
							: transfer
					)
				)

				this.transfersBytesSent += transferred
			},
			onFinished: () => {
				if (params.dontEmitProgress) {
					return
				}

				const now = Date.now()

				setFinishedTransfers(prev => [
					...prev,
					{
						id: params.id,
						type: "download",
						itemType: "file",
						uuid: params.uuid,
						state: "finished",
						bytes: params.size,
						name: params.name,
						size: params.size,
						startedTimestamp: 0,
						queuedTimestamp: now,
						errorTimestamp: 0,
						finishedTimestamp: now,
						progressTimestamp: 0
					}
				])

				setTransfers(prev => prev.filter(transfer => transfer.id !== params.id))
			},
			onError: () => {
				if (params.dontEmitProgress) {
					return
				}

				const now = Date.now()

				setTransfers(prev =>
					prev.map(transfer =>
						transfer.id === params.id
							? {
									...transfer,
									state: "error",
									errorTimestamp: now
							  }
							: transfer
					)
				)

				if (this.transfersAllBytes >= params.size) {
					this.transfersAllBytes -= params.size
				}
			}
		})
}
