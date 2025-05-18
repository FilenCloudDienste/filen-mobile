import type NodeWorker from ".."
import transfersStore from "../stores/transfers.store"
import { normalizeTransferProgress } from "../lib/utils"

export default async function transferAction(
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
			progressNormalized >= 95
		) {
			return false
		}

		this.transfersAbortControllers[transfer.id]?.abort()

		transfersStore.getState().setTransfers(prev => prev.filter(transfer => transfer.id !== transfer.id))

		if (this.transfersAllBytes >= transfer.size) {
			this.transfersAllBytes -= transfer.size
		}

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
			progressNormalized >= 95
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
