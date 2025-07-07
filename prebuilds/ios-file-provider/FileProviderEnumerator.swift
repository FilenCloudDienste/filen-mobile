import FileProvider

class FileProviderEnumerator: NSObject, NSFileProviderEnumerator {
	private let enumeratedItemIdentifier: NSFileProviderItemIdentifier
	private let ext: FileProviderExtension

	init(enumeratedItemIdentifier: NSFileProviderItemIdentifier, ext: FileProviderExtension) {
		self.enumeratedItemIdentifier =
			if enumeratedItemIdentifier == NSFileProviderItemIdentifier.rootContainer {
				NSFileProviderItemIdentifier(ext.rootUuid)
			} else if enumeratedItemIdentifier == NSFileProviderItemIdentifier.trashContainer {
				NSFileProviderItemIdentifier("trash")
			} else { enumeratedItemIdentifier }
		self.ext = ext
		super.init()
	}

	func invalidate() {
		// noop
		// with paged approach in api v4 we could probably make use of this
	}

	func enumerateItems(
		for observer: any NSFileProviderEnumerationObserver, startingAt page: NSFileProviderPage
	) {
		Task {
			do {
				let object = try self.ext.state.queryItem(
					path: self.enumeratedItemIdentifier.rawValue)!
				switch object {
				case FfiObject.file(_):
					// files are not enumerated, only directories
					// we don't support subscribing to file updates.
					observer.finishEnumerating(upTo: nil)
					return
				case FfiObject.dir(let ffiDir):
					if ffiDir.parent == "trash" {
						// we do not support enumerating trash items
						observer.finishEnumerating(upTo: nil)
						return
					}
				default: break
				}
			} catch {
				observer.finishEnumeratingWithError(NSFileProviderError(.noSuchItem))
				return
			}

			let response: QueryChildrenResponse?
			do {
				response = try await self.ext.state.updateAndQueryDirChildren(
					path: self.enumeratedItemIdentifier.rawValue, orderBy: nil)
			} catch let error as CacheError {
				observer.finishEnumeratingWithError(error)
				return
			}
			guard let response = response else {
				observer.finishEnumeratingWithError(NSFileProviderError(.noSuchItem))
				return
			}

			let items = response.objects.map {
				FileProviderItem(parentItemIdentifier: self.enumeratedItemIdentifier, object: $0)
			}

			observer.didEnumerate(items)
			observer.finishEnumerating(upTo: nil)
		}
	}

}
