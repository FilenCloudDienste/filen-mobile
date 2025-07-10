import FileProvider
import Foundation

func getParentItemIdentifier(itemIdentifier: NSFileProviderItemIdentifier)
	-> NSFileProviderItemIdentifier
{
	// very ghetto
	if let lastSlash = itemIdentifier.rawValue.lastIndex(of: "/") {
		if itemIdentifier.rawValue.count(where: { $0 == "/" }) >= 2 {
			return NSFileProviderItemIdentifier(
				String(itemIdentifier.rawValue.prefix(upTo: lastSlash)))

		} else {
			return .rootContainer
		}
	} else {
		return .rootContainer
	}
}

func cacheErrorToError(error: CacheError) -> any Error {
	// todo improve lol
	switch error {
	case CacheError.Disabled(_), CacheError.Unauthenticated(_):
		return NSFileProviderError(.notAuthenticated)
	case CacheError.DoesNotExist(_), CacheError.NotADirectory(_):
		return NSFileProviderError(.noSuchItem)
	default: return error
	}
}

func objectToUuid(object: FfiObject) -> String {
	switch object {
	case .file(let file): return file.uuid
	case .dir(let dir): return dir.uuid
	case .root(let root): return root.uuid
	}
}
