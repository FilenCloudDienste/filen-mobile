//
//  FileProviderItem.swift
//  FileProviderExt
//
//  Created by Jan Lenczyk on 30.09.23.
//

import FileProvider
import UniformTypeIdentifiers

class FileProviderItem: NSObject, NSFileProviderItem {
  private let identifier: NSFileProviderItemIdentifier
  private let parentIdentifier: NSFileProviderItemIdentifier
  let item: Item
    
  init (identifier: NSFileProviderItemIdentifier, parentIdentifier: NSFileProviderItemIdentifier, item: Item) {
    self.identifier = identifier
    self.parentIdentifier = parentIdentifier
    self.item = item
    
    super.init()
  }

  var itemIdentifier: NSFileProviderItemIdentifier {
    self.identifier
  }
  
  var parentItemIdentifier: NSFileProviderItemIdentifier {
    self.parentIdentifier
  }
  
  var capabilities: NSFileProviderItemCapabilities {
    [.allowsReading, .allowsWriting, .allowsRenaming, .allowsReparenting, .allowsTrashing, .allowsDeleting]
  }
  
  var filename: String {
    self.item.name
  }
  
  var documentSize: NSNumber? {
    if (self.item.type == .folder) {
      return nil
    }
    
    return NSNumber(value: self.item.size)
  }
  
  var creationDate: Date? {
    Date(timeIntervalSince1970: TimeInterval(self.item.timestamp))
  }
  
  var contentModificationDate: Date? {
    self.item.type == .folder ? nil : Date(timeIntervalSince1970: TimeInterval(self.item.lastModified / 1000))
  }
  
  var contentType: UTType {
    self.item.type == .folder ? .folder : (UTType(filenameExtension: FileProviderUtils.shared.fileExtension(from: self.item.name) ?? "") ?? .data)
  }
  
  var favoriteRank: NSNumber? {
    get {
      nil //FileProviderUtils.shared.getFavoriteRank(uuid: itemIdentifier.rawValue)
    }

    set {
      //FileProviderUtils.shared.setFavoriteRank(uuid: itemIdentifier.rawValue, rank: newValue)
    }
  }

  var tagData: Data? {
    get {
      nil //FileProviderUtils.shared.getTagData(uuid: itemIdentifier.rawValue)
    }
    
    set {
      //FileProviderUtils.shared.setTagData(uuid: itemIdentifier.rawValue, data: newValue)
    }
  }
  
  var childItemCount: NSNumber? {
    nil
  }
  
  var versionIdentifier: Data? {
    nil
  }
  
  var isMostRecentVersionDownloaded: Bool {
    true
  }
  
  var isDownloaded: Bool {
    autoreleasepool {
      if (self.item.type == .folder || self.identifier == NSFileProviderItemIdentifier.rootContainer || self.identifier.rawValue == NSFileProviderItemIdentifier.rootContainer.rawValue) {
        return true
      }
      
      let url = NSFileProviderManager.default.documentStorageURL.appendingPathComponent(identifier.rawValue, isDirectory: true).appendingPathComponent(self.item.name, isDirectory: false)
      let exists = FileManager.default.fileExists(atPath: url.path)
      
      if (!exists){
        return false
      }
      
      do {
        let stat = try FileManager.default.attributesOfItem(atPath: url.path)
        
        if let fileSize = stat[.size] as? Int {
          return fileSize - 32 < self.item.size
        }
        
        return false
      } catch {
        print("[isDownloaded] error: \(error)")
        
        return false
      }
    }
  }
  
  var isUploading: Bool {
    autoreleasepool {
      if let uploading = FileProviderUtils.currentUploads[self.item.uuid] {
        return uploading
      }
      
      return false
    }
  }
  
  var isDownloading: Bool {
    autoreleasepool {
      if let downloading = FileProviderUtils.currentDownloads[self.item.uuid] {
        return downloading
      }
      
      return false
    }
  }
}
