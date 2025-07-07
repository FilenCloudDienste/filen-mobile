import FileProvider
import Foundation
import UniformTypeIdentifiers

let PROVIDER = "app.filen.io"
let BACKGROUND_ID = PROVIDER + ".background"

class FileProviderExtension: NSFileProviderExtension {
	let state: FilenMobileCacheState
	let rootUuid: String
	// MARK: - Working with items and persistent identifiers

	override init() {
		// redacted
		let email = ""
		let rootUuid = ""
		let authInfo = ""
		let privateKey = ""
		let authVersion = UInt32(2)
		self.state = try! FilenMobileCacheState.fromStringsInFile(
			email: email, rootUuid: rootUuid, authInfo: authInfo, privateKey: privateKey,
			apiKey: apiKey, version: authVersion,
			filesDir: NSFileProviderManager.default.documentStorageURL.path(percentEncoded: false))
		self.rootUuid = self.state.rootUuid()
	}

	override func persistentIdentifierForItem(at url: URL) -> NSFileProviderItemIdentifier? {
		let uuid = url.lastPathComponent
		do {
			guard let path = try self.state.queryPathForUuid(uuid: uuid) else {
				print("no path for uuid", uuid)
				return nil
			}
			print("persistentIdentifierForItem", url.path(), "->", path)
			let id = NSFileProviderItemIdentifier(rawValue: path)
			return id
		} catch {
			print("error getting path for uuid", uuid, error)
			return nil
		}
	}

	override func urlForItem(withPersistentIdentifier identifier: NSFileProviderItemIdentifier)
		-> URL?
	{
		print("urlForItem", identifier.rawValue)
		let object: FfiObject?

		do { object = try self.objectForId(identifier: identifier) } catch {
			print("error getting url for : ", error, identifier.rawValue)
			return nil
		}
		guard let object = object else {
			print("no url for item")
			return nil
		}
		switch object {
		case .file(let item):
			return NSFileProviderManager.default.documentStorageURL.appending(
				path: "cache", directoryHint: .isDirectory
			).appending(path: item.uuid, directoryHint: .notDirectory)
		case .dir(let item):
			return NSFileProviderManager.default.documentStorageURL.appending(
				path: "cache", directoryHint: .isDirectory
			).appending(path: item.uuid, directoryHint: .isDirectory)
		case .root(let item):
			return NSFileProviderManager.default.documentStorageURL.appending(
				path: "cache", directoryHint: .isDirectory
			).appending(path: item.uuid, directoryHint: .isDirectory)
		}
	}

	override func item(for identifier: NSFileProviderItemIdentifier) throws -> NSFileProviderItem {
		guard let object = try self.objectForId(identifier: identifier) else {
			throw NSFileProviderError(.noSuchItem)
		}
		return FileProviderItem(itemIdentifier: identifier, object: object)
	}

	override func enumerator(for containerItemIdentifier: NSFileProviderItemIdentifier) throws
		-> NSFileProviderEnumerator
	{ return FileProviderEnumerator(enumeratedItemIdentifier: containerItemIdentifier, ext: self) }

	// MARK: - Managing shared files

	override func itemChanged(at url: URL) {
		let uuid = url.lastPathComponent
		let path = try? self.state.queryPathForUuid(uuid: uuid)
		guard let path = path else {
			print("no item found for uuid", uuid)
			return
		}
		Task {
			try await self.state.uploadFileIfChanged(
				path: path, progressCallback: ProgressNotifier())
		}
	}

	override func providePlaceholder(at url: URL) async throws {
		guard let identifier = persistentIdentifierForItem(at: url) else {
			throw NSFileProviderError(.noSuchItem)
		}

		let placeholderDirectoryUrl = url.deletingLastPathComponent()
		let fileProviderItem = try item(for: identifier)
		let placeholderURL = NSFileProviderManager.placeholderURL(for: url)

		if !FileManager.default.fileExists(atPath: placeholderDirectoryUrl.path) {
			try FileManager.default.createDirectory(
				at: placeholderDirectoryUrl, withIntermediateDirectories: true)
		}

		try NSFileProviderManager.writePlaceholder(
			at: placeholderURL, withMetadata: fileProviderItem)
	}

	override func startProvidingItem(at url: URL) async throws {
		let _ = try await self.state.downloadFileIfChangedByUuid(
			uuid: url.lastPathComponent, progressCallback: ProgressNotifier())
	}

	override func stopProvidingItem(at url: URL) {
		Task { try await self.state.clearLocalCacheByUuid(uuid: url.lastPathComponent) }
	}

	// MARK: - Handling actions
	override func createDirectory(
		withName directoryName: String,
		inParentItemIdentifier parentItemIdentifier: NSFileProviderItemIdentifier
	) async throws -> NSFileProviderItem {
		let path =
			if parentItemIdentifier == .rootContainer { self.rootUuid } else {
				parentItemIdentifier.rawValue
			}
		let resp = try await self.state.createDir(
			parentPath: path, name: directoryName, created: nil)

		return FileProviderItem(
			itemIdentifier: NSFileProviderItemIdentifier(resp.id), object: FfiObject.dir(resp.dir))
	}

	override func deleteItem(withIdentifier itemIdentifier: NSFileProviderItemIdentifier)
		async throws
	{ try await self.state.deleteItem(item: itemIdentifier.rawValue) }

	override func importDocument(
		at fileURL: URL, toParentItemIdentifier parentItemIdentifier: NSFileProviderItemIdentifier
	) async throws -> NSFileProviderItem {
		if !fileURL.startAccessingSecurityScopedResource() {
			throw NSFileProviderError(.noSuchItem)
		}
		let parent =
			if parentItemIdentifier == .rootContainer { self.rootUuid } else {
				parentItemIdentifier.rawValue
			}
		let resourceValues = try fileURL.resourceValues(forKeys: [
			.nameKey, .isDirectoryKey, .creationDateKey, .contentModificationDateKey,
			.typeIdentifierKey,
		])
		let name = resourceValues.name!
		let creationInterval = resourceValues.creationDate?.timeIntervalSince1970
		let creationTimeStamp = creationInterval.map { Int64($0 * 1000) }

		let item: FileProviderItem
		if resourceValues.isDirectory! {
			let info = try await self.state.createDir(
				parentPath: parent, name: name, created: creationTimeStamp)
			item = FileProviderItem(
				itemIdentifier: NSFileProviderItemIdentifier(info.id),
				object: FfiObject.dir(info.dir))
		} else {
			let modificationInterval = resourceValues.contentModificationDate?.timeIntervalSince1970
			let modificationTimeStamp = modificationInterval.map { Int64($0 * 1000) }
			let info = UploadFileInfo(
				name: name, creation: creationTimeStamp, modification: modificationTimeStamp,
				mime: resourceValues.typeIdentifier.flatMap { UTType($0)?.preferredMIMEType })
			let resp = try await self.state.uploadNewFile(
				osPath: fileURL.path(percentEncoded: false), parentPath: parent, info: info,
				progressCallback: ProgressNotifier())
			item = FileProviderItem(
				itemIdentifier: NSFileProviderItemIdentifier(resp.id),
				object: FfiObject.file(resp.file))
		}
		fileURL.stopAccessingSecurityScopedResource()
		return item
	}

	override func renameItem(
		withIdentifier itemIdentifier: NSFileProviderItemIdentifier, toName itemName: String
	) async throws -> NSFileProviderItem {
		let resp = try await self.state.renameItem(item: itemIdentifier.rawValue, newName: itemName)
		guard let item = resp else { throw NSFileProviderError(.filenameCollision) }
		return FileProviderItem(
			itemIdentifier: NSFileProviderItemIdentifier(item.id), object: item.object)
	}

	override func reparentItem(
		withIdentifier itemIdentifier: NSFileProviderItemIdentifier,
		toParentItemWithIdentifier parentItemIdentifier: NSFileProviderItemIdentifier,
		newName: String?
	) async throws -> NSFileProviderItem {
		let resp = try await self.state.moveItem(
			item: itemIdentifier.rawValue, newParent: parentItemIdentifier.rawValue)
		let item = FileProviderItem(
			itemIdentifier: NSFileProviderItemIdentifier(resp.id), object: resp.object)
		if let newName = newName {
			if item.filename == newName { return item }  // no need to rename if the name is the same
			// if a new name is provided, we rename the item
			let resp = try await self.state.renameItem(item: resp.id, newName: newName)

			guard let item = resp else { throw NSFileProviderError(.filenameCollision) }
			return FileProviderItem(
				itemIdentifier: NSFileProviderItemIdentifier(item.id), object: item.object)
		} else {
			return item
		}
	}

	override func setFavoriteRank(
		_ favoriteRank: NSNumber?, forItemIdentifier itemIdentifier: NSFileProviderItemIdentifier
	) async throws -> NSFileProviderItem {
		let resp = try await self.state.setFavoriteRank(
			item: itemIdentifier.rawValue, favoriteRank: favoriteRank?.int64Value ?? 0)
		return FileProviderItem(
			itemIdentifier: NSFileProviderItemIdentifier(resp.id), object: resp.object)
	}

	// override func setLastUsedDate(
	// 	_ lastUsedDate: Date?, forItemIdentifier itemIdentifier: NSFileProviderItemIdentifier,
	// 	completionHandler: @escaping (NSFileProviderItem?, Error?) -> Void
	// ) { fatalError("Not implemented") }

	override func setTagData(
		_ tagData: Data?, forItemIdentifier itemIdentifier: NSFileProviderItemIdentifier,
		completionHandler: @escaping (NSFileProviderItem?, Error?) -> Void
	) { fatalError("Not implemented") }

	override func trashItem(withIdentifier itemIdentifier: NSFileProviderItemIdentifier)
		async throws -> NSFileProviderItem
	{
		let resp = try await self.state.trashItem(path: itemIdentifier.rawValue)
		try await NSFileProviderManager.default.signalEnumerator(
			for: getParentItemIdentifier(itemIdentifier: itemIdentifier))

		return FileProviderItem(
			itemIdentifier: NSFileProviderItemIdentifier(resp.id), object: resp.object)
	}

	override func untrashItem(
		withIdentifier itemIdentifier: NSFileProviderItemIdentifier,
		toParentItemIdentifier parentItemIdentifier: NSFileProviderItemIdentifier?
	) async throws -> NSFileProviderItem {
		let uuid =
			if let lastSlash = itemIdentifier.rawValue.lastIndex(of: "/") {
				String(itemIdentifier.rawValue[itemIdentifier.rawValue.index(after: lastSlash)...])
			} else { throw NSFileProviderError(.noSuchItem) }
		let resp = try await self.state.restoreItem(uuid: uuid, to: parentItemIdentifier?.rawValue)
		return FileProviderItem(
			itemIdentifier: NSFileProviderItemIdentifier(resp.id), object: resp.object)
	}

	// MARK: - Accessing thumbnails

	override func fetchThumbnails(
		for itemIdentifiers: [NSFileProviderItemIdentifier], requestedSize size: CGSize,
		perThumbnailCompletionHandler: @escaping (NSFileProviderItemIdentifier, Data?, Error?) ->
			Void, completionHandler: @escaping (Error?) -> Void
	) -> Progress {
		let progress = Progress(totalUnitCount: Int64(itemIdentifiers.count))
		let fetchHandler = FetchThumbnailHandler(
			perThumbnailCompletionHandler: perThumbnailCompletionHandler,
			completionHandler: completionHandler, progress: progress)
		let thumbnailTask = self.state.getThumbnails(
			items: itemIdentifiers.map { $0.rawValue }, requestedWidth: UInt32(size.width),
			requestedHeight: UInt32(size.height), callback: fetchHandler)
		progress.cancellationHandler = { thumbnailTask.cancel() }
		return progress
	}

	// MARK: - Working with services

	override func supportedServiceSources(for itemIdentifier: NSFileProviderItemIdentifier) throws
		-> [NSFileProviderServiceSource]
	{ [] }

	func objectForId(identifier: NSFileProviderItemIdentifier) throws -> FfiObject? {
		let path =
			switch identifier {
			case NSFileProviderItemIdentifier.rootContainer: self.rootUuid
			case NSFileProviderItemIdentifier.trashContainer: "trash"
			default: identifier.rawValue
			}

		return try self.state.queryItem(path: path)
	}

}
