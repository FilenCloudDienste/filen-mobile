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
