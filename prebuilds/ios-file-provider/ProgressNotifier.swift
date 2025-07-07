import Foundation

final class ProgressNotifier: ProgressCallback {
	init() {}
	func setTotal(size: UInt64) { print("setTotal: ", size) }
	func onProgress(bytesProcessed: UInt64) { print("onProgress: ", bytesProcessed) }
}
