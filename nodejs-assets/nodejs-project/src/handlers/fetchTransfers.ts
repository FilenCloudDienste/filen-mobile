import type NodeWorker from ".."
import transfersStore from "../stores/transfers.store"
import { calcSpeed, calcTimeLeft, normalizeTransferProgress } from "../lib/utils"

export default function fetchTransfers(this: NodeWorker) {
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
