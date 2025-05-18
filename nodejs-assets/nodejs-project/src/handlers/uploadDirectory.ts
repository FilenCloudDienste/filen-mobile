import sdk from "../lib/sdk"
import fs from "fs-extra"
import { FS_RM_OPTIONS } from "../lib/constants"
import type NodeWorker from ".."
import { PauseSignal } from "@filen/sdk"
import transfersStore from "../stores/transfers.store"
import { normalizeFilePathForNode } from "../lib/utils"

export default async function uploadDirectory(
	this: NodeWorker,
	params: {
		id: string
		localPath: string
		parent: string
		name: string
		size: number
		dontEmitProgress?: boolean
		deleteAfterUpload?: boolean
		isShared?: boolean
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
		.uploadLocalDirectory({
			source: normalizeFilePathForNode(params.localPath),
			parent: params.parent,
			name: params.name,
			abortSignal: this.transfersAbortControllers[params.id]?.signal,
			pauseSignal: this.transfersPauseSignals[params.id],
			throwOnSingleFileUploadError: false,
			onQueued: () => {
				if (params.dontEmitProgress) {
					return
				}

				const now = Date.now()

				setTransfers(prev => [
					...prev,
					{
						id: params.id,
						type: "upload",
						itemType: "directory",
						uuid: params.id,
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
						type: "upload",
						itemType: "directory",
						uuid: params.id,
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

	if (typeof params.deleteAfterUpload === "boolean" && params.deleteAfterUpload) {
		await fs.rm(normalizeFilePathForNode(params.localPath), FS_RM_OPTIONS)
	}
}
