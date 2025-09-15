import type NodeWorker from ".."
import transfersStore from "../stores/transfers.store"
import { calcSpeed, calcTimeLeft, normalizeTransferProgress } from "../lib/utils"

export function fetchTransfers(this: NodeWorker) {
	const { transfers, finishedTransfers } = transfersStore.getState()
	const ongoingTransfers = transfers.filter(
		transfer => transfer.state === "queued" || transfer.state === "started" || transfer.state === "paused"
	)

	const now = Date.now()
	let remaining = ongoingTransfers.length > 0 ? calcTimeLeft(now, this.transfersProgressStarted, this.transfersBytesSent) : 0

	if (ongoingTransfers.length > 0) {
		// TODO
		// Quick "hack" to better calculate remaining time when a lot of small files are being transferred (not really accurate, needs better solution)
		remaining = remaining + Math.floor(ongoingTransfers.length / 2)
	}

	return {
		transfers,
		finishedTransfers,
		...(ongoingTransfers.length > 0
			? {
					speed: calcSpeed(now, this.transfersProgressStarted, this.transfersBytesSent),
					remaining: remaining,
					progress: normalizeTransferProgress(this.transfersAllBytes, this.transfersBytesSent)
			  }
			: {
					speed: 0,
					remaining: 0,
					progress: 0
			  })
	}
}

export async function transferAction(
	this: NodeWorker,
	params: {
		id: string
		action: "stop" | "pause" | "resume"
	}
) {
	const transfer = transfersStore
		.getState()
		.transfers.filter(transfer => transfer.id === params.id)
		.at(0)

	if (!transfer) {
		return false
	}

	const progressNormalized = normalizeTransferProgress(transfer.size, transfer.bytes)

	if (params.action === "stop") {
		if (
			!this.transfersAbortControllers[transfer.id] ||
			transfer.state === "stopped" ||
			transfer.state === "error" ||
			progressNormalized >= 99 ||
			this.transfersAbortControllers[transfer.id]?.signal.aborted
		) {
			return false
		}

		this.transfersAbortControllers[transfer.id]?.abort()

		return true
	} else if (params.action === "pause") {
		if (
			!this.transfersPauseSignals[transfer.id] ||
			this.transfersPauseSignals[transfer.id]?.isPaused() ||
			transfer.state === "stopped" ||
			transfer.state === "error" ||
			transfer.state === "finished"
		) {
			return false
		}

		this.transfersPauseSignals[transfer.id]?.pause()

		transfersStore.getState().setTransfers(prev =>
			prev.map(t =>
				t.id === transfer.id
					? {
							...t,
							state: "paused"
					  }
					: t
			)
		)

		return true
	} else if (params.action === "resume") {
		if (
			!this.transfersPauseSignals[transfer.id] ||
			!this.transfersPauseSignals[transfer.id]?.isPaused() ||
			transfer.state === "stopped" ||
			transfer.state === "error" ||
			transfer.state === "finished" ||
			transfer.state === "paused" ||
			progressNormalized >= 99
		) {
			return false
		}

		this.transfersPauseSignals[transfer.id]?.resume()

		transfersStore.getState().setTransfers(prev =>
			prev.map(t =>
				t.id === transfer.id
					? {
							...t,
							state: "started"
					  }
					: t
			)
		)

		return true
	}

	return false
}
