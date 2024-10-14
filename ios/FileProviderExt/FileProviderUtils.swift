//
//  FileProviderUtils.swift
//  FileProviderExt
//
//  Created by Jan Lenczyk on 30.09.23.
//

import Foundation
import FileProvider
import UniformTypeIdentifiers
import Alamofire
import IkigaJSON
import SQLite

class FileProviderUtils {
  public static let shared: FileProviderUtils = {
    let instance = FileProviderUtils()
    
    return instance
  }()
  
  public static var currentDownloads = {
    let currentDownloads = [String: Bool]()
    
    return currentDownloads
  }()
  
  public static var currentUploads = {
    let currentUploads = [String: Bool]()
    
    return currentUploads
  }()
  
  public let jsonDecoder = IkigaJSONDecoder()
  private let jsonEncoder = IkigaJSONEncoder()
  private let tempPath = NSFileProviderManager.default.documentStorageURL.appendingPathComponent("temp", isDirectory: true)
  private let dbPath = NSFileProviderManager.default.documentStorageURL.appendingPathComponent("db", isDirectory: true)
  private var tempPathCreated = false
  private var dbPathCreated = false
  private var db: Connection?
  private var dbInitialized = false
  private let downloadSemaphore = Semaphore(max: 3)
  private let uploadSemaphore = Semaphore(max: 3)
  private let transferSemaphore = Semaphore(max: 30)
  
  internal lazy var sessionConfiguration: URLSessionConfiguration = {
    let configuration = URLSessionConfiguration.af.default
    
    configuration.requestCachePolicy = .reloadIgnoringLocalCacheData
    configuration.urlCache = nil
    configuration.urlCredentialStorage = nil
    configuration.urlCache = URLCache(memoryCapacity: 0, diskCapacity: 0, diskPath: nil)
    
    return configuration
  }()
  
  internal lazy var internalSessionManager: Alamofire.Session = {
    return Alamofire.Session(
      configuration: sessionConfiguration,
      rootQueue: DispatchQueue(label: "org.alamofire.sessionManager.rootQueue"),
      startRequestsImmediately: true,
      interceptor: nil,
      serverTrustManager: nil,
      redirectHandler: nil,
      cachedResponseHandler: nil
    )
  }()
  
  public var sessionManager: Alamofire.Session {
    return internalSessionManager
  }
  
  func openDb () throws -> Connection {
    try autoreleasepool {
      if self.dbInitialized {
        return self.db!
      }
      
      let dbPath = try self.getDbPath().appendingPathComponent("db_v1.sqlite3", isDirectory: false)
      
      self.db = try Connection(dbPath.path)
      
      try self.db!.execute("PRAGMA journal_mode = wal")
      try self.db!.execute("PRAGMA synchronous = normal")
      try self.db!.execute("PRAGMA foreign_keys = off")
      
      try self.db!.execute("CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, uuid TEXT NOT NULL DEFAULT '', parent TEXT NOT NULL DEFAULT '', name TEXT NOT NULL DEFAULT '', type TEXT NOT NULL DEFAULT '', mime TEXT NOT NULL DEFAULT '', size INTEGER NOT NULL DEFAULT 0, timestamp INTEGER NOT NULL DEFAULT 0, lastModified INTEGER NOT NULL DEFAULT 0, key TEXT NOT NULL DEFAULT '', chunks INTEGER NOT NULL DEFAULT 0, region TEXT NOT NULL DEFAULT '', bucket TEXT NOT NULL DEFAULT '', version INTEGER NOT NULL DEFAULT '')")
      try self.db!.execute("CREATE INDEX IF NOT EXISTS uuid_index ON items (uuid)")
      try self.db!.execute("CREATE UNIQUE INDEX IF NOT EXISTS uuid_unique ON items (uuid)")
      
      try self.db!.execute("CREATE TABLE IF NOT EXISTS decrypted_file_metadata (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, uuid TEXT NOT NULL DEFAULT '', name TEXT NOT NULL DEFAULT '', size INTEGER NOT NULL DEFAULT 0, mime TEXT NOT NULL DEFAULT '', key TEXT NOT NULL DEFAULT '', lastModified INTEGER NOT NULL DEFAULT 0, hash TEXT NOT NULL DEFAULT '', used_metadata TEXT NOT NULL DEFAULT '')")
      try self.db!.execute("CREATE INDEX IF NOT EXISTS uuid_index ON decrypted_file_metadata (uuid)")
      try self.db!.execute("CREATE INDEX IF NOT EXISTS used_metadata_index ON decrypted_file_metadata (used_metadata)")
      try self.db!.execute("CREATE UNIQUE INDEX IF NOT EXISTS uuid_unique ON decrypted_file_metadata (uuid)")
      
      try self.db!.execute("CREATE TABLE IF NOT EXISTS decrypted_folder_metadata (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, uuid TEXT NOT NULL DEFAULT '', name TEXT NOT NULL DEFAULT '', used_metadata TEXT NOT NULL DEFAULT '')")
      try self.db!.execute("CREATE INDEX IF NOT EXISTS uuid_index ON decrypted_folder_metadata (uuid)")
      try self.db!.execute("CREATE INDEX IF NOT EXISTS used_metadata_index ON decrypted_folder_metadata (used_metadata)")
      try self.db!.execute("CREATE UNIQUE INDEX IF NOT EXISTS uuid_unique ON decrypted_folder_metadata (uuid)")
      
      try self.db!.execute("CREATE TABLE IF NOT EXISTS metadata (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, key TEXT NOT NULL DEFAULT '', data TEXT NOT NULL DEFAULT '')")
      try self.db!.execute("CREATE INDEX IF NOT EXISTS key_index ON metadata (key)")
      try self.db!.execute("CREATE UNIQUE INDEX IF NOT EXISTS key_unique ON metadata (key)")
      
      self.dbInitialized = true
      
      return self.db!
    }
  }
  
  func getTempPath () throws -> URL {
    try autoreleasepool {
      if self.tempPathCreated {
        return self.tempPath
      }
      
      if !FileManager.default.fileExists(atPath: self.tempPath.path) {
        try FileManager.default.createDirectory(at: self.tempPath, withIntermediateDirectories: true, attributes: nil)
      }
      
      self.tempPathCreated = true
      
      return self.tempPath
    }
  }
  
  func getDbPath () throws -> URL {
    try autoreleasepool {
      if self.dbPathCreated {
        return self.dbPath
      }
      
      if !FileManager.default.fileExists(atPath: self.dbPath.path) {
        try FileManager.default.createDirectory(at: self.dbPath, withIntermediateDirectories: true, attributes: nil)
      }
      
      self.dbPathCreated = true
      
      return self.dbPath
    }
  }
  
  func isLoggedIn () -> Bool {
    autoreleasepool {
      guard let loggedIn = MMKVInstance.shared.instance?.bool(forKey: "isLoggedIn", defaultValue: false), let apiKey = MMKVInstance.shared.instance?.string(forKey: "apiKey", defaultValue: nil), let masterKeys = MMKVInstance.shared.instance?.string(forKey: "masterKeys", defaultValue: nil) else {
        return false
      }
      
      if (!loggedIn || apiKey.count <= 0 || masterKeys.count <= 0) {
        return false
      }
          
      return true
    }
  }
  
  func needsFaceID () -> Bool {
    autoreleasepool {
      let userId = self.userId()
      
      guard let loggedIn = MMKVInstance.shared.instance?.bool(forKey: "isLoggedIn", defaultValue: false), let lockAppAfterVal = MMKVInstance.shared.instance?.double(forKey: "lockAppAfter:" + String(userId), defaultValue: 0), let lastBiometricScreen = MMKVInstance.shared.instance?.double(forKey: "lastBiometricScreen:" + String(userId), defaultValue: 0), let biometricPinAuth = MMKVInstance.shared.instance?.bool(forKey: "biometricPinAuth:" + String(userId), defaultValue: false) else {
        return false
      }

      if !loggedIn {
        return false
      }

      var lockAppAfter = lockAppAfterVal

      if lockAppAfter <= 900 { // 15 minutes minimum timeout since "immediate" locking setting will make the provider never open
        lockAppAfter = 900
      }

      lockAppAfter = floor(lockAppAfter * 1000)

      return (Date().timeIntervalSince1970 * 1000) >= (lastBiometricScreen + lockAppAfter) && biometricPinAuth
    }
  }
  
  func storeMetadata (key: String, data: Data) -> Void {
    autoreleasepool {
      do {
        try self.openDb().run("INSERT OR REPLACE INTO metadata (key, data) VALUES (?, ?)", [key, data.base64EncodedString()])
      } catch {
        print("[storeMetadata] error: \(error)")
      }
    }
  }
  
  func getMetadata (key: String) -> Data? {
    autoreleasepool {
      do {
        if let row = try FileProviderUtils.shared.openDb().run("SELECT data FROM metadata WHERE key = ?", [key]).makeIterator().next() {
          if let data = row[0] as? String {
            return Data(base64Encoded: data)
          }
        }
        
        return nil
      } catch {
        print("[getMetadata] error: \(error)")
        
        return nil
      }
    }
  }
  
  func removeMetadata (key: String) -> Void {
    autoreleasepool {
      do {
        try self.openDb().run("DELETE FROM metadata WHERE key = ?", [key])
      } catch {
        print("[removeMetadata] error: \(error)")
      }
    }
  }
  
  func getIdentifierFromUUID(id: String) -> NSFileProviderItemIdentifier {
    if let root = rootFolderUUID() {
      if root == id || id == NSFileProviderItemIdentifier.rootContainer.rawValue {
        return NSFileProviderItemIdentifier.rootContainer
      } else {
        return NSFileProviderItemIdentifier(id)
      }
    } else {
      print ("Couldn't get root identifier, returning id")
      return NSFileProviderItemIdentifier(id)
    }
  }
  
  func fileExtension(from name: String) -> String? {
    autoreleasepool {
      let components = name.components(separatedBy: ".")
      
      guard components.count > 1 else {
          return nil
      }
      
      return components.last
    }
  }
  
  func userId () -> Int {
    autoreleasepool {
      guard let id = MMKVInstance.shared.instance?.double(forKey: "userId", defaultValue: 0) else {
        return 0
      }
      
      return Int(id)
    }
  }
  
  func rootFolderUUID () -> String? {
    let userIdString = String(self.userId())
    guard let uuid =  MMKVInstance.shared.instance?.string(forKey: "defaultDriveUUID:" + userIdString, defaultValue: nil) else { return nil }
    
    if (uuid.count <= 0) {
      return nil
    }
    
    return uuid
  }
  
  func masterKeys () -> [String]? {
    guard let keys = MMKVInstance.shared.instance?.string(forKey: "masterKeys", defaultValue: nil) else { return nil }
    guard let keysData = keys.data(using: .utf8) else { return nil }
    
    do {
      return try self.jsonDecoder.decode([String].self, from: keysData)
    } catch {
      return nil
    }
  }
  
  func apiRequest <T: Decodable>(endpoint: String, method: String, body: [String: Any]?) async throws -> T {
    guard let apiKey = MMKVInstance.shared.instance?.string(forKey: "apiKey", defaultValue: nil), let url = URL(string: "https://gateway.filen.io" + endpoint) else {
      throw NSFileProviderError(.serverUnreachable)
    }
    
    guard let jsonString = FilenUtils.shared.orderedJSONString(from: body ?? []) else {
      throw NSFileProviderError(.serverUnreachable)
    }
    
    let checksum = try FilenCrypto.shared.hash(message: jsonString, hash: .sha512)
    
    let headers: HTTPHeaders = [
      "Authorization": "Bearer \(apiKey)",
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Checksum": checksum
    ]
    
    return try await sessionManager.request(url, method: .post, parameters: nil, encoding: BodyStringEncoding(body: jsonString), headers: headers){ $0.timeoutInterval = 3600 }.validate().serializingDecodable(T.self).value
  }
  
  func fetchFolderContents (uuid: String) async throws -> FetchFolderContents {
    let response: FetchFolderContents = try await self.apiRequest(endpoint: "/v3/dir/content", method: "POST", body: ["uuid": uuid])
    
    if (!response.status) {
      throw NSFileProviderError(.serverUnreachable)
    }
    
    if (response.data == nil) {
      throw NSFileProviderError(.serverUnreachable)
    }
    
    return response
  }
  
  func getItemFromUUID (uuid id: String) -> ItemJSON? {
    guard let rootFolderUUID = self.rootFolderUUID() else { return nil }
    var uuid = id
    
    if (id == NSFileProviderItemIdentifier.rootContainer.rawValue) {
      uuid = rootFolderUUID
    }
    
    do {
      if let row = try self.openDb().run("SELECT uuid, parent, name, type, mime, size, timestamp, lastModified, key, chunks, region, bucket, version FROM items WHERE uuid = ?", [uuid]).makeIterator().next() {
        if let uuid = row[0] as? String, let parent = row[1] as? String, let name = row[2] as? String, let type = row[3] as? String, let mime = row[4] as? String, let size = row[5] as? Int64, let timestamp = row[6] as? Int64, let lastModified = row[7] as? Int64, let key = row[8] as? String, let chunks = row[9] as? Int64, let region = row[10] as? String, let bucket = row[11] as? String, let version = row[12] as? Int64 {
          return ItemJSON(
            uuid: uuid,
            parent: parent,
            name: name,
            type: type,
            mime: mime,
            size: Int(size),
            timestamp: Int(timestamp),
            lastModified: Int(lastModified),
            key: key,
            chunks: Int(chunks),
            region: region,
            bucket: bucket,
            version: Int(version)
          )
        }
      }
      
      return nil
    } catch {
      print("[getItemFromUUID] error: \(error)")
      
      return nil
    }
  }
  
  func createFolder (name: String, parent: String) async throws -> String {
    guard let masterKeys = self.masterKeys() else {
      throw NSFileProviderError(.notAuthenticated)
    }
    
    let encryptedName = try FilenCrypto.shared.encryptFolderName(name: FolderMetadata(name: name), masterKeys: masterKeys)
    let nameHashed = try FilenCrypto.shared.hashFn(message: name.lowercased())
    
    let uuid = UUID().uuidString.lowercased()
    
    let response: CreateFolder = try await self.apiRequest(
      endpoint: "/v3/dir/create",
      method: "POST",
      body: [
        "uuid": uuid,
        "name": encryptedName,
        "nameHashed": nameHashed,
        "parent": parent
      ]
    )
    
    if (!response.status) {
      throw NSFileProviderError(.serverUnreachable)
    }
    
    if (response.data == nil) {
      throw NSFileProviderError(.serverUnreachable)
    }
    
    if let res = response.data {
      try await checkIfItemParentIsShared(
        type: "folder",
        parent: parent,
        itemMetadata: CheckIfItemParentIsSharedMetadata(
          uuid: uuid,
          name: name
        )
      )
      
      return res.uuid
    }
    
    throw NSFileProviderError(.notAuthenticated)
  }
  
  func renameFolder (uuid: String, toName: String) async throws -> Void {
    guard let masterKeys = self.masterKeys() else {
      throw NSFileProviderError(.notAuthenticated)
    }
    
    let encryptedName = try FilenCrypto.shared.encryptFolderName(name: FolderMetadata(name: toName), masterKeys: masterKeys)
    let nameHashed = try FilenCrypto.shared.hashFn(message: toName.lowercased())
    
    let response: BaseAPIResponse = try await self.apiRequest(
      endpoint: "/v3/dir/rename",
      method: "POST",
      body: [
        "uuid": uuid,
        "name": encryptedName,
        "nameHashed": nameHashed
      ]
    )
    
    if (!response.status) {
      throw NSFileProviderError(.serverUnreachable)
    }
    
    try await checkIfItemIsSharedForRename(
      uuid: uuid,
      type: "folder",
      itemMetadata: CheckIfItemParentIsSharedMetadata(
        uuid: uuid,
        name: toName
      )
    )
  }
  
  func renameFile (uuid: String, metadata: FileMetadata) async throws -> Void {
    guard let masterKeys = self.masterKeys() else {
      throw NSFileProviderError(.notAuthenticated)
    }
    
    let encryptedMetadata = try FilenCrypto.shared.encryptFileMetadata(
      metadata: FileMetadata(
        name: metadata.name,
        size: metadata.size,
        mime: metadata.mime,
        key: metadata.key,
        lastModified: metadata.lastModified
      ),
      masterKeys: masterKeys
    )
    
    let encryptedName = try FilenCrypto.shared.encryptFileName(name: metadata.name, fileKey: metadata.key)
    let nameHashed = try FilenCrypto.shared.hashFn(message: metadata.name.lowercased())
    
    let response: BaseAPIResponse = try await self.apiRequest(
      endpoint: "/v3/file/rename",
      method: "POST",
      body: [
        "uuid": uuid,
        "name": encryptedName,
        "nameHashed": nameHashed,
        "metadata": encryptedMetadata
      ]
    )
    
    if (!response.status) {
      throw NSFileProviderError(.serverUnreachable)
    }
    
    try await checkIfItemIsSharedForRename(
      uuid: uuid,
      type: "file",
      itemMetadata: CheckIfItemParentIsSharedMetadata(
        uuid: uuid,
        name: metadata.name,
        size: metadata.size,
        mime: metadata.mime,
        key: metadata.key,
        lastModified: metadata.lastModified
      )
    )
  }
  
  func trashItem (uuid: String, type: ItemType) async throws -> Void {
    let response: BaseAPIResponse = try await self.apiRequest(
      endpoint: "/v3/" + (type == .file ? "file" : "dir") + "/trash",
      method: "POST",
      body: [
        "uuid": uuid
      ]
    )
    
    if (!response.status) {
      throw NSFileProviderError(.serverUnreachable)
    }
  }
  
  func restoreItem (uuid: String, type: ItemType) async throws -> Void {
    let response: BaseAPIResponse = try await self.apiRequest(
      endpoint: "/v3/" + (type == .file ? "file" : "dir") + "/restore",
      method: "POST",
      body: [
        "uuid": uuid
      ]
    )
    
    if (!response.status) {
      throw NSFileProviderError(.serverUnreachable)
    }
  }
  
  func deleteItem (uuid: String, type: ItemType) async throws -> Void {
    let response: BaseAPIResponse = try await self.apiRequest(
      endpoint: "/v3/" + (type == .file ? "file" : "dir") + "/delete/permanent",
      method: "POST",
      body: [
        "uuid": uuid
      ]
    )
    
    if (!response.status) {
      throw NSFileProviderError(.serverUnreachable)
    }
  }
  
  func moveItem (parent: String, item: ItemJSON) async throws -> Void {
    let response: BaseAPIResponse = try await self.apiRequest(
      endpoint: "/v3/" + (item.type == "folder" ? "dir" : "file")  + "/move",
      method: "POST",
      body: [
        "uuid": item.uuid,
        "to": parent
      ]
    )
    
    if (!response.status) {
      throw NSFileProviderError(.serverUnreachable)
    }
    
    if item.type == "folder" {
      try await checkIfItemParentIsShared(
        type: "folder",
        parent: parent,
        itemMetadata: CheckIfItemParentIsSharedMetadata(
          uuid: item.uuid,
          name: item.name
        )
      )
    } else {
      try await checkIfItemParentIsShared(
        type: "file",
        parent: parent,
        itemMetadata: CheckIfItemParentIsSharedMetadata(
          uuid: item.uuid,
          name: item.name,
          size: item.size,
          mime: item.mime,
          key: item.key,
          lastModified: item.lastModified
        )
      )
    }
  }
  
  func setFavoriteRank (uuid: String, rank: NSNumber?) -> Void {
    autoreleasepool {
      if let rankNS = rank {
        let int = rankNS.intValue
        
        if let rankData = String(int).data(using: .utf8) {
          self.storeMetadata(key: "favorite:" + uuid, data: rankData)
        }
      }
    }
  }
  
  func getFavoriteRank (uuid: String) -> NSNumber? {
    guard let rank = self.getMetadata(key: "favorite:" + uuid) else { return nil }
    guard let rankString = String(data: rank, encoding: .utf8) else { return nil }
    guard let int = Int(rankString) else { return nil }
    
    return NSNumber(value: int)
  }
  
  func setTagData (uuid: String, data: Data?) -> Void {
    autoreleasepool {
      if let tagData = data {
        self.storeMetadata(key: "tag:" + uuid, data: tagData)
      }
    }
  }
  
  func getTagData (uuid: String) -> Data? {
    return self.getMetadata(key: "tag:" + uuid)
  }
  
  func signalEnumeratorForIdentifier (for identifier: NSFileProviderItemIdentifier) -> Void {
    Task {
      do {
        guard FunctionRateLimiter.shared.shouldAllowExecution(for: identifier) else {
            return
        }
        
        guard let rootFolderUUID = self.rootFolderUUID() else {
          throw NSFileProviderError(.notAuthenticated)
        }
        
        try await NSFileProviderManager.default.signalEnumerator(for: NSFileProviderItemIdentifier(rawValue: rootFolderUUID) == identifier || identifier.rawValue == NSFileProviderItemIdentifier.rootContainer.rawValue ? NSFileProviderItemIdentifier.rootContainer : identifier)
      } catch {
        print("[signalEnumeratorForIdentifier] error: \(error)")
      }
    }
  }
  
  func signalEnumerator (for uuid: String) -> Void {
    Task {
      do {
        guard let rootFolderUUID = self.rootFolderUUID() else {
          throw NSFileProviderError(.notAuthenticated)
        }
        
        try await NSFileProviderManager.default.signalEnumerator(for: uuid == rootFolderUUID ? NSFileProviderItemIdentifier.rootContainer : NSFileProviderItemIdentifier(rawValue: uuid))
      } catch {
        print("[signalEnumerator] error: \(error)")
      }
    }
  }
  
  func uploadChunk (url: URL, fileURL: URL, checksum: String) async throws -> (region: String, bucket: String) {
    guard let apiKey = MMKVInstance.shared.instance?.string(forKey: "apiKey", defaultValue: nil) else {
      throw NSFileProviderError(.serverUnreachable)
    }
    
    let headers: HTTPHeaders = [
      "Authorization": "Bearer \(apiKey)",
      "Accept": "application/json",
      "Checksum": checksum
    ]
    
    let response = try await sessionManager.upload(fileURL, to: url, headers: headers){ $0.timeoutInterval = 3600 }.validate().serializingDecodable(UploadChunk.self).value
    
    if (!response.status) {
      throw NSFileProviderError(.serverUnreachable)
    }
    
    return (region: response.data!.region, bucket: response.data!.bucket)
  }
  
  func encryptAndUploadChunk (url: String, chunkSize: Int, uuid: String, index: Int, uploadKey: String, parent: String, key: String) async throws -> (region: String, bucket: String) {
    let fileURL = try self.getTempPath().appendingPathComponent(UUID().uuidString.lowercased() + "." + uuid + "." + String(index), isDirectory: false)
    
    guard let inputURL = URL(string: url.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? url) else {
      throw NSError(domain: "encryptAndUploadChunk", code: 1, userInfo: nil)
    }
    
    let (_, checksum: chunkChecksum) = try FilenCrypto.shared.streamEncryptData(input: inputURL, output: fileURL, key: key, version: 2, index: index)
    
    // We need to serialize it to JSON this way to ensure correct ordering of parameters
    let queryItemsJSONString = #"{"uuid":"\#(uuid.lowercased())","index":"\#(index)","uploadKey":"\#(uploadKey)","parent":"\#(parent.lowercased())","hash":"\#(chunkChecksum.lowercased())"}"#
    
    let queryItemsChecksum = try FilenCrypto.shared.hash(message: queryItemsJSONString, hash: .sha512)
    
    guard let urlWithComponents = URL(string: "https://ingest.filen.io/v3/upload?uuid=\(uuid.lowercased())&index=\(index)&uploadKey=\(uploadKey)&parent=\(parent.lowercased())&hash=\(chunkChecksum)") else {
      throw NSError(domain: "encryptAndUploadChunk", code: 2, userInfo: nil)
    }
    
    let result = try await self.uploadChunk(url: urlWithComponents, fileURL: fileURL, checksum: queryItemsChecksum)
    
    if FileManager.default.fileExists(atPath: fileURL.path) {
      try FileManager.default.removeItem(atPath: fileURL.path)
    }
    
    return result
  }
  
  func uploadFile (url: String, parent: String) async throws -> ItemJSON {
    if (!FileManager.default.fileExists(atPath: url)) {
      throw NSFileProviderError(.noSuchItem)
    }
    
    guard let masterKeys = self.masterKeys(), let lastMasterKey = masterKeys.last else {
      throw NSFileProviderError(.notAuthenticated)
    }
    
    try await self.uploadSemaphore.acquire()
    
    defer {
      self.uploadSemaphore.release()
    }
    
    let stat = try FileManager.default.attributesOfItem(atPath: url)
    
    guard let fileSize = stat[.size] as? Int, let fileURL = URL(string: url.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? url), let lastModified = stat[.modificationDate] as? Date else {
      throw NSFileProviderError(.noSuchItem)
    }
    
    let key = try FilenCrypto.shared.generateRandomString(length: 32)
    let lastModifiedInt = Int(lastModified.timeIntervalSince1970 * 1000)
    
    if (fileSize <= 0) { // We do not support 0 Byte files yet
      throw NSFileProviderError(.noSuchItem)
    }
    
    let uuid = UUID().uuidString.lowercased()
    let fileName = fileURL.lastPathComponent
    var dummyOffset = 0
    var fileChunks = 0
    let chunkSizeToUse = 1024 * 1024
    let ext = self.fileExtension(from: fileName) ?? ""
    let mimeType = UTType(filenameExtension: ext)?.preferredMIMEType ?? ""
    
    while (dummyOffset < fileSize) {
      fileChunks += 1
      dummyOffset += chunkSizeToUse
    }
    
    let metadataJSON = try self.jsonEncoder.encode(
      FileMetadata(
        name: fileName,
        size: fileSize,
        mime: mimeType,
        key: key,
        lastModified: lastModifiedInt
      )
    )
    
    guard let metadataJSONString = String(data: metadataJSON, encoding: .utf8) else {
      throw NSFileProviderError(.noSuchItem)
    }
    
    let rm = try FilenCrypto.shared.generateRandomString(length: 32)
    let uploadKey = try FilenCrypto.shared.generateRandomString(length: 32)
    let nameEnc = try FilenCrypto.shared.encryptMetadata(metadata: fileName, key: key)
    let mimeEnc = try FilenCrypto.shared.encryptMetadata(metadata: mimeType, key: key)
    let nameHashed = try FilenCrypto.shared.hashFn(message: fileName.lowercased())
    let sizeEnc = try FilenCrypto.shared.encryptMetadata(metadata: String(fileSize), key: key)
    let metadata = try FilenCrypto.shared.encryptMetadata(metadata: metadataJSONString, key: lastMasterKey)
    
    let uploadFileResult = UploadFileResult()
    
    try await withThrowingTaskGroup(of: Void.self) { group in
      for index in 0..<fileChunks {
        autoreleasepool {
          group.addTask {
            try await self.transferSemaphore.acquire()
            
            defer {
              self.transferSemaphore.release()
            }
            
            let result = try await self.encryptAndUploadChunk(url: url, chunkSize: chunkSizeToUse, uuid: uuid, index: index, uploadKey: uploadKey, parent: parent, key: key)
            
            if (result.bucket.count > 0 && result.region.count > 0) {
              await uploadFileResult.set(bucket: result.bucket, region: result.region)
            }
          }
        }
        
        for try await _ in group {}
      }
    }
    
    let bucket = await uploadFileResult.bucket
    let region = await uploadFileResult.region
    
    /*for index in 0..<fileChunks {
      let result = try await self.encryptAndUploadChunk(
        url: url,
        chunkSize: chunkSizeToUse,
        uuid: uuid,
        index: index,
        uploadKey: uploadKey,
        parent: parent,
        key: key
      )
    
      if (result.bucket.count > 0 && result.region.count > 0) {
        bucket = result.bucket
        region = result.region
      }
    }*/
    
    let done = try await self.markUploadAsDone(
      uuid: uuid,
      name: nameEnc,
      nameHashed: nameHashed,
      size: sizeEnc,
      chunks: fileChunks,
      mime: mimeEnc,
      rm: rm,
      metadata: metadata,
      version: 2,
      uploadKey: uploadKey
    )
    
    try await checkIfItemParentIsShared(
      type: "file",
      parent: parent,
      itemMetadata: CheckIfItemParentIsSharedMetadata(
        uuid: uuid,
        name: fileName,
        size: fileSize,
        mime: mimeType,
        key: key,
        lastModified: lastModifiedInt
      )
    )
    
    return ItemJSON(
      uuid: uuid,
      parent: parent,
      name: fileName,
      type: "file",
      mime: mimeType,
      size: fileSize,
      timestamp: Int(Date().timeIntervalSince1970),
      lastModified: lastModifiedInt,
      key: key,
      chunks: done.data!.chunks,
      region: region,
      bucket: bucket,
      version: 2
    )
  }
  
  func markUploadAsDone (uuid: String, name: String, nameHashed: String, size: String, chunks: Int, mime: String, rm: String, metadata: String, version: Int, uploadKey: String) async throws -> MarkUploadAsDone {
    let response: MarkUploadAsDone = try await self.apiRequest(
      endpoint: "/v3/upload/done",
      method: "POST",
      body: [
        "uuid": uuid,
        "name": name,
        "nameHashed": nameHashed,
        "size": size,
        "chunks": chunks,
        "mime": mime,
        "rm": rm,
        "metadata": metadata,
        "version": version,
        "uploadKey": uploadKey
      ]
    )
    
    if (!response.status) {
      throw NSFileProviderError(.serverUnreachable)
    }
    
    return response
  }
  
  func isSharingFolder (uuid: String) async throws -> IsSharingFolder {
    let response: IsSharingFolder = try await self.apiRequest(
      endpoint: "/v3/dir/shared",
      method: "POST",
      body: [
        "uuid": uuid
      ]
    )
    
    if (!response.status) {
      throw NSFileProviderError(.serverUnreachable)
    }
    
    return response
  }
  
  func isLinkingFolder (uuid: String) async throws -> IsLinkingFolder {
    let response: IsLinkingFolder = try await self.apiRequest(
      endpoint: "/v3/dir/linked",
      method: "POST",
      body: [
        "uuid": uuid
      ]
    )
    
    if (!response.status) {
      throw NSFileProviderError(.serverUnreachable)
    }
    
    return response
  }
  
  func shareItem (uuid: String, parent: String, email: String, type: String, metadata: String) async throws -> Void {
    let response: BaseAPIResponse = try await self.apiRequest(
      endpoint: "/v3/item/share",
      method: "POST",
      body: [
        "uuid": uuid,
        "parent": parent,
        "email": email,
        "type": type,
        "metadata": metadata
      ]
    )
    
    if (!response.status) {
      throw NSFileProviderError(.serverUnreachable)
    }
  }
  
  func addItemToPublicLink (uuid: String, parent: String, linkUUID: String, type: String, metadata: String, key: String, expiration: String) async throws -> Void {
    let response: BaseAPIResponse = try await self.apiRequest(
      endpoint: "/v3/dir/link/add",
      method: "POST",
      body: [
        "uuid": uuid,
        "parent": parent,
        "linkUUID": linkUUID,
        "type": type,
        "metadata": metadata,
        "key": key,
        "expiration": expiration
      ]
    )
    
    if (!response.status) {
      throw NSFileProviderError(.serverUnreachable)
    }
  }
  
  func renameSharedItem (uuid: String, receiverId: Int, metadata: String) async throws -> Void {
    let response: BaseAPIResponse = try await self.apiRequest(
      endpoint: "/v3/item/shared/rename",
      method: "POST",
      body: [
        "uuid": uuid,
        "receiverId": receiverId,
        "metadata": metadata
      ]
    )
    
    if (!response.status) {
      throw NSFileProviderError(.serverUnreachable)
    }
  }
  
  func renameItemInPublicLink (uuid: String, linkUUID: String, metadata: String) async throws -> Void {
    let response: BaseAPIResponse = try await self.apiRequest(
      endpoint: "/v3/item/linked/rename",
      method: "POST",
      body: [
        "uuid": uuid,
        "linkUUID": linkUUID,
        "metadata": metadata
      ]
    )
    
    if (!response.status) {
      throw NSFileProviderError(.serverUnreachable)
    }
  }
  
  func isSharingItem (uuid: String) async throws -> IsSharingItem {
    let response: IsSharingItem = try await self.apiRequest(
      endpoint: "/v3/item/shared",
      method: "POST",
      body: [
        "uuid": uuid
      ]
    )
    
    if (!response.status) {
      throw NSFileProviderError(.serverUnreachable)
    }
    
    return response
  }
  
  func isLinkingItem (uuid: String) async throws -> IsLinkingItem {
    let response: IsLinkingItem = try await self.apiRequest(
      endpoint: "/v3/item/linked",
      method: "POST",
      body: [
        "uuid": uuid
      ]
    )
    
    if (!response.status) {
      throw NSFileProviderError(.serverUnreachable)
    }
    
    return response
  }
  
  func getFolderContents (uuid: String, type: String = "normal", linkUUID: String?, linkHasPassword: Bool?, linkPassword: String?, linkSalt: String?) async throws -> GetFolderContents {
    let response: GetFolderContents = try await self.apiRequest(
      endpoint: type == "shared" ? "/v3/dir/download/shared" : type == "linked" ? "/v3/dir/download/link" : "/v3/dir/download",
      method: "POST",
      body: type == "shared" ? [
        "uuid": uuid
      ] : type == "linked" ? [
        "uuid": linkUUID!,
        "parent": uuid,
        "password": linkHasPassword! && linkSalt != nil && linkPassword != nil ? linkSalt!.count == 32 ? FilenCrypto.shared.deriveKeyFromPassword(password: linkPassword!, salt: linkSalt!, bitLength: 512, hash: .sha512, rounds: 200000) : FilenCrypto.shared.hashFn(message: linkPassword!.count == 0 ? "empty": linkPassword!) : FilenCrypto.shared.hashFn(message: "empty")
      ] : [
        "uuid": uuid
      ]
    )
    
    if (!response.status) {
      throw NSFileProviderError(.serverUnreachable)
    }
    
    return response
  }
  
  func checkIfItemIsSharedForRename (uuid: String, type: String, itemMetadata: CheckIfItemParentIsSharedMetadata) async throws -> Void {
    guard let masterKeys = self.masterKeys() else {
      throw NSFileProviderError(.notAuthenticated)
    }
    
    let isSharingItem = try await self.isSharingItem(uuid: uuid)
    let isLinkingItem = try await self.isLinkingItem(uuid: uuid)
    
    if !isSharingItem.data!.sharing && !isLinkingItem.data!.link {
      return
    }
    
    if let metadata = type == "folder" ? String(data: try self.jsonEncoder.encode(FolderMetadata(name: itemMetadata.name!)), encoding: .utf8) : String(data: try self.jsonEncoder.encode(FileMetadata(name: itemMetadata.name!, size: itemMetadata.size!, mime: itemMetadata.mime!, key: itemMetadata.key!, lastModified: itemMetadata.lastModified!)), encoding: .utf8) {
      if isSharingItem.data!.sharing {
        for user in isSharingItem.data!.users! {
          if let encryptedMetadata = FilenCrypto.shared.encryptMetadataPublicKey(metadata: metadata, publicKey: user.publicKey) {
            try await self.renameSharedItem(
              uuid: uuid,
              receiverId: user.id,
              metadata: encryptedMetadata
            )
          }
        }
      }
      
      if isLinkingItem.data!.link {
        for link in isLinkingItem.data!.links! {
          if let key = try FilenCrypto.shared.decryptFolderLinkKey(metadata: link.linkKey, masterKeys: masterKeys) {
            let encryptedMetadata = try FilenCrypto.shared.encryptMetadata(metadata: metadata, key: key)
              
            try await self.renameItemInPublicLink(
              uuid: uuid,
              linkUUID: link.linkUUID,
              metadata: encryptedMetadata
            )
          }
        }
      }
    }
  }
  
  func checkIfItemParentIsShared (type: String, parent: String, itemMetadata: CheckIfItemParentIsSharedMetadata) async throws -> Void {
    guard let masterKeys = self.masterKeys() else {
      throw NSFileProviderError(.notAuthenticated)
    }
    
    let isSharingParent = try await self.isSharingFolder(uuid: parent)
    let isLinkingParent = try await self.isLinkingFolder(uuid: parent)
    
    if !isSharingParent.data!.sharing && !isLinkingParent.data!.link {
      return
    }
    
    if isSharingParent.data!.sharing {
      var filesToShare: [ItemToShareFile] = []
      var foldersToShare: [ItemToShareFolder] = []

      if type == "file" {
        filesToShare.append(
          ItemToShareFile(
            uuid: itemMetadata.uuid,
            parent: parent,
            metadata: FileMetadata(
              name: itemMetadata.name!,
              size: itemMetadata.size!,
              mime: itemMetadata.mime!,
              key: itemMetadata.key!,
              lastModified: itemMetadata.lastModified!
            )
          )
        )
      } else {
        foldersToShare.append(
          ItemToShareFolder(
            uuid: itemMetadata.uuid,
            parent: parent,
            metadata: FolderMetadata(name: itemMetadata.name!)
          )
        )
        
        let contents = try await self.getFolderContents(uuid: itemMetadata.uuid, type: "normal", linkUUID: nil, linkHasPassword: nil, linkPassword: nil, linkSalt: nil)
        
        for file in contents.data!.files {
          if let decryptedMetadata = FilenCrypto.shared.decryptFileMetadata(metadata: file.metadata, masterKeys: masterKeys) {
            filesToShare.append(
              ItemToShareFile(
                uuid: file.uuid,
                parent: file.parent,
                metadata: decryptedMetadata
              )
            )
          }
        }
        
        for i in 0..<contents.data!.folders.count {
          let folder = contents.data!.folders[i]
          
          if folder.uuid != itemMetadata.uuid && folder.parent != "base" {
            if let decryptedName = FilenCrypto.shared.decryptFolderName(metadata: folder.name, masterKeys: masterKeys) {
              foldersToShare.append(
                ItemToShareFolder(
                  uuid: folder.uuid,
                  parent: i == 0 ? "none" : folder.parent,
                  metadata: FolderMetadata(name: decryptedName)
                )
              )
            }
          }
        }
      }
      
      for file in filesToShare {
        if let metadata = String(data: try self.jsonEncoder.encode(file.metadata), encoding: .utf8) {
          for user in isSharingParent.data!.users! {
            if let publicKeyEncryptedMetadata = FilenCrypto.shared.encryptMetadataPublicKey(metadata: metadata, publicKey: user.publicKey) {
              try await self.shareItem(
                uuid: file.uuid,
                parent: file.parent,
                email: user.email,
                type: "file",
                metadata: publicKeyEncryptedMetadata
              )
            }
          }
        }
      }
      
      for folder in foldersToShare {
        if let metadata = String(data: try self.jsonEncoder.encode(folder.metadata), encoding: .utf8) {
          for user in isSharingParent.data!.users! {
            if let publicKeyEncryptedMetadata = FilenCrypto.shared.encryptMetadataPublicKey(metadata: metadata, publicKey: user.publicKey) {
              try await self.shareItem(
                uuid: folder.uuid,
                parent: folder.parent,
                email: user.email,
                type: "folder",
                metadata: publicKeyEncryptedMetadata
              )
            }
          }
        }
      }
    }
    
    if isLinkingParent.data!.link {
      var filesToShare: [ItemToShareFile] = []
      var foldersToShare: [ItemToShareFolder] = []

      if type == "file" {
        filesToShare.append(
          ItemToShareFile(
            uuid: itemMetadata.uuid,
            parent: parent,
            metadata: FileMetadata(
              name: itemMetadata.name!,
              size: itemMetadata.size!,
              mime: itemMetadata.mime!,
              key: itemMetadata.key!,
              lastModified: itemMetadata.lastModified!
            )
          )
        )
      } else {
        foldersToShare.append(
          ItemToShareFolder(
            uuid: itemMetadata.uuid,
            parent: parent,
            metadata: FolderMetadata(name: itemMetadata.name!)
          )
        )
        
        let contents = try await self.getFolderContents(uuid: itemMetadata.uuid, type: "normal", linkUUID: nil, linkHasPassword: nil, linkPassword: nil, linkSalt: nil)
        
        for file in contents.data!.files {
          if let decryptedMetadata = FilenCrypto.shared.decryptFileMetadata(metadata: file.metadata, masterKeys: masterKeys) {
            filesToShare.append(
              ItemToShareFile(
                uuid: file.uuid,
                parent: file.parent,
                metadata: decryptedMetadata
              )
            )
          }
        }
        
        for i in 0..<contents.data!.folders.count {
          let folder = contents.data!.folders[i]
          
          if let decryptedName = FilenCrypto.shared.decryptFolderName(metadata: folder.name, masterKeys: masterKeys) {
            if folder.uuid != itemMetadata.uuid && folder.parent != "base" {
              foldersToShare.append(
                ItemToShareFolder(
                  uuid: folder.uuid,
                  parent: i == 0 ? "none" : folder.parent,
                  metadata: FolderMetadata(name: decryptedName)
                )
              )
            }
          }
        }
      }
      
      for file in filesToShare {
        if let metadata = String(data: try self.jsonEncoder.encode(file.metadata), encoding: .utf8) {
          for link in isLinkingParent.data!.links! {
            if let key = try FilenCrypto.shared.decryptFolderLinkKey(metadata: link.linkKey, masterKeys: masterKeys) {
              let encryptedMetadata = try FilenCrypto.shared.encryptMetadata(metadata: metadata, key: key)
              
              try await self.addItemToPublicLink(
                uuid: file.uuid,
                parent: file.parent,
                linkUUID: link.linkUUID,
                type: "file",
                metadata: encryptedMetadata,
                key: link.linkKey,
                expiration: "never"
              )
            }
          }
        }
      }
      
      for folder in foldersToShare {
        if let metadata = String(data: try self.jsonEncoder.encode(folder.metadata), encoding: .utf8) {
          for link in isLinkingParent.data!.links! {
            if let key = try FilenCrypto.shared.decryptFolderLinkKey(metadata: link.linkKey, masterKeys: masterKeys) {
              let encryptedMetadata = try FilenCrypto.shared.encryptMetadata(metadata: metadata, key: key)
              
              try await self.addItemToPublicLink(
                uuid: folder.uuid,
                parent: folder.parent,
                linkUUID: link.linkUUID,
                type: "folder",
                metadata: encryptedMetadata,
                key: link.linkKey,
                expiration: "never"
              )
            }
          }
        }
      }
    }
  }
  
  func downloadAndDecryptChunk (uuid: String, region: String, bucket: String, index: Int, key: String, version: Int) async throws -> URL {
    guard let downloadURL = URL(string: "https://egest.filen.io/\(region)/\(bucket)/\(uuid)/\(index)") else {
      throw NSFileProviderError(.serverUnreachable)
    }
    
    let tempFileURL = try self.getTempPath().appendingPathComponent(UUID().uuidString.lowercased() + "." + uuid + "." + String(index), isDirectory: false)
    let downloadedFileURL = try await sessionManager.download(downloadURL){ $0.timeoutInterval = 3600 }.validate().serializingDownloadedFileURL().value
    
    defer {
      do {
        if FileManager.default.fileExists(atPath: downloadedFileURL.path) {
          try FileManager.default.removeItem(at: downloadedFileURL)
        }
      } catch {
        print(error)
      }
    }
    
    _ = try FilenCrypto.shared.streamDecryptData(input: downloadedFileURL, output: tempFileURL, key: key, version: version)
    
    return tempFileURL
  }

  func downloadFile (uuid: String, url: String, maxChunks: Int) async throws -> (didDownload: Bool, url: String) {
    if (maxChunks <= 0) {
      return (didDownload: false, url: "")
    }
    
    guard let itemJSON = self.getItemFromUUID(uuid: uuid), let destinationURL = URL(string: url.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? url) else {
      throw NSFileProviderError(.noSuchItem)
    }
    
    let destinationBaseURL = destinationURL.deletingLastPathComponent()
    
    if !FileManager.default.fileExists(atPath: destinationBaseURL.path) {
      try FileManager.default.createDirectory(at: destinationBaseURL, withIntermediateDirectories: true, attributes: nil)
    }
    
    if FileManager.default.fileExists(atPath: url) {
      return (didDownload: false, url: url)
    }
    
    let tempFileURL = try self.getTempPath().appendingPathComponent(UUID().uuidString.lowercased(), isDirectory: false)
    
    try await self.downloadSemaphore.acquire()
    
    defer {
      do {
        self.downloadSemaphore.release()
        
        if FileManager.default.fileExists(atPath: tempFileURL.path) {
          try FileManager.default.removeItem(at: tempFileURL)
        }
      } catch {
        print(error)
      }
    }
    
    let chunksToDownload = maxChunks >= itemJSON.chunks ? itemJSON.chunks : maxChunks
    var status = 0
    let dIo = DispatchIO(type: .random, path: tempFileURL.path, oflag: O_CREAT | O_WRONLY, mode: S_IRUSR | S_IWUSR | S_IRGRP | S_IWGRP | S_IROTH | S_IWOTH, queue: DispatchQueue(label: "io.filenSDK"), cleanupHandler: { (err) in
      status = Int(err)
    })
    if status != 0 {
      return (didDownload: false, url: url)
    }
    
    try await withThrowingTaskGroup(of: Void.self) { group in
      print(chunksToDownload)
      for index in 0..<chunksToDownload {
        autoreleasepool {
          group.addTask {
            try await self.transferSemaphore.acquire()
            
            let decryptedChunkURL = try await self.downloadAndDecryptChunk(
              uuid: itemJSON.uuid,
              region: itemJSON.region,
              bucket: itemJSON.bucket,
              index: index,
              key: itemJSON.key,
              version: itemJSON.version
            )
            
            self.transferSemaphore.release()
            
            defer {
              do {
                if FileManager.default.fileExists(atPath: decryptedChunkURL.path) {
                  try FileManager.default.removeItem(at: decryptedChunkURL)
                }
              } catch {
                print(error)
              }
            }
            
            guard let readStream = InputStream(fileAtPath: decryptedChunkURL.path) else {
              throw NSError(domain: "Could not open read stream", code: 1, userInfo: nil)
            }
            defer {
              readStream.close()
            }
            readStream.open()
            
            let bufferSize = 1024
            var buffer = [UInt8](repeating: 0, count: bufferSize)
            var tmpOffset: Int64 = 0
            
            while readStream.hasBytesAvailable {
              autoreleasepool {
                let bytesRead:Int64 = Int64(readStream.read(&buffer, maxLength: bufferSize))
                
                if bytesRead > 0 {
                  let data1 = Data(buffer)
                  data1.withUnsafeBytes {
                    dIo?.write(offset: 1024 * 1024 * Int64(index) + tmpOffset, data: DispatchData(bytes: UnsafeRawBufferPointer(start: $0, count: data1.count)), queue: DispatchQueue(label: "io.filenSDK"), ioHandler: { (done, data, err) in
                      if (done){
                        //                                            print("Finished with \(1024 * 1024 * Int64(index) + tmpOffset)")
                      } else if (err != 0) {
                        print("ERROR \(err) at \(1024 * 1024 * Int64(index) + tmpOffset)")
                      }
                    })
                    tmpOffset += bytesRead
                  }
                }
              }
            }
          }
        }
      }
      for try await _ in group {}
    }
    
    dIo?.close()
    
    /*for index in 0..<chunksToDownload  {
      try await self.downloadAndDecryptChunk(
        destinationURL: tempFileURL,
        uuid: uuid,
        region: itemJSON.region,
        bucket: itemJSON.bucket,
        index: index,
        key: itemJSON.key,
        version: itemJSON.version
      )
    }*/
    
    if !FileManager.default.fileExists(atPath: tempFileURL.path) {
      throw NSFileProviderError(.serverUnreachable)
    }
    
    try FileManager.default.moveItem(atPath: tempFileURL.path, toPath: destinationURL.path)
    
    return (didDownload: true, url: url)
  }
  
  func cleanupTempDir () -> Void {
    let now: TimeInterval = Date().timeIntervalSince1970
    
    do {
      let tempDir = try self.getTempPath()
      let files = try FileManager.default.contentsOfDirectory(at: tempDir, includingPropertiesForKeys: [.creationDateKey], options: [])
        
      for file in files {
        if let attributes = try? FileManager.default.attributesOfItem(atPath: file.path), let creationDate = attributes[.creationDate] as? Date {
          let timeSinceCreation = creationDate.timeIntervalSince1970 + (3600 * 3)
          
          if now > timeSinceCreation {
            try FileManager.default.removeItem(at: file)
          }
        }
      }
    } catch {
        print("[cleanupTempDir] error:", error)
    }
  }

  func convertTimestampToMs (_ timestamp: Int) -> Int {
      let now = Int(Date().timeIntervalSince1970 * 1000)

      if abs(now - timestamp) < abs(now - timestamp * 1000) {
          return timestamp
      }

      return timestamp * 1000
  }
}

class FunctionRateLimiter {
  private var lastExecutionTimes: [NSFileProviderItemIdentifier: Date] = [:]
  private let queue = DispatchQueue(label: "io.filen.app.functionRatelimiter")
  
  public static let shared: FunctionRateLimiter = {
    let instance = FunctionRateLimiter()
    
    return instance
  }()

  func shouldAllowExecution(for identifier: NSFileProviderItemIdentifier) -> Bool {
    let now = Date()
    let oneSecond: TimeInterval = 1.0
    
    return queue.sync {
      if let lastExecutionTime = lastExecutionTimes[identifier], now.timeIntervalSince(lastExecutionTime) < oneSecond {
        return false
      } else {
        lastExecutionTimes[identifier] = now
        
        return true
      }
    }
  }
}

struct BodyStringEncoding: ParameterEncoding {
  private let body: String

  init (body: String) {
    self.body = body
  }

  func encode (_ urlRequest: URLRequestConvertible, with parameters: Parameters?) throws -> URLRequest {
    guard var urlRequest = urlRequest.urlRequest else {
      throw Errors.emptyURLRequest
    }
    
    guard let data = body.data(using: .utf8) else {
      throw Errors.encodingProblem
    }
    
    urlRequest.httpBody = data
    
    return urlRequest
  }
}

extension BodyStringEncoding {
  enum Errors: Error {
    case emptyURLRequest
    case encodingProblem
  }
}

extension BodyStringEncoding.Errors: LocalizedError {
  var errorDescription: String? {
    switch self {
      case .emptyURLRequest: return "Empty url request"
      case .encodingProblem: return "Encoding problem"
    }
  }
}

actor DownloadFileCurrentWriteIndex {
  var index = 0
  
  func increase() -> Void {
    index += 1
  }
}

actor UploadFileResult {
  var bucket = ""
  var region = ""
  
  func set(bucket b: String, region r: String) -> Void {
    bucket = b
    region = r
  }
}
