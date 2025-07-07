import FileProvider
import Foundation

final class FetchThumbnailHandler: ThumbnailCallback {

	private let perThumbnailCompletionHandler: (NSFileProviderItemIdentifier, Data?, Error?) -> Void
	private let completionHandler: (Error?) -> Void
	private let progress: Progress

	init(
		perThumbnailCompletionHandler: @escaping (NSFileProviderItemIdentifier, Data?, Error?) ->
			Void, completionHandler: @escaping (Error?) -> Void, progress: Progress
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
		case .notFound:
			self.perThumbnailCompletionHandler(
				NSFileProviderItemIdentifier(id), nil, NSFileProviderError(.noSuchItem))
		case .noThumbnail:
			self.perThumbnailCompletionHandler(NSFileProviderItemIdentifier(id), nil, nil)
		case .err(let error):
			print("Error fetching thumbnail for \(id): \(error)")
			self.perThumbnailCompletionHandler(NSFileProviderItemIdentifier(id), nil, error)
		}
	}

	func complete() { self.completionHandler(nil) }
}
