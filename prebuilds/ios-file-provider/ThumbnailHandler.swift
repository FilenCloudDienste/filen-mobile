import FileProvider
import Foundation

final class FetchThumbnailHandler: ThumbnailCallback {

	private let perThumbnailCompletionHandler:
		@Sendable (NSFileProviderItemIdentifier, Data?, Error?) -> Void
	private let completionHandler: @Sendable (Error?) -> Void
	private let progress: Progress

	init(
		perThumbnailCompletionHandler: @Sendable @escaping (
			NSFileProviderItemIdentifier, Data?, Error?
		) -> Void, completionHandler: @Sendable @escaping (Error?) -> Void, progress: Progress
	) {
		self.perThumbnailCompletionHandler = perThumbnailCompletionHandler
		self.completionHandler = completionHandler
		self.progress = progress
	}

	func process(id: String, result: ThumbnailResult) {
		self.progress.completedUnitCount += 1

		switch result {
		case .ok(let path):
			let data = try? Data(contentsOf: URL(fileURLWithPath: path))
			self.perThumbnailCompletionHandler(NSFileProviderItemIdentifier(id), data, nil)
		// todo
		case .notFound:
			self.perThumbnailCompletionHandler(
				NSFileProviderItemIdentifier(id), nil, NSFileProviderError(.noSuchItem))
		case .noThumbnail:
			self.perThumbnailCompletionHandler(NSFileProviderItemIdentifier(id), nil, nil)
		case .err(let error):
			print("Error fetching thumbnail for \(id): \(error)")
			self.perThumbnailCompletionHandler(
				NSFileProviderItemIdentifier(id), nil, cacheErrorToError(error: error))
		}
	}

	func complete() { self.completionHandler(nil) }
}