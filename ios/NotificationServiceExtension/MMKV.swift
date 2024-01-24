//
//  MMKV.swift
//  NotificationServiceExtension
//
//  Created by Jan Lenczyk on 23.01.24.
//

import Foundation

class MMKVInstance {
  static let shared: MMKVInstance = {
    let instance = MMKVInstance()
    
    return instance
  }()
  
  private var mmkv: MMKV?
  private var groupDir: String
  
  init() {
    let fileManager = FileManager.default
    let groupDir = fileManager.containerURL(forSecurityApplicationGroupIdentifier: "group.io.filen.app")?.path
    
    MMKV.initialize(rootDir: nil, groupDir: groupDir!, logLevel: MMKVLogLevel.debug)
  
    self.mmkv = MMKV.init(mmapID: "filen_shared", cryptKey: nil, mode: MMKVMode.multiProcess)
    self.groupDir = groupDir!
  }
  
  var instance: MMKV? {
    get {
      return self.mmkv
    }
  }
}
