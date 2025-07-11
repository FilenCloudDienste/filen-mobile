import Foundation
import os

final class ProgressNotifier: ProgressCallback {
	private let set: OSAllocatedUnfairLock<Set<String>>
	let uuid: String
	private let total: OSAllocatedUnfairLock<UInt64> = OSAllocatedUnfairLock(initialState: 0)
	private let processed: OSAllocatedUnfairLock<UInt64> = OSAllocatedUnfairLock(initialState: 0)

	init(set: OSAllocatedUnfairLock<Set<String>>, uuid: String) {
		self.set = set
		let _ = self.set.withLock { set in set.insert(uuid) }
		self.uuid = uuid
	}

	func setTotal(size: UInt64) { self.total.withLock { $0 = size } }

	func onProgress(bytesProcessed: UInt64) {
		let processed = self.processed.withLock { processed in
			processed += bytesProcessed
			return processed
		}
		let total = self.total.withLock { total in return total }
		if processed >= total { let _ = self.set.withLock { set in set.remove(self.uuid) } }
	}

	deinit { let _ = self.set.withLock { set in set.remove(self.uuid) } }
}
