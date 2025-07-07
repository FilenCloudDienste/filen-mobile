import FileProvider
import UniformTypeIdentifiers

class FileProviderItem: NSObject, NSFileProviderItem {
	private let identifier: NSFileProviderItemIdentifier
	private let object: FfiObject

	var filename: String {
		switch self.object {
		case .file(let ffiFile): return ffiFile.name
		case .dir(let ffiDir): return ffiDir.name
		case .root(_): return "Filen"
		}
	}

	init(parentItemIdentifier: NSFileProviderItemIdentifier, object: FfiNonRootObject) {
		var suffix: String
		switch object {
		case let .file(ffiFile):
			self.object = FfiObject.file(ffiFile)
			suffix = "/" + ffiFile.name
		case let .dir(ffiDir):
			self.object = FfiObject.dir(ffiDir)
			suffix = "/" + ffiDir.name
		}

		self.identifier = NSFileProviderItemIdentifier(parentItemIdentifier.rawValue + suffix)
	}

	init(itemIdentifier: NSFileProviderItemIdentifier, object: FfiObject) {
		self.identifier = itemIdentifier
		self.object = object
	}

	var itemIdentifier: NSFileProviderItemIdentifier { return identifier }

	var parentItemIdentifier: NSFileProviderItemIdentifier {
		getParentItemIdentifier(itemIdentifier: self.identifier)
	}

	var capabilities: NSFileProviderItemCapabilities {
		switch self.object {
		case .file(_):
			if self.identifier.rawValue.starts(with: "trash/") {
				[.allowsReparenting, .allowsDeleting]
			} else {
				[
					.allowsReading, .allowsWriting, .allowsRenaming, .allowsTrashing,
					.allowsReparenting, .allowsDeleting,
				]
			}
		case .dir(_):
			if self.identifier.rawValue.starts(with: "trash/") {
				[.allowsReparenting, .allowsDeleting]
			} else {
				[
					.allowsContentEnumerating, .allowsAddingSubItems, .allowsRenaming,
					.allowsTrashing, .allowsReparenting, .allowsDeleting,
				]
			}
		case .root(_): [.allowsContentEnumerating, .allowsAddingSubItems]
		}
	}

	var documentSize: NSNumber? {
		switch self.object {
		case .file(let ffiFile): return NSNumber(value: ffiFile.size)
		case .dir(_): return nil
		case .root(_): return nil
		}
	}

	var versionIdentifier: Data? {
		switch self.object {
		case .file(let ffiFile): return ffiFile.hash
		case .dir(_): return nil
		case .root(_): return nil
		}
	}

	var contentType: UTType {
		switch self.object {
		case .file(let file):
			let name = file.name
			let lastDot = name.lastIndex(of: ".")
			guard let lastDot = lastDot else {
				return .data  // default to data if no extension
			}
			let ext = name[name.index(after: lastDot)...]
			if let type = UTType(filenameExtension: String(ext)) {
				return type
			} else {
				return .data
			}
		case .dir(_): return .folder
		case .root(_): return .folder
		}
	}

	var isTrashed: Bool { self.identifier.rawValue.starts(with: "trash/") }
	var contentModificationDate: Date? {
		switch self.object {
		case .file(let ffiFile):
			return Date(timeIntervalSince1970: TimeInterval(ffiFile.modified / 1000))
		case .dir(_): return nil
		case .root(_): return nil
		}
	}

	var creationDate: Date? {
		switch self.object {
		case .file(let ffiFile):
			return Date(timeIntervalSince1970: TimeInterval(ffiFile.created / 1000))
		case .dir(let dir):
			guard let created = dir.created else { return nil }
			return Date(timeIntervalSince1970: TimeInterval(created / 1000))
		case .root(_): return nil
		}
	}

	var favoriteRank: NSNumber? {
		switch self.object {
		case .file(let ffiFile):
			if ffiFile.favoriteRank == 0 { return nil }
			return NSNumber(value: ffiFile.favoriteRank)
		case .dir(let ffiDir):
			if ffiDir.favoriteRank == 0 { return nil }
			return NSNumber(value: ffiDir.favoriteRank)
		case .root(_): return nil
		}
	}

}
